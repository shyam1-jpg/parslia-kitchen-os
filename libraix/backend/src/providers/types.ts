import type { ModelDefinition } from "../config/models.js";

export interface ProviderMessage {
  role: "system" | "user" | "assistant";
  content: string;
}

export interface ProviderRequest {
  model: ModelDefinition;
  messages: ProviderMessage[];
  stream?: boolean;
  tools?: string[];
}

export interface ProviderResponse {
  content: string;
  tokensUsed: number;
  estimatedCostCents: number;
  providerLatencyMs: number;
}

export interface ProviderHealth {
  provider: string;
  available: boolean;
  lastChecked: string;
  error?: string;
}

export interface AiProviderAdapter {
  readonly name: string;
  healthCheck(): Promise<ProviderHealth>;
  complete(request: ProviderRequest): Promise<ProviderResponse>;
  stream?(request: ProviderRequest): AsyncGenerator<string>;
}

export class ProviderError extends Error {
  constructor(
    message: string,
    public readonly provider: string,
    public readonly code: string,
    public readonly retryable: boolean
  ) {
    super(message);
  }
}
