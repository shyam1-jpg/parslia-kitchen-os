import { Router } from "express";
import { z } from "zod";
import { requireAuth } from "../middleware/auth.js";
import { isFeatureEnabled } from "../config/featureFlags.js";
import { findUserById, toSafeUser } from "../services/users.js";
import { createCheckoutSession, handleWebhookEvent } from "../services/stripe.js";
import { runDeepResearch } from "../services/research.js";
import { registerProjectFile, getProject } from "../services/projects.js";

const router = Router();

export function stripeWebhookHandler(req: import("express").Request, res: import("express").Response) {
  try {
    const sig = req.headers["stripe-signature"] as string;
    const type = handleWebhookEvent(req.body as Buffer, sig);
    res.json({ received: true, type });
  } catch {
    res.status(400).json({ error: "WEBHOOK_FAILED" });
  }
}

router.post("/stripe/checkout", requireAuth, async (req, res) => {
  const row = findUserById(req.session.userId!);
  if (!row) return res.status(401).json({ error: "UNAUTHENTICATED" });
  const user = toSafeUser(row);
  const plan = (req.body as { plan?: string }).plan === "enterprise" ? "enterprise" : "pro";

  try {
    const result = await createCheckoutSession(user.id, user.email, plan);
    res.json(result);
  } catch (e) {
    res.status(500).json({ error: e instanceof Error ? e.message : "CHECKOUT_FAILED" });
  }
});

router.post("/research", requireAuth, async (req, res) => {
  const row = findUserById(req.session.userId!);
  if (!row) return res.status(401).json({ error: "UNAUTHENTICATED" });
  const user = toSafeUser(row);

  if (!isFeatureEnabled("deep-research", user.plan) && user.plan === "free") {
    return res.status(403).json({ error: "FEATURE_REQUIRES_PRO" });
  }

  const schema = z.object({
    query: z.string().min(1).max(8000),
    depth: z.enum(["quick", "standard", "deep"]).default("standard"),
  });
  const parsed = schema.safeParse(req.body);
  if (!parsed.success) return res.status(400).json({ error: "INVALID_INPUT" });

  try {
    const result = await runDeepResearch(user, parsed.data);
    res.json(result);
  } catch (e) {
    const msg = e instanceof Error ? e.message : "FAILED";
    if (msg === "USAGE_LIMIT_REACHED") return res.status(429).json({ error: msg });
    res.status(502).json({ error: msg });
  }
});

router.post("/upload", requireAuth, (req, res) => {
  const schema = z.object({
    projectId: z.string(),
    filename: z.string().max(255),
    mimeType: z.string(),
    sizeBytes: z.number().max(20_000_000),
    contentBase64: z.string().max(27_000_000).optional(),
  });
  const parsed = schema.safeParse(req.body);
  if (!parsed.success) return res.status(400).json({ error: "INVALID_INPUT" });

  const project = getProject(req.session.userId!, parsed.data.projectId);
  if (!project) return res.status(404).json({ error: "PROJECT_NOT_FOUND" });

  const allowed = ["application/pdf", "text/plain", "text/markdown", "text/csv", "image/png", "image/jpeg"];
  if (!allowed.includes(parsed.data.mimeType)) {
    return res.status(400).json({ error: "FILE_TYPE_NOT_ALLOWED" });
  }

  const file = registerProjectFile(
    parsed.data.projectId,
    parsed.data.filename,
    parsed.data.mimeType,
    parsed.data.sizeBytes
  );

  res.status(201).json({ file, message: "File registered. Full storage pipeline connects in Phase 2." });
});

export default router;
