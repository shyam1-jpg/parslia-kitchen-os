import type { AiProviderAdapter, ProviderHealth, ProviderRequest, ProviderResponse } from "./types.js";
import { ProviderError } from "./types.js";

export function parseOpenAiCompatibleError(raw: string): string {
  try {
    const parsed = JSON.parse(raw) as { error?: { message?: string } };
    if (parsed.error?.message) return parsed.error.message;
  } catch {
    /* use raw */
  }
  return raw.slice(0, 300);
}

function buildBody(request: ProviderRequest, stream: boolean) {
  const modelId = request.model.providerModelId;
  const isReasoning = /reasoner|r1|o\d|grok-4-5|grok-4\.5|grok-4\.20.*reasoning/i.test(modelId);

  const body: Record<string, unknown> = {
    model: modelId,
    messages: request.messages,
    stream,
  };

  if (isReasoning) {
    body.max_completion_tokens = Number(process.env.OPENAI_MAX_TOKENS ?? 4096);
  } else {
    body.max_tokens = Number(process.env.OPENAI_MAX_TOKENS ?? 4096);
    body.temperature = Number(process.env.OPENAI_TEMPERATURE ?? 0.7);
  }

  return body;
}

export interface OpenAiCompatibleConfig {
  name: string;
  apiKeyEnv: string;
  baseUrl: string;
  costPer1kTokensCents?: number;
}

export function createOpenAiCompatibleProvider(config: OpenAiCompatibleConfig): AiProviderAdapter {
  const completionsUrl = `${config.baseUrl.replace(/\/$/, "")}/v1/chat/completions`;
  const cost = config.costPer1kTokensCents ?? 0.2;

  return {
    name: config.name,

    async healthCheck(): Promise<ProviderHealth> {
      const key = process.env[config.apiKeyEnv]?.trim() ?? "";
      return {
        provider: config.name,
        available: Boolean(key),
        lastChecked: new Date().toISOString(),
        error: key ? undefined : `Set ${config.apiKeyEnv} on the server`,
      };
    },

    async complete(request: ProviderRequest): Promise<ProviderResponse> {
      const start = Date.now();
      const apiKey = process.env[config.apiKeyEnv]?.trim() ?? "";
      if (!apiKey) {
        throw new ProviderError(
          `${config.name} API key not configured`,
          config.name,
          "PROVIDER_UNAVAILABLE",
          false
        );
      }

      const res = await fetch(completionsUrl, {
        method: "POST",
        headers: { Authorization: `Bearer ${apiKey}`, "Content-Type": "application/json" },
        body: JSON.stringify(buildBody(request, false)),
        signal: AbortSignal.timeout(120_000),
      });

      if (!res.ok) {
        const err = await res.text();
        const detail = parseOpenAiCompatibleError(err);
        const code = res.status === 429 ? "RATE_LIMIT" : res.status >= 500 ? "PROVIDER_UNAVAILABLE" : "PROVIDER_ERROR";
        throw new ProviderError(detail, config.name, code, res.status >= 500 || res.status === 429);
      }

      const data = (await res.json()) as {
        choices?: { message?: { content?: string } }[];
        usage?: { total_tokens?: number };
      };
      const tokens = data.usage?.total_tokens ?? 0;

      return {
        content: data.choices?.[0]?.message?.content ?? "No response received.",
        tokensUsed: tokens,
        estimatedCostCents: Math.ceil(tokens * cost / 1000),
        providerLatencyMs: Date.now() - start,
      };
    },

    async *stream(request: ProviderRequest): AsyncGenerator<string> {
      const apiKey = process.env[config.apiKeyEnv]?.trim() ?? "";
      if (!apiKey) {
        throw new ProviderError(`${config.name} API key not configured`, config.name, "PROVIDER_UNAVAILABLE", false);
      }

      const res = await fetch(completionsUrl, {
        method: "POST",
        headers: { Authorization: `Bearer ${apiKey}`, "Content-Type": "application/json" },
        body: JSON.stringify(buildBody(request, true)),
        signal: AbortSignal.timeout(120_000),
      });

      if (!res.ok || !res.body) {
        const result = await this.complete!(request);
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
            const parsed = JSON.parse(payload) as { choices?: { delta?: { content?: string } }[] };
            const delta = parsed.choices?.[0]?.delta?.content;
            if (delta) yield delta;
          } catch {
            /* skip */
          }
        }
      }
    },
  };
}
