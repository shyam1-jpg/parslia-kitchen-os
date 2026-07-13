import { Router } from "express";
import { z } from "zod";
import {
  createUser,
  findUserByEmail,
  findUserById,
  verifyPassword,
  findOrCreateOAuthUser,
  createPasswordResetToken,
  resetPasswordWithToken,
  deleteUserAccount,
  createEmailVerificationToken,
  verifyEmailWithToken,
  toSafeUser,
} from "../services/users.js";
import { getUsage } from "../services/usage.js";
import { requireAuth } from "../middleware/auth.js";
import { sendPasswordResetEmail, sendVerificationEmail, isEmailConfigured } from "../services/email.js";
import { isStripeCheckoutConfigured } from "../services/stripe.js";
import { listConfiguredProviders } from "../providers/config.js";

const router = Router();

const signupSchema = z.object({
  email: z.string().email(),
  password: z.string().min(8),
  displayName: z.string().optional(),
});

const loginSchema = z.object({
  email: z.string().email(),
  password: z.string().min(1),
});

router.post("/signup", async (req, res) => {
  const parsed = signupSchema.safeParse(req.body);
  if (!parsed.success) return res.status(400).json({ error: "INVALID_INPUT" });

  try {
    const user = await createUser(parsed.data.email, parsed.data.password, parsed.data.displayName);
    req.session.userId = user.id;

    const frontend = process.env.FRONTEND_URL ?? "http://localhost:5173";
    const token = createEmailVerificationToken(user.id);
    const verifyUrl = `${frontend}/verify-email?token=${token}`;
    const payload: Record<string, unknown> = { user, usage: getUsage(user.id, user.plan) };

    if (isEmailConfigured()) {
      const sent = await sendVerificationEmail(parsed.data.email, verifyUrl);
      if (!sent) payload.verifyUrl = verifyUrl;
    } else {
      payload.verifyUrl = verifyUrl;
      payload.emailNote = "Email not configured on server — use this link to verify your account.";
    }

    res.status(201).json(payload);
  } catch (e) {
    if (e instanceof Error && e.message === "EMAIL_EXISTS") {
      return res.status(409).json({ error: "EMAIL_EXISTS" });
    }
    throw e;
  }
});

router.post("/login", async (req, res) => {
  const parsed = loginSchema.safeParse(req.body);
  if (!parsed.success) return res.status(400).json({ error: "INVALID_INPUT" });

  const row = findUserByEmail(parsed.data.email);
  if (!row || !(await verifyPassword(row, parsed.data.password))) {
    return res.status(401).json({ error: "INVALID_CREDENTIALS" });
  }
  if (row.suspended) {
    return res.status(403).json({ error: "ACCOUNT_SUSPENDED" });
  }

  const user = toSafeUser(row);
  req.session.userId = user.id;
  res.json({ user, usage: getUsage(user.id, user.plan) });
});

router.get("/config", (_req, res) => {
  res.json({
    oauth: {
      google: Boolean(process.env.GOOGLE_CLIENT_ID),
      apple: Boolean(process.env.APPLE_CLIENT_ID),
      microsoft: Boolean(process.env.MICROSOFT_CLIENT_ID),
    },
    stripe: isStripeCheckoutConfigured(),
    email: isEmailConfigured(),
    providers: listConfiguredProviders(),
  });
});

router.post("/logout", (req, res) => {
  req.session.destroy(() => {
    res.clearCookie("connect.sid");
    res.json({ ok: true });
  });
});

router.get("/me", requireAuth, (req, res) => {
  const row = findUserById(req.session.userId!);
  if (!row) return res.status(401).json({ error: "UNAUTHENTICATED" });
  const user = toSafeUser(row);
  res.json({ user, usage: getUsage(user.id, user.plan) });
});

