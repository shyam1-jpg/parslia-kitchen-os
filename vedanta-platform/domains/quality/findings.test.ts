import { describe, it } from "node:test";
import assert from "node:assert/strict";
import {
  CONFIGURED_ROOM_TOTAL,
  DOCUMENTED_SKIPPED_DRY_RUN,
  DOCUMENTED_SKIPPED_PROGRESS_MD,
  SHEET_ONLY_ROOM_NUMBERS,
  buildQualityItems,
  classifyCount,
  classifyDocumentedCounts,
  classifyMissingRooms,
  classifyRoomCount,
  evidenceLines,
  parseQualityStatus,
} from "./findings.ts";

describe("data quality classifications", () => {
  it("flags 45 configured vs 42 imported as a source conflict, not a guess", () => {
    assert.equal(classifyRoomCount({ configured: CONFIGURED_ROOM_TOTAL, actual: 42, guest: 41, staff: 1 }), "SOURCE_CONFLICT");
    assert.equal(classifyRoomCount({ configured: 42, actual: 42, guest: 41, staff: 1 }), "VERIFIED");
  });
  it("does not invent rooms 301–307 — they stay missing until the house confirms", () => {
    const inventory = ["101", "104", "G01"];
    assert.equal(classifyMissingRooms(inventory), "MISSING");
    assert.equal(classifyMissingRooms([...inventory, ...SHEET_ONLY_ROOM_NUMBERS]), "VERIFIED");
  });
  it("treats leftover unlinked placements and assumed departures as review, not as errors to auto-fix", () => {
    assert.equal(classifyCount(11097), "NEEDS_REVIEW");
    assert.equal(classifyCount(0), "VERIFIED");
  });
  it("flags two documented skip-counts that disagree", () => {
    assert.equal(classifyDocumentedCounts(65, 6), "SOURCE_CONFLICT");
    assert.equal(classifyDocumentedCounts(6, 6), "NEEDS_REVIEW");
  });
  it("refuses unknown staff statuses", () => {
    assert.equal(parseQualityStatus("verified"), "VERIFIED");
    assert.equal(parseQualityStatus("maybe"), null);
  });
  it("builds the six live findings without inventing rooms or prices", () => {
    const items = buildQualityItems({
      configured: CONFIGURED_ROOM_TOTAL,
      actual: 42,
      guest: 41,
      staff: 1,
      numbers: ["101", "104", "G01"],
      assumedDepartures: 125,
      unlinkedPlacements: 11097,
      skippedProgressMd: DOCUMENTED_SKIPPED_PROGRESS_MD,
      skippedDryRun: DOCUMENTED_SKIPPED_DRY_RUN,
      packageCount: 8,
    });
    assert.equal(items.length, 6);
    assert.equal(items.find(i => i.code === "ROOM_COUNT")?.computed_status, "SOURCE_CONFLICT");
    assert.equal(items.find(i => i.code === "ROOMS_301_307")?.computed_status, "MISSING");
    assert.deepEqual(items.find(i => i.code === "ROOMS_301_307")?.evidence.missing, [...SHEET_ONLY_ROOM_NUMBERS]);
    assert.equal(items.find(i => i.code === "SKIPPED_IMPORT_ROWS")?.computed_status, "SOURCE_CONFLICT");
    assert.ok(items.find(i => i.code === "ROOM_COUNT")?.lines.some(l => l.includes("Imported: 42")));
    const overlay = buildQualityItems({
      configured: 45, actual: 42, guest: 41, staff: 1, numbers: ["101"],
      assumedDepartures: 1, unlinkedPlacements: 1,
      skippedProgressMd: 65, skippedDryRun: 6, packageCount: 8,
      overlays: [{ code: "ROOM_COUNT", status: "VERIFIED", note: "House confirmed 42 is correct", decided_by: "u1", decided_at: "2026-09-03" }],
    });
    assert.equal(overlay[0].house_status, "VERIFIED");
    assert.equal(overlay[0].status, "VERIFIED");
    assert.equal(overlay[0].computed_status, "SOURCE_CONFLICT");
  });
  it("writes house-readable evidence, not a JSON dump", () => {
    const lines = evidenceLines("ROOMS_301_307", { sheet_only: [...SHEET_ONLY_ROOM_NUMBERS], missing: [...SHEET_ONLY_ROOM_NUMBERS], present: [] });
    assert.ok(lines.some(l => l.includes("301, 302, 303, 304, 305, 306, 307")));
    assert.ok(!lines.some(l => l.includes("{")));
    assert.deepEqual(evidenceLines("SKIPPED_IMPORT_ROWS", { progress_md: 65, dry_run_doc: 6 })[0], "PROGRESS.md recorded: 65 skipped rows");
  });
});
