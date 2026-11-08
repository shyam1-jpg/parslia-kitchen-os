import { describe, it } from "node:test";
import assert from "node:assert/strict";
import { nextLeaveStatus, leaveNeedsHodFirst } from "./leave-state.ts";

describe("leaveNeedsHodFirst", () => {
  it("reception needs the head of department first", () => {
    assert.equal(leaveNeedsHodFirst("RECEPTIONIST"), true);
    assert.equal(leaveNeedsHodFirst("HK_SUPERVISOR"), false);
    assert.equal(leaveNeedsHodFirst("GENERAL_MANAGER"), false);
  });
});

describe("nextLeaveStatus", () => {
  it("sends a reception holiday to the front-office manager, then the GM", () => {
    assert.equal(nextLeaveStatus("SUBMITTED", "approve", "FRONT_OFFICE_MANAGER", "RECEPTIONIST"), "HOD_APPROVED");
    assert.equal(nextLeaveStatus("HOD_APPROVED", "approve", "GENERAL_MANAGER", "RECEPTIONIST"), "APPROVED");
  });
  it("sends a head of department holiday straight to the general manager", () => {
    assert.equal(nextLeaveStatus("SUBMITTED", "approve", "GENERAL_MANAGER", "HK_SUPERVISOR"), "APPROVED");
    assert.equal(nextLeaveStatus("SUBMITTED", "approve", "FRONT_OFFICE_MANAGER", "HK_SUPERVISOR"), null);
  });
  it("lets the GM complete both steps for ordinary staff", () => {
    assert.equal(nextLeaveStatus("SUBMITTED", "approve", "SYSTEM_OWNER", "KITCHEN"), "APPROVED");
    assert.equal(nextLeaveStatus("SUBMITTED", "approve", "GENERAL_MANAGER", "RESTAURANT_STAFF"), "APPROVED");
    assert.equal(nextLeaveStatus("SUBMITTED", "approve", "GENERAL_MANAGER", "GROUNDS"), "APPROVED");
  });
  it("lets the restaurant manager sign waiter holiday, then the GM", () => {
    assert.equal(nextLeaveStatus("SUBMITTED", "approve", "RESTAURANT_MANAGER", "RESTAURANT_STAFF"), "HOD_APPROVED");
    assert.equal(nextLeaveStatus("HOD_APPROVED", "approve", "GENERAL_MANAGER", "RESTAURANT_STAFF"), "APPROVED");
  });
  it("lets the sales manager sign assistant holiday, then the GM", () => {
    assert.equal(nextLeaveStatus("SUBMITTED", "approve", "SALES_MANAGER", "SALES_ASSISTANT"), "HOD_APPROVED");
    assert.equal(nextLeaveStatus("HOD_APPROVED", "approve", "GENERAL_MANAGER", "SALES_ASSISTANT"), "APPROVED");
    assert.equal(nextLeaveStatus("SUBMITTED", "approve", "GENERAL_MANAGER", "SALES_MANAGER"), "APPROVED");
  });
});
