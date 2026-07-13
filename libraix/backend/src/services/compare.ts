import { getModelById, getModelsForPlan } from "../config/models.js";
import { completeViaGateway } from "../providers/gateway.js";
import { canSendMessage, recordMessageUsage } from "./usage.js";
import type { SafeUser } from "./users.js";

export interface CompareRequest {
  message: string;
  modelIds: string[];
  systemPrompt?: string;
}

export interface CompareResultItem {
  modelId: string;
  displayName: string;
  content: string;
  responseTimeMs: number;
  estimatedCostCents: number;
  tokensUsed: number;
  error?: string;
}

export interface CompareResult {
  prompt: string;
  results: CompareResultItem[];
  judgeSummary?: string;
}

export async function compareModels(user: SafeUser, req: CompareRequest): Promise<CompareResult> {
  if (req.modelIds.length < 2 || req.modelIds.length > 4) {
    throw new Error("COMPARE_MODEL_COUNT");
  }

  const available = getModelsForPlan(user.plan).filter((m) => m.capabilities.chat);
  const models = req.modelIds.map((id) => getModelById(id));
  const missing = req.modelIds.filter((id) => !getModelById(id));
  if (missing.length) {
    throw new Error(`MODELS_UNAVAILABLE:${missing.join(",")}`);
  }

  for (const model of models) {
    if (!available.some((m) => m.id === model!.id)) throw new Error("MODEL_NOT_AUTHORIZED");
  }

  const results: CompareResultItem[] = await Promise.all(
    models.map(async (model) => {
      const isPremium = model!.tier !== "free";
      if (!canSendMessage(user.id, user.plan, isPremium)) {
        return {
          modelId: model!.id,
          displayName: model!.displayName,
          content: "",
          responseTimeMs: 0,
          estimatedCostCents: 0,
          tokensUsed: 0,
          error: "USAGE_LIMIT_REACHED",
        };
      }

      try {
        const response = await completeViaGateway(model!, {
          messages: [
            ...(req.systemPrompt ? [{ role: "system" as const, content: req.systemPrompt }] : []),
            { role: "user" as const, content: req.message },
          ],
        });
        recordMessageUsage(user.id, isPremium, response.tokensUsed, response.estimatedCostCents);
        return {
          modelId: model!.id,
          displayName: model!.displayName,
          content: response.content,
          responseTimeMs: response.providerLatencyMs,
          estimatedCostCents: response.estimatedCostCents,
          tokensUsed: response.tokensUsed,
        };
      } catch (e) {
        return {
          modelId: model!.id,
          displayName: model!.displayName,
          content: "",
          responseTimeMs: 0,
          estimatedCostCents: 0,
          tokensUsed: 0,
          error: e instanceof Error ? e.message : "FAILED",
        };
      }
    })
  );

  const judgeSummary = await judgeResponses(user, req.message, results.filter((r) => !r.error));

  return { prompt: req.message, results, judgeSummary };
}

async function judgeResponses(user: SafeUser, prompt: string, results: CompareResultItem[]): Promise<string | undefined> {
  if (results.length < 2) return undefined;
  const judgeModel = getModelById("libraix-smart");
  if (!judgeModel || !canSendMessage(user.id, user.plan, true)) return undefined;

  const comparison = results.map((r) => `### ${r.displayName}\n${r.content.slice(0, 1500)}`).join("\n\n");
  try {
    const response = await completeViaGateway(judgeModel, {
      messages: [
        {
          role: "system",
          content: "You are an impartial evaluator. Compare AI responses on accuracy, completeness, clarity and instruction-following. Do not favour any model by name. Be concise.",
        },
        { role: "user", content: `Prompt: ${prompt}\n\n${comparison}\n\nProvide a brief evaluation.` },
      ],
    });
    recordMessageUsage(user.id, true, response.tokensUsed, response.estimatedCostCents);
    return response.content;
  } catch {
    return undefined;
  }
}
