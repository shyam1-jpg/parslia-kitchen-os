/**
 * Shared house task engine. Additive — existing house log, guest requests,
 * checklists and maintenance tickets are unchanged.
 */
import type { FastifyInstance } from "fastify";
import { pool } from "./db.ts";
import { requireActor, problem } from "./auth.ts";
import { OPS_DEPARTMENTS } from "../../../domains/ops/board.ts";
import {
  TASK_CATALOGUE,
  actualMinutes,
  canTransition,
  formatTask,
  initialStatus,
  parseTaskStatus,
  parseUuid,
  pausePatch,
  sanitizeTaskInput,
  type TaskStatus,
} from "../../../domains/ops/tasks.ts";

const PHOTO_MAX = 700_000;
const TRACKED_FIELDS = [
  "title", "notes", "department", "team", "location_label", "asset_label", "room_label",
  "guest_name", "booking_id", "event_label", "sop_slug", "parent_id", "priority", "severity",
  "due_at", "start_at", "expected_minutes", "assigned_staff_id", "assigned_label",
  "blocked_reason", "verification_note", "approval_note",
] as const;

async function requireTaskReader(req: any, reply: any) {
  const a = await requireActor(req, reply, ["ADMIN", "STAFF"]);
  if (!a) return null;
  if (a.perms.has("task.read") || a.perms.has("group.read") || a.perms.has("cover.read")) return a;
  reply.code(403).send(problem(403, "forbidden", "You cannot open house tasks"));
  return null;
}

async function requireTaskWriter(req: any, reply: any) {
  const a = await requireTaskReader(req, reply);
  if (!a) return null;
  if (a.perms.has("task.write") || a.perms.has("group.read") || a.perms.has("cover.read")) return a;
  reply.code(403).send(problem(403, "forbidden", "You cannot change house tasks"));
  return null;
}

function canAssign(a: { perms: Set<string> }) {
  return a.perms.has("task.assign") || a.perms.has("cover.write") || a.perms.has("group.update") || a.perms.has("user.manage");
}

function canApprove(a: { perms: Set<string> }) {
  return a.perms.has("task.approve") || a.perms.has("sop.manage") || a.perms.has("user.manage") || a.perms.has("package.manage");
}

function shape(row: any, now = new Date()) {
  const formatted = formatTask(row, now);
  return {
    id: row.id,
    title: row.title,
    notes: row.notes,
    department: row.department,
    department_label: formatted.department_label,
    team: row.team,
    location_label: row.location_label,
    asset_label: row.asset_label,
    room_label: row.room_label,
    guest_name: row.guest_name,
    booking_id: row.booking_id,
    event_label: row.event_label,
    sop_slug: row.sop_slug,
    parent_id: row.parent_id,
    priority: row.priority,
    priority_label: formatted.priority_label,
    severity: row.severity,
    severity_label: formatted.severity_label,
    status: row.status,
    status_label: formatted.status_label,
    overdue: formatted.overdue,
    due_at: row.due_at,
    start_at: row.start_at,
    started_at: row.started_at,
    finished_at: row.finished_at,
    expected_minutes: row.expected_minutes,
    actual_minutes: formatted.actual_minutes,
    blocked_reason: row.blocked_reason,
    assigned_staff_id: row.assigned_staff_id,
    assigned_staff_ids: row.assigned_staff_ids ?? [],
    assigned_label: row.assigned_label,
    assigned_name: row.assigned_name ?? null,
    created_by: row.created_by,
    created_by_name: row.created_by_name ?? null,
    verification_note: row.verification_note,
    approval_note: row.approval_note,
    source: row.source,
    created_at: row.created_at,
    updated_at: row.updated_at,
    next: formatted.next,
  };
}

const TASK_SELECT = `
  t.id, t.title, t.notes, t.department, t.team, t.location_label, t.asset_label, t.room_label,
  t.guest_name, t.booking_id, t.event_label, t.sop_slug, t.parent_id, t.priority, t.severity,
  t.status, t.due_at, t.start_at, t.started_at, t.finished_at, t.expected_minutes,
  t.paused_at, t.pause_accumulated_ms, t.blocked_reason, t.created_by, t.assigned_staff_id,
  t.assigned_staff_ids, t.assigned_label, t.verification_note, t.approval_note, t.source,
  t.created_at, t.updated_at,
  au.display_name assigned_name,
  cu.display_name created_by_name
`;

