import { describe, it } from "node:test";
import assert from "node:assert/strict";
import { dutiesByPhase, NIGHT_DUTIES, NIGHT_HOW, parseDutySlot } from "./night.ts";
import { parseShift, routeGuestRequest, shiftLabel } from "./board.ts";

describe("night porter duties", () => {
  it("covers lock-up, guests, the tea station and morning handover", () => {
    const phases = dutiesByPhase();
    assert.deepEqual(phases.map(p => p.phase.code), ["lockup", "guests", "station", "handover"]);
    assert.ok(NIGHT_DUTIES.some(d => /door/i.test(d.title) && d.due_time === "22:00"));
    assert.ok(NIGHT_DUTIES.some(d => /window/i.test(d.title)));
    assert.ok(NIGHT_DUTIES.some(d => /light/i.test(d.title)));
    assert.ok(NIGHT_DUTIES.some(d => /let guests in/i.test(d.title)));
    assert.ok(NIGHT_DUTIES.some(d => /dirty cups/i.test(d.title)));
    assert.ok(NIGHT_DUTIES.some(d => /inventory/i.test(d.title) && /tea/i.test(d.title)));
    assert.ok(NIGHT_DUTIES.some(d => /handover/i.test(d.title)));
    assert.equal(NIGHT_DUTIES.filter(d => d.phase === "handover").length, 1);
  });

  it("explains how the night is worked", () => {
    assert.ok(NIGHT_HOW.some(line => /two lock-ups/i.test(line)));
    assert.ok(NIGHT_HOW.some(line => /never leave the latch/i.test(line)));
    assert.ok(NIGHT_HOW.some(line => /handover/i.test(line)));
  });

  it("treats night as its own shift, not evening", () => {
    assert.equal(parseShift("night"), "night");
    assert.equal(parseShift("overnight"), "night");
    assert.equal(parseShift("evening"), "pm");
    assert.equal(shiftLabel("night"), "Night");
    assert.equal(parseDutySlot("night"), "NIGHT");
    assert.equal(parseDutySlot("AM"), "AM");
  });

  it("sends after-hours door asks to the night porter", () => {
    assert.equal(routeGuestRequest("Locked out — can you let me in?"), "NIGHT");
    assert.equal(routeGuestRequest("Late arrival after dinner"), "NIGHT");
    assert.equal(routeGuestRequest("Can someone call a taxi at 9?"), "FRONT");
  });
});
