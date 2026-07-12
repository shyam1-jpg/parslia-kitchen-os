import { getModelById } from "../config/models.js";
import { canSendMessage, recordMessageUsage } from "./usage.js";
import type { PlanTier } from "../config/models.js";
import type { SafeUser } from "./users.js";

const OPENAI_API_URL = "https://api.openai.com/v1/responses";

export interface AiRequest {
  message: string;
  modelId: string;
  conversationHistory?: { role: "user" | "assistant"; content: string }[];
  systemPrompt?: string;
}

export interface AiResponse {
  content: string;
  modelId: string;
  tokensUsed?: number;
}

export async function respondWithAi(user: SafeUser, req: AiRequest): Promise<AiResponse> {
  const model = getModelById(req.modelId);
  if (!model) throw new Error("MODEL_NOT_FOUND");
  if (!model.enabled) throw new Error("MODEL_DISABLED");
  if (!model.capabilities.chat) throw new Error("MODEL_NOT_CHAT");

  const isPremium = model.tier !== "free";
  if (!canSendMessage(user.id, user.plan, isPremium)) {
    throw new Error("USAGE_LIMIT_REACHED");
  }

  const apiKey = process.env.OPENAI_API_KEY;
  if (!apiKey) {
    // Dev fallback when no key configured
    recordMessageUsage(user.id, isPremium, 100, 0);
    return {
      content: `[Dev mode — set OPENAI_API_KEY on the server]\n\nYou asked: "${req.message.slice(0, 200)}"\n\nModel: ${model.displayName}`,
      modelId: model.id,
      tokensUsed: 100,
    };
  }

  const input = [
    ...(req.systemPrompt ? [{ role: "system" as const, content: req.systemPrompt }] : []),
    ...(req.conversationHistory ?? []),
    { role: "user" as const, content: req.message },
  ];

  const res = await fetch(OPENAI_API_URL, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${apiKey}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      model: model.providerModelId,
      input,
      stream: false,
    }),
  });

  if (!res.ok) {
    const err = await res.text();
    throw new Error(`PROVIDER_ERROR:${res.status}:${err.slice(0, 200)}`);
  }

  const data = (await res.json()) as {
    output_text?: string;
    usage?: { total_tokens?: number };
  };

  const tokens = data.usage?.total_tokens ?? 0;
  recordMessageUsage(user.id, isPremium, tokens, 0);

  return {
    content: data.output_text ?? "No response received.",
    modelId: model.id,
    tokensUsed: tokens,
  };
}

export async function* streamAiResponse(user: SafeUser, req: AiRequest): AsyncGenerator<string> {
  const result = await respondWithAi(user, req);
  yield result.content;
}
