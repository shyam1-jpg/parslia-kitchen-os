import { Router } from "express";
import { z } from "zod";
import { requireAuth } from "../middleware/auth.js";
import { findUserById, toSafeUser } from "../services/users.js";
import { respondWithAi } from "../services/ai.js";
import { getPublicCatalog, getModelsForPlan } from "../config/models.js";

const router = Router();

router.get("/catalog", (_req, res) => {
  res.json(getPublicCatalog());
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
  modelId: z.string(),
  conversationId: z.string().optional(),
  systemPrompt: z.string().max(8000).optional(),
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
      conversationHistory: parsed.data.history,
      systemPrompt: parsed.data.systemPrompt,
    });
    res.json(result);
  } catch (e) {
    const msg = e instanceof Error ? e.message : "UNKNOWN";
    if (msg === "USAGE_LIMIT_REACHED") return res.status(429).json({ error: "USAGE_LIMIT_REACHED" });
    if (msg === "MODEL_NOT_FOUND" || msg === "MODEL_DISABLED") {
      return res.status(400).json({ error: msg });
    }
    if (msg.startsWith("PROVIDER_ERROR")) {
      return res.status(502).json({ error: "PROVIDER_ERROR" });
    }
    throw e;
  }
});

export default router;
