import { describe, it } from "node:test";
import assert from "node:assert/strict";
import { cleanName, guestCopy, isPublicProgrammeName, nightsBetween, programmeKind } from "./programmes.ts";

describe("public programmes", () => {
  it("hides private booking holds and HOLDs", () => {
    assert.equal(isPublicProgrammeName("Paul booking"), false);
    assert.equal(isPublicProgrammeName("Rishika Shah booking"), false);
    assert.equal(isPublicProgrammeName("HOLD — kitchen"), false);
    assert.equal(isPublicProgrammeName("Hoffman - Graduate Programme"), true);
    assert.equal(isPublicProgrammeName("Michelle Yoga - DAY RETREAT"), true);
  });

  it("cleans sheet copy for guests", () => {
    assert.equal(cleanName("Alexandra Beeley\nSacha Michel"), "Alexandra Beeley Sacha Michel");
    assert.equal(guestCopy("EYEBODY\nCheck-in: Fri 18th at 4pm\nPAID\norganisers at 3pm"), "EYEBODY\nCheck-in: Fri 18th at 4pm");
  });

  it("labels kinds and nights", () => {
    assert.equal(programmeKind("day_retreat"), "Day retreat");
    assert.equal(programmeKind("residential"), "Residential retreat");
    assert.equal(nightsBetween("2026-10-23", "2026-10-25"), 2);
  });
});
