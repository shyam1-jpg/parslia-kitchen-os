import { describe, it } from "node:test";
import assert from "node:assert/strict";
import { currentBeat, guestHeadcount, houseDayBeats, roomStatusCounts } from "./pulse.ts";

describe("house pulse", () => {
  it("uses the house check-in and check-out times on the day list", () => {
    const beats = houseDayBeats("15:00", "11:00");
    assert.ok(beats.some(b => b.time === "11:00" && /check-out/i.test(b.label)));
    assert.ok(beats.some(b => b.time === "15:00" && /check-in/i.test(b.label)));
  });

  it("counts rooms without inventing a payment figure", () => {
    const c = roomStatusCounts([
      { status: "INSPECTED" },
      { status: "VACANT_DIRTY" },
      { status: "OUT_OF_ORDER" },
      { status: "OCCUPIED", staff_only: true },
    ]);
    assert.equal(c.inspected, 1);
    assert.equal(c.ready, 1);
    assert.equal(c.dirty, 1);
    assert.equal(c.out_of_order, 1);
    assert.equal(c.occupied, 0);
  });

  it("sums in-house guests from expected counts", () => {
    assert.equal(guestHeadcount([{ expected_guests: 12 }, { expected_guests: null }, { expected_guests: 4 }]), 16);
    assert.equal(currentBeat(houseDayBeats(), "10:00")?.time, "09:00");
  });
});