async function loadTask(propertyId: string, id: string) {
  const r = await pool.query(
    `select ${TASK_SELECT}
     from ops_task t
     left join app_user au on au.id = t.assigned_staff_id
     left join app_user cu on cu.id = t.created_by
     where t.property_id = $1 and t.id = $2`,
    [propertyId, id],
  );
  return r.rows[0] ?? null;
}

async function writeEvent(opts: {
  tenantId: string;
  propertyId: string;
  taskId: string;
  actorId: string;
  actorName: string;
  kind: string;
  from_status?: string | null;
  to_status?: string | null;
  field_name?: string | null;
  previous_value?: string | null;
  new_value?: string | null;
  body?: string;
  attachment_kind?: string | null;
}) {
  await pool.query(
    `insert into ops_task_event
      (task_id, tenant_id, property_id, kind, actor_id, actor_name, from_status, to_status,
       field_name, previous_value, new_value, body, attachment_kind)
     values ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13)`,
    [
      opts.taskId, opts.tenantId, opts.propertyId, opts.kind, opts.actorId, opts.actorName,
      opts.from_status ?? null, opts.to_status ?? null, opts.field_name ?? null,
      opts.previous_value ?? null, opts.new_value ?? null, opts.body ?? "", opts.attachment_kind ?? null,
    ],
  );
}

function asText(v: unknown): string {
  if (v == null) return "";
  if (Array.isArray(v)) return v.join(",");
  if (v instanceof Date) return v.toISOString();
  return String(v);
}

