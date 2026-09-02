import type { FastifyInstance } from "fastify";
import { pool, tx } from "./db.ts";
import { requireActor, allow, problem } from "./auth.ts";
import { audit } from "./groups.ts";

const FLOW: Record<string, Record<string, string>> = {
  OPEN: { start: "IN_PROGRESS", wait: "WAITING_PARTS", done: "DONE", cancel: "CANCELLED" },
  IN_PROGRESS: { wait: "WAITING_PARTS", done: "DONE", cancel: "CANCELLED" },
  WAITING_PARTS: { start: "IN_PROGRESS", done: "DONE", cancel: "CANCELLED" },
  DONE: { reopen: "OPEN" }, CANCELLED: { reopen: "OPEN" },
};
const COLS = `t.id, t.number, t.title, t.description, t.priority, t.status, t.location, t.takes_room_out, t.resolution, t.created_at, t.updated_at, t.resolved_at, t.version,
  r.number room, rep.display_name reported_by, asg.display_name assigned_to, t.assigned_to_user_id`;
const FROM = `from maintenance_ticket t left join room r on r.id=t.room_id left join app_user rep on rep.id=t.reported_by_user_id left join app_user asg on asg.id=t.assigned_to_user_id`;

export default async function routes(f: FastifyInstance) {
  f.get<{ Querystring: { status?: string; room?: string } }>("/maintenance", async (req, reply) => {
    const a = await requireActor(req, reply); if (!a || !allow(a, "maintenance.read", reply)) return;
    const open = req.query.status !== "closed";
    const r = await pool.query(`select ${COLS} ${FROM} where t.property_id=$1 and (($2 and t.status not in ('DONE','CANCELLED')) or (not $2 and t.status in ('DONE','CANCELLED'))) and ($3::text is null or r.number=$3)
      order by case t.priority when 'SAFETY' then 0 when 'URGENT' then 1 when 'NORMAL' then 2 else 3 end, t.created_at desc limit 200`, [a.propertyId, open, req.query.room ?? null]);
    const people = await pool.query(`select u.id, u.display_name name from app_user u join membership m on m.user_id=u.id join role ro on ro.id=m.role_id where u.tenant_id=$1 and u.status='ACTIVE' and ro.code in ('MAINTENANCE','GROUNDS','HK_SUPERVISOR','GENERAL_MANAGER') order by 2`, [a.tenantId]);
    return { items: r.rows, assignees: people.rows };
  });

  f.post<{ Body: { title: string; description?: string; room?: string; location?: string; priority?: string; takes_room_out?: boolean } }>("/maintenance", async (req, reply) => {
    const a = await requireActor(req, reply); if (!a || !allow(a, "maintenance.report", reply)) return;
    const b = req.body ?? {} as any; if (!b.title?.trim()) return reply.code(422).send(problem(422, "validation", "Say what the problem is"));
    return tx(async c => {
      const room = b.room ? (await c.query(`select id, status from room where property_id=$1 and number=$2 for update`, [a.propertyId, b.room])).rows[0] : null;
      if (b.room && !room) { reply.code(404); return problem(404, "not_found", `No room ${b.room}`); }
      const r = await c.query(`insert into maintenance_ticket (tenant_id, property_id, room_id, location, title, description, priority, reported_by_user_id, takes_room_out) values ($1,$2,$3,$4,$5,$6,$7,$8,$9) returning id, number`,
        [a.tenantId, a.propertyId, room?.id ?? null, b.location ?? null, b.title.trim(), b.description ?? null, b.priority ?? "NORMAL", a.userId, !!b.takes_room_out && !!room]);
      if (b.takes_room_out && room && !["OUT_OF_SERVICE", "OUT_OF_ORDER"].includes(room.status)) {
        await c.query(`update room set status='OUT_OF_ORDER', status_before_oos=$2, version=version+1 where id=$1`, [room.id, room.status]);
        await c.query(`insert into room_status_event (tenant_id, room_id, from_status, to_status, by_user_id, reason) values ($1,$2,$3,'OUT_OF_ORDER',$4,$5)`, [a.tenantId, room.id, room.status, a.userId, `M-${r.rows[0].number}: ${b.title.trim()}`]);
      }
      await audit(c, a, "maintenance_ticket", r.rows[0].id, "maintenance.report", { payload: b });
      reply.code(201); return { id: r.rows[0].id, number: r.rows[0].number };
    });
  });

  f.patch<{ Params: { id: string }; Body: { assigned_to_user_id?: string | null; priority?: string; description?: string; resolution?: string } }>("/maintenance/:id", async (req, reply) => {
    const a = await requireActor(req, reply); if (!a || !allow(a, "maintenance.work", reply)) return;
    const allowed = ["assigned_to_user_id", "priority", "description", "resolution"]; const sets: string[] = []; const vals: unknown[] = [];
    for (const k of allowed) if (k in (req.body ?? {})) { vals.push((req.body as any)[k]); sets.push(`${k}=$${vals.length}`); }
    if (!sets.length) return reply.code(422).send(problem(422, "validation", "Nothing to change"));
    vals.push(req.params.id, a.propertyId);
    const r = await pool.query(`update maintenance_ticket set ${sets.join(",")}, version=version+1 where id=$${vals.length - 1} and property_id=$${vals.length}`, vals);
    if (!r.rowCount) return reply.code(404).send(problem(404, "not_found", "No such ticket")); return { ok: true };
  });

  f.post<{ Params: { id: string; cmd: string }; Body: { resolution?: string; room_back_in_service?: boolean } }>("/maintenance/:id/commands/:cmd", async (req, reply) => {
    const a = await requireActor(req, reply); if (!a || !allow(a, "maintenance.work", reply)) return;
    return tx(async c => {
      const t = (await c.query(`select * from maintenance_ticket where id=$1 and property_id=$2 for update`, [req.params.id, a.propertyId])).rows[0];
      if (!t) { reply.code(404); return problem(404, "not_found", "No such ticket"); }
      const to = FLOW[t.status]?.[req.params.cmd]; if (!to) { reply.code(409); return problem(409, "invalid_transition", `Cannot '${req.params.cmd}' a ticket that is ${t.status.toLowerCase()}`); }
      await c.query(`update maintenance_ticket set status=$2, resolution=coalesce($3, resolution), resolved_at=case when $2 in ('DONE','CANCELLED') then now() else null end, assigned_to_user_id=case when $4='start' and assigned_to_user_id is null then $5 else assigned_to_user_id end, version=version+1 where id=$1`,
        [t.id, to, req.body?.resolution ?? null, req.params.cmd, a.userId]);
      if (to === "DONE" && t.takes_room_out && t.room_id && req.body?.room_back_in_service) {
        const room = (await c.query(`select status from room where id=$1`, [t.room_id])).rows[0];
        if (["OUT_OF_SERVICE", "OUT_OF_ORDER"].includes(room.status)) {
          await c.query(`update room set status='VACANT_DIRTY', status_before_oos=null, version=version+1 where id=$1`, [t.room_id]);
          await c.query(`insert into room_status_event (tenant_id, room_id, from_status, to_status, by_user_id, reason) values ($1,$2,$3,'VACANT_DIRTY',$4,$5)`, [a.tenantId, t.room_id, room.status, a.userId, `M-${t.number} done — safety check confirmed`]);
        }
      }
      await audit(c, a, "maintenance_ticket", t.id, "maintenance." + req.params.cmd, { from: t.status, to, reason: req.body?.resolution });
      return { ok: true, status: to };
    });
  });
}
