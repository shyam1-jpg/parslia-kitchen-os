import { Router } from "express";
import { z } from "zod";
import { requireAuth } from "../middleware/auth.js";
import { isFeatureEnabled } from "../config/featureFlags.js";
import { findUserById, toSafeUser } from "../services/users.js";
import {
  listMemories,
  createMemory,
  updateMemory,
  deleteMemory,
  deleteAllMemories,
  getUserPreferences,
  updateUserPreferences,
} from "../services/memory.js";

const router = Router();

router.use(requireAuth);

router.get("/", (req, res) => {
  const user = toSafeUser(findUserById(req.session.userId!)!);
  if (!isFeatureEnabled("memory", user.plan)) {
    return res.status(403).json({ error: "FEATURE_DISABLED" });
  }
  const projectId = req.query.projectId as string | undefined;
  res.json({ memories: listMemories(req.session.userId!, projectId) });
});

router.post("/", (req, res) => {
  const user = toSafeUser(findUserById(req.session.userId!)!);
  if (!isFeatureEnabled("memory", user.plan)) {
    return res.status(403).json({ error: "FEATURE_DISABLED" });
  }
  const schema = z.object({ category: z.string(), content: z.string().min(1).max(2000), projectId: z.string().optional() });
  const parsed = schema.safeParse(req.body);
  if (!parsed.success) return res.status(400).json({ error: "INVALID_INPUT" });
  const memory = createMemory(req.session.userId!, parsed.data.category, parsed.data.content, parsed.data.projectId);
  res.status(201).json(memory);
});

router.patch("/:id", (req, res) => {
  const { content, category } = req.body as { content?: string; category?: string };
  if (!content) return res.status(400).json({ error: "CONTENT_REQUIRED" });
  const ok = updateMemory(req.session.userId!, req.params.id, content, category);
  if (!ok) return res.status(404).json({ error: "NOT_FOUND" });
  res.json({ ok: true });
});

router.delete("/:id", (req, res) => {
  const ok = deleteMemory(req.session.userId!, req.params.id);
  if (!ok) return res.status(404).json({ error: "NOT_FOUND" });
  res.json({ ok: true });
});

router.delete("/", (_req, res) => {
  const count = deleteAllMemories(_req.session.userId!);
  res.json({ deleted: count });
});

router.get("/preferences", (req, res) => {
  res.json(getUserPreferences(req.session.userId!));
});

router.patch("/preferences", (req, res) => {
  const schema = z.object({
    memoryEnabled: z.boolean().optional(),
    privacyMode: z.enum(["standard", "temporary", "business"]).optional(),
    routerMode: z.string().optional(),
  });
  const parsed = schema.safeParse(req.body);
  if (!parsed.success) return res.status(400).json({ error: "INVALID_INPUT" });
  updateUserPreferences(req.session.userId!, parsed.data);
  res.json(getUserPreferences(req.session.userId!));
});

export default router;