router.post("/forgot-password", async (req, res) => {
  const parsed = z.object({ email: z.string().email() }).safeParse(req.body);
  if (!parsed.success) return res.status(400).json({ error: "INVALID_INPUT" });

  const token = createPasswordResetToken(parsed.data.email);
  const frontend = process.env.FRONTEND_URL ?? "http://localhost:5173";
  const payload: Record<string, string> = {
    message: "If an account exists for that email, password reset instructions have been sent.",
  };

  if (token) {
    const resetUrl = `${frontend}/reset-password?token=${token}`;
    const sent = await sendPasswordResetEmail(parsed.data.email, resetUrl);
    if (!sent) {
      console.warn("Password reset email not sent — configure RESEND_API_KEY or SMTP_* on server");
      if (process.env.NODE_ENV !== "production") {
        payload.resetUrl = resetUrl;
      }
    }
  }

  res.json(payload);
});

router.post("/reset-password", async (req, res) => {
  const parsed = z
    .object({ token: z.string().min(1), password: z.string().min(8) })
    .safeParse(req.body);
  if (!parsed.success) return res.status(400).json({ error: "INVALID_INPUT" });

  const ok = resetPasswordWithToken(parsed.data.token, parsed.data.password);
  if (!ok) return res.status(400).json({ error: "INVALID_OR_EXPIRED_TOKEN" });
  res.json({ ok: true });
});

router.delete("/account", requireAuth, (req, res) => {
  const userId = req.session.userId!;
  const ok = deleteUserAccount(userId);
  if (!ok) return res.status(404).json({ error: "NOT_FOUND" });
  req.session.destroy(() => {
    res.clearCookie("connect.sid");
    res.json({ ok: true });
  });
});

/** OAuth stub — disabled in production until real OAuth callback is wired */
router.post("/oauth/:provider", (req, res) => {
  if (process.env.NODE_ENV === "production" && !process.env.OAUTH_STUB_ENABLED) {
    return res.status(501).json({ error: "OAUTH_NOT_CONFIGURED" });
  }
  const provider = req.params.provider;
  if (!["google", "apple", "microsoft"].includes(provider)) {
    return res.status(400).json({ error: "UNSUPPORTED_PROVIDER" });
  }

  const { email, providerUserId, displayName } = req.body as {
    email?: string;
    providerUserId?: string;
    displayName?: string;
  };

  if (!email || !providerUserId) {
    return res.status(400).json({ error: "INVALID_OAUTH_PAYLOAD" });
  }

  const user = findOrCreateOAuthUser(provider, providerUserId, email, displayName);
  req.session.userId = user.id;
  res.json({ user, usage: getUsage(user.id, user.plan) });
});

router.get("/oauth/:provider/start", (req, res) => {
  const provider = req.params.provider;
  const frontend = process.env.FRONTEND_URL ?? "http://localhost:5173";

  if (provider === "google" && process.env.GOOGLE_CLIENT_ID) {
    const redirect = `${frontend}/login?oauth=google`;
    const url = `https://accounts.google.com/o/oauth2/v2/auth?client_id=${process.env.GOOGLE_CLIENT_ID}&redirect_uri=${encodeURIComponent(redirect)}&response_type=code&scope=email%20profile&access_type=online`;
    return res.redirect(url);
  }

  return res.redirect(
    `${frontend}/login?oauth_error=${encodeURIComponent(provider)}`
  );
});

router.post("/verify-email", (req, res) => {
  const token = (req.body as { token?: string }).token;
  if (!token) return res.status(400).json({ error: "TOKEN_REQUIRED" });
  const ok = verifyEmailWithToken(token);
  if (!ok) return res.status(400).json({ error: "INVALID_OR_EXPIRED_TOKEN" });
  res.json({ ok: true });
});

router.post("/resend-verification", requireAuth, async (req, res) => {
  const row = findUserById(req.session.userId!)!;
  if (row.email_verified === 1) return res.json({ ok: true, alreadyVerified: true });
  const frontend = process.env.FRONTEND_URL ?? "http://localhost:5173";
  const token = createEmailVerificationToken(row.id);
  const verifyUrl = `${frontend}/verify-email?token=${token}`;

  if (isEmailConfigured()) {
    const sent = await sendVerificationEmail(row.email, verifyUrl);
    if (!sent) return res.json({ ok: true, verifyUrl, emailNote: "Email send failed — use this link to verify." });
    return res.json({ ok: true });
  }

  res.json({ ok: true, verifyUrl, emailNote: "Email not configured on server — use this link to verify." });
});

export default router;
