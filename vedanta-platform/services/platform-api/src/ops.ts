/**
 * House log — shift handover, daily checklists, notices, guest requests.
 * House (ADMIN) and pocket (STAFF) share the same board. Guests never see it.
 */
import type { FastifyInstance } from "fastify";
import { pool } from "./db.ts";
import { requireActor, problem } from "./auth.ts";
import {
  checklistProgress,
  departmentLabel,
  OPS_DEPARTMENTS,
  parseDepartment,
  parseRequestStatus,
  parseShift,
  routeGuestRequest,
  shiftLabel,
} from "../../../domains/ops/board.ts";

async function londonDate(): Promise<string> {
  const r = await pool.query(`select (timezone('Europe/London', now()))::date::text t`);
  return r.rows[0].t;
}

async function requireLogActor(req: any, reply: any) {
  const a = await requireActor(req, reply, ["ADMIN", "STAFF"]);
  if (!a) return null;
  if (a.perms.has("group.read") || a.perms.has("cover.read")) return a;
  reply.code(403).send(problem(403, "forbidden", "You cannot open the house log"));
  return null;
}

function shapeBoard(
  date: string,
  handover: any[],
  notices: any[],
  checks: any[],
  ticks: { item_id: string; done: boolean; done_by_name: string | null }[],
  requests: any[],
) {
  const tickByItem = new Map(ticks.map(t => [t.item_id, t]));
  const checklists = checks.map(item => {
    const tick = tickByItem.get(item.id);
    return {
      id: item.id,
      department: item.department,
      department_label: departmentLabel(item.department),
      title: item.title,
      due_time: item.due_time ?? null,
      done: Boolean(tick?.done),
      done_by_name: tick?.done_by_name ?? null,
    };
  });
  const progress = checklistProgress(checklists);
  return {
    date,
    departments: OPS_DEPARTMENTS,
    progress,
    handover: handover.map(row => ({
      id: row.id,
      department: row.department,
      department_label: departmentLabel(row.department),
      shift: row.shift,
      shift_label: shiftLabel(row.shift),
      for_date: row.for_date,
      body: row.body,
      author_name: row.author_name,
      created_at: row.created_at,
    })),
    notices: notices.map(row => ({
      id: row.id,
      department: row.department,
      department_label: departmentLabel(row.department),
      title: row.title,
      body: row.body,
      author_name: row.author_name,
      pinned: row.pinned,
      created_at: row.created_at,
    })),
    checklists,
    guest_requests: requests.map(row => ({
      id: row.id,
      guest_name: row.guest_name,
      room_label: row.room_label,
      department: row.department,
      department_label: departmentLabel(row.department),
      request_text: row.request_text,
      status: row.status,
      created_at: row.created_at,
    })),
  };
}

async function loadBoard(propertyId: string, date: string) {
  const [handover, notices, checks, ticks, requests] = await Promise.all([
    pool.query(
      `select id, department, shift, for_date::text, body, author_name, created_at
       from ops_handover
       where property_id = $1 and for_date >= $2::date - 1
       order by created_at desc
       limit 40`,
      [propertyId, date],
    ),
    pool.query(
      `select id, department, title, body, author_name, pinned, created_at
       from ops_notice
       where property_id = $1
       order by pinned desc, created_at desc
       limit 20`,
      [propertyId],
    ),
    pool.query(
      `select id, department, title, sort_order, to_char(due_time,'HH24:MI') due_time
       from ops_checklist_item
       where property_id = $1 and active = true
       order by department, sort_order, title`,
      [propertyId],
    ),
    pool.query(
      `select item_id::text, done, done_by_name
       from ops_checklist_tick
       where property_id = $1 and for_date = $2`,
      [propertyId, date],
    ),
    pool.query(
      `select id, guest_name, room_label, department, request_text, status, created_at
       from ops_guest_request
       where property_id = $1 and status <> 'done'
       order by created_at desc
       limit 40`,
      [propertyId],
    ),
  ]);
  return shapeBoard(date, handover.rows, notices.rows, checks.rows, ticks.rows, requests.rows);
}

