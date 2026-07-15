import { Router } from "express";
import { z } from "zod";
import { requireAuth } from "../middleware/auth.js";
import { isFeatureEnabled } from "../config/featureFlags.js";
import { findUserById, toSafeUser } from "../services/users.js";
import {
  listPrompts,
  createPrompt,
  updatePrompt,
  deletePrompt,
  listCustomAssistants,
  createCustomAssistant,
  updateCustomAssistant,
  deleteCustomAssistant,
  createShareLink,
  getSharedChat,
  revokeShareLink,
  listFolders,
  createFolder,
  deleteFolder,
  setConversationFolder,
  listAutomations,
  createAutomation,
  updateAutomation,
  deleteAutomation,
  claimDueAutomations,
  listConnectors,
  setConnectorStatus,
} from "../services/workspaceExtras.js";
import { invokeMcpTool, listMcpTools } from "../services/mcpTools.js";

const router = Router();

function uid(req: import("express").Request) {
  return req.session.userId!;
}

function planOf(req: import("express").Request) {
  const row = findUserById(uid(req));
  return row ? toSafeUser(row).plan : "free";
}

/** Public read-only shared chat (no auth). */
router.get("/share/:token", (req, res) => {
  const token = Array.isArray(req.params.token) ? req.params.token[0] : req.params.token;
  const chat = getSharedChat(token);
  if (!chat) return res.status(404).json({ error: "NOT_FOUND" });
  res.json(chat);
});

router.use(requireAuth);

/* Prompts */
router.get("/prompts", (req, res) => {
  res.json({ prompts: listPrompts(uid(req)) });
});

router.post("/prompts", (req, res) => {
  const parsed = z
    .object({ title: z.string().min(1).max(120), body: z.string().min(1).max(8000) })
    .safeParse(req.body);
  if (!parsed.success) return res.status(400).json({ error: "INVALID_INPUT" });
  res.status(201).json(createPrompt(uid(req), parsed.data.title, parsed.data.body));
});

router.patch("/prompts/:id", (req, res) => {
  const parsed = z
    .object({ title: z.string().min(1).max(120).optional(), body: z.string().min(1).max(8000).optional() })
    .safeParse(req.body);
  if (!parsed.success) return res.status(400).json({ error: "INVALID_INPUT" });
  const updated = updatePrompt(uid(req), req.params.id as string, parsed.data);
  if (!updated) return res.status(404).json({ error: "NOT_FOUND" });
  res.json(updated);
});

router.delete("/prompts/:id", (req, res) => {
  if (!deletePrompt(uid(req), req.params.id as string)) return res.status(404).json({ error: "NOT_FOUND" });
  res.json({ ok: true });
});

/* Custom assistants */
router.get("/assistants", (req, res) => {
  if (!isFeatureEnabled("custom-agents", planOf(req))) {
    return res.status(403).json({ error: "FEATURE_DISABLED" });
  }
  res.json({ assistants: listCustomAssistants(uid(req)) });
});

router.post("/assistants", (req, res) => {
  if (!isFeatureEnabled("custom-agents", planOf(req))) {
    return res.status(403).json({ error: "FEATURE_DISABLED" });
  }
  const parsed = z
    .object({
      name: z.string().min(1).max(80),
      description: z.string().max(240).optional(),
      systemPrompt: z.string().min(1).max(8000),
    })
    .safeParse(req.body);
  if (!parsed.success) return res.status(400).json({ error: "INVALID_INPUT" });
  res.status(201).json(createCustomAssistant(uid(req), parsed.data));
});

router.patch("/assistants/:id", (req, res) => {
  if (!isFeatureEnabled("custom-agents", planOf(req))) {
    return res.status(403).json({ error: "FEATURE_DISABLED" });
  }
  const parsed = z
    .object({
      name: z.string().min(1).max(80).optional(),
      description: z.string().max(240).optional(),
      systemPrompt: z.string().min(1).max(8000).optional(),
    })
    .safeParse(req.body);
  if (!parsed.success) return res.status(400).json({ error: "INVALID_INPUT" });
  const updated = updateCustomAssistant(uid(req), req.params.id as string, parsed.data);
  if (!updated) return res.status(404).json({ error: "NOT_FOUND" });
  res.json(updated);
});

router.delete("/assistants/:id", (req, res) => {
  if (!deleteCustomAssistant(uid(req), req.params.id as string)) {
    return res.status(404).json({ error: "NOT_FOUND" });
  }
  res.json({ ok: true });
});

/* Share (auth) */
router.post("/share", (req, res) => {
  const parsed = z.object({ conversationId: z.string().min(1) }).safeParse(req.body);
  if (!parsed.success) return res.status(400).json({ error: "INVALID_INPUT" });
  const link = createShareLink(uid(req), parsed.data.conversationId);
  if (!link) return res.status(404).json({ error: "NOT_FOUND" });
  const frontend = process.env.FRONTEND_URL ?? "https://libraix.ai";
  res.status(201).json({
    token: link.token,
    url: `${frontend.replace(/\/$/, "")}/share/${link.token}`,
  });
});

router.delete("/share/:conversationId", (req, res) => {
  revokeShareLink(uid(req), req.params.conversationId as string);
  res.json({ ok: true });
});

/* Folders */
router.get("/folders", (req, res) => {
  res.json({ folders: listFolders(uid(req)) });
});

