/** Shared house task engine.
 *  New tables only — does not replace guest requests, checklists, or maintenance tickets.
 *  Overdue is derived from due_at; it is never stored, so a status change never wipes history.
 */

import { departmentLabel, parseDepartment, type OpsDepartment } from "./board.ts";

export const TASK_STATUSES = [
  "new",
  "assigned",
  "acknowledged",
  "accepted",
  "scheduled",
  "in_progress",
  "paused",
  "waiting",
  "blocked",
  "awaiting_approval",
  "completed",
  "verified",
  "reopened",
  "cancelled",
] as const;

export type TaskStatus = (typeof TASK_STATUSES)[number];

export const TASK_PRIORITIES = ["low", "normal", "high", "urgent"] as const;
export type TaskPriority = (typeof TASK_PRIORITIES)[number];

export const TASK_SEVERITIES = ["none", "minor", "major", "critical"] as const;
export type TaskSeverity = (typeof TASK_SEVERITIES)[number];

export const CLOSED_TASK_STATUSES = new Set<TaskStatus>(["completed", "verified", "cancelled"]);

const STATUS_SET = new Set<string>(TASK_STATUSES);
const PRIORITY_SET = new Set<string>(TASK_PRIORITIES);
const SEVERITY_SET = new Set<string>(TASK_SEVERITIES);

const STATUS_LABEL: Record<TaskStatus, string> = {
  new: "New",
  assigned: "Assigned",
  acknowledged: "Acknowledged",
  accepted: "Accepted",
  scheduled: "Scheduled",
  in_progress: "In progress",
  paused: "Paused",
  waiting: "Waiting",
  blocked: "Blocked",
  awaiting_approval: "Awaiting approval",
  completed: "Completed",
  verified: "Verified",
  reopened: "Reopened",
  cancelled: "Cancelled",
};

const PRIORITY_LABEL: Record<TaskPriority, string> = {
  low: "Low",
  normal: "Normal",
  high: "High",
  urgent: "Urgent",
};

const SEVERITY_LABEL: Record<TaskSeverity, string> = {
  none: "None",
  minor: "Minor",
  major: "Major",
  critical: "Critical",
};

/** Allowed next statuses. History is never rewritten — only a new status is recorded. */
const TRANSITIONS: Record<TaskStatus, TaskStatus[]> = {
  new: ["assigned", "scheduled", "cancelled"],
  assigned: ["acknowledged", "accepted", "scheduled", "in_progress", "cancelled", "new"],
  acknowledged: ["accepted", "scheduled", "in_progress", "cancelled"],
  accepted: ["scheduled", "in_progress", "cancelled"],
  scheduled: ["in_progress", "assigned", "cancelled"],
  in_progress: ["paused", "waiting", "blocked", "awaiting_approval", "completed", "cancelled"],
  paused: ["in_progress", "waiting", "blocked", "cancelled"],
  waiting: ["in_progress", "blocked", "cancelled"],
  blocked: ["in_progress", "waiting", "cancelled"],
  awaiting_approval: ["verified", "completed", "in_progress", "cancelled"],
  completed: ["verified", "reopened"],
  verified: ["reopened"],
  reopened: ["assigned", "acknowledged", "accepted", "scheduled", "in_progress"],
  cancelled: ["reopened"],
};

export function isTaskStatus(v: unknown): v is TaskStatus {
  return typeof v === "string" && STATUS_SET.has(v);
}

export function parseTaskStatus(v: unknown, fallback: TaskStatus = "new"): TaskStatus {
  const raw = String(v ?? "").trim().toLowerCase().replace(/[\s-]+/g, "_");
  if (raw === "inprogress") return "in_progress";
  if (raw === "awaitingapproval") return "awaiting_approval";
  return isTaskStatus(raw) ? raw : fallback;
}

export function parseTaskPriority(v: unknown, fallback: TaskPriority = "normal"): TaskPriority {
  const raw = String(v ?? "").trim().toLowerCase();
  return PRIORITY_SET.has(raw) ? (raw as TaskPriority) : fallback;
}

export function parseTaskSeverity(v: unknown, fallback: TaskSeverity = "none"): TaskSeverity {
  const raw = String(v ?? "").trim().toLowerCase();
  return SEVERITY_SET.has(raw) ? (raw as TaskSeverity) : fallback;
}

export function taskStatusLabel(status: string): string {
  return isTaskStatus(status) ? STATUS_LABEL[status] : status;
}

