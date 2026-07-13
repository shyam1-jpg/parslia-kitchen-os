import { getModelById } from "../config/models.js";
import { completeWithFallback, streamWithFallback } from "../providers/resilience.js";
import { canSendMessage, getUsage, recordMessageUsage } from "./usage.js";
import { routeModel } from "./router.js";
import { getMemoryContext } from "./memory.js";
import { getProjectDocumentContext } from "./projects.js";
import { buildWebSearchContext } from "./research.js";
import { detectImageRequest } from "./imageIntent.js";
import { generateImage } from "./images.js";
import { isFeatureEnabled } from "../config/featureFlags.js";
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
- Do not mention that you are an AI unless asked. Focus on delivering value.
- When users ask you to generate, draw, or create an image, the Libraix system handles image creation automatically — do not tell them to use Google Images or external sites.`;

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
  imageUrl?: string;
  type?: "text" | "image";
  sources?: Array<{ index: number; filename: string; excerpt: string }>;
}

function buildSystemMessages(
  req: AiRequest,
  userId: string,
  webContext?: string | null,
  projectDocContext?: string | null
) {
  const memoryCtx = req.useMemory !== false ? getMemoryContext(userId, req.projectId) : "";
  const projectCtx = projectDocContext ?? "";
  const systemParts = [DEFAULT_SYSTEM_PROMPT, req.systemPrompt, projectCtx, memoryCtx, webContext].filter(Boolean);
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
      const fallback = getModelById("libraix-fast") ?? getModelById("libraix-deepseek");
      if (!fallback || !canSendMessage(user.id, user.plan, false)) {
        throw new Error("USAGE_LIMIT_REACHED");
      }
      model = fallback;
      isPremium = false;
    } else {
      throw new Error("USAGE_LIMIT_REACHED");
    }
  }

  const fallback = getModelById("libraix-fast") ?? getModelById("libraix-deepseek");
  return { model, router, isPremium, fallback };
}

async function tryGenerateChatImage(user: SafeUser, message: string): Promise<AiResponse | null> {
  const prompt = detectImageRequest(message);
  if (!prompt || !isFeatureEnabled("image-studio", user.plan)) return null;

  const image = await generateImage(user, { prompt, speed: "fast" });
  const caption = image.revisedPrompt ? `*${image.revisedPrompt}*` : `*${prompt}*`;
  return {
    content: `![Generated image](${image.url})\n\nHere's your image.\n\n${caption}`,
    modelId: image.modelId,
    displayName: image.displayName,
    provider: image.provider,
    providerModelId: "dall-e-3",
    imageUrl: image.url,
    type: "image",
  };
}

export async function respondWithAi(user: SafeUser, req: AiRequest): Promise<AiResponse> {
  const imageResult = await tryGenerateChatImage(user, req.message);
  if (imageResult) return imageResult;

  const { model, router, isPremium, fallback } = resolveModel(user, req);

  const webContext =
    req.routerMode === "deep-research" ? await buildWebSearchContext(req.message) : null;

  const docBundle = req.projectId
    ? getProjectDocumentContext(user.id, req.projectId, req.message)
    : { context: "", sources: [] as AiResponse["sources"] };

  const messages = [
    ...buildSystemMessages(req, user.id, webContext, docBundle.context || null),
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
    sources: docBundle.sources?.length ? docBundle.sources : undefined,
  };
}

export async function* streamAiResponse(
  user: SafeUser,
  req: AiRequest
): AsyncGenerator<
  string | { model: ReturnType<typeof getModelById> } | { image: AiResponse } | { sources: NonNullable<AiResponse["sources"]> }
> {
  const imagePrompt = detectImageRequest(req.message);
  if (imagePrompt && isFeatureEnabled("image-studio", user.plan)) {
    yield "Rendering your image…\n\n";
    try {
      const imageResult = await tryGenerateChatImage(user, req.message);
      if (imageResult) {
        yield imageResult.content;
        yield { image: imageResult };
        return;
      }
    } catch (e) {
      const msg = e instanceof Error ? e.message : "Image generation failed";
      yield `Could not generate image: ${msg}\n\nTry **Image Studio** from the sidebar, or check that OPENAI_API_KEY is set on the server.`;
      return;
    }
  }

  const { model, fallback } = resolveModel(user, req);

  const webContext =
    req.routerMode === "deep-research" ? await buildWebSearchContext(req.message) : null;

  const docBundle = req.projectId
    ? getProjectDocumentContext(user.id, req.projectId, req.message)
    : { context: "", sources: [] as NonNullable<AiResponse["sources"]> };

  const messages = [
    ...buildSystemMessages(req, user.id, webContext, docBundle.context || null),
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
  if (docBundle.sources?.length) yield { sources: docBundle.sources };
  yield { model: usedModel };
  const usedPremium = usedModel.tier !== "free";
  recordMessageUsage(user.id, usedPremium, Math.ceil(totalLen / 4), 0);
}

export { routeModel };
