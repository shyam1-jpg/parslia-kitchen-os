import type { AiProviderAdapter, ProviderHealth, ProviderRequest, ProviderResponse } from "./types.js";
import { ProviderError } from "./types.js";

const CHAT_COMPLETIONS_URL = "https://api.openai.com/v1/chat/completions";

function parseOpenAiError(raw: string): string {
  try {
    const parsed = JSON.parse(raw) as { error?: { message?: string } };
    if (parsed.error?.message) return parsed.error.message;
  } catch {
    /* use raw */
  }
  return raw.slice(0, 300);
}

function buildOpenAiBody(request: ProviderRequest, stream: boolean) {
  const modelId = request.model.providerModelId;
  const isReasoning = /^o\d/i.test(modelId);

  const body: Record<string, unknown> = {
    model: modelId,
    messages: request.messages,
    stream,
  };

  const deepAstrology = request.messages.some(
    (m) => m.role === "system" && typeof m.content === "string" && /Libraix Astrology|DEEP, ADVANCED readings/i.test(m.content)
  );
  const tokenCap = Number(process.env.OPENAI_MAX_TOKENS ?? (deepAstrology ? 8192 : 4096));

  if (isReasoning) {
    body.max_completion_tokens = tokenCap;
  } else {
    body.max_tokens = tokenCap;
    body.temperature = Number(process.env.OPENAI_TEMPERATURE ?? (deepAstrology ? 0.85 : 0.7));
  }

  return body;
}

export class OpenAiProvider implements AiProviderAdapter {
  readonly name = "openai";

  private get apiKey() {
    return process.env.OPENAI_API_KEY ?? "";
  }

  async healthCheck(): Promise<ProviderHealth> {
    if (!this.apiKey) {
      return {
        provider: this.name,
        available: true,
        lastChecked: new Date().toISOString(),
        error: "Dev mode — set OPENAI_API_KEY for live responses",
      };
    }
    return { provider: this.name, available: true, lastChecked: new Date().toISOString() };
  }

  async complete(request: ProviderRequest): Promise<ProviderResponse> {
    const start = Date.now();
    if (!this.apiKey) {
      return {
        content: `[Dev mode — set OPENAI_API_KEY on the server for live AI responses]\n\nYou said: "${request.messages.at(-1)?.content ?? ""}"\n\nModel: ${request.model.displayName}`,
        tokensUsed: 50,
        estimatedCostCents: 0,
        providerLatencyMs: Date.now() - start,
      };
    }

    const res = await fetch(CHAT_COMPLETIONS_URL, {
      method: "POST",
      headers: { Authorization: `Bearer ${this.apiKey}`, "Content-Type": "application/json" },
      body: JSON.stringify(buildOpenAiBody(request, false)),
      signal: AbortSignal.timeout(120_000),
    });

    if (!res.ok) {
      const err = await res.text();
      const detail = parseOpenAiError(err);
      const code = res.status === 429 ? "RATE_LIMIT" : res.status >= 500 ? "PROVIDER_UNAVAILABLE" : "PROVIDER_ERROR";
      throw new ProviderError(detail, this.name, code, res.status >= 500 || res.status === 429);
    }

    const data = (await res.json()) as {
      choices?: { message?: { content?: string } }[];
      usage?: { total_tokens?: number };
    };
    const tokens = data.usage?.total_tokens ?? 0;

    return {
      content: data.choices?.[0]?.message?.content ?? "No response received.",
      tokensUsed: tokens,
      estimatedCostCents: Math.ceil(tokens * 0.002),
      providerLatencyMs: Date.now() - start,
    };
  }

  async *stream(request: ProviderRequest): AsyncGenerator<string> {
    if (!this.apiKey) {
      const text = `[Dev mode — set OPENAI_API_KEY on the server for live AI responses]\n\nYou said: "${request.messages.at(-1)?.content ?? ""}"\n\nModel: ${request.model.displayName}`;
      for (const word of text.split(" ")) {
        yield word + " ";
      }
      return;
    }

    const res = await fetch(CHAT_COMPLETIONS_URL, {
      method: "POST",
      headers: { Authorization: `Bearer ${this.apiKey}`, "Content-Type": "application/json" },
      body: JSON.stringify(buildOpenAiBody(request, true)),
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
          const parsed = JSON.parse(payload) as {
            choices?: { delta?: { content?: string } }[];
          };
          const delta = parsed.choices?.[0]?.delta?.content;
          if (delta) yield delta;
        } catch {
          /* skip malformed chunks */
        }
      }
    }
  }
}