export function taskPriorityLabel(priority: string): string {
  return PRIORITY_SET.has(priority) ? PRIORITY_LABEL[priority as TaskPriority] : priority;
}

export function taskSeverityLabel(severity: string): string {
  return SEVERITY_SET.has(severity) ? SEVERITY_LABEL[severity as TaskSeverity] : severity;
}

export function canTransition(from: TaskStatus, to: TaskStatus): boolean {
  if (from === to) return false;
  return TRANSITIONS[from].includes(to);
}

export function allowedTransitions(from: TaskStatus): TaskStatus[] {
  return TRANSITIONS[from];
}

export function isClosedTask(status: string): boolean {
  return isTaskStatus(status) && CLOSED_TASK_STATUSES.has(status);
}

export function isOverdue(input: { status: string; due_at?: string | Date | null }, now: Date = new Date()): boolean {
  if (!input.due_at || isClosedTask(input.status)) return false;
  const due = input.due_at instanceof Date ? input.due_at : new Date(input.due_at);
  if (Number.isNaN(due.getTime())) return false;
  return due.getTime() < now.getTime();
}

export function displayStatus(input: { status: string; due_at?: string | Date | null }, now?: Date): string {
  if (isOverdue(input, now)) return "Overdue";
  return taskStatusLabel(input.status);
}

export type TaskDraft = {
  title: string;
  notes: string;
  department: OpsDepartment;
  team: string;
  location_label: string;
  asset_label: string;
  room_label: string;
  guest_name: string;
  booking_id: string | null;
  event_label: string;
  sop_slug: string;
  parent_id: string | null;
  priority: TaskPriority;
  severity: TaskSeverity;
  due_at: string | null;
  start_at: string | null;
  expected_minutes: number | null;
  assigned_staff_id: string | null;
  assigned_staff_ids: string[];
  assigned_label: string;
  blocked_reason: string;
};

const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

export function parseUuid(v: unknown): string | null {
  const s = String(v ?? "").trim();
  return UUID.test(s) ? s : null;
}

function trim(v: unknown, max: number): string {
  return String(v ?? "").trim().slice(0, max);
}

function parseIso(v: unknown): string | null {
  const s = String(v ?? "").trim();
  if (!s) return null;
  const d = new Date(s);
  return Number.isNaN(d.getTime()) ? null : d.toISOString();
}

function parseMinutes(v: unknown): number | null {
  if (v === "" || v == null) return null;
  const n = Number(v);
  if (!Number.isFinite(n) || n < 0 || n > 20_000) return null;
  return Math.round(n);
}

function parseUuidList(v: unknown): string[] {
  const raw = Array.isArray(v) ? v : typeof v === "string" ? v.split(",") : [];
  const ids = raw.map(parseUuid).filter((id): id is string => !!id);
  return [...new Set(ids)].slice(0, 20);
}

export function sanitizeTaskInput(body: Record<string, unknown> | null | undefined): TaskDraft {
  const src = body ?? {};
  const assigned_staff_id = parseUuid(src.assigned_staff_id);
  const extra = parseUuidList(src.assigned_staff_ids);
  const assigned_staff_ids = assigned_staff_id
    ? [...new Set([assigned_staff_id, ...extra])]
    : extra;
  return {
    title: trim(src.title, 200),
    notes: trim(src.notes, 8000),
    department: parseDepartment(src.department, "HOUSE"),
    team: trim(src.team, 80),
    location_label: trim(src.location_label, 120),
    asset_label: trim(src.asset_label, 120),
    room_label: trim(src.room_label, 40),
    guest_name: trim(src.guest_name, 120),
    booking_id: parseUuid(src.booking_id),
    event_label: trim(src.event_label, 160),
    sop_slug: trim(src.sop_slug, 80),
    parent_id: parseUuid(src.parent_id),
    priority: parseTaskPriority(src.priority),
    severity: parseTaskSeverity(src.severity),
    due_at: parseIso(src.due_at),
    start_at: parseIso(src.start_at),
    expected_minutes: parseMinutes(src.expected_minutes),
    assigned_staff_id,
    assigned_staff_ids,
    assigned_label: trim(src.assigned_label, 120),
    blocked_reason: trim(src.blocked_reason, 400),
  };
}

export function initialStatus(draft: Pick<TaskDraft, "assigned_staff_id" | "assigned_staff_ids" | "assigned_label" | "team" | "start_at">): TaskStatus {
  if (draft.start_at) return "scheduled";
  if (draft.assigned_staff_id || draft.assigned_staff_ids.length || draft.assigned_label || draft.team) return "assigned";
  return "new";
}