export default async function ops(f: FastifyInstance) {
  f.get("/v1/ops/board", async (req, reply) => {
    const a = await requireLogActor(req, reply); if (!a) return;
    return loadBoard(a.propertyId, await londonDate());
  });

  f.post("/v1/ops/handover", async (req: any, reply) => {
    const a = await requireLogActor(req, reply); if (!a) return;
    const note = String(req.body?.body ?? "").trim();
    if (!note) return reply.code(422).send(problem(422, "validation", "Write the handover note"));
    const department = parseDepartment(req.body?.department, "HOUSE");
    const shift = parseShift(req.body?.shift);
    const r = await pool.query(
      `insert into ops_handover (tenant_id, property_id, department, shift, for_date, body, author_user_id, author_name)
       values ($1, $2, $3, $4, (timezone('Europe/London', now()))::date, $5, $6, $7)
       returning id`,
      [a.tenantId, a.propertyId, department, shift, note, a.userId, a.name],
    );
    return { id: r.rows[0].id };
  });

  f.post("/v1/ops/notices", async (req: any, reply) => {
    const a = await requireLogActor(req, reply); if (!a) return;
    const title = String(req.body?.title ?? "").trim();
    const body = String(req.body?.body ?? "").trim();
    if (!title || !body) return reply.code(422).send(problem(422, "validation", "Title and note are required"));
    const department = req.body?.department ? parseDepartment(req.body.department, "HOUSE") : null;
    const r = await pool.query(
      `insert into ops_notice (tenant_id, property_id, department, title, body, author_user_id, author_name, pinned)
       values ($1, $2, $3, $4, $5, $6, $7, $8)
       returning id`,
      [a.tenantId, a.propertyId, department, title, body, a.userId, a.name, Boolean(req.body?.pinned)],
    );
    return { id: r.rows[0].id };
  });

  f.post("/v1/ops/checklists/:id/tick", async (req: any, reply) => {
    const a = await requireLogActor(req, reply); if (!a) return;
    const done = req.body?.done !== false;
    const owned = (await pool.query(
      `select id from ops_checklist_item where id=$1 and property_id=$2`,
      [req.params.id, a.propertyId],
    )).rows[0];
    if (!owned) return reply.code(404).send(problem(404, "not_found", "No such checklist item"));
    await pool.query(
      `insert into ops_checklist_tick (tenant_id, property_id, item_id, for_date, done, done_by_user_id, done_by_name, done_at)
       values ($1, $2, $3, (timezone('Europe/London', now()))::date, $4, $5, $6, now())
       on conflict (item_id, for_date) do update
         set done = excluded.done,
             done_by_user_id = excluded.done_by_user_id,
             done_by_name = excluded.done_by_name,
             done_at = now()`,
      [a.tenantId, a.propertyId, req.params.id, done, a.userId, a.name],
    );
    return { ok: true, done };
  });

  f.post("/v1/ops/guest-requests", async (req: any, reply) => {
    const a = await requireLogActor(req, reply); if (!a) return;
    const requestText = String(req.body?.request_text ?? req.body?.requestText ?? "").trim();
    if (!requestText) return reply.code(422).send(problem(422, "validation", "Write what is needed"));
    const department = routeGuestRequest(requestText, req.body?.department);
    const r = await pool.query(
      `insert into ops_guest_request (
         tenant_id, property_id, guest_enquiry_id, guest_name, room_label, department, request_text, status
       ) values ($1, $2, $3, $4, $5, $6, $7, 'open')
       returning id, department`,
      [
        a.tenantId,
        a.propertyId,
        String(req.body?.guest_enquiry_id ?? "").trim() || null,
        String(req.body?.guest_name ?? "").trim() || null,
        String(req.body?.room_label ?? "").trim() || null,
        department,
        requestText,
      ],
    );
    return { id: r.rows[0].id, department: r.rows[0].department, department_label: departmentLabel(r.rows[0].department) };
  });

  f.patch("/v1/ops/guest-requests/:id", async (req: any, reply) => {
    const a = await requireLogActor(req, reply); if (!a) return;
    const status = parseRequestStatus(req.body?.status);
    const r = await pool.query(
      `update ops_guest_request
          set status = $3, updated_at = now()
        where property_id = $1 and id = $2
        returning id`,
      [a.propertyId, req.params.id, status],
    );
    if (!r.rowCount) return reply.code(404).send(problem(404, "not_found", "No such request"));
    return { ok: true, status };
  });
}
