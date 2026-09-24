import { describe, it } from "node:test";
import assert from "node:assert/strict";
import {
  ACCESS_LOCK_AFTER,
  GENERIC_FAIL,
  EXPIRED,
  LOCKED,
  accessOutcome,
  nextFailedAttempts,
  issueExpiry,
  publicLoginDetail,
} from "./access.ts";

const now = new Date("2026-09-03T12:00:00Z");

describe("guest access codes", () => {
  it("uses one message for unknown email and wrong code", () => {
    const unknown = accessOutcome({ found: false, hashMatches: false, now });
    const wrong = accessOutcome({ found: true, hashMatches: false, now });
    assert.equal(unknown.ok, false);
    assert.equal(wrong.ok, false);
    assert.equal(publicLoginDetail(unknown), GENERIC_FAIL);
    assert.equal(publicLoginDetail(wrong), GENERIC_FAIL);
  });

  it("rejects an expired code even when the hash matches", () => {
    const r = accessOutcome({
      found: true,
      hashMatches: true,
      expiresAt: "2026-08-01T00:00:00Z",
      now,
    });
    assert.deepEqual(r, { ok: false, code: "expired", detail: EXPIRED });
  });

  it("locks after too many failures", () => {
    const fifth = nextFailedAttempts(ACCESS_LOCK_AFTER - 1, now);
    assert.equal(fifth.attempts, ACCESS_LOCK_AFTER);
    assert.ok(fifth.lockedUntil && fifth.lockedUntil.getTime() > now.getTime());
    const locked = accessOutcome({
      found: true,
      hashMatches: true,
      lockedUntil: fifth.lockedUntil,
      now,
    });
    assert.equal(locked.ok, false);
    assert.equal(publicLoginDetail(locked), LOCKED);
  });

  it("accepts a current matching code", () => {
    const r = accessOutcome({
      found: true,
      hashMatches: true,
      expiresAt: issueExpiry(now),
      now,
    });
    assert.deepEqual(r, { ok: true });
  });
});
