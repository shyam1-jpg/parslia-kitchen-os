import { describe, it } from "node:test";
import assert from "node:assert/strict";
import { hoursFromPunches, canPunch } from "./hours.ts";

describe("hoursFromPunches", () => {
  it("sums a closed pair", () => {
    const a = new Date("2026-09-03T08:00:00Z");
    const b = new Date("2026-09-03T16:00:00Z");
    assert.equal(hoursFromPunches([{ at: a, kind: "IN" }, { at: b, kind: "OUT" }]), 8);
  });
  it("counts an open shift to now", () => {
    const a = new Date("2026-09-03T08:00:00Z");
    const now = new Date("2026-09-03T10:00:00Z");
    assert.equal(hoursFromPunches([{ at: a, kind: "IN" }], now), 2);
  });
});

describe("canPunch", () => {
  it("refuses a second clock-in", () => assert.equal(canPunch("IN", "IN"), false));
  it("refuses clock-out when not in", () => assert.equal(canPunch(null, "OUT"), false));
});
