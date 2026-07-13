import type { AiProviderAdapter, ProviderHealth, ProviderRequest, ProviderResponse } from "./types.js";
import { ProviderError } from "./types.js";
import { OpenAiProvider } from "./openai.js";
import { AnthropicProvider } from "./anthropic.js";
import { GoogleProvider } from "./google.js";
import { createOpenAiCompatibleProvider } from "./openaiCompatible.js";
import { metaProvider, perplexityProvider } from "./stubs.js";
import type { ModelDefinition } from "../config/models.js";

const deepseekProvider = createOpenAiCompatibleProvider({
  name: "deepseek",
  apiKeyEnv: "DEEPSEEK_API_KEY",
  baseUrl: process.env.DEEPSEEK_BASE_URL ?? "https://api.deepseek.com",
  costPer1kTokensCents: 0.14,
});

const xaiProvider = createOpenAiCompatibleProvider({
  name: "xai",
  apiKeyEnv: "XAI_API_KEY",
  baseUrl: process.env.XAI_BASE_URL ?? "https://api.x.ai",
  costPer1kTokensCents: 0.5,
});

const adapters: Record<string, AiProviderAdapter> = {
  openai: new OpenAiProvider(),
  deepseek: deepseekProvider,
  xai: xaiProvider,
  anthropic: new AnthropicProvider(),
  google: new GoogleProvider(),
  meta: metaProvider,
  perplexity: perplexityProvider,
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
      health.error ?? `${model.provider} is currently unavailable`,
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
    throw new ProviderError(
      health.error ?? `${model.provider} is currently unavailable`,
      model.provider,
      "PROVIDER_UNAVAILABLE",
      true
    );
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
