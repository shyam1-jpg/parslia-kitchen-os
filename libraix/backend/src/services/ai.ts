import { getModelById } from "../config/models.js";
import { completeViaGateway, streamViaGateway } from "../providers/gateway.js";
import { canSendMessage, recordMessageUsage } from "./usage.js";
import { routeModel } from "./router.js";
import { getMemoryContext } from "./memory.js";
import { getProjectContext } from "./projects.js";
import type { RouterMode } from "../config/featureFlags.js";
import type { SafeUser } from "./users.js";

const DEFAULT_SYSTEM_PROMPT = "You are Libraix, an expert AI assistant built into the Libraix workspace. Give accurate, thoughtful, well-structured answers. Match your depth to the question: concise for simple questions, thorough with clear step-by-step reasoning for complex ones. Use Markdown formatting (headings, bullet points, numbered steps, code blocks) whenever it makes the answer clearer. Be warm and direct, admit uncertainty when you are not sure, and ask a clarifying question when the request is ambiguous.";

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
  tokensUsed?: number;
  router?: ReturnType<typeof routeModel>;
}

export async function respondWithAi(user: SafeUser, req: AiRequest): Promise<AiResponse> {
  const router = routeModel({
    message: req.message,
    mode: req.routerMode ?? "auto",
    userPlan: user.plan,
    manualModelId: req.modelId,
  });

  const model = getModelById(router.modelId);
  if (!model) throw new Error("MODEL_NOT_FOUND");
  if (!model.enabled) throw new Error("MODEL_DISABLED");
  if (!model.capabilities.chat) throw new Error("MODEL_NOT_CHAT");

  const isPremium = model.tier !== "free";
  if (!canSendMessage(user.id, user.plan, isPremium)) {
    throw new Error("USAGE_LIMIT_REACHED");
  }

  const memoryCtx = req.useMemory !== false ? getMemoryContext(user.id, req.projectId) : "";
  const projectCtx = req.projectId ? getProjectContext(user.id, req.projectId) : "";
  const systemParts = [DEFAULT_SYSTEM_PROMPT, req.systemPrompt, projectCtx, memoryCtx].filter(Boolean);

  const messages = [
    ...(systemParts.length ? [{ role: "system" as const, content: systemParts.join("\n\n") }] : []),
    ...(req.conversationHistory ?? []),
    { role: "user" as const, content: req.message },
  ];

  const response = await completeViaGateway(model, { messages });
  recordMessageUsage(user.id, isPremium, response.tokensUsed, response.estimatedCostCents);

  return {
    content: response.content,
    modelId: model.id,
    tokensUsed: response.tokensUsed,
    router,
  };
}

export async function* streamAiResponse(user: SafeUser, req: AiRequest): AsyncGenerator<string> {
  const router = routeModel({
    message: req.message,
    mode: req.routerMode ?? "auto",
    userPlan: user.plan,
    manualModelId: req.modelId,
  });

  const model = getModelById(router.modelId);
  if (!model) throw new Error("MODEL_NOT_FOUND");

  const isPremium = model.tier !== "free";
  if (!canSendMessage(user.id, user.plan, isPremium)) {
    throw new Error("USAGE_LIMIT_REACHED");
  }

  const memoryCtx = req.useMemory !== false ? getMemoryContext(user.id, req.projectId) : "";
  const messages = [
    { role: "system" as const, content: memoryCtx ? DEFAULT_SYSTEM_PROMPT + "\n\n" + memoryCtx : DEFAULT_SYSTEM_PROMPT },
    ...(req.conversationHistory ?? []),
    { role: "user" as const, content: req.message },
  ];

  let totalLen = 0;
  for await (const chunk of streamViaGateway(model, { messages, stream: true })) {
    totalLen += chunk.length;
    yield chunk;
  }
  recordMessageUsage(user.id, isPremium, Math.ceil(totalLen / 4), 0);
}

export { routeModel };
