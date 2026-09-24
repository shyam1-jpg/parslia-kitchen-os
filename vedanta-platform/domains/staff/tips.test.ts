import { describe, it } from "node:test";
import assert from "node:assert/strict";
import { splitTips } from "./tips.ts";

describe("splitTips", () => {
  it("pays the hourly rate first, then splits the rest by hours", () => {
    const r = splitTips({
      total: 200,
      ratePerHour: 0.2,
      method: "HOURS",
      staff: [{ userId: "a", hours: 40 }, { userId: "b", hours: 10 }],
    });
    assert.equal(r[0].guaranteed, 8);
    assert.equal(r[1].guaranteed, 2);
    assert.equal(r[0].share, 160);
    assert.equal(r[1].share, 40);
  });
  it("splits the remainder evenly when asked", () => {
    const r = splitTips({ total: 100, ratePerHour: 0, method: "EVEN", staff: [{ userId: "a", hours: 40 }, { userId: "b", hours: 10 }] });
    assert.equal(r[0].share, 50);
    assert.equal(r[1].share, 50);
  });
  it("applies a manual top-up after the split", () => {
    const r = splitTips({ total: 20, ratePerHour: 0, method: "EVEN", staff: [{ userId: "a", hours: 1 }, { userId: "b", hours: 1 }], manual: { a: 5 } });
    assert.equal(r[0].share, 15);
    assert.equal(r[1].share, 10);
  });
});
