import { getModelById } from "../config/models.js";
import type { RouterMode } from "../config/featureFlags.js";
import type { SafeUser } from "./users.js";
import {
  prepareTurnContext,
  resolveTurnModel,
  runTurnComplete,
  runTurnStream,
  tryGenerateChatImage,
} from "./orchestrator.js";

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
  router?: ReturnType<typeof import("./router.js").routeModel>;
  imageUrl?: string;
  type?: "text" | "image";
  sources?: Array<{ index: number; filename: string; excerpt: string; url?: string }>;
}

export async function respondWithAi(user: SafeUser, req: AiRequest): Promise<AiResponse> {
  return runTurnComplete(user, req);
}

export async function* streamAiResponse(
  user: SafeUser,
  req: AiRequest
): AsyncGenerator<
  string | { model: ReturnType<typeof getModelById> } | { image: AiResponse } | { sources: NonNullable<AiResponse["sources"]> }
> {
  yield* runTurnStream(user, req);
}

export { routeModel } from "./router.js";
export { tryGenerateChatImage };
