import type { AiProviderAdapter, ProviderHealth, ProviderRequest, ProviderResponse } from "./types.js";

function stubProvider(name: string): AiProviderAdapter {
  return {
    name,
    async healthCheck(): Promise<ProviderHealth> {
      return {
        provider: name,
        available: false,
        lastChecked: new Date().toISOString(),
        error: "Not yet supported",
      };
    },
    async complete(request: ProviderRequest): Promise<ProviderResponse> {
      return {
        content: `[${name} is not yet available on Libraix]\n\nRequested model: ${request.model.displayName}`,
        tokensUsed: 0,
        estimatedCostCents: 0,
        providerLatencyMs: 0,
      };
    },
  };
}

export const metaProvider = stubProvider("meta");
export const perplexityProvider = stubProvider("perplexity");
