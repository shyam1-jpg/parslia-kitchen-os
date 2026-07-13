import { Router } from "express";
import { z } from "zod";
import { v4 as uuid } from "uuid";
import { requireAuth } from "../middleware/auth.js";
import { getUsage } from "../services/usage.js";
import { findUserById, toSafeUser } from "../services/users.js";
import { respondWithAi, streamAiResponse, routeModel } from "../services/ai.js";
import { compareModels } from "../services/compare.js";
import { getPublicCatalog, getModelsForPlan, getModelById } from "../config/models.js";
import { getPublicFeatures, ROUTER_MODES, isFeatureEnabled } from "../config/featureFlags.js";
import { getAllProviderHealth } from "../providers/gateway.js";
import { ProviderError } from "../providers/types.js";
import { getPublicRuntimeConfig } from "../services/siteConfig.js";
import { getCompanyInfo } from "../config/company.js";
import { db } from "../db/schema.js";
import type { RouterMode } from "../config/featureFlags.js";

const router = Router();

router.get("/site", (_req, res) => {
  res.json(getPublicRuntimeConfig());
});

router.get("/company", (_req, res) => {
  res.json(getCompanyInfo());
});

router.post("/support", async (req, res) => {
  const parsed = z
    .object({
      email: z.string().email(),
      subject: z.string().min(1).max(200),
      body: z.string().min(1).max(8000),
    })
    .safeParse(req.body);
  if (!parsed.success) return res.status(400).json({ error: "INVALID_INPUT" });

  const userId = req.session.userId ?? null;
  db.prepare(
    "INSERT INTO support_requests (id, user_id, email, subject, body, status) VALUES (?, ?, ?, ?, ?, 'open')"
  ).run(uuid(), userId, parsed.data.email, parsed.data.subject, parsed.data.body);
  res.json({ ok: true });
});

router.post("/privacy-request", async (req, res) => {
  const parsed = z
    .object({
      email: z.string().email(),
      requestType: z.enum(["export", "deletion", "correction", "other"]),
      details: z.string().max(4000).optional(),
    })
    .safeParse(req.body);
  if (!parsed.success) return res.status(400).json({ error: "INVALID_INPUT" });

  const userId = req.session.userId ?? null;
  db.prepare(
    "INSERT INTO privacy_requests (id, user_id, email, request_type, status) VALUES (?, ?, ?, ?, 'pending')"
  ).run(uuid(), userId, parsed.data.email, parsed.data.requestType);
  res.json({ ok: true });
});

router.get("/catalog", (_req, res) => {
  res.json(getPublicCatalog());
});

router.get("/features", requireAuth, (req, res) => {
  const row = findUserById(req.session.userId!);
  if (!row) return res.status(401).json({ error: "UNAUTHENTICATED" });
  const user = toSafeUser(row);
  res.json({ features: getPublicFeatures(user.plan) });
});

router.get("/providers/health", requireAuth, async (_req, res) => {
  const health = await getAllProviderHealth();
  res.json({ providers: health });
});

router.get("/router/modes", (_req, res) => {
  res.json({ modes: ROUTER_MODES });
});

router.post("/router/preview", requireAuth, (req, res) => {
  const row = findUserById(req.session.userId!);
  if (!row) return res.status(401).json({ error: "UNAUTHENTICATED" });
  const user = toSafeUser(row);
  const { message, mode, modelId } = req.body as { message?: string; mode?: RouterMode; modelId?: string };
  if (!message) return res.status(400).json({ error: "MESSAGE_REQUIRED" });
  const result = routeModel({ message, mode: mode ?? "auto", userPlan: user.plan, manualModelId: modelId });
  res.json(result);
});

router.get("/models", requireAuth, (req, res) => {
  const row = findUserById(req.session.userId!);
  if (!row) return res.status(401).json({ error: "UNAUTHENTICATED" });
  const user = toSafeUser(row);
  const models = getModelsForPlan(user.plan).map(({ providerModelId: _, ...rest }) => rest);
  res.json({ models });
});

const respondSchema = z.object({
  message: z.string().min(1).max(32000),
  modelId: z.string().optional(),
  routerMode: z.string().optional(),
  conversationId: z.string().optional(),
  projectId: z.string().optional(),
  systemPrompt: z.string().max(8000).optional(),
  useMemory: z.boolean().optional(),
  history: z
    .array(z.object({ role: z.enum(["user", "assistant"]), content: z.string() }))
    .max(50)
    .optional(),
});

