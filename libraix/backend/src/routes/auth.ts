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
import {
  createOAuthState,
  completeOAuthLogin,
  getOAuthStartUrl,
  getOAuthPublicConfig,
  type OAuthProvider,
} from "../services/oauth.js";

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
      if (!sent && process.env.NODE_ENV !== "production") payload.verifyUrl = verifyUrl;
      if (!sent) payload.emailNote = "Verification email could not be sent. Try resend from Settings after logging in.";
    } else if (process.env.NODE_ENV !== "production") {
      payload.verifyUrl = verifyUrl;
      payload.emailNote = "Email not configured on server — use this link to verify your account.";
    } else {
      payload.emailNote = "Check your inbox for a verification email.";
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
    oauth: getOAuthPublicConfig(),
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
  try {
    const ok = deleteUserAccount(userId);
    if (!ok) return res.status(404).json({ error: "NOT_FOUND" });
    req.session.destroy(() => {
      res.clearCookie("connect.sid");
      res.json({ ok: true });
    });
  } catch (e) {
    if (e instanceof Error && e.message === "CANNOT_DELETE_SUPER_ADMIN") {
      return res.status(403).json({ error: "CANNOT_DELETE_SUPER_ADMIN" });
    }
    throw e;
  }
});

/** OAuth — Google & Microsoft fully wired when client secrets are set on Render */
function isOAuthProvider(provider: string): provider is OAuthProvider {
  return ["google", "apple", "microsoft"].includes(provider);
}

router.get("/oauth/:provider/start", (req, res) => {
  const provider = req.params.provider;
  const frontend = process.env.FRONTEND_URL ?? "http://localhost:5173";

  if (!isOAuthProvider(provider)) {
    return res.redirect(`${frontend}/login?oauth_error=unsupported`);
  }

  const state = createOAuthState();
  req.session.oauthState = state;

  const url = getOAuthStartUrl(provider, state);
  if (!url) {
    return res.redirect(`${frontend}/login?oauth_error=${encodeURIComponent(provider)}`);
  }

  res.redirect(url);
});

async function handleOAuthCallback(req: import("express").Request, res: import("express").Response, provider: OAuthProvider) {
  const frontend = process.env.FRONTEND_URL ?? "http://localhost:5173";
  const code = (req.query.code ?? req.body?.code) as string | undefined;
  const state = (req.query.state ?? req.body?.state) as string | undefined;

  if (!code || !state || state !== req.session.oauthState) {
    return res.redirect(`${frontend}/login?oauth_error=${provider}`);
  }

  try {
    const user = await completeOAuthLogin(provider, code);
    const row = findUserById(user.id);
    if (row?.suspended) {
      return res.redirect(`${frontend}/login?oauth_error=suspended`);
    }
    req.session.userId = user.id;
    delete req.session.oauthState;
    res.redirect(`${frontend}/app`);
  } catch (e) {
    console.error(`OAuth ${provider} callback failed:`, e);
    res.redirect(`${frontend}/login?oauth_error=${provider}`);
  }
}

router.get("/oauth/:provider/callback", async (req, res) => {
  const provider = req.params.provider;
  if (!isOAuthProvider(provider) || provider === "apple") {
    return res.status(400).json({ error: "UNSUPPORTED_PROVIDER" });
  }
  await handleOAuthCallback(req, res, provider);
});

router.post("/oauth/apple/callback", async (req, res) => {
  await handleOAuthCallback(req, res, "apple");
});

/** Dev-only OAuth stub for local testing without provider keys */
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
    if (!sent && process.env.NODE_ENV !== "production") {
      return res.json({ ok: true, verifyUrl, emailNote: "Email send failed — use this link to verify." });
    }
    return res.json({ ok: true });
  }

  if (process.env.NODE_ENV !== "production") {
    return res.json({ ok: true, verifyUrl, emailNote: "Email not configured on server — use this link to verify." });
  }
  res.json({ ok: true, emailNote: "Email is not configured on this server." });
});

export default router;
