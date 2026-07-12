import type { AiProviderAdapter, ProviderHealth, ProviderRequest, ProviderResponse } from "./types.js";

function stubProvider(name: string): AiProviderAdapter {
  return {
    name,
    async healthCheck(): Promise<ProviderHealth> {
      const key = process.env[`${name.toUpperCase()}_API_KEY`];
      return {
        provider: name,
        available: Boolean(key),
        lastChecked: new Date().toISOString(),
        error: key ? undefined : "API key not configured",
      };
    },
    async complete(request: ProviderRequest): Promise<ProviderResponse> {
      return {
        content: `[${name} provider not yet connected in production]\n\nRequested model: ${request.model.displayName}`,
        tokensUsed: 0,
        estimatedCostCents: 0,
        providerLatencyMs: 0,
      };
    },
  };
}

export const anthropicProvider = stubProvider("anthropic");
export const googleProvider = stubProvider("google");
export const deepseekProvider = stubProvider("deepseek");
