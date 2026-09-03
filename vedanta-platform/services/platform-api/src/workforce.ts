/**
 * House workforce: leave, clock, duty board, SOP, contracts, tips.
 * Pocket routes (/staff) only accept STAFF audience tokens.
 * House routes (/v1/workforce) only accept ADMIN audience tokens.
 * Guests have no path in here.
 */
import type { FastifyInstance } from "fastify";
import { pool, tx } from "./db.ts";
import { requireActor, allow, problem } from "./auth.ts";
import { audit } from "./groups.ts";
import { nextLeaveStatus, leaveNeedsHodFirst } from "../../../domains/staff/leave-state.ts";
import { buildOrganogram } from "../../../domains/staff/organogram.ts";
import { hoursFromPunches, canPunch, type Punch } from "../../../domains/staff/hours.ts";
import { splitTips, type TipMethod } from "../../../domains/staff/tips.ts";

const weekStart = (iso: string) => {
  const d = new Date(iso + "T00:00:00Z");
  const day = d.getUTCDay() || 7;
  d.setUTCDate(d.getUTCDate() - (day - 1));
  return d.toISOString().slice(0, 10);
};

async function punches(propertyId: string, userId: string, from: string, to: string): Promise<Punch[]> {
  const r = await pool.query(`select kind, at from staff_clock where property_id=$1 and user_id=$2 and at::date >= $3 and at::date <= $4 order by at`, [propertyId, userId, from, to]);
  return r.rows.map((x: { kind: "IN" | "OUT"; at: Date }) => ({ kind: x.kind, at: new Date(x.at) }));
}

async function lastKind(propertyId: string, userId: string): Promise<"IN" | "OUT" | null> {
  const r = await pool.query(`select kind from staff_clock where property_id=$1 and user_id=$2 order by at desc limit 1`, [propertyId, userId]);
  return r.rows[0]?.kind ?? null;
}