export function actualMinutes(input: {
  started_at?: string | Date | null;
  finished_at?: string | Date | null;
  paused_at?: string | Date | null;
  pause_accumulated_ms?: number | string | null;
  status?: string;
}, now: Date = new Date()): number | null {
  if (!input.started_at) return null;
  const start = input.started_at instanceof Date ? input.started_at : new Date(input.started_at);
  if (Number.isNaN(start.getTime())) return null;
  const end = input.finished_at
    ? (input.finished_at instanceof Date ? input.finished_at : new Date(input.finished_at))
    : now;
  let pause = Number(input.pause_accumulated_ms ?? 0);
  if (!Number.isFinite(pause) || pause < 0) pause = 0;
  if (input.status === "paused" && input.paused_at) {
    const p = input.paused_at instanceof Date ? input.paused_at : new Date(input.paused_at);
    if (!Number.isNaN(p.getTime())) pause += Math.max(0, end.getTime() - p.getTime());
  }
  const ms = end.getTime() - start.getTime() - pause;
  return Math.max(0, Math.round(ms / 60_000));
}

export function pausePatch(current: { status: string; paused_at?: string | Date | null; pause_accumulated_ms?: number | string | null }, next: TaskStatus, now: Date = new Date()): {
  paused_at: Date | null;
  pause_accumulated_ms: number;
  started_at_touch: boolean;
  finished_at: Date | null;
} {
  let pause = Number(current.pause_accumulated_ms ?? 0);
  if (!Number.isFinite(pause) || pause < 0) pause = 0;
  if (current.status === "paused" && current.paused_at && next !== "paused") {
    const p = current.paused_at instanceof Date ? current.paused_at : new Date(current.paused_at);
    if (!Number.isNaN(p.getTime())) pause += Math.max(0, now.getTime() - p.getTime());
  }
  const enteringWork = next === "in_progress" && current.status !== "in_progress";
  const closing = CLOSED_TASK_STATUSES.has(next);
  return {
    paused_at: next === "paused" ? now : null,
    pause_accumulated_ms: pause,
    started_at_touch: enteringWork,
    finished_at: closing ? now : null,
  };
}

export type StaffAction = { status: TaskStatus; label: string };

/** Few-tap actions for pocket and the house list. Managers still see the full machine. */
export function staffActions(status: TaskStatus): StaffAction[] {
  const all: StaffAction[] = [];
  const add = (s: TaskStatus, label: string) => {
    if (canTransition(status, s)) all.push({ status: s, label });
  };
  add("acknowledged", "Acknowledge");
  add("accepted", "Accept");
  add("in_progress", status === "paused" ? "Resume" : "Start");
  add("paused", "Pause");
  add("waiting", "Waiting");
  add("blocked", "Blocked");
  add("completed", "Complete");
  add("awaiting_approval", "Send for approval");
  return all;
}

export function managerActions(status: TaskStatus): StaffAction[] {
  const all: StaffAction[] = [];
  const add = (s: TaskStatus, label: string) => {
    if (canTransition(status, s)) all.push({ status: s, label });
  };
  add("verified", "Verify");
  add("reopened", "Reopen");
  add("cancelled", "Cancel");
  add("assigned", "Mark assigned");
  add("scheduled", "Schedule");
  return all;
}

export function formatTask<T extends {
  status: string;
  department: string;
  priority: string;
  severity: string;
  due_at?: string | Date | null;
  started_at?: string | Date | null;
  finished_at?: string | Date | null;
  paused_at?: string | Date | null;
  pause_accumulated_ms?: number | string | null;
  expected_minutes?: number | null;
}>(row: T, now: Date = new Date()) {
  const overdue = isOverdue(row, now);
  return {
    ...row,
    department_label: departmentLabel(row.department),
    status_label: overdue ? "Overdue" : taskStatusLabel(row.status),
    priority_label: taskPriorityLabel(row.priority),
    severity_label: taskSeverityLabel(row.severity),
    overdue,
    actual_minutes: actualMinutes(row, now),
    next: staffActions(parseTaskStatus(row.status)),
  };
}

export const TASK_CATALOGUE = {
  statuses: TASK_STATUSES.map(code => ({ code, label: STATUS_LABEL[code] })),
  priorities: TASK_PRIORITIES.map(code => ({ code, label: PRIORITY_LABEL[code] })),
  severities: TASK_SEVERITIES.map(code => ({ code, label: SEVERITY_LABEL[code] })),
};
