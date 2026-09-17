import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { isRetryableStreamError } from "./errors.ts";

describe("stream retry policy", () => {
  it("retries timeouts, HTTP proxy errors, and dropped sockets", () => {
    assert.equal(isRetryableStreamError("REQUEST_TIMED_OUT"), true);
    assert.equal(isRetryableStreamError("HTTP_502"), true);
    assert.equal(isRetryableStreamError("Failed to fetch"), true);
    assert.equal(isRetryableStreamError("ABORTED"), false);
    assert.equal(isRetryableStreamError("USAGE_LIMIT_REACHED"), false);
  });
});
