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

const ollamaProvider = createOpenAiCompatibleProvider({
  name: "ollama",
  apiKeyEnv: "OLLAMA_API_KEY",
  baseUrl: process.env.OLLAMA_BASE_URL ?? "http://127.0.0.1:11434",
  costPer1kTokensCents: 0,
  authOptional: true,
  configuredEnv: "OLLAMA_BASE_URL",
});

/** OpenRouter — cloud access to Llama, Qwen, and other open-weight models with one key. */
const openrouterProvider = createOpenAiCompatibleProvider({
  name: "openrouter",
  apiKeyEnv: "OPENROUTER_API_KEY",
  baseUrl: process.env.OPENROUTER_BASE_URL ?? "https://openrouter.ai/api",
  costPer1kTokensCents: 0.2,
  extraHeaders: {
    "HTTP-Referer": process.env.FRONTEND_URL ?? "https://libraix.ai",
    "X-Title": "Libraix",
  },
});

const adapters: Record<string, AiProviderAdapter> = {
  openai: new OpenAiProvider(),
  deepseek: deepseekProvider,
  xai: xaiProvider,
  ollama: ollamaProvider,
  openrouter: openrouterProvider,
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
  return adapter.complete({ ...request, model });
}

/**
 * Hot path: skip healthCheck() so the first token is not delayed by a redundant
 * availability round-trip. Adapters already throw PROVIDER_UNAVAILABLE when
 * keys are missing.
 */
export async function* streamViaGateway(model: ModelDefinition, request: Omit<ProviderRequest, "model">): AsyncGenerator<string> {
  const adapter = getProviderAdapter(model.provider);
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
