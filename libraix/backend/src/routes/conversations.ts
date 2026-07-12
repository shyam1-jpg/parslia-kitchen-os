import { Router } from "express";
import { z } from "zod";
import { requireAuth } from "../middleware/auth.js";
import {
  listConversations,
  createConversation,
  getConversation,
  getMessages,
  addMessage,
  deleteConversation,
  updateConversationTitle,
} from "../services/conversations.js";
import { findUserById, toSafeUser } from "../services/users.js";
import { getUsage } from "../services/usage.js";

const router = Router();

function paramId(req: import("express").Request): string {
  const id = req.params.id;
  return Array.isArray(id) ? id[0] : id;
}

router.get("/", requireAuth, (req, res) => {
  res.json({ conversations: listConversations(req.session.userId!) });
});

router.post("/", requireAuth, (req, res) => {
  const { modelId, title } = req.body as { modelId?: string; title?: string };
  if (!modelId) return res.status(400).json({ error: "MODEL_ID_REQUIRED" });
  const conv = createConversation(req.session.userId!, modelId, title);
  res.status(201).json(conv);
});

router.get("/:id", requireAuth, (req, res) => {
  const conv = getConversation(req.session.userId!, paramId(req));
  if (!conv) return res.status(404).json({ error: "NOT_FOUND" });
  res.json({ conversation: conv, messages: getMessages(conv.id) });
});

router.patch("/:id", requireAuth, (req, res) => {
  const { title } = req.body as { title?: string };
  if (!title) return res.status(400).json({ error: "TITLE_REQUIRED" });
  const ok = updateConversationTitle(req.session.userId!, paramId(req), title);
  if (!ok) return res.status(404).json({ error: "NOT_FOUND" });
  res.json({ ok: true });
});

router.delete("/:id", requireAuth, (req, res) => {
  const ok = deleteConversation(req.session.userId!, paramId(req));
  if (!ok) return res.status(404).json({ error: "NOT_FOUND" });
  res.json({ ok: true });
});

router.get("/:id/export", requireAuth, (req, res) => {
  const conv = getConversation(req.session.userId!, paramId(req));
  if (!conv) return res.status(404).json({ error: "NOT_FOUND" });
  const messages = getMessages(conv.id);
  res.setHeader("Content-Disposition", `attachment; filename="libraix-chat-${conv.id.slice(0, 8)}.json"`);
  res.json({ conversation: conv, messages, exportedAt: new Date().toISOString() });
});

router.post("/:id/messages", requireAuth, (req, res) => {
  const schema = z.object({ role: z.enum(["user", "assistant"]), content: z.string() });
  const parsed = schema.safeParse(req.body);
  if (!parsed.success) return res.status(400).json({ error: "INVALID_INPUT" });

  const conv = getConversation(req.session.userId!, paramId(req));
  if (!conv) return res.status(404).json({ error: "NOT_FOUND" });

  const msg = addMessage(conv.id, parsed.data.role, parsed.data.content);
  res.status(201).json(msg);
});

router.get("/account/summary", requireAuth, (req, res) => {
  const row = findUserById(req.session.userId!);
  if (!row) return res.status(401).json({ error: "UNAUTHENTICATED" });
  const user = toSafeUser(row);
  res.json({ user, usage: getUsage(user.id, user.plan) });
});

export default router;
