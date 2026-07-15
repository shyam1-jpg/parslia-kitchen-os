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
  updateConversationMeta,
  updateMessage,
  deleteMessagesAfter,
  deleteMessagesFrom,
  branchConversation,
} from "../services/conversations.js";
import { findUserById, toSafeUser } from "../services/users.js";
import { getUsage } from "../services/usage.js";

const router = Router();

function paramId(req: import("express").Request): string {
  const id = req.params.id;
  return Array.isArray(id) ? id[0] : id;
}

router.get("/", requireAuth, (req, res) => {
  const archived = req.query.archived === "1" || req.query.archived === "true";
  res.json({ conversations: listConversations(req.session.userId!, { archived }) });
});

router.post("/", requireAuth, (req, res) => {
  const schema = z.object({
    modelId: z.string(),
    title: z.string().optional(),
    projectId: z.string().nullable().optional(),
  });
  const parsed = schema.safeParse(req.body);
  if (!parsed.success) return res.status(400).json({ error: "INVALID_INPUT" });
  const conv = createConversation(
    req.session.userId!,
    parsed.data.modelId,
    parsed.data.title,
    parsed.data.projectId
  );
  res.status(201).json(conv);
});

router.get("/:id", requireAuth, (req, res) => {
  const conv = getConversation(req.session.userId!, paramId(req));
  if (!conv) return res.status(404).json({ error: "NOT_FOUND" });
  res.json({ conversation: conv, messages: getMessages(conv.id) });
});

router.patch("/:id", requireAuth, (req, res) => {
  const body = req.body as {
    title?: string;
    pinned?: boolean;
    archived?: boolean;
    projectId?: string | null;
    folderId?: string | null;
  };
  const userId = req.session.userId!;
  const id = paramId(req);

  if (body.title) {
    const ok = updateConversationTitle(userId, id, body.title);
    if (!ok) return res.status(404).json({ error: "NOT_FOUND" });
  }
  if (
    body.pinned !== undefined ||
    body.archived !== undefined ||
    body.projectId !== undefined ||
    body.folderId !== undefined
  ) {
    const ok = updateConversationMeta(userId, id, {
      pinned: body.pinned,
      archived: body.archived,
      projectId: body.projectId,
      folderId: body.folderId,
    });
    if (!ok) return res.status(404).json({ error: "NOT_FOUND" });
  }
  res.json({ ok: true, conversation: getConversation(userId, id) });
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

router.patch("/:id/messages/:messageId", requireAuth, (req, res) => {
  const schema = z.object({ content: z.string().min(1) });
  const parsed = schema.safeParse(req.body);
  if (!parsed.success) return res.status(400).json({ error: "INVALID_INPUT" });

  const conv = getConversation(req.session.userId!, paramId(req));
  if (!conv) return res.status(404).json({ error: "NOT_FOUND" });

  const ok = updateMessage(conv.id, req.params.messageId as string, parsed.data.content);
  if (!ok) return res.status(404).json({ error: "NOT_FOUND" });
  deleteMessagesAfter(conv.id, req.params.messageId as string);
  res.json({ ok: true, messages: getMessages(conv.id) });
});

router.post("/:id/regenerate", requireAuth, (req, res) => {
  const conv = getConversation(req.session.userId!, paramId(req));
  if (!conv) return res.status(404).json({ error: "NOT_FOUND" });
  const messages = getMessages(conv.id);
  const lastAssistant = [...messages].reverse().find((m) => m.role === "assistant");
  if (!lastAssistant) return res.status(400).json({ error: "NO_ASSISTANT_MESSAGE" });
  deleteMessagesFrom(conv.id, lastAssistant.id);
  res.json({ ok: true, messages: getMessages(conv.id) });
});

router.post("/:id/branch", requireAuth, (req, res) => {
  const schema = z.object({ messageId: z.string(), modelId: z.string().optional() });
  const parsed = schema.safeParse(req.body);
  if (!parsed.success) return res.status(400).json({ error: "INVALID_INPUT" });
  const source = getConversation(req.session.userId!, paramId(req));
  if (!source) return res.status(404).json({ error: "NOT_FOUND" });
  const branched = branchConversation(
    req.session.userId!,
    source.id,
    parsed.data.messageId,
    parsed.data.modelId ?? source.modelId
  );
  if (!branched) return res.status(400).json({ error: "BRANCH_FAILED" });
  res.status(201).json({ conversation: branched, messages: getMessages(branched.id) });
});

router.get("/account/summary", requireAuth, (req, res) => {
  const row = findUserById(req.session.userId!);
  if (!row) return res.status(401).json({ error: "UNAUTHENTICATED" });
  const user = toSafeUser(row);
  res.json({ user, usage: getUsage(user.id, user.plan) });
});

export default router;
