import { describe, it } from "node:test";
import assert from "node:assert/strict";
import {
  actualMinutes,
  allowedTransitions,
  canTransition,
  displayStatus,
  formatTask,
  initialStatus,
  isOverdue,
  parseTaskPriority,
  parseTaskSeverity,
  parseTaskStatus,
  pausePatch,
  sanitizeTaskInput,
  staffActions,
} from "./tasks.ts";

describe("task status machine", () => {
  it("lets a new task be taken, started, scheduled or cancelled — not completed", () => {
    assert.equal(canTransition("new", "assigned"), true);
    assert.equal(canTransition("new", "in_progress"), true);
    assert.equal(canTransition("new", "scheduled"), true);
    assert.equal(canTransition("new", "cancelled"), true);
    assert.equal(canTransition("new", "completed"), false);
  });
  it("never jumps from new to completed", () => {
    assert.equal(canTransition("new", "verified"), false);
    assert.equal(canTransition("assigned", "verified"), false);
  });
  it("records pause, wait, block and complete from in progress", () => {
    assert.equal(canTransition("in_progress", "paused"), true);
    assert.equal(canTransition("in_progress", "completed"), true);
    assert.equal(canTransition("paused", "in_progress"), true);
  });
  it("keeps completed history and only allows verify or reopen", () => {
    assert.deepEqual(allowedTransitions("completed"), ["verified", "reopened"]);
    assert.equal(canTransition("completed", "cancelled"), false);
  });
  it("lets a cancelled or verified task be reopened", () => {
    assert.equal(canTransition("cancelled", "reopened"), true);
    assert.equal(canTransition("verified", "reopened"), true);
    assert.equal(canTransition("verified", "in_progress"), false);
  });
  it("treats same-status as not a transition", () => {
    assert.equal(canTransition("in_progress", "in_progress"), false);
  });
});

describe("parse helpers", () => {
  it("accepts spaced and dashed status words", () => {
    assert.equal(parseTaskStatus("In Progress"), "in_progress");
    assert.equal(parseTaskStatus("awaiting-approval"), "awaiting_approval");
    assert.equal(parseTaskStatus("nope"), "new");
  });
  it("falls back priority and severity", () => {
    assert.equal(parseTaskPriority("URGENT"), "urgent");
    assert.equal(parseTaskPriority("hot"), "normal");
    assert.equal(parseTaskSeverity("critical"), "critical");
  });
});

describe("overdue is derived, never stored", () => {
  const now = new Date("2026-09-03T12:00:00Z");
  it("flags an open task past due_at", () => {
    assert.equal(isOverdue({ status: "assigned", due_at: "2026-09-01T09:00:00Z" }, now), true);
    assert.equal(displayStatus({ status: "assigned", due_at: "2026-09-01T09:00:00Z" }, now), "Overdue");
  });
  it("does not flag completed or cancelled work", () => {
    assert.equal(isOverdue({ status: "completed", due_at: "2026-09-01T09:00:00Z" }, now), false);
    assert.equal(isOverdue({ status: "cancelled", due_at: "2026-09-01T09:00:00Z" }, now), false);
  });
  it("does not flag a future due date", () => {
    assert.equal(isOverdue({ status: "new", due_at: "2026-09-10T09:00:00Z" }, now), false);
  });
});

describe("sanitizeTaskInput", () => {
  it("requires a title and caps free text", () => {
    const d = sanitizeTaskInput({ title: "  Walk the east lawn  ", notes: "x".repeat(9000), department: "grounds" });
    assert.equal(d.title, "Walk the east lawn");
    assert.equal(d.notes.length, 8000);
    assert.equal(d.department, "GROUNDS");
  });
  it("keeps assignment ids unique and drops junk", () => {
    const d = sanitizeTaskInput({
      title: "Fix tap",
      assigned_staff_id: "11111111-1111-1111-8111-111111111111",
      assigned_staff_ids: ["11111111-1111-1111-8111-111111111111", "not-a-uuid", "22222222-2222-2222-8222-222222222222"],
    });
    assert.equal(d.assigned_staff_ids.length, 2);
  });
  it("starts assigned when a person or team is set", () => {
    assert.equal(initialStatus(sanitizeTaskInput({ title: "A" })), "new");
    assert.equal(initialStatus(sanitizeTaskInput({ title: "A", assigned_label: "Morning HK" })), "assigned");
    assert.equal(initialStatus(sanitizeTaskInput({ title: "A", start_at: "2026-09-04T08:00:00Z" })), "scheduled");
  });
});

describe("pause and actual minutes", () => {
  it("subtracts paused time from the working clock", () => {
    const mins = actualMinutes({
      started_at: "2026-09-03T10:00:00Z",
      finished_at: "2026-09-03T12:00:00Z",
      pause_accumulated_ms: 30 * 60_000,
      status: "completed",
    }, new Date("2026-09-03T12:00:00Z"));
    assert.equal(mins, 90);
  });
  it("adds the open pause window when still paused", () => {
    const mins = actualMinutes({
      started_at: "2026-09-03T10:00:00Z",
      paused_at: "2026-09-03T11:00:00Z",
      pause_accumulated_ms: 0,
      status: "paused",
    }, new Date("2026-09-03T11:20:00Z"));
    assert.equal(mins, 60);
  });
  it("accumulates pause when resuming", () => {
    const patch = pausePatch(
      { status: "paused", paused_at: "2026-09-03T11:00:00Z", pause_accumulated_ms: 0 },
      "in_progress",
      new Date("2026-09-03T11:15:00Z"),
    );
    assert.equal(patch.pause_accumulated_ms, 15 * 60_000);
    assert.equal(patch.paused_at, null);
    assert.equal(patch.started_at_touch, true);
  });
});

describe("staff actions stay short", () => {
  it("offers take it and start from new, acknowledge from assigned", () => {
    const fromNew = staffActions("new").map(a => a.label);
    assert.ok(fromNew.includes("Take it"));
    assert.ok(fromNew.includes("Start"));
    const labels = staffActions("assigned").map(a => a.label);
    assert.ok(labels.includes("Acknowledge"));
    assert.ok(labels.includes("Start"));
    assert.ok(!labels.includes("Verify"));
  });
  it("offers resume while paused", () => {
    assert.ok(staffActions("paused").some(a => a.label === "Resume"));
  });
});

describe("formatTask", () => {
  it("adds department and overdue labels without changing the stored status", () => {
    const row = formatTask({
      status: "in_progress",
      department: "HK",
      priority: "high",
      severity: "minor",
      due_at: "2020-01-01T00:00:00Z",
      started_at: "2026-09-03T10:00:00Z",
      pause_accumulated_ms: 0,
    }, new Date("2026-09-03T11:00:00Z"));
    assert.equal(row.status, "in_progress");
    assert.equal(row.status_label, "Overdue");
    assert.equal(row.department_label, "Housekeeping");
    assert.equal(row.overdue, true);
    assert.equal(row.actual_minutes, 60);
  });
});
