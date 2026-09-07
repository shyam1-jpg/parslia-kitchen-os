import { describe, it } from "node:test";
import assert from "node:assert/strict";

/** Pure check: a rename must not keep the old spelling on the board. */
function applyRename(labels: string[], from: string, to: string) {
  return labels.map(l => l === from ? to : l);
}

describe("name correction", () => {
  it("moves the old spelling off the board", () => {
    const after = applyRename(["Kirsty G", "Priya Sharma", "Kirsty G"], "Kirsty G", "Kirsty Green");
    assert.deepEqual(after, ["Kirsty Green", "Priya Sharma", "Kirsty Green"]);
    assert.equal(after.includes("Kirsty G"), false);
  });
  it("does not touch another person's name", () => {
    const after = applyRename(["Other Client"], "Priya Sharma", "Priya S.");
    assert.deepEqual(after, ["Other Client"]);
  });
});
