import type { AiProviderAdapter, ProviderHealth, ProviderRequest, ProviderResponse } from "./types.js";
import { ProviderError } from "./types.js";
import { OpenAiProvider } from "./openai.js";
import { anthropicProvider, googleProvider, deepseekProvider } from "./stubs.js";
import type { ModelDefinition } from "../config/models.js";

const adapters: Record<string, AiProviderAdapter> = {
  openai: new OpenAiProvider(),
  anthropic: anthropicProvider,
  google: googleProvider,
  deepseek: deepseekProvider,
  meta: deepseekProvider,
  xai: deepseekProvider,
  perplexity: deepseekProvider,
};

export function getProviderAdapter(provider: string): AiProviderAdapter {
  const adapter = adapters[provider];
  if (!adapter) throw new ProviderError(`Unknown provider: ${provider}`, provider, "UNKNOWN_PROVIDER", false);
  return adapter;
}

export async function completeViaGateway(model: ModelDefinition, request: Omit<ProviderRequest, "model">): Promise<ProviderResponse> {
  const adapter = getProviderAdapter(model.provider);
  const health = await adapter.healthCheck();
  if (!health.available) {
    throw new ProviderError(
      `${model.provider} is currently unavailable`,
      model.provider,
      "PROVIDER_UNAVAILABLE",
      true
    );
  }
  return adapter.complete({ ...request, model });
}

export async function* streamViaGateway(model: ModelDefinition, request: Omit<ProviderRequest, "model">): AsyncGenerator<string> {
  const adapter = getProviderAdapter(model.provider);
  const health = await adapter.healthCheck();
  if (!health.available) {
    yield `[${model.provider} unavailable — configure API key on server]`;
    return;
  }
  if (adapter.stream) {
    yield* adapter.stream({ ...request, model });
    return;
  }
  const result = await adapter.complete({ ...request, model });
  yield result.content;
}

export async function getAllProviderHealth(): Promise<ProviderHealth[]> {
  const unique = [...new Set(Object.values(adapters))];
  return Promise.all(unique.map((a) => a.healthCheck()));
}
