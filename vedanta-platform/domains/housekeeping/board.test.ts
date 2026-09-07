import { describe, it } from "node:test";
import assert from "node:assert/strict";
import { hkDot, stayKind, visitMinutes } from "./board.ts";

describe("housekeeping board", () => {
  it("maps room status to a board dot", () => {
    assert.equal(hkDot("VACANT_DIRTY").tone, "dirty");
    assert.equal(hkDot("INSPECTED").label, "Inspected");
    assert.equal(hkDot("OUT_OF_ORDER").tone, "ooo");
  });

  it("labels arrival, departure and stay-over from occupancy halves", () => {
    assert.equal(stayKind({ occupied_last_night: true, occupied_tonight: false }), "departure");
    assert.equal(stayKind({ occupied_last_night: false, occupied_tonight: true }), "arrival");
    assert.equal(stayKind({ occupied_last_night: true, occupied_tonight: true }), "stayover");
  });

  it("measures a clean in minutes", () => {
    assert.equal(visitMinutes("2026-09-03T10:08:00Z", "2026-09-03T10:32:00Z"), 24);
    assert.equal(visitMinutes(null, "2026-09-03T10:32:00Z"), null);
  });
});
