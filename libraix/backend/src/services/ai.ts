import { getModelById } from "../config/models.js";
import { completeWithFallback, streamWithFallback } from "../providers/resilience.js";
import { canSendMessage, getUsage, recordMessageUsage } from "./usage.js";
import { routeModel } from "./router.js";
import { getMemoryContext } from "./memory.js";
import { getProjectContext } from "./projects.js";
import type { RouterMode } from "../config/featureFlags.js";
import type { SafeUser } from "./users.js";

const DEFAULT_SYSTEM_PROMPT = `You are Libraix, a capable AI assistant in the Libraix workspace. Your answers should feel polished and professional — like ChatGPT or Claude.

Guidelines:
- Write in clear, natural language. Be helpful, thoughtful, and direct.
- Match depth to the question: brief for simple asks; thorough with structure for complex ones.
- Always use Markdown when it helps: headings (##), bullet lists, numbered steps, **bold** for key terms, and fenced code blocks with language tags for code.
- For explanations, break ideas into logical sections. For how-to tasks, use numbered steps.
- For code, provide complete, working examples with brief comments where useful.
- Be honest about uncertainty. Ask one clarifying question when the request is ambiguous.
- Do not mention that you are an AI unless asked. Focus on delivering value.`;

export interface AiRequest {
  message: string;
  modelId?: string;
  routerMode?: RouterMode;
  conversationHistory?: { role: "user" | "assistant"; content: string }[];
  systemPrompt?: string;
  projectId?: string;
  useMemory?: boolean;
}

export interface AiResponse {
  content: string;
  modelId: string;
  displayName: string;
  provider: string;
  providerModelId: string;
  tokensUsed?: number;
  router?: ReturnType<typeof routeModel>;
}

function buildSystemMessages(req: AiRequest, userId: string) {
  const memoryCtx = req.useMemory !== false ? getMemoryContext(userId, req.projectId) : "";
  const projectCtx = req.projectId ? getProjectContext(userId, req.projectId) : "";
  const systemParts = [DEFAULT_SYSTEM_PROMPT, req.systemPrompt, projectCtx, memoryCtx].filter(Boolean);
  return systemParts.length ? [{ role: "system" as const, content: systemParts.join("\n\n") }] : [];
}

function resolveModel(user: SafeUser, req: AiRequest) {
  const usage = getUsage(user.id, user.plan);
  const premiumRemaining = Math.max(0, usage.premiumLimit - usage.premiumUsed);

  const router = routeModel({
    message: req.message,
    mode: req.routerMode ?? "auto",
    userPlan: user.plan,
    manualModelId: req.modelId,
    premiumRemaining,
  });

  let model = getModelById(router.modelId);
  if (!model) throw new Error("MODEL_NOT_FOUND");
  if (!model.enabled) throw new Error("MODEL_DISABLED");
  if (!model.capabilities.chat) throw new Error("MODEL_NOT_CHAT");

  let isPremium = model.tier !== "free";
  if (!canSendMessage(user.id, user.plan, isPremium)) {
    if (isPremium) {
      const fallback = getModelById("libraix-fast");
      if (!fallback || !canSendMessage(user.id, user.plan, false)) {
        throw new Error("USAGE_LIMIT_REACHED");
      }
      model = fallback;
      isPremium = false;
    } else {
      throw new Error("USAGE_LIMIT_REACHED");
    }
  }

  return { model, router, isPremium, fallback: getModelById("libraix-fast") };
}

export async function respondWithAi(user: SafeUser, req: AiRequest): Promise<AiResponse> {
  const { model, router, isPremium, fallback } = resolveModel(user, req);

  const messages = [
    ...buildSystemMessages(req, user.id),
    ...(req.conversationHistory ?? []),
    { role: "user" as const, content: req.message },
  ];

  const { response, model: usedModel } = await completeWithFallback(model, fallback, messages);
  const usedPremium = usedModel.tier !== "free";
  recordMessageUsage(user.id, usedPremium, response.tokensUsed, response.estimatedCostCents);

  return {
    content: response.content,
    modelId: usedModel.id,
    displayName: usedModel.displayName,
    provider: usedModel.provider,
    providerModelId: usedModel.providerModelId,
    tokensUsed: response.tokensUsed,
    router,
  };
}

export async function* streamAiResponse(user: SafeUser, req: AiRequest): AsyncGenerator<string | { model: ReturnType<typeof getModelById> }> {
  const { model, fallback } = resolveModel(user, req);

  const messages = [
    ...buildSystemMessages(req, user.id),
    ...(req.conversationHistory ?? []),
    { role: "user" as const, content: req.message },
  ];

  let totalLen = 0;
  let usedModel = model;
  for await (const item of streamWithFallback(model, fallback, messages)) {
    usedModel = item.model;
    totalLen += item.chunk.length;
    yield item.chunk;
  }
  yield { model: usedModel };
  const usedPremium = usedModel.tier !== "free";
  recordMessageUsage(user.id, usedPremium, Math.ceil(totalLen / 4), 0);
}

export { routeModel };
