import assert from "node:assert/strict";
import { describe, it } from "node:test";
import {
  encodeSse,
  markFirstByte,
  markFirstToken,
  sseHeaders,
  summarizeStreamTiming,
  type StreamTiming,
} from "./streamSse.js";

describe("stream SSE helpers", () => {
  it("encodes JSON events and the done sentinel", () => {
    assert.equal(encodeSse("[DONE]"), "data: [DONE]\n\n");
    assert.equal(
      encodeSse({ meta: { status: "routing", displayName: "Libraix Fast" } }),
      `data: ${JSON.stringify({ meta: { status: "routing", displayName: "Libraix Fast" } })}\n\n`
    );
  });

  it("disables proxy buffering so the first status event is not held back", () => {
    const headers = sseHeaders();
    assert.equal(headers["X-Accel-Buffering"], "no");
    assert.match(headers["Content-Type"], /text\/event-stream/);
    assert.match(headers["Cache-Control"], /no-transform/);
  });

  it("measures prelude vs first token", () => {
    const timing: StreamTiming = { startedAt: 1_000 };
    markFirstByte(timing);
    timing.firstByteAt = 1_040;
    markFirstToken(timing);
    timing.firstTokenAt = 1_180;
    timing.endedAt = 1_500;
    const summary = summarizeStreamTiming(timing);
    assert.equal(summary.preludeMs, 40);
    assert.equal(summary.firstTokenMs, 180);
    assert.equal(summary.totalMs, 500);
  });
});
