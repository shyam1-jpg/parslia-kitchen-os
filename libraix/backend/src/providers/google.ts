import type { AiProviderAdapter, ProviderHealth, ProviderRequest, ProviderResponse } from "./types.js";
import { ProviderError } from "./types.js";

function toGeminiContents(messages: ProviderRequest["messages"]) {
  const systemParts = messages.filter((m) => m.role === "system").map((m) => m.content);
  const contents = messages
    .filter((m) => m.role !== "system")
    .map((m) => ({
      role: m.role === "assistant" ? "model" : "user",
      parts: [{ text: m.content }],
    }));
  return {
    systemInstruction: systemParts.length ? { parts: [{ text: systemParts.join("\n\n") }] } : undefined,
    contents,
  };
}

export class GoogleProvider implements AiProviderAdapter {
  readonly name = "google";

  private get apiKey() {
    return process.env.GOOGLE_API_KEY?.trim() ?? "";
  }

  async healthCheck(): Promise<ProviderHealth> {
    return {
      provider: this.name,
      available: Boolean(this.apiKey),
      lastChecked: new Date().toISOString(),
      error: this.apiKey ? undefined : "Set GOOGLE_API_KEY on the server",
    };
  }

  private url(modelId: string, stream: boolean) {
    const action = stream ? "streamGenerateContent" : "generateContent";
    return `https://generativelanguage.googleapis.com/v1beta/models/${modelId}:${action}?key=${this.apiKey}${stream ? "&alt=sse" : ""}`;
  }

  async complete(request: ProviderRequest): Promise<ProviderResponse> {
    const start = Date.now();
    if (!this.apiKey) {
      throw new ProviderError("Google API key not configured", this.name, "PROVIDER_UNAVAILABLE", false);
    }

    const { systemInstruction, contents } = toGeminiContents(request.messages);
    const body: Record<string, unknown> = { contents };
    if (systemInstruction) body.systemInstruction = systemInstruction;
    body.generationConfig = {
      temperature: Number(process.env.OPENAI_TEMPERATURE ?? 0.7),
      maxOutputTokens: Number(process.env.OPENAI_MAX_TOKENS ?? 4096),
    };

    const res = await fetch(this.url(request.model.providerModelId, false), {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(body),
      signal: AbortSignal.timeout(120_000),
    });

    if (!res.ok) {
      const err = await res.text();
      const code = res.status === 429 ? "RATE_LIMIT" : res.status >= 500 ? "PROVIDER_UNAVAILABLE" : "PROVIDER_ERROR";
      throw new ProviderError(err.slice(0, 300), this.name, code, res.status >= 500 || res.status === 429);
    }

    const data = (await res.json()) as {
      candidates?: { content?: { parts?: { text?: string }[] } }[];
      usageMetadata?: { totalTokenCount?: number };
    };
    const text = data.candidates?.[0]?.content?.parts?.map((p) => p.text ?? "").join("") ?? "No response received.";
    const tokens = data.usageMetadata?.totalTokenCount ?? 0;

    return {
      content: text,
      tokensUsed: tokens,
      estimatedCostCents: Math.ceil(tokens * 0.1 / 1000),
      providerLatencyMs: Date.now() - start,
    };
  }

  async *stream(request: ProviderRequest): AsyncGenerator<string> {
    if (!this.apiKey) {
      throw new ProviderError("Google API key not configured", this.name, "PROVIDER_UNAVAILABLE", false);
    }

    const { systemInstruction, contents } = toGeminiContents(request.messages);
    const body: Record<string, unknown> = { contents };
    if (systemInstruction) body.systemInstruction = systemInstruction;
    body.generationConfig = {
      temperature: Number(process.env.OPENAI_TEMPERATURE ?? 0.7),
      maxOutputTokens: Number(process.env.OPENAI_MAX_TOKENS ?? 4096),
    };

    const res = await fetch(this.url(request.model.providerModelId, true), {
      method: "POST",
      headers: { "Content-Type": "application/json" },
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
        try {
          const parsed = JSON.parse(payload) as {
            candidates?: { content?: { parts?: { text?: string }[] } }[];
          };
          const text = parsed.candidates?.[0]?.content?.parts?.map((p) => p.text ?? "").join("");
          if (text) yield text;
        } catch {
          /* skip */
        }
      }
    }
  }
}