export default async function workforce(f: FastifyInstance) {
  // ----- Pocket (phone): clock, own leave, assigned SOP -----
  f.post("/staff/clock", async (req: any, reply) => {
    const a = await requireActor(req, reply, "STAFF"); if (!a || !allow(a, "clock.self", reply)) return;
    const kind = req.body?.kind === "OUT" ? "OUT" : "IN";
    const last = await lastKind(a.propertyId, a.userId);
    if (!canPunch(last, kind)) return reply.code(409).send(problem(409, "clock", kind === "IN" ? "You are already clocked in" : "Clock in first"));
    const r = await pool.query(`insert into staff_clock (tenant_id, property_id, user_id, kind) values ($1,$2,$3,$4) returning id, kind, at`, [a.tenantId, a.propertyId, a.userId, kind]);
    await pool.query(`insert into audit_event(tenant_id,property_id,actor_user_id,entity_type,entity_id,action,payload) values ($1,$2,$3,'staff_clock',$4,$5,'{}')`, [a.tenantId, a.propertyId, a.userId, r.rows[0].id, kind === "IN" ? "clock.in" : "clock.out"]);
    return r.rows[0];
  });
  f.get("/staff/clock", async (req, reply) => {
    const a = await requireActor(req, reply, "STAFF"); if (!a || !allow(a, "clock.self", reply)) return;
    const today = (await pool.query(`select (timezone('Europe/London', now()))::date::text t`)).rows[0].t;
    const from = weekStart(today);
    const p = await punches(a.propertyId, a.userId, from, today);
    return { last: await lastKind(a.propertyId, a.userId), hours_this_week: hoursFromPunches(p), week_start: from, punches: p };
  });
  f.post("/staff/leave", async (req: any, reply) => {
    const a = await requireActor(req, reply, "STAFF"); if (!a || !allow(a, "leave.request", reply)) return;
    const b = req.body ?? {};
    if (!b.starts_on || !b.ends_on) return reply.code(422).send(problem(422, "validation", "starts_on and ends_on are required"));
    if (b.ends_on < b.starts_on) return reply.code(422).send(problem(422, "validation", "Leave cannot end before it starts"));
    const kind = ["HOLIDAY", "DAY_OFF", "SICK", "UNPAID"].includes(b.kind) ? b.kind : "HOLIDAY";
    const days = Math.round((+new Date(b.ends_on) - +new Date(b.starts_on)) / 86400000) + 1;
    const hours = Number(b.hours) > 0 ? Number(b.hours) : days * 8;
    const r = await pool.query(`insert into staff_leave (tenant_id,property_id,user_id,kind,starts_on,ends_on,hours,note) values ($1,$2,$3,$4,$5,$6,$7,$8)
      returning id, kind, starts_on::text, ends_on::text, hours, status, note`, [a.tenantId, a.propertyId, a.userId, kind, b.starts_on, b.ends_on, hours, b.note ?? null]);
    await pool.query(`insert into audit_event(tenant_id,property_id,actor_user_id,entity_type,entity_id,action,payload) values ($1,$2,$3,'staff_leave',$4,'leave.submit',$5)`, [a.tenantId, a.propertyId, a.userId, r.rows[0].id, JSON.stringify({ kind })]);
    return r.rows[0];
  });
  f.get("/staff/leave", async (req, reply) => {
    const a = await requireActor(req, reply, "STAFF"); if (!a || !allow(a, "leave.request", reply)) return;
    const r = await pool.query(`select id, kind, starts_on::text, ends_on::text, hours, status, note, decided_reason, created_at from staff_leave where user_id=$1 order by starts_on desc limit 50`, [a.userId]);
    return { items: r.rows, needs_hod_first: leaveNeedsHodFirst(a.role) };
  });
  f.get("/staff/duty", async (req, reply) => {
    const a = await requireActor(req, reply, "STAFF"); if (!a || !allow(a, "cover.read", reply)) return;
    const from = new Date().toISOString().slice(0, 10);
    const r = await pool.query(`select id, on_date::text, slot, kind, note from staff_duty
      where property_id=$1 and user_id=$2 and on_date>=$3 order by on_date, slot limit 14`, [a.propertyId, a.userId, from]);
    return { items: r.rows };
  });
  f.get("/staff/sop", async (req, reply) => {
    const a = await requireActor(req, reply, "STAFF"); if (!a || !allow(a, "sop.read", reply)) return;
    const r = await pool.query(`select s.id, s.title, s.body, a.sent_at, a.read_at from staff_sop_assignment a join staff_sop s on s.id=a.sop_id where a.user_id=$1 order by a.sent_at desc`, [a.userId]);
    return { items: r.rows };
  });
  f.post("/staff/sop/:id/read", async (req: any, reply) => {
    const a = await requireActor(req, reply, "STAFF"); if (!a || !allow(a, "sop.read", reply)) return;
    await pool.query(`update staff_sop_assignment set read_at=coalesce(read_at, now()) where sop_id=$1 and user_id=$2`, [req.params.id, a.userId]);
    return { ok: true };
  });

  // ----- House -----
  const house = async (req: any, reply: any, perm: string) => {
    const a = await requireActor(req, reply, "ADMIN"); if (!a || !allow(a, perm, reply)) return null; return a;
  };

  f.get("/v1/workforce/leave", async (req, reply) => {
    const a = await requireActor(req, reply, "ADMIN"); if (!a) return;
    if (!a.perms.has("leave.approve_hod") && !a.perms.has("leave.approve_gm")) return reply.code(403).send(problem(403, "forbidden", "You cannot see the leave book"));
    const r = await pool.query(`select l.id, l.kind, l.starts_on::text, l.ends_on::text, l.hours, l.status, l.note, l.version,
        u.display_name as name, u.email, r.code as role, d.code as department
      from staff_leave l join app_user u on u.id=l.user_id join membership m on m.user_id=u.id and m.property_id=l.property_id
      join role r on r.id=m.role_id left join department d on d.id=m.department_id
      where l.property_id=$1 order by l.created_at desc limit 200`, [a.propertyId]);
    return { items: r.rows };
  });

  f.post("/v1/workforce/leave/:id/:cmd", async (req: any, reply) => {
    const a = await requireActor(req, reply, "ADMIN"); if (!a) return;
    const cmd = req.params.cmd as "approve" | "reject" | "cancel";
    if (!["approve", "reject", "cancel"].includes(cmd)) return reply.code(404).send(problem(404, "not_found", "Unknown command"));
    return tx(async c => {
      const l = (await c.query(`select l.*, r.code as requester_role, d.code as requester_dept
        from staff_leave l join membership m on m.user_id=l.user_id and m.property_id=l.property_id
        join role r on r.id=m.role_id left join department d on d.id=m.department_id
        where l.id=$1 and l.property_id=$2 for update`, [req.params.id, a.propertyId])).rows[0];
      if (!l) { reply.code(404); return problem(404, "not_found", "No such request"); }
      const next = nextLeaveStatus(l.status, cmd, a.role, l.requester_role);
      if (!next) { reply.code(409); return problem(409, "leave", "That signature is not allowed from your role, or the request is already decided"); }
      if (cmd === "approve" && next === "HOD_APPROVED") {
        if (!a.perms.has("leave.approve_hod")) { reply.code(403); return problem(403, "forbidden", "Only the head of department can sign this"); }
        if (a.department && l.requester_dept && a.department !== l.requester_dept && !["SYSTEM_OWNER", "GENERAL_MANAGER"].includes(a.role)) {
          reply.code(403); return problem(403, "forbidden", "This request belongs to another department");
        }
      }
      if (cmd === "approve" && next === "APPROVED" && !a.perms.has("leave.approve_gm") && !(next === "APPROVED" && a.perms.has("leave.approve_hod") && !leaveNeedsHodFirst(l.requester_role))) {
        if (!a.perms.has("leave.approve_gm")) { reply.code(403); return problem(403, "forbidden", "The general manager signs this step"); }
      }
      const hod = next === "HOD_APPROVED" ? a.userId : l.hod_approver_id;
      const gm = next === "APPROVED" ? a.userId : l.gm_approver_id;
      await c.query(`update staff_leave set status=$2, hod_approver_id=$3, gm_approver_id=$4, decided_reason=$5, version=version+1 where id=$1`,
        [l.id, next, hod, gm, req.body?.reason ?? null]);
      await audit(c, a, "staff_leave", l.id, `leave.${cmd}`, { from: l.status, to: next, reason: req.body?.reason });
      return { id: l.id, status: next };
    });
  });

  f.get("/v1/workforce/clock", async (req: any, reply) => {
    const a = await house(req, reply, "clock.manage"); if (!a) return;
    const today = (await pool.query(`select (timezone('Europe/London', now()))::date::text t`)).rows[0].t;
    const from = String(req.query?.from ?? weekStart(today));
    const to = String(req.query?.to ?? today);
    const users = (await pool.query(`select u.id, u.display_name as name, u.email, r.code as role from app_user u join membership m on m.user_id=u.id join role r on r.id=m.role_id where m.property_id=$1 and u.status='ACTIVE'`, [a.propertyId])).rows;
    const items = [];
    for (const u of users) {
      const p = await punches(a.propertyId, u.id, from, to);
      items.push({ id: u.id, name: u.name, email: u.email, role: u.role, hours: hoursFromPunches(p), last: p.at(-1)?.kind ?? null });
    }
    return { from, to, items };
  });

  f.get("/v1/workforce/people", async (req, reply) => {
    const a = await requireActor(req, reply, "ADMIN"); if (!a || !allow(a, "cover.read", reply)) return;
    const r = await pool.query(`select distinct on (u.id) u.id, u.display_name as name, u.email, r.code as role, r.name as role_name, d.code as department, d.name as department_name
      from app_user u join membership m on m.user_id=u.id join role r on r.id=m.role_id left join department d on d.id=m.department_id
      where m.property_id=$1 and u.status='ACTIVE' order by u.id, u.display_name`, [a.propertyId]);
    return { items: r.rows.sort((x: { name: string }, y: { name: string }) => x.name.localeCompare(y.name)) };
  });

  f.get("/v1/workforce/organogram", async (req, reply) => {
    const a = await requireActor(req, reply, "ADMIN"); if (!a) return;
    if (!a.perms.has("cover.read") && !a.perms.has("group.read")) { reply.code(403); return problem(403, "forbidden", "You cannot see the household"); }
    const r = await pool.query(`select distinct on (u.id) u.display_name as name, u.email, r.code as role, d.code as department
      from app_user u join membership m on m.user_id=u.id join role r on r.id=m.role_id left join department d on d.id=m.department_id
      where m.property_id=$1 and u.status='ACTIVE' order by u.id, u.display_name`, [a.propertyId]);
    return buildOrganogram(r.rows);
  });

  f.get("/v1/workforce/duty", async (req: any, reply) => {
    const a = await requireActor(req, reply, "ADMIN"); if (!a || !allow(a, "cover.read", reply)) return;
    const from = String(req.query?.from ?? new Date().toISOString().slice(0, 10));
    const to = String(req.query?.to ?? from);
    const r = await pool.query(`select d.id, d.on_date::text, d.slot, d.kind, d.note, u.id as user_id, u.display_name as name, r.code as role, rm.number as room
      from staff_duty d join app_user u on u.id=d.user_id join membership m on m.user_id=u.id and m.property_id=d.property_id
      join role r on r.id=m.role_id left join room rm on rm.id=d.room_id
      where d.property_id=$1 and d.on_date>=$2 and d.on_date<=$3 order by d.on_date, d.slot, u.display_name`, [a.propertyId, from, to]);
    return { items: r.rows };
  });
  f.post("/v1/workforce/duty", async (req: any, reply) => {
    const a = await house(req, reply, "cover.write"); if (!a) return;
    const b = req.body ?? {};
    if (!b.user_id || !b.on_date || !b.slot) return reply.code(422).send(problem(422, "validation", "user_id, on_date and slot are required"));
    const room = b.room ? (await pool.query(`select id from room where property_id=$1 and number=$2`, [a.propertyId, b.room])).rows[0] : null;
    const r = await pool.query(`insert into staff_duty (tenant_id,property_id,user_id,on_date,slot,kind,room_id,note) values ($1,$2,$3,$4,$5,$6,$7,$8)
      on conflict (user_id, on_date, slot) do update set kind=excluded.kind, room_id=excluded.room_id, note=excluded.note
      returning id`, [a.tenantId, a.propertyId, b.user_id, b.on_date, b.slot, b.kind === "COVER" ? "COVER" : "DUTY", room?.id ?? null, b.note ?? null]);
    return { id: r.rows[0].id };
  });

  f.get("/v1/workforce/sop", async (req, reply) => {
    const a = await house(req, reply, "sop.manage"); if (!a) return;
    const sops = (await pool.query(`select id, title, created_at from staff_sop where property_id=$1 order by created_at desc`, [a.propertyId])).rows;
    return { items: sops };
  });
  f.post("/v1/workforce/sop", async (req: any, reply) => {
    const a = await house(req, reply, "sop.manage"); if (!a) return;
    if (!req.body?.title || !req.body?.body) return reply.code(422).send(problem(422, "validation", "title and body are required"));
    const s = (await pool.query(`insert into staff_sop (tenant_id,property_id,title,body,created_by) values ($1,$2,$3,$4,$5) returning id`, [a.tenantId, a.propertyId, req.body.title, req.body.body, a.userId])).rows[0];
    const ids: string[] = req.body.user_ids ?? [];
    for (const id of ids) await pool.query(`insert into staff_sop_assignment (sop_id, user_id) values ($1,$2) on conflict do nothing`, [s.id, id]);
    return { id: s.id, sent: ids.length };
  });

  f.get("/v1/workforce/hr", async (req, reply) => {
    const a = await house(req, reply, "hr.read"); if (!a) return;
    const r = await pool.query(`select u.id, u.email, u.display_name as name, r.code as role, d.code as department,
        h.designation, h.contracted_hours, h.pay_note,
        (select json_agg(json_build_object('id',c.id,'title',c.title,'status',c.status,'sent_at',c.sent_at) order by c.created_at desc) from staff_contract c where c.user_id=u.id) contracts
      from app_user u join membership m on m.user_id=u.id join role r on r.id=m.role_id
      left join department d on d.id=m.department_id left join staff_hr h on h.user_id=u.id
      where m.property_id=$1 and u.status='ACTIVE' order by u.display_name`, [a.propertyId]);
    return { items: r.rows };
  });
  f.patch("/v1/workforce/hr/:id", async (req: any, reply) => {
    const a = await house(req, reply, "hr.read"); if (!a) return;
    const b = req.body ?? {};
    await pool.query(`insert into staff_hr (user_id, tenant_id, property_id, designation, contracted_hours, pay_note)
      values ($1,$2,$3,$4,$5,$6)
      on conflict (user_id) do update set designation=excluded.designation, contracted_hours=excluded.contracted_hours, pay_note=excluded.pay_note, updated_at=now()`,
      [req.params.id, a.tenantId, a.propertyId, b.designation ?? null, b.contracted_hours ?? null, b.pay_note ?? null]);
    return { ok: true };
  });
  f.post("/v1/workforce/contracts", async (req: any, reply) => {
    const a = await house(req, reply, "hr.read"); if (!a) return;
    const b = req.body ?? {};
    if (!b.user_id || !b.title || !b.body) return reply.code(422).send(problem(422, "validation", "user_id, title and body are required"));
    const c = (await pool.query(`insert into staff_contract (tenant_id,property_id,user_id,title,body,starts_on,status,sent_at) values ($1,$2,$3,$4,$5,$6,'SENT', now()) returning id`,
      [a.tenantId, a.propertyId, b.user_id, b.title, b.body, b.starts_on ?? null])).rows[0];
    await pool.query(`insert into outbound_email (tenant_id, property_id, kind, to_email, subject, body, status, sent_by_user_id)
      select $1,$2,'staff_contract', u.email, $3, $4, 'LOGGED', $5 from app_user u where u.id=$6`,
      [a.tenantId, a.propertyId, `Your contract — ${b.title}`, b.body, a.userId, b.user_id]).catch(() => {});
    return { id: c.id, status: "SENT" };
  });

  f.post("/v1/workforce/tips", async (req: any, reply) => {
    const a = await house(req, reply, "tip.manage"); if (!a) return;
    const b = req.body ?? {};
    const total = Number(b.total);
    if (!(total >= 0)) return reply.code(422).send(problem(422, "validation", "total is required"));
    const method = (["EVEN", "HOURS", "RATE"].includes(b.method) ? b.method : "HOURS") as TipMethod;
    const rate = Number(b.rate_per_hour ?? 0);
    const today = (await pool.query(`select (timezone('Europe/London', now()))::date::text t`)).rows[0].t;
    const from = String(b.week_start ?? weekStart(today));
    const to = new Date(+new Date(from) + 6 * 86400000).toISOString().slice(0, 10);
    const users = (await pool.query(`select u.id from app_user u join membership m on m.user_id=u.id where m.property_id=$1 and u.status='ACTIVE'`, [a.propertyId])).rows;
    const staff = [];
    for (const u of users) {
      const hours = hoursFromPunches(await punches(a.propertyId, u.id, from, to));
      if (hours > 0 || (b.include_zero && b.user_ids?.includes(u.id))) staff.push({ userId: u.id, hours });
    }
    const picked = Array.isArray(b.user_ids) && b.user_ids.length ? staff.filter(s => b.user_ids.includes(s.userId)) : staff.filter(s => s.hours > 0);
    const shares = splitTips({ total, ratePerHour: rate, method, staff: picked, manual: b.manual ?? {} });
    const poolId = (await pool.query(`insert into tip_pool (tenant_id,property_id,week_start,total,rate_per_hour,method,created_by) values ($1,$2,$3,$4,$5,$6,$7) returning id`,
      [a.tenantId, a.propertyId, from, total, rate, method, a.userId])).rows[0].id;
    for (const s of shares) {
      await pool.query(`insert into tip_share (pool_id,user_id,hours,guaranteed,pool,manual,share) values ($1,$2,$3,$4,$5,$6,$7)`,
        [poolId, s.userId, s.hours, s.guaranteed, s.pool, s.manual, s.share]);
    }
    const named = (await pool.query(`select s.user_id, u.display_name as name, s.hours, s.guaranteed, s.pool, s.manual, s.share from tip_share s join app_user u on u.id=s.user_id where s.pool_id=$1 order by s.share desc`, [poolId])).rows;
    return { id: poolId, week_start: from, total, rate_per_hour: rate, method, items: named };
  });
}
