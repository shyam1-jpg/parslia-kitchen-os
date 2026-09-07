import { test } from "node:test";
import assert from "node:assert/strict";
import { transitionRoom } from "./room-state.ts";

test("clean, inspect, occupy, vacate", () => {
  let r = { status: "VACANT_DIRTY" as const, statusBeforeOos: null };
  r = transitionRoom(r, "start_cleaning");
  r = transitionRoom(r, "finish_cleaning");
  r = transitionRoom(r, "pass_inspection");
  r = transitionRoom(r, "occupy");
  r = transitionRoom(r, "vacate");
  assert.equal(r.status, "VACANT_DIRTY");
});

test("out of order requires safety check to restore", () => {
  let r = transitionRoom({ status: "INSPECTED", statusBeforeOos: null }, "set_out_of_order");
  assert.equal(r.status, "OUT_OF_ORDER");
  assert.equal(r.statusBeforeOos, "INSPECTED");
  assert.throws(() => transitionRoom(r, "restore"));
  r = transitionRoom(r, "restore", { safetyCheckPassed: true });
  assert.equal(r.status, "VACANT_DIRTY");
});

test("an out-of-order room cannot be cleaned", () => {
  const r = { status: "OUT_OF_ORDER" as const, statusBeforeOos: "VACANT_DIRTY" as const };
  assert.throws(() => transitionRoom(r, "start_cleaning"));
});
