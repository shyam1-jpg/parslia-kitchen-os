import { ConnectorError } from "./errors.ts";
import type { ActionSafety, HttpCall, HttpResult, RetryPolicy } from "./types.ts";
import { redact, safeTarget } from "./validate.ts";

const RETRY_STATUSES = new Set([408, 429, 502, 503, 504]);

export interface HttpDependencies {
  fetchImpl: typeof fetch;
  sleep: (ms: number) => Promise<void>;
  random: () => number;
  /** Action safety wins over the caller's claim. Machine commands are never retried. */
  safety: ActionSafety;
}

export async function requestJson(call: HttpCall, deps: HttpDependencies): Promise<HttpResult> {
  const safety = deps.safety;
  const requested = call.retry ?? { maxAttempts: 1, baseDelayMs: 0 };
  const retry: RetryPolicy = safety === "machine" ? { maxAttempts: 1, baseDelayMs: 0 } : requested;
  const maxAttempts = safety === "machine" ? 1 : Math.min(4, Math.max(1, retry.maxAttempts));
  let lastError: ConnectorError | null = null;

  for (let attempt = 1; attempt <= maxAttempts; attempt++) {
    const controller = new AbortController();
    let timedOut = false;
    const timer = setTimeout(() => {
      timedOut = true;
      controller.abort();
    }, call.timeoutMs);
    try {
      const response = await deps.fetchImpl(call.url, {
        method: call.method,
        headers: call.headers,
        body: call.body,
        signal: controller.signal,
      });
      const declared = Number(response.headers.get("content-length") ?? "0");
      if (Number.isFinite(declared) && declared > 1_000_000) {
        throw new ConnectorError("upstream", `Response from ${safeTarget(call.url)} was larger than 1 MB.`, {
          httpStatus: response.status,
        });
      }
      const text = await response.text();
      if (text.length > 1_000_000) {
        throw new ConnectorError("upstream", `Response from ${safeTarget(call.url)} was larger than 1 MB.`, {
          httpStatus: response.status,
        });
      }
      const parsed = parseBody(text);
      if (response.status === 401 || response.status === 403) {
        throw new ConnectorError(
          "auth",
          `The other system rejected the credential (${response.status}). Reconnect with a new key.`,
          { httpStatus: response.status },
        );
      }
      if (response.ok) {
        if (text.trim() && parsed.invalid) {
          throw new ConnectorError("upstream", `Response from ${safeTarget(call.url)} was not JSON.`, {
            httpStatus: response.status,
          });
        }
        return { status: response.status, body: parsed.value, attempts: attempt };
      }
      const retryable = safety === "read" && RETRY_STATUSES.has(response.status);
      const snippet = redact(text);
      const error = new ConnectorError(
        "upstream",
        `The other system returned ${response.status} for ${safeTarget(call.url)}.${snippet ? ` ${snippet}` : ""}`,
        { retryable, httpStatus: response.status },
      );
      if (retryable && attempt < maxAttempts) {
        lastError = error;
        await deps.sleep(backoff(retry.baseDelayMs, attempt, deps.random));
        continue;
      }
      throw error;
    } catch (error) {
      if (error instanceof ConnectorError) {
        if (error.retryable && safety === "read" && attempt < maxAttempts) {
          lastError = error;
          await deps.sleep(backoff(retry.baseDelayMs, attempt, deps.random));
          continue;
        }
        throw exhausted(error, attempt, maxAttempts);
      }
      const network = new ConnectorError(
        timedOut ? "timeout" : "upstream",
        timedOut
          ? `The other system did not respond within ${call.timeoutMs} ms.`
          : `Could not reach ${safeTarget(call.url)}.`,
        { retryable: safety === "read" },
      );
      if (network.retryable && attempt < maxAttempts) {
        lastError = network;
        await deps.sleep(backoff(retry.baseDelayMs, attempt, deps.random));
        continue;
      }
      throw exhausted(network, attempt, maxAttempts);
    } finally {
      clearTimeout(timer);
    }
  }

  throw lastError ?? new ConnectorError("upstream", "The request failed.");
}

function parseBody(text: string): { invalid: boolean; value: unknown } {
  if (!text.trim()) return { invalid: false, value: null };
  try {
    return { invalid: false, value: JSON.parse(text) as unknown };
  } catch {
    return { invalid: true, value: null };
  }
}

function exhausted(error: ConnectorError, attempt: number, maxAttempts: number): ConnectorError {
  if (!error.retryable || attempt < maxAttempts) return error;
  return new ConnectorError(error.code, error.message, { retryable: false, httpStatus: error.httpStatus });
}

function backoff(base: number, attempt: number, random: () => number): number {
  const spread = 0.8 + random() * 0.4;
  return Math.min(2000, Math.round(base * attempt * spread));
}
