import { Router } from "express";
import { z } from "zod";
import {
  createUser,
  findUserByEmail,
  findUserById,
  verifyPassword,
  findOrCreateOAuthUser,
  toSafeUser,
} from "../services/users.js";
import { getUsage } from "../services/usage.js";
import { requireAuth } from "../middleware/auth.js";

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
    res.status(201).json({ user, usage: getUsage(user.id, user.plan) });
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

  const user = toSafeUser(row);
  req.session.userId = user.id;
  res.json({ user, usage: getUsage(user.id, user.plan) });
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

/** OAuth stub — wire to real provider in production */
router.post("/oauth/:provider", (req, res) => {
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

  return res.status(501).json({
    error: "OAUTH_NOT_CONFIGURED",
    message: `Set ${provider.toUpperCase()}_CLIENT_ID on the server to enable ${provider} sign-in.`,
  });
});

export default router;
