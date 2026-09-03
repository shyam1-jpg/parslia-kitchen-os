/**
 * Guest book — a separate login and a separate ledger.
 * These routes never read staff_hr, staff_clock, reports, or the room board.
 */
import { randomBytes } from "node:crypto";
import type { FastifyInstance } from "fastify";
import { pool } from "./db.ts";
import { emailLoginEnabled, problem } from "./auth.ts";

const hits = new Map<string, { n: number; t: number }>();
function rateOk(key: string): boolean {
  const now = Date.now();
  const cur = hits.get(key);
  if (!cur || now - cur.t > 60_000) { hits.set(key, { n: 1, t: now }); return true; }
  cur.n += 1; return cur.n <= 8;
}

type Guest = { id: string; tenantId: string; propertyId: string; email: string; name: string };

async function requireGuest(req: any, reply: any): Promise<Guest | null> {
  const auth = req.headers.authorization;
  if (!auth?.startsWith("Bearer ")) { reply.code(401).send(problem(401, "unauthenticated", "Sign in to continue")); return null; }
  const s = (await pool.query(`select g.id, g.tenant_id, g.property_id, g.email, g.display_name
    from guest_session s join guest_account g on g.id=s.guest_id where s.token=$1 and s.expires_at > now() and g.status='ACTIVE'`, [auth.slice(7)])).rows[0];
  if (!s) { reply.code(401).send(problem(401, "unauthenticated", "Sign in to continue")); return null; }
  return { id: s.id, tenantId: s.tenant_id, propertyId: s.property_id, email: s.email, name: s.display_name };
}

export default async function guestPortal(f: FastifyInstance) {
  f.get("/guest/property", async () => {
    const r = (await pool.query(`select p.name, p.check_in_from::text, p.check_out_by::text, t.currency,
        (select count(*) from room r where r.property_id=p.id and not r.staff_only)::int as rooms
      from property p join tenant t on t.id=p.tenant_id order by p.created_at limit 1`)).rows[0];
    return { name: r?.name ?? "The Vedanta", check_in_from: (r?.check_in_from ?? "15:00").slice(0, 5), check_out_by: (r?.check_out_by ?? "11:00").slice(0, 5), currency: r?.currency ?? "GBP", rooms: r?.rooms ?? 41 };
  });

  f.post("/guest/enquiries", async (req: any, reply) => {
    if (!rateOk(`enq:${req.ip || "x"}`)) return reply.code(429).send(problem(429, "rate_limited", "Please wait a minute before sending another enquiry"));
    const b = req.body ?? {};
    const email = String(b.email ?? "").trim().toLowerCase();
    const name = String(b.name ?? "").trim();
    const people = Number(b.people);
    if (!name || !email.includes("@") || !(people > 0) || !b.arrival || !b.departure) return reply.code(422).send(problem(422, "validation", "Name, email, number of people, arrival and departure are required"));
    if (b.departure < b.arrival) return reply.code(422).send(problem(422, "validation", "Departure must be on or after arrival"));
    const prop = (await pool.query(`select p.id, p.tenant_id from property p order by p.created_at limit 1`)).rows[0];
    const guest = (await pool.query(`insert into guest_account (tenant_id, property_id, email, display_name) values ($1,$2,$3,$4)
      on conflict (property_id, email) do update set display_name=excluded.display_name returning id`, [prop.tenant_id, prop.id, email, name])).rows[0];
    const e = (await pool.query(`insert into guest_enquiry (tenant_id,property_id,guest_id,name,email,people,arrival_date,departure_date,notes)
      values ($1,$2,$3,$4,$5,$6,$7,$8,$9) returning id, status`, [prop.tenant_id, prop.id, guest.id, name, email, people, b.arrival, b.departure, b.notes ?? null])).rows[0];
    return { id: e.id, status: e.status };
  });

  f.post("/guest/login", async (req: any, reply) => {
    if (!emailLoginEnabled()) return reply.code(404).send(problem(404, "not_found", "Guest sign-in is not open"));
    if (!rateOk(`glogin:${req.ip || "x"}`)) return reply.code(429).send(problem(429, "rate_limited", "Too many sign-in attempts"));
    const email = String(req.body?.email ?? "").trim().toLowerCase();
    const g = (await pool.query(`select id, display_name, email from guest_account where lower(email)=$1 and status='ACTIVE'`, [email])).rows[0];
    if (!g) return reply.code(401).send(problem(401, "unknown_user", "No guest book under that email. Send an enquiry first."));
    const token = randomBytes(32).toString("base64url");
    await pool.query(`insert into guest_session (token, guest_id, expires_at) values ($1,$2, now() + interval '12 hours')`, [token, g.id]);
    return { token, user: { email: g.email, name: g.display_name, surface: "GUEST" } };
  });

  f.get("/guest/me", async (req, reply) => {
    const g = await requireGuest(req, reply); if (!g) return;
    return { email: g.email, name: g.name, surface: "GUEST" };
  });

  f.get("/guest/enquiries", async (req, reply) => {
    const g = await requireGuest(req, reply); if (!g) return;
    const r = await pool.query(`select id, name, people, arrival_date::text arrival, departure_date::text departure, notes, status, created_at
      from guest_enquiry where guest_id=$1 order by created_at desc`, [g.id]);
    return { items: r.rows };
  });
}
