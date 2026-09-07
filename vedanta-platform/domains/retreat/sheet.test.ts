import { describe, it } from "node:test";
import assert from "node:assert/strict";
import { buildProgrammeSheet, roomsShort } from "./sheet.ts";

describe("programme operating sheet", () => {
  it("one booking drives every department without inventing money", () => {
    const sheet = buildProgrammeSheet({
      name: "Hoffman Graduate Programme",
      organisation: "Hoffman Institute",
      arrival: "2026-10-10",
      departure: "2026-10-17",
      expected_guests: 80,
      expected_rooms: 40,
      rooms_placed: ["110", "111"],
      meals: { breakfast: 80, lunch: 80, dinner: 80 },
      dietary: "5 vegan · 4 Jain",
      spa: true,
      status: "CONFIRMED",
      exclusive: true,
    });
    assert.equal(sheet.dates.nights, 7);
    assert.equal(sheet.rooms_short, 38);
    assert.ok(sheet.departments.some(d => d.code === "KITCHEN" && d.work.includes("80 covers")));
    assert.ok(sheet.departments.some(d => d.code === "FINANCE" && /folio not live/i.test(d.work)));
    assert.ok(!JSON.stringify(sheet).includes("£"));
  });

  it("does not invent rooms that were not placed", () => {
    assert.equal(roomsShort(40, 2), 38);
    assert.equal(roomsShort(null, 0), 0);
  });
});
