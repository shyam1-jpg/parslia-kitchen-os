import type { AiProviderAdapter, ProviderHealth, ProviderRequest, ProviderResponse } from "./types.js";
import { ProviderError } from "./types.js";
import { parseOpenAiCompatibleError } from "./openaiCompatible.js";

const ANTHROPIC_URL = "https://api.anthropic.com/v1/messages";
const VERSION = "2023-06-01";

function splitMessages(messages: ProviderRequest["messages"]) {
  const systemParts = messages.filter((m) => m.role === "system").map((m) => m.content);
  const chatMessages = messages
    .filter((m) => m.role !== "system")
    .map((m) => ({ role: m.role as "user" | "assistant", content: m.content }));
  return {
    system: systemParts.length ? systemParts.join("\n\n") : undefined,
    messages: chatMessages,
  };
}

export class AnthropicProvider implements AiProviderAdapter {
  readonly name = "anthropic";

  private get apiKey() {
    return process.env.ANTHROPIC_API_KEY?.trim() ?? "";
  }

  async healthCheck(): Promise<ProviderHealth> {
    return {
      provider: this.name,
      available: Boolean(this.apiKey),
      lastChecked: new Date().toISOString(),
      error: this.apiKey ? undefined : "Set ANTHROPIC_API_KEY on the server",
    };
  }

  async complete(request: ProviderRequest): Promise<ProviderResponse> {
    const start = Date.now();
    if (!this.apiKey) {
      throw new ProviderError("Anthropic API key not configured", this.name, "PROVIDER_UNAVAILABLE", false);
    }

    const { system, messages } = splitMessages(request.messages);
    const body: Record<string, unknown> = {
      model: request.model.providerModelId,
      max_tokens: Number(process.env.OPENAI_MAX_TOKENS ?? 4096),
      messages,
    };
    if (system) body.system = system;

    const res = await fetch(ANTHROPIC_URL, {
      method: "POST",
      headers: {
        "x-api-key": this.apiKey,
        "anthropic-version": VERSION,
        "Content-Type": "application/json",
      },
      body: JSON.stringify(body),
      signal: AbortSignal.timeout(120_000),
    });

    if (!res.ok) {
      const err = await res.text();
      const detail = parseOpenAiCompatibleError(err);
      const code = res.status === 429 ? "RATE_LIMIT" : res.status >= 500 ? "PROVIDER_UNAVAILABLE" : "PROVIDER_ERROR";
      throw new ProviderError(detail, this.name, code, res.status >= 500 || res.status === 429);
    }

    const data = (await res.json()) as {
      content?: { type: string; text?: string }[];
      usage?: { input_tokens?: number; output_tokens?: number };
    };
    const text = data.content?.find((c) => c.type === "text")?.text ?? "No response received.";
    const tokens = (data.usage?.input_tokens ?? 0) + (data.usage?.output_tokens ?? 0);

    return {
      content: text,
      tokensUsed: tokens,
      estimatedCostCents: Math.ceil(tokens * 0.3 / 1000),
      providerLatencyMs: Date.now() - start,
    };
  }

  async *stream(request: ProviderRequest): AsyncGenerator<string> {
    if (!this.apiKey) {
      throw new ProviderError("Anthropic API key not configured", this.name, "PROVIDER_UNAVAILABLE", false);
    }

    const { system, messages } = splitMessages(request.messages);
    const body: Record<string, unknown> = {
      model: request.model.providerModelId,
      max_tokens: Number(process.env.OPENAI_MAX_TOKENS ?? 4096),
      messages,
      stream: true,
    };
    if (system) body.system = system;

    const res = await fetch(ANTHROPIC_URL, {
      method: "POST",
      headers: {
        "x-api-key": this.apiKey,
        "anthropic-version": VERSION,
        "Content-Type": "application/json",
      },
      body: JSON.stringify(body),
      signal: AbortSignal.timeout(120_000),
    });

    if (!res.ok || !res.body) {
      const result = await this.complete(request);
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
          const parsed = JSON.parse(payload) as { type?: string; delta?: { type?: string; text?: string } };
          if (parsed.type === "content_block_delta" && parsed.delta?.text) {
            yield parsed.delta.text;
          }
        } catch {
          /* skip */
        }
      }
    }
  }
}