router.post("/folders", (req, res) => {
  const parsed = z.object({ name: z.string().min(1).max(60) }).safeParse(req.body);
  if (!parsed.success) return res.status(400).json({ error: "INVALID_INPUT" });
  res.status(201).json(createFolder(uid(req), parsed.data.name));
});

router.delete("/folders/:id", (req, res) => {
  if (!deleteFolder(uid(req), req.params.id as string)) return res.status(404).json({ error: "NOT_FOUND" });
  res.json({ ok: true });
});

router.post("/folders/assign", (req, res) => {
  const parsed = z
    .object({ conversationId: z.string(), folderId: z.string().nullable() })
    .safeParse(req.body);
  if (!parsed.success) return res.status(400).json({ error: "INVALID_INPUT" });
  const ok = setConversationFolder(uid(req), parsed.data.conversationId, parsed.data.folderId);
  if (!ok) return res.status(404).json({ error: "NOT_FOUND" });
  res.json({ ok: true });
});

/* Automations */
router.get("/automations", (req, res) => {
  if (!isFeatureEnabled("automations", planOf(req))) {
    return res.status(403).json({ error: "FEATURE_DISABLED" });
  }
  res.json({ automations: listAutomations(uid(req)) });
});

router.post("/automations", (req, res) => {
  if (!isFeatureEnabled("automations", planOf(req))) {
    return res.status(403).json({ error: "FEATURE_DISABLED" });
  }
  const parsed = z
    .object({
      name: z.string().min(1).max(80),
      prompt: z.string().min(1).max(4000),
      schedule: z.enum(["daily", "weekly", "weekday"]).optional(),
    })
    .safeParse(req.body);
  if (!parsed.success) return res.status(400).json({ error: "INVALID_INPUT" });
  res.status(201).json(createAutomation(uid(req), parsed.data));
});

router.patch("/automations/:id", (req, res) => {
  const parsed = z
    .object({
      name: z.string().min(1).max(80).optional(),
      prompt: z.string().min(1).max(4000).optional(),
      schedule: z.enum(["daily", "weekly", "weekday"]).optional(),
      enabled: z.boolean().optional(),
    })
    .safeParse(req.body);
  if (!parsed.success) return res.status(400).json({ error: "INVALID_INPUT" });
  const updated = updateAutomation(uid(req), req.params.id as string, parsed.data);
  if (!updated) return res.status(404).json({ error: "NOT_FOUND" });
  res.json(updated);
});

router.delete("/automations/:id", (req, res) => {
  if (!deleteAutomation(uid(req), req.params.id as string)) return res.status(404).json({ error: "NOT_FOUND" });
  res.json({ ok: true });
});

router.post("/automations/due", (req, res) => {
  if (!isFeatureEnabled("automations", planOf(req))) {
    return res.status(403).json({ error: "FEATURE_DISABLED" });
  }
  res.json({ due: claimDueAutomations(uid(req)) });
});

/* Connectors + MCP-style tools */
router.get("/connectors", (req, res) => {
  if (!isFeatureEnabled("connectors", planOf(req))) {
    return res.status(403).json({ error: "FEATURE_DISABLED" });
  }
  res.json({
    connectors: listConnectors(uid(req)),
    note: "OAuth app credentials required on the server to fully connect Google / GitHub. Pending/connected connectors expose Agent tools today.",
  });
});

router.get("/connectors/tools", (req, res) => {
  if (!isFeatureEnabled("connectors", planOf(req))) {
    return res.status(403).json({ error: "FEATURE_DISABLED" });
  }
  res.json({ tools: listMcpTools(uid(req)) });
});

router.post("/connectors/tools/invoke", async (req, res) => {
  if (!isFeatureEnabled("connectors", planOf(req))) {
    return res.status(403).json({ error: "FEATURE_DISABLED" });
  }
  const { tool, query, projectId, brief } = req.body as {
    tool?: string;
    query?: string;
    projectId?: string;
    brief?: string;
  };
  if (!tool) return res.status(400).json({ error: "TOOL_REQUIRED" });
  const result = await invokeMcpTool(uid(req), tool, { query, projectId, brief });
  res.json({ result });
});

router.post("/connectors/:provider/connect", (req, res) => {
  if (!isFeatureEnabled("connectors", planOf(req))) {
    return res.status(403).json({ error: "FEATURE_DISABLED" });
  }
  const provider = req.params.provider as string;
  const googleReady = Boolean(process.env.GOOGLE_CLIENT_ID && process.env.GOOGLE_CLIENT_SECRET);
  if (provider.startsWith("google") && !googleReady) {
    return res.status(503).json({
      error: "CONNECTOR_NOT_CONFIGURED",
      hint: "Add GOOGLE_CLIENT_ID and GOOGLE_CLIENT_SECRET on Render, then try again.",
    });
  }
  // Mark pending until full OAuth scopes are wired; UI shows status honestly.
  const updated = setConnectorStatus(uid(req), provider, "pending");
  if (!updated) return res.status(400).json({ error: "INVALID_PROVIDER" });
  res.json({
    connector: updated,
    hint: "Connection request saved. Full Drive/Gmail/Calendar sync lands once OAuth scopes are approved in Google Cloud.",
  });
});

router.post("/connectors/:provider/disconnect", (req, res) => {
  const updated = setConnectorStatus(uid(req), req.params.provider as string, "disconnected");
  if (!updated) return res.status(400).json({ error: "INVALID_PROVIDER" });
  res.json({ connector: updated });
});

export default router;