router.post("/ai/respond", requireAuth, async (req, res) => {
  const parsed = respondSchema.safeParse(req.body);
  if (!parsed.success) return res.status(400).json({ error: "INVALID_INPUT" });

  const row = findUserById(req.session.userId!);
  if (!row) return res.status(401).json({ error: "UNAUTHENTICATED" });
  const user = toSafeUser(row);

  try {
    const result = await respondWithAi(user, {
      message: parsed.data.message,
      modelId: parsed.data.modelId,
      routerMode: parsed.data.routerMode as RouterMode | undefined,
      conversationHistory: parsed.data.history,
      systemPrompt: parsed.data.systemPrompt,
      projectId: parsed.data.projectId,
      useMemory: parsed.data.useMemory,
    });
    res.json(result);
  } catch (e) {
    handleAiError(e, res);
  }
});

router.post("/ai/stream", requireAuth, async (req, res) => {
  const parsed = respondSchema.safeParse(req.body);
  if (!parsed.success) return res.status(400).json({ error: "INVALID_INPUT" });

  const row = findUserById(req.session.userId!);
  if (!row) return res.status(401).json({ error: "UNAUTHENTICATED" });
  const user = toSafeUser(row);

  if (!isFeatureEnabled("streaming", user.plan)) {
    return res.status(403).json({ error: "FEATURE_DISABLED" });
  }

  res.setHeader("Content-Type", "text/event-stream");
  res.setHeader("Cache-Control", "no-cache");
  res.setHeader("Connection", "keep-alive");
  res.flushHeaders?.();

  const heartbeat = setInterval(() => {
    res.write(": keepalive\n\n");
  }, 12000);

  try {
    const reqBody = {
      message: parsed.data.message,
      modelId: parsed.data.modelId,
      routerMode: parsed.data.routerMode as RouterMode | undefined,
      conversationHistory: parsed.data.history,
      projectId: parsed.data.projectId,
    };

    let model = getModelById(
      routeModel({
        message: parsed.data.message,
        mode: (parsed.data.routerMode as RouterMode) ?? "auto",
        userPlan: user.plan,
        manualModelId: parsed.data.modelId,
        premiumRemaining: (() => {
          const u = getUsage(user.id, user.plan);
          return Math.max(0, u.premiumLimit - u.premiumUsed);
        })(),
      }).modelId
    );

    for await (const chunk of streamAiResponse(user, reqBody)) {
      if (typeof chunk === "object" && chunk && "model" in chunk) {
        model = chunk.model ?? model;
        continue;
      }
      res.write(`data: ${JSON.stringify({ delta: chunk })}\n\n`);
    }
    if (model) {
      res.write(
        `data: ${JSON.stringify({
          meta: {
            modelId: model.id,
            displayName: model.displayName,
            provider: model.provider,
            providerModelId: model.providerModelId,
          },
        })}\n\n`
      );
    }
    res.write("data: [DONE]\n\n");
    res.end();
  } catch (e) {
    const msg = e instanceof Error ? e.message : "UNKNOWN";
    const code = e instanceof ProviderError ? e.code : "PROVIDER_ERROR";
    res.write(`data: ${JSON.stringify({ error: code, detail: msg.slice(0, 200) })}\n\n`);
    res.end();
  } finally {
    clearInterval(heartbeat);
  }
});

router.post("/ai/compare", requireAuth, async (req, res) => {
  const row = findUserById(req.session.userId!);
  if (!row) return res.status(401).json({ error: "UNAUTHENTICATED" });
  const user = toSafeUser(row);

  if (!isFeatureEnabled("model-compare", user.plan)) {
    return res.status(403).json({ error: "FEATURE_DISABLED" });
  }

  const schema = z.object({
    message: z.string().min(1).max(8000),
    modelIds: z.array(z.string()).min(2).max(4),
    systemPrompt: z.string().optional(),
  });
  const parsed = schema.safeParse(req.body);
  if (!parsed.success) return res.status(400).json({ error: "INVALID_INPUT" });

  try {
    const result = await compareModels(user, parsed.data);
    res.json(result);
  } catch (e) {
    handleAiError(e, res);
  }
});

function handleAiError(e: unknown, res: import("express").Response) {
  const msg = e instanceof Error ? e.message : "UNKNOWN";
  if (msg === "USAGE_LIMIT_REACHED") return res.status(429).json({ error: "USAGE_LIMIT_REACHED" });
  if (msg === "MODEL_NOT_FOUND" || msg === "MODEL_DISABLED" || msg === "MODEL_NOT_CHAT" || msg === "COMPARE_MODEL_COUNT") {
    return res.status(400).json({ error: msg });
  }
  if (e instanceof ProviderError) {
    const status = e.code === "RATE_LIMIT" ? 429 : e.code === "PROVIDER_UNAVAILABLE" ? 503 : 502;
    return res.status(status).json({
      error: e.code === "PROVIDER_UNAVAILABLE" ? "PROVIDER_UNAVAILABLE" : e.code === "RATE_LIMIT" ? "RATE_LIMIT" : "PROVIDER_ERROR",
      detail: msg.slice(0, 200),
    });
  }
  console.error("Unhandled AI error:", e);
  return res.status(500).json({ error: "INTERNAL_ERROR" });
}

export default router;
