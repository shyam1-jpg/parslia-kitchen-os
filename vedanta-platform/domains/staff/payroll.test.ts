import { describe, it } from "node:test";
import assert from "node:assert/strict";
import { payFromHours, payrollRow, shiftsFromPunches, weekStartMonday } from "./payroll.ts";

describe("shiftsFromPunches", () => {
  it("pairs clock in and out", () => {
    const s = shiftsFromPunches([
      { kind: "IN", at: new Date("2026-09-03T08:00:00Z") },
      { kind: "OUT", at: new Date("2026-09-03T16:30:00Z") },
    ]);
    assert.equal(s.length, 1);
    assert.equal(s[0].hours, 8.5);
    assert.ok(s[0].outAt);
  });
  it("keeps an open shift", () => {
    const s = shiftsFromPunches([{ kind: "IN", at: new Date("2026-09-03T08:00:00Z") }], new Date("2026-09-03T09:00:00Z"));
    assert.equal(s[0].outAt, null);
    assert.equal(s[0].hours, 1);
  });
});

describe("payFromHours", () => {
  it("multiplies hours by the house rate", () => {
    assert.equal(payFromHours(10, 12.5), 125);
  });
  it("hides pay when no rate is set", () => {
    assert.equal(payFromHours(10, null), null);
  });
});

describe("payrollRow", () => {
  it("shows hours against contracted hours", () => {
    const r = payrollRow({ hours: 42, hourlyRate: 11, contractedHours: 40 });
    assert.equal(r.pay, 462);
    assert.equal(r.variance, 2);
  });
});

describe("weekStartMonday", () => {
  it("snaps Thursday to the Monday", () => {
    assert.equal(weekStartMonday("2026-09-03"), "2026-08-31");
  });
});
