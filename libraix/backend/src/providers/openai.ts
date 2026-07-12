import type { AiProviderAdapter, ProviderHealth, ProviderRequest, ProviderResponse } from "./types.js";
import { ProviderError } from "./types.js";

const OPENAI_API_URL = "https://api.openai.com/v1/responses";

export class OpenAiProvider implements AiProviderAdapter {
  readonly name = "openai";

  private get apiKey() {
    return process.env.OPENAI_API_KEY ?? "";
  }

  async healthCheck(): Promise<ProviderHealth> {
    if (!this.apiKey) {
      return { provider: this.name, available: false, lastChecked: new Date().toISOString(), error: "API key not configured" };
    }
    return { provider: this.name, available: true, lastChecked: new Date().toISOString() };
  }

  async complete(request: ProviderRequest): Promise<ProviderResponse> {
    const start = Date.now();
    if (!this.apiKey) {
      return {
        content: `[Dev mode — set OPENAI_API_KEY]\n\nModel: ${request.model.displayName}`,
        tokensUsed: 50,
        estimatedCostCents: 0,
        providerLatencyMs: Date.now() - start,
      };
    }

    const res = await fetch(OPENAI_API_URL, {
      method: "POST",
      headers: { Authorization: `Bearer ${this.apiKey}`, "Content-Type": "application/json" },
      body: JSON.stringify({
        model: request.model.providerModelId,
        input: request.messages,
        stream: false,
      }),
      signal: AbortSignal.timeout(120_000),
    });

    if (!res.ok) {
      const err = await res.text();
      throw new ProviderError(err.slice(0, 300), this.name, `HTTP_${res.status}`, res.status >= 500);
    }

    const data = (await res.json()) as { output_text?: string; usage?: { total_tokens?: number } };
    const tokens = data.usage?.total_tokens ?? 0;

    return {
      content: data.output_text ?? "No response received.",
      tokensUsed: tokens,
      estimatedCostCents: Math.ceil(tokens * 0.002),
      providerLatencyMs: Date.now() - start,
    };
  }

  async *stream(request: ProviderRequest): AsyncGenerator<string> {
    if (!this.apiKey) {
      yield `[Dev mode — set OPENAI_API_KEY]\n\nModel: ${request.model.displayName}`;
      return;
    }

    const res = await fetch(OPENAI_API_URL, {
      method: "POST",
      headers: { Authorization: `Bearer ${this.apiKey}`, "Content-Type": "application/json" },
      body: JSON.stringify({
        model: request.model.providerModelId,
        input: request.messages,
        stream: true,
      }),
      signal: AbortSignal.timeout(120_000),
    });

    if (!res.ok || !res.body) {
      const result = await this.complete({ ...request, stream: false });
      yield result.content;
      return;
    }

    const reader = res.body.getReader();
    const decoder = new TextDecoder();
    let buffer = "";

    while (true) {
      const { done, value } = await reader.read();
      if (done) break;
      buffer += decoder.decode(value, { stream: true });
      const lines = buffer.split("\n");
      buffer = lines.pop() ?? "";
      for (const line of lines) {
        if (!line.startsWith("data: ")) continue;
        const payload = line.slice(6).trim();
        if (payload === "[DONE]") return;
        try {
          const parsed = JSON.parse(payload) as { type?: string; delta?: string; output_text?: string };
          if (parsed.delta) yield parsed.delta;
          else if (parsed.output_text) yield parsed.output_text;
        } catch {
          /* skip malformed chunks */
        }
      }
    }
  }
}
