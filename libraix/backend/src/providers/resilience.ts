import type { ModelDefinition } from "../config/models.js";
import type { ProviderMessage, ProviderResponse } from "./types.js";
import { ProviderError } from "./types.js";
import { completeViaGateway, streamViaGateway } from "./gateway.js";

function parseOpenAiError(raw: string): string {
  try {
    const parsed = JSON.parse(raw) as { error?: { message?: string; code?: string; type?: string } };
    const msg = parsed.error?.message;
    if (msg) return msg;
  } catch {
    /* use raw */
  }
  return raw.slice(0, 200);
}

export function normalizeProviderError(e: unknown, provider = "openai"): ProviderError {
  if (e instanceof ProviderError) {
    const detail = parseOpenAiError(e.message);
    return new ProviderError(detail, e.provider, e.code, e.retryable);
  }
  const msg = e instanceof Error ? e.message : String(e);
  return new ProviderError(msg, provider, "PROVIDER_ERROR", true);
}

export async function completeWithFallback(
  primary: ModelDefinition,
  fallback: ModelDefinition | undefined,
  messages: ProviderMessage[]
): Promise<{ response: ProviderResponse; model: ModelDefinition }> {
  try {
    const response = await completeViaGateway(primary, { messages });
    return { response, model: primary };
  } catch (e) {
    if (!fallback || fallback.id === primary.id) throw normalizeProviderError(e, primary.provider);
    console.warn(`Model ${primary.id} failed, retrying with ${fallback.id}:`, e instanceof Error ? e.message : e);
    try {
      const response = await completeViaGateway(fallback, { messages });
      return { response, model: fallback };
    } catch (retryErr) {
      throw normalizeProviderError(retryErr, fallback.provider);
    }
  }
}

export async function* streamWithFallback(
  primary: ModelDefinition,
  fallback: ModelDefinition | undefined,
  messages: ProviderMessage[]
): AsyncGenerator<{ chunk: string; model: ModelDefinition }> {
  let usedModel = primary;
  let failed = false;

  try {
    for await (const chunk of streamViaGateway(primary, { messages, stream: true })) {
      yield { chunk, model: usedModel };
    }
    return;
  } catch (e) {
    failed = true;
    if (!fallback || fallback.id === primary.id) throw normalizeProviderError(e, primary.provider);
    console.warn(`Stream ${primary.id} failed, retrying with ${fallback.id}:`, e instanceof Error ? e.message : e);
  }

  if (failed && fallback) {
    usedModel = fallback;
    for await (const chunk of streamViaGateway(fallback, { messages, stream: true })) {
      yield { chunk, model: usedModel };
    }
  }
}
