/** SSE helpers so chat streams flush immediately (ChatGPT-style first byte). */

export type StreamStatus = "routing" | "preparing" | "writing" | "retrying";

export function sseHeaders(): Record<string, string> {
  return {
    "Content-Type": "text/event-stream; charset=utf-8",
    "Cache-Control": "no-cache, no-transform",
    Connection: "keep-alive",
    "X-Accel-Buffering": "no",
  };
}

export function encodeSse(data: unknown): string {
  if (data === "[DONE]") return "data: [DONE]\n\n";
  return `data: ${JSON.stringify(data)}\n\n`;
}

export interface StreamTiming {
  startedAt: number;
  firstByteAt?: number;
  firstTokenAt?: number;
  endedAt?: number;
}

export function markFirstByte(timing: StreamTiming): void {
  if (!timing.firstByteAt) timing.firstByteAt = Date.now();
}

export function markFirstToken(timing: StreamTiming): void {
  if (!timing.firstTokenAt) timing.firstTokenAt = Date.now();
}

export function summarizeStreamTiming(timing: StreamTiming): {
  preludeMs: number;
  firstTokenMs: number | null;
  totalMs: number;
} {
  const end = timing.endedAt ?? Date.now();
  return {
    preludeMs: (timing.firstByteAt ?? end) - timing.startedAt,
    firstTokenMs: timing.firstTokenAt ? timing.firstTokenAt - timing.startedAt : null,
    totalMs: end - timing.startedAt,
  };
}
