import { describe, it } from "node:test";
import assert from "node:assert/strict";
import {
  checklistProgress,
  ownGuestRequests,
  parseDepartment,
  parseRequestStatus,
  parseShift,
  routeGuestRequest,
  shiftLabel,
} from "./board.ts";

describe("routeGuestRequest", () => {
  it("sends linen and towels to housekeeping", () => {
    assert.equal(routeGuestRequest("Extra towels in 110 please"), "HK");
  });
  it("sends meals and allergens to the kitchen", () => {
    assert.equal(routeGuestRequest("Dairy allergy — no butter at breakfast"), "KITCHEN");
  });
  it("sends a leak to maintenance", () => {
    assert.equal(routeGuestRequest("Shower leaking onto the landing"), "MAINT");
  });
  it("honours an explicit department", () => {
    assert.equal(routeGuestRequest("Need help", "GROUNDS"), "GROUNDS");
  });
  it("defaults front of house for a general ask", () => {
    assert.equal(routeGuestRequest("Can someone call a taxi at 9?"), "FRONT");
  });
});

describe("parse helpers", () => {
  it("normalises shift names", () => {
    assert.equal(parseShift("PM"), "pm");
    assert.equal(parseShift("evening"), "pm");
    assert.equal(parseShift(""), "am");
    assert.equal(shiftLabel("pm"), "Evening");
  });
  it("falls back to whole house for unknown departments", () => {
    assert.equal(parseDepartment("nope"), "HOUSE");
    assert.equal(parseDepartment("hk"), "HK");
  });
  it("maps request status words", () => {
    assert.equal(parseRequestStatus("in_progress"), "doing");
    assert.equal(parseRequestStatus("closed"), "done");
    assert.equal(parseRequestStatus(""), "open");
  });
});

describe("checklistProgress", () => {
  it("counts ticks for the day", () => {
    assert.deepEqual(checklistProgress([{ done: true }, { done: false }, { done: true }]), { done: 2, total: 3 });
  });
});

describe("ownGuestRequests", () => {
  it("never returns another guest's ask", () => {
    const rows = [
      { guestAccountId: "a", guestEmail: "priya@example.com", text: "towels" },
      { guestAccountId: "b", guestEmail: "other@example.com", text: "taxi" },
    ];
    const mine = ownGuestRequests(rows, { id: "a", email: "priya@example.com" });
    assert.equal(mine.length, 1);
    assert.equal(mine[0].text, "towels");
  });
});
