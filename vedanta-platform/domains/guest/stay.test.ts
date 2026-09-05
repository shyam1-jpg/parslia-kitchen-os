import { describe, it } from "node:test";
import assert from "node:assert/strict";
import { roomsForStay, publicStay } from "./stay.ts";

describe("roomsForStay", () => {
  const rows = [
    { booking_id: "a", number: "110", section: "First Floor" },
    { booking_id: "b", number: "204", section: "Second Floor" },
    { booking_id: "a", number: "112", section: "First Floor" },
    { booking_id: "a", number: "110", section: "First Floor" },
  ];
  it("returns only rooms on this client's booking", () => {
    assert.deepEqual(roomsForStay("a", rows), [
      { number: "110", section: "First Floor" },
      { number: "112", section: "First Floor" },
    ]);
  });
  it("never leaks another client's room", () => {
    assert.equal(roomsForStay("a", rows).some(r => r.number === "204"), false);
  });
  it("returns nothing when the stay has no booking yet", () => {
    assert.deepEqual(roomsForStay(null, rows), []);
  });
});

describe("publicStay", () => {
  it("lets a guest read their own record", () => {
    const s = publicStay({ email: "priya@example.com", name: "Priya" }, "priya@example.com");
    assert.equal(s.name, "Priya");
  });
  it("refuses another client's record", () => {
    assert.throws(() => publicStay({ email: "priya@example.com", name: "Priya" }, "other@example.com"));
  });
});