export default async function tasks(f: FastifyInstance) {
  f.get("/v1/ops/tasks", async (req: any, reply) => {
    const a = await requireTaskReader(req, reply); if (!a) return;
    const q = req.query ?? {};
    const department = String(q.department ?? "").trim().toUpperCase();
    const status = String(q.status ?? "").trim().toLowerCase();
    const mine = String(q.mine ?? "") === "1" || String(q.mine ?? "") === "true";
    const overdueOnly = String(q.overdue ?? "") === "1" || String(q.overdue ?? "") === "true";
    const search = String(q.q ?? "").trim();
    const parent = parseUuid(q.parent_id);
    const limit = Math.min(100, Math.max(1, Number(q.limit) || 80));
    const offset = Math.max(0, Number(q.offset) || 0);
    const params: unknown[] = [a.propertyId];
    const where = ["t.property_id = $1"];
    if (department && department !== "ALL") {
      params.push(department);
      where.push(`t.department = $${params.length}`);
    }
    if (status === "done" || status === "closed") {
      where.push(`t.status in ('completed','verified')`);
    } else if (status && status !== "all" && status !== "overdue") {
      params.push(status);
      where.push(`t.status = $${params.length}`);
    }
    if (mine) {
      params.push(a.userId);
      where.push(`(t.assigned_staff_id = $${params.length} or $${params.length} = any(t.assigned_staff_ids))`);
    }
    if (overdueOnly) {
      where.push(`t.due_at is not null and t.due_at < now() and t.status not in ('completed','verified','cancelled')`);
    }
    if (parent) {
      params.push(parent);
      where.push(`t.parent_id = $${params.length}`);
    }
    if (search) {
      params.push(`%${search.replace(/[%_]/g, "")}%`);
      where.push(`(t.title ilike $${params.length} or t.notes ilike $${params.length} or t.room_label ilike $${params.length} or t.guest_name ilike $${params.length})`);
    }
    const rows = (await pool.query(
      `select ${TASK_SELECT}
       from ops_task t
       left join app_user au on au.id = t.assigned_staff_id
       left join app_user cu on cu.id = t.created_by
       where ${where.join(" and ")}
       order by
         case when t.status in ('completed','verified','cancelled') then 1 else 0 end,
         t.due_at nulls last,
         t.created_at desc
       limit ${limit} offset ${offset}`,
      params,
    )).rows;
    const now = new Date();
    const items = rows.map(r => shape(r, now));
    const counts = (await pool.query(
      `select
         count(*)::int total,
         count(*) filter (where status not in ('completed','verified','cancelled'))::int open,
         count(*) filter (where status in ('completed','verified'))::int done,
         count(*) filter (where due_at is not null and due_at < now() and status not in ('completed','verified','cancelled'))::int overdue
       from ops_task where property_id = $1`,
      [a.propertyId],
    )).rows[0];
    return {
      items,
      counts,
      departments: OPS_DEPARTMENTS,
      ...TASK_CATALOGUE,
      can_assign: canAssign(a),
      can_approve: canApprove(a),
    };
  });

  f.get("/v1/ops/tasks/people", async (req, reply) => {
    const a = await requireTaskReader(req, reply); if (!a) return;
    const rows = (await pool.query(
      `select distinct on (u.id) u.id, u.display_name as name, r.name as role_name
       from app_user u
       join membership m on m.user_id = u.id and m.property_id = $1
       join role r on r.id = m.role_id
       where u.status = 'ACTIVE'
       order by u.id, u.display_name`,
      [a.propertyId],
    )).rows;
    return { items: rows.sort((x: { name: string }, y: { name: string }) => x.name.localeCompare(y.name)) };
  });

  f.get("/v1/ops/tasks/:id", async (req: any, reply) => {
    const a = await requireTaskReader(req, reply); if (!a) return;
    const row = await loadTask(a.propertyId, req.params.id);
    if (!row) return reply.code(404).send(problem(404, "not_found", "That task is not on the house list"));
    const events = (await pool.query(
      `select id, kind, actor_name, from_status, to_status, field_name, previous_value, new_value,
              body, attachment_kind, created_at
       from ops_task_event
       where task_id = $1
       order by created_at asc`,
      [row.id],
    )).rows.map((e: any) => ({
      ...e,
      body: e.attachment_kind ? (String(e.body ?? "").startsWith("data:") ? e.body : "") : e.body,
    }));
    const children = (await pool.query(
      `select ${TASK_SELECT}
       from ops_task t
       left join app_user au on au.id = t.assigned_staff_id
       left join app_user cu on cu.id = t.created_by
       where t.property_id = $1 and t.parent_id = $2
       order by t.created_at`,
      [a.propertyId, row.id],
    )).rows.map((c: any) => shape(c));
    return { ...shape(row), events, children, can_assign: canAssign(a), can_approve: canApprove(a) };
  });

  f.post("/v1/ops/tasks", async (req: any, reply) => {
    const a = await requireTaskWriter(req, reply); if (!a) return;
    const draft = sanitizeTaskInput(req.body);
    if (!draft.title) return reply.code(422).send(problem(422, "validation", "Give the task a title"));
    if (draft.assigned_staff_id && draft.assigned_staff_id !== a.userId && !canAssign(a)) {
      return reply.code(403).send(problem(403, "forbidden", "You can assign a task to yourself, not to someone else"));
    }
    const status = initialStatus(draft);
    const r = await pool.query(
      `insert into ops_task (
         tenant_id, property_id, title, notes, department, team, location_label, asset_label,
         room_label, guest_name, booking_id, event_label, sop_slug, parent_id, priority, severity,
         status, due_at, start_at, expected_minutes, blocked_reason, created_by, assigned_staff_id,
         assigned_staff_ids, assigned_label, source
       ) values (
         $1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13,$14,$15,$16,$17,$18,$19,$20,$21,$22,$23,$24,$25,'house'
       ) returning id`,
      [
        a.tenantId, a.propertyId, draft.title, draft.notes, draft.department, draft.team,
        draft.location_label, draft.asset_label, draft.room_label, draft.guest_name, draft.booking_id,
        draft.event_label, draft.sop_slug, draft.parent_id, draft.priority, draft.severity, status,
        draft.due_at, draft.start_at, draft.expected_minutes, draft.blocked_reason, a.userId,
        draft.assigned_staff_id, draft.assigned_staff_ids, draft.assigned_label,
      ],
    );
    await writeEvent({
      tenantId: a.tenantId, propertyId: a.propertyId, taskId: r.rows[0].id,
      actorId: a.userId, actorName: a.name, kind: "status", from_status: null, to_status: status,
      body: "Task opened",
    });
    reply.code(201);
    return shape(await loadTask(a.propertyId, r.rows[0].id));
  });

  f.patch("/v1/ops/tasks/:id", async (req: any, reply) => {
    const a = await requireTaskWriter(req, reply); if (!a) return;
    const current = await loadTask(a.propertyId, req.params.id);
    if (!current) return reply.code(404).send(problem(404, "not_found", "That task is not on the house list"));
    const draft = sanitizeTaskInput({ ...current, ...(req.body ?? {}) });
    if (!draft.title) return reply.code(422).send(problem(422, "validation", "Give the task a title"));
    const nextAssignee = parseUuid(req.body?.assigned_staff_id) ?? draft.assigned_staff_id;
    if (nextAssignee && nextAssignee !== current.assigned_staff_id && nextAssignee !== a.userId && !canAssign(a)) {
      return reply.code(403).send(problem(403, "forbidden", "You can take a task yourself, not reassign it"));
    }
    const next = {
      title: draft.title,
      notes: "notes" in (req.body ?? {}) ? draft.notes : current.notes,
      department: "department" in (req.body ?? {}) ? draft.department : current.department,
      team: "team" in (req.body ?? {}) ? draft.team : current.team,
      location_label: "location_label" in (req.body ?? {}) ? draft.location_label : current.location_label,
      asset_label: "asset_label" in (req.body ?? {}) ? draft.asset_label : current.asset_label,
      room_label: "room_label" in (req.body ?? {}) ? draft.room_label : current.room_label,
      guest_name: "guest_name" in (req.body ?? {}) ? draft.guest_name : current.guest_name,
      booking_id: "booking_id" in (req.body ?? {}) ? draft.booking_id : current.booking_id,
      event_label: "event_label" in (req.body ?? {}) ? draft.event_label : current.event_label,
      sop_slug: "sop_slug" in (req.body ?? {}) ? draft.sop_slug : current.sop_slug,
      parent_id: "parent_id" in (req.body ?? {}) ? draft.parent_id : current.parent_id,
      priority: "priority" in (req.body ?? {}) ? draft.priority : current.priority,
      severity: "severity" in (req.body ?? {}) ? draft.severity : current.severity,
      due_at: "due_at" in (req.body ?? {}) ? draft.due_at : current.due_at,
      start_at: "start_at" in (req.body ?? {}) ? draft.start_at : current.start_at,
      expected_minutes: "expected_minutes" in (req.body ?? {}) ? draft.expected_minutes : current.expected_minutes,
      assigned_staff_id: "assigned_staff_id" in (req.body ?? {}) ? draft.assigned_staff_id : current.assigned_staff_id,
      assigned_staff_ids: "assigned_staff_ids" in (req.body ?? {}) ? draft.assigned_staff_ids : current.assigned_staff_ids,
      assigned_label: "assigned_label" in (req.body ?? {}) ? draft.assigned_label : current.assigned_label,
      blocked_reason: "blocked_reason" in (req.body ?? {}) ? draft.blocked_reason : current.blocked_reason,
      verification_note: typeof req.body?.verification_note === "string" ? String(req.body.verification_note).trim().slice(0, 800) : current.verification_note,
      approval_note: typeof req.body?.approval_note === "string" ? String(req.body.approval_note).trim().slice(0, 800) : current.approval_note,
    };
    await pool.query(
      `update ops_task set
         title=$3, notes=$4, department=$5, team=$6, location_label=$7, asset_label=$8,
         room_label=$9, guest_name=$10, booking_id=$11, event_label=$12, sop_slug=$13, parent_id=$14,
         priority=$15, severity=$16, due_at=$17, start_at=$18, expected_minutes=$19,
         assigned_staff_id=$20, assigned_staff_ids=$21, assigned_label=$22, blocked_reason=$23,
         verification_note=$24, approval_note=$25, updated_at=now()
       where property_id=$1 and id=$2`,
      [
        a.propertyId, current.id, next.title, next.notes, next.department, next.team,
        next.location_label, next.asset_label, next.room_label, next.guest_name, next.booking_id,
        next.event_label, next.sop_slug, next.parent_id, next.priority, next.severity, next.due_at,
        next.start_at, next.expected_minutes, next.assigned_staff_id, next.assigned_staff_ids,
        next.assigned_label, next.blocked_reason, next.verification_note, next.approval_note,
      ],
    );
    for (const field of TRACKED_FIELDS) {
      const prev = asText(current[field]);
      const neu = asText((next as any)[field]);
      if (prev === neu) continue;
      await writeEvent({
        tenantId: a.tenantId, propertyId: a.propertyId, taskId: current.id,
        actorId: a.userId, actorName: a.name, kind: "field", field_name: field,
        previous_value: prev, new_value: neu,
      });
    }
    if (next.assigned_staff_id !== current.assigned_staff_id || next.assigned_label !== current.assigned_label) {
      await writeEvent({
        tenantId: a.tenantId, propertyId: a.propertyId, taskId: current.id,
        actorId: a.userId, actorName: a.name, kind: "assignment",
        previous_value: current.assigned_label || current.assigned_name || "",
        new_value: next.assigned_label || next.assigned_staff_id || "",
      });
    }
    return shape(await loadTask(a.propertyId, current.id));
  });

  f.post("/v1/ops/tasks/:id/status", async (req: any, reply) => {
    const a = await requireTaskWriter(req, reply); if (!a) return;
    const current = await loadTask(a.propertyId, req.params.id);
    if (!current) return reply.code(404).send(problem(404, "not_found", "That task is not on the house list"));
    const next = parseTaskStatus(req.body?.status, current.status) as TaskStatus;
    if (next === current.status) return shape(current);
    if (!canTransition(current.status, next)) {
      return reply.code(409).send(problem(409, "invalid_transition", `Cannot move a ${current.status.replace(/_/g, " ")} task to ${next.replace(/_/g, " ")}`));
    }
    if ((next === "verified" || next === "cancelled" || next === "reopened") && !canApprove(a)) {
      return reply.code(403).send(problem(403, "forbidden", "A manager verifies, cancels or reopens this task"));
    }
    const now = new Date();
    const patch = pausePatch(current, next, now);
    const blocked = next === "blocked" ? String(req.body?.blocked_reason ?? current.blocked_reason ?? "").trim().slice(0, 400) : current.blocked_reason;
    await pool.query(
      `update ops_task set
         status=$3,
         paused_at=$4,
         pause_accumulated_ms=$5,
         started_at = coalesce(started_at, case when $6 then $7::timestamptz else null end),
         finished_at=$8,
         blocked_reason=$9,
         updated_at=now()
       where property_id=$1 and id=$2`,
      [
        a.propertyId, current.id, next, patch.paused_at, patch.pause_accumulated_ms,
        patch.started_at_touch, now, patch.finished_at, blocked,
      ],
    );
    if (current.status === "new" && next === "assigned" && !current.assigned_staff_id) {
      await pool.query(`update ops_task set assigned_staff_id=$2, updated_at=now() where id=$1`, [current.id, a.userId]);
    }
    await writeEvent({
      tenantId: a.tenantId, propertyId: a.propertyId, taskId: current.id,
      actorId: a.userId, actorName: a.name, kind: "status",
      from_status: current.status, to_status: next,
      body: String(req.body?.note ?? "").trim().slice(0, 800),
    });
    const updated = await loadTask(a.propertyId, current.id);
    return { ...shape(updated), actual_minutes: actualMinutes(updated, now) };
  });

  f.post("/v1/ops/tasks/:id/comment", async (req: any, reply) => {
    const a = await requireTaskWriter(req, reply); if (!a) return;
    const current = await loadTask(a.propertyId, req.params.id);
    if (!current) return reply.code(404).send(problem(404, "not_found", "That task is not on the house list"));
    const body = String(req.body?.body ?? "").trim();
    if (!body) return reply.code(422).send(problem(422, "validation", "Write a comment"));
    await writeEvent({
      tenantId: a.tenantId, propertyId: a.propertyId, taskId: current.id,
      actorId: a.userId, actorName: a.name, kind: "comment", body: body.slice(0, 4000),
    });
    await pool.query(`update ops_task set updated_at=now() where id=$1`, [current.id]);
    return { ok: true };
  });

  f.post("/v1/ops/tasks/:id/attachment", async (req: any, reply) => {
    const a = await requireTaskWriter(req, reply); if (!a) return;
    const current = await loadTask(a.propertyId, req.params.id);
    if (!current) return reply.code(404).send(problem(404, "not_found", "That task is not on the house list"));
    const data = String(req.body?.data ?? req.body?.image_data ?? "");
    const kind = String(req.body?.kind ?? "photo").toLowerCase();
    const allowed = ["photo", "video", "voice", "signature"];
    if (!allowed.includes(kind)) return reply.code(422).send(problem(422, "validation", "Attach a photo, video, voice note or signature"));
    if (!data.startsWith("data:")) return reply.code(422).send(problem(422, "validation", "Choose a file from this device"));
    if (data.length > PHOTO_MAX) return reply.code(422).send(problem(422, "validation", "That file is too large — use a smaller one"));
    await writeEvent({
      tenantId: a.tenantId, propertyId: a.propertyId, taskId: current.id,
      actorId: a.userId, actorName: a.name, kind: "attachment",
      body: data, attachment_kind: kind,
    });
    await pool.query(`update ops_task set updated_at=now() where id=$1`, [current.id]);
    return { ok: true };
  });

  f.post("/v1/ops/tasks/:id/approve", async (req: any, reply) => {
    const a = await requireTaskWriter(req, reply); if (!a) return;
    if (!canApprove(a)) return reply.code(403).send(problem(403, "forbidden", "A manager approves this task"));
    const current = await loadTask(a.propertyId, req.params.id);
    if (!current) return reply.code(404).send(problem(404, "not_found", "That task is not on the house list"));
    const target: TaskStatus = current.status === "in_progress" ? "awaiting_approval" : "verified";
    if (!canTransition(current.status, target)) {
      return reply.code(409).send(problem(409, "invalid_transition", "This task is not ready to approve yet"));
    }
    const note = String(req.body?.note ?? "").trim().slice(0, 800);
    const now = new Date();
    const patch = pausePatch(current, target, now);
    await pool.query(
      `update ops_task set status=$3, approval_note=$4, paused_at=$5, pause_accumulated_ms=$6,
         finished_at=$7, updated_at=now()
       where property_id=$1 and id=$2`,
      [a.propertyId, current.id, target, note, patch.paused_at, patch.pause_accumulated_ms, patch.finished_at],
    );
    await writeEvent({
      tenantId: a.tenantId, propertyId: a.propertyId, taskId: current.id,
      actorId: a.userId, actorName: a.name, kind: "approval",
      from_status: current.status, to_status: target, body: note,
    });
    return shape(await loadTask(a.propertyId, current.id));
  });

  f.post("/v1/ops/tasks/:id/verify", async (req: any, reply) => {
    const a = await requireTaskWriter(req, reply); if (!a) return;
    if (!canApprove(a)) return reply.code(403).send(problem(403, "forbidden", "A manager verifies this task"));
    const current = await loadTask(a.propertyId, req.params.id);
    if (!current) return reply.code(404).send(problem(404, "not_found", "That task is not on the house list"));
    if (!canTransition(current.status, "verified")) {
      return reply.code(409).send(problem(409, "invalid_transition", "Verify after the work is complete or awaiting approval"));
    }
    const note = String(req.body?.note ?? "").trim().slice(0, 800);
    const now = new Date();
    const patch = pausePatch(current, "verified", now);
    await pool.query(
      `update ops_task set status='verified', verification_note=$3, paused_at=$4,
         pause_accumulated_ms=$5, finished_at=$6, updated_at=now()
       where property_id=$1 and id=$2`,
      [a.propertyId, current.id, note, patch.paused_at, patch.pause_accumulated_ms, patch.finished_at],
    );
    await writeEvent({
      tenantId: a.tenantId, propertyId: a.propertyId, taskId: current.id,
      actorId: a.userId, actorName: a.name, kind: "verification",
      from_status: current.status, to_status: "verified", body: note,
    });
    return shape(await loadTask(a.propertyId, current.id));
  });

  f.post("/v1/ops/tasks/:id/reopen", async (req: any, reply) => {
    const a = await requireTaskWriter(req, reply); if (!a) return;
    if (!canApprove(a)) return reply.code(403).send(problem(403, "forbidden", "A manager reopens this task"));
    const current = await loadTask(a.propertyId, req.params.id);
    if (!current) return reply.code(404).send(problem(404, "not_found", "That task is not on the house list"));
    if (!canTransition(current.status, "reopened")) {
      return reply.code(409).send(problem(409, "invalid_transition", "Only a finished or cancelled task can be reopened"));
    }
    const note = String(req.body?.note ?? "").trim().slice(0, 800);
    await pool.query(
      `update ops_task set status='reopened', finished_at=null, updated_at=now()
       where property_id=$1 and id=$2`,
      [a.propertyId, current.id],
    );
    await writeEvent({
      tenantId: a.tenantId, propertyId: a.propertyId, taskId: current.id,
      actorId: a.userId, actorName: a.name, kind: "status",
      from_status: current.status, to_status: "reopened", body: note,
    });
    return shape(await loadTask(a.propertyId, current.id));
  });
}
