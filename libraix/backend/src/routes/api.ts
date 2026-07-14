import { Router } from "express";
import { z } from "zod";
import { v4 as uuid } from "uuid";
import { requireAuth } from "../middleware/auth.js";
import { getUsage } from "../services/usage.js";
import { findUserById, toSafeUser } from "../services/users.js";
import { respondWithAi, streamAiResponse, routeModel } from "../services/ai.js";
import { compareModels } from "../services/compare.js";
import { getPublicCatalog, listDisplayModelsForPlan, getModelsForPlan, getModelById } from "../config/models.js";
import { getPublicFeatures, ROUTER_MODES, isFeatureEnabled, type RouterMode } from "../config/featureFlags.js";
import { getAllProviderHealth } from "../providers/gateway.js";
import { ProviderError } from "../providers/types.js";
import { getPublicRuntimeConfig } from "../services/siteConfig.js";
import { getCompanyInfo } from "../config/company.js";
import { db } from "../db/schema.js";
import { generateImage, getImageUsage } from "../services/images.js";
import { listConfiguredProviders } from "../providers/config.js";
import { getCached, setCached } from "../services/cache.js";
import { getSavedLocation, resolveLocationFromRequest, saveUserLocation } from "../services/location.js";
import { getUserPreferences } from "../services/memory.js";

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
  const cached = getCached<ReturnType<typeof getPublicCatalog>>("catalog:public");
  if (cached) return res.json(cached);
  const catalog = getPublicCatalog();
  setCached("catalog:public", catalog, 60_000);
  res.json(catalog);
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
  res.json({ models: listDisplayModelsForPlan(user.plan) });
});

router.get("/providers/status", requireAuth, (_req, res) => {
  res.json({
    configured: listConfiguredProviders(),
    note: "Add missing API keys on Render → libraix-api → Environment, then redeploy.",
  });
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
      systemPrompt: parsed.data.systemPrompt,
      projectId: parsed.data.projectId,
      useMemory: parsed.data.useMemory,
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

    let imageMeta: { imageUrl: string; type: string } | null = null;
    let sourcesMeta: Array<{ index: number; filename: string; excerpt: string; url?: string }> | undefined;
    let weatherCardMeta: unknown;

    for await (const chunk of streamAiResponse(user, reqBody)) {
      if (typeof chunk === "object" && chunk && "image" in chunk) {
        const img = chunk.image;
        model = getModelById(img.modelId) ?? model;
        imageMeta = { imageUrl: img.imageUrl!, type: "image" };
        continue;
      }
      if (typeof chunk === "object" && chunk && "weatherCard" in chunk) {
        weatherCardMeta = chunk.weatherCard;
        // Push card immediately so the UI can animate before text finishes
        res.write(`data: ${JSON.stringify({ meta: { weatherCard: weatherCardMeta } })}\n\n`);
        continue;
      }
      if (typeof chunk === "object" && chunk && "sources" in chunk) {
        sourcesMeta = chunk.sources;
        continue;
      }
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
            displayName: imageMeta ? "Libraix Image (DALL·E 3)" : model.displayName,
            provider: imageMeta ? "openai" : model.provider,
            providerModelId: imageMeta ? "dall-e-3" : model.providerModelId,
            ...(imageMeta ?? {}),
            ...(sourcesMeta ? { sources: sourcesMeta } : {}),
            ...(weatherCardMeta ? { weatherCard: weatherCardMeta } : {}),
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
  if (msg === "USAGE_LIMIT_REACHED" || msg === "IMAGE_LIMIT_REACHED") return res.status(429).json({ error: msg });
  if (msg === "IMAGE_MODEL_UNAVAILABLE") return res.status(503).json({ error: msg });
  if (msg === "MODEL_NOT_FOUND" || msg === "MODEL_DISABLED" || msg === "MODEL_NOT_CHAT" || msg === "COMPARE_MODEL_COUNT") {
    return res.status(400).json({ error: msg });
  }
  if (msg.startsWith("MODELS_UNAVAILABLE:")) {
    return res.status(400).json({
      error: "MODELS_UNAVAILABLE",
      detail: msg.slice("MODELS_UNAVAILABLE:".length).replace(/,/g, ", "),
    });
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

router.post("/images/generate", requireAuth, async (req, res) => {
  const row = findUserById(req.session.userId!);
  if (!row) return res.status(401).json({ error: "UNAUTHENTICATED" });
  const user = toSafeUser(row);

  if (!isFeatureEnabled("image-studio", user.plan)) {
    return res.status(403).json({ error: "FEATURE_DISABLED" });
  }

  const schema = z.object({
    prompt: z.string().min(1).max(4000),
    size: z.enum(["1024x1024", "1792x1024", "1024x1792"]).optional(),
    quality: z.enum(["standard", "hd"]).optional(),
    speed: z.enum(["fast", "quality"]).optional(),
  });
  const parsed = schema.safeParse(req.body);
  if (!parsed.success) return res.status(400).json({ error: "INVALID_INPUT" });

  try {
    const result = await generateImage(user, parsed.data);
    res.json(result);
  } catch (e) {
    const msg = e instanceof Error ? e.message : "UNKNOWN";
    if (msg === "IMAGE_LIMIT_REACHED") return res.status(429).json({ error: "IMAGE_LIMIT_REACHED" });
    if (msg === "IMAGE_MODEL_UNAVAILABLE") return res.status(503).json({ error: "IMAGE_MODEL_UNAVAILABLE" });
    handleAiError(e, res);
  }
});

router.get("/images/usage", requireAuth, (req, res) => {
  const row = findUserById(req.session.userId!);
  if (!row) return res.status(401).json({ error: "UNAUTHENTICATED" });
  res.json(getImageUsage(toSafeUser(row)));
});

/** Detect location from login IP (and refresh cache). Used for local weather defaults. */
router.get("/location", requireAuth, async (req, res) => {
  const userId = req.session.userId!;
  const prefs = getUserPreferences(userId);
  if (prefs.privacyMode === "strict") {
    return res.json({ location: getSavedLocation(userId), note: "IP auto-locate is off in privacy mode." });
  }
  const force = req.query.refresh === "1";
  try {
    const location = await resolveLocationFromRequest(userId, req, { forceRefresh: force, save: true });
    res.json({ location, auto: true });
  } catch {
    res.json({ location: getSavedLocation(userId), auto: false });
  }
});

router.post("/location", requireAuth, (req, res) => {
  const schema = z.object({
    city: z.string().min(1).max(100),
    region: z.string().max(100).optional().nullable(),
    country: z.string().max(100).optional(),
    latitude: z.number().min(-90).max(90),
    longitude: z.number().min(-180).max(180),
    timezone: z.string().max(80).optional().nullable(),
    source: z.enum(["browser", "manual"]).default("manual"),
  });
  const parsed = schema.safeParse(req.body);
  if (!parsed.success) return res.status(400).json({ error: "INVALID_INPUT" });
  const location = saveUserLocation(req.session.userId!, parsed.data);
  res.json({ location });
});

export default router;
