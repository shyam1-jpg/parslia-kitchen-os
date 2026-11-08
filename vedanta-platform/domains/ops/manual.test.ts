import { describe, it } from "node:test";
import assert from "node:assert/strict";
import {
  chapterToPocketBody,
  defaultManual,
  HOUSE_MANUALS,
  MANUAL_KINDS,
  manualsForDepartment,
  parseManualStatus,
} from "./manual.ts";

describe("house manuals", () => {
  it("covers every working department plus the app book", () => {
    const depts = new Set(HOUSE_MANUALS.map(c => c.department));
    for (const code of ["HOUSE", "FRONT", "NIGHT", "HK", "KITCHEN", "RESTAURANT", "MAINT", "GROUNDS", "MGMT"]) {
      assert.ok(depts.has(code as never), code);
    }
    assert.ok(HOUSE_MANUALS.some(c => c.kind === "APP" && /how to use/i.test(c.title)));
    assert.ok(HOUSE_MANUALS.some(c => c.kind === "HOSPITALITY" && /smile/i.test(c.body)));
    assert.ok(HOUSE_MANUALS.some(c => c.kind === "SAFETY" && c.department === "KITCHEN"));
    assert.equal(new Set(HOUSE_MANUALS.map(c => c.slug)).size, HOUSE_MANUALS.length);
  });

  it("teaches receive, read, act and withdraw", () => {
    const rec = defaultManual("app-receive-and-act")!;
    assert.match(rec.body, /mark as read/i);
    assert.match(rec.body, /withdraw/i);
    assert.match(chapterToPocketBody(rec), /Look:/);
    assert.match(chapterToPocketBody(rec), /Act:/);
  });

  it("keeps kitchen brigade and night porter as Look / Act", () => {
    const kit = defaultManual("kitchen-brigade")!;
    assert.ok(kit.steps.every(s => s.look && s.act));
    assert.match(kit.body, /brigade/i);
    assert.match(kit.body, /allergen/i);
    const night = defaultManual("night-porter")!;
    assert.match(night.body, /latch/i);
    assert.equal(manualsForDepartment("NIGHT")[0].slug, "night-porter");
  });

  it("parses withdrawn without inventing kinds", () => {
    assert.equal(parseManualStatus("withdrawn"), "withdrawn");
    assert.equal(parseManualStatus("live"), "live");
    assert.ok(MANUAL_KINDS.includes("APP"));
  });
});
