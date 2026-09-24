import { test } from "node:test";
import assert from "node:assert/strict";
import { transition, allowedCommands, InvalidTransition } from "./reservation-state.ts";

test("happy path enquiry → option → confirmed → checked in → checked out", () => {
  let s = transition("ENQUIRY", "hold");
  s = transition(s, "confirm");
  s = transition(s, "check_in");
  s = transition(s, "check_out");
  assert.equal(s, "CHECKED_OUT");
});

test("cannot check in an unconfirmed reservation", () => {
  assert.throws(() => transition("OPTION", "check_in"), InvalidTransition);
});

test("terminal states allow nothing", () => {
  for (const s of ["CHECKED_OUT", "CANCELLED", "NO_SHOW"] as const) {
    assert.deepEqual(allowedCommands(s), []);
  }
});
