import { describe, it } from "node:test";
import assert from "node:assert/strict";
import { londonWeekday, nextDayIso, recipeForDate, WATER_WEEK } from "./service.ts";

describe("water week", () => {
  it("gives every weekday its own recipe", () => {
    assert.equal(WATER_WEEK.length, 7);
    assert.equal(new Set(WATER_WEEK.map(r => r.weekday)).size, 7);
  });
  it("maps ISO dates in London-style weekdays", () => {
    assert.equal(londonWeekday("2026-09-03"), "Thursday");
    assert.equal(londonWeekday("2026-09-07"), "Monday");
    assert.equal(recipeForDate("2026-09-03").title, "Ginger and lemon water");
  });
  it("lets the desk look a day ahead", () => {
    assert.equal(nextDayIso("2026-09-03"), "2026-09-04");
    assert.equal(recipeForDate(nextDayIso("2026-09-03")).weekday, "Friday");
  });
  it("asks the kitchen for fruit, not Suma", () => {
    const r = recipeForDate("2026-09-07");
    assert.equal(r.ingredients.every(i => i.from === "kitchen"), true);
  });
});
