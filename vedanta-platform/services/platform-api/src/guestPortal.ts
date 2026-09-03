/**
 * Guest book — a separate login and a separate ledger.
 * These routes never read staff_hr, staff_clock, reports, or the room board.
 * House reads enquiries on /v1/guest-enquiries (ADMIN only).
 */
import { createHash, randomBytes, randomInt } from "node:crypto";
import type { FastifyInstance } from "fastify";
import { pool, tx } from "./db.ts";
import { emailLoginEnabled, problem, requireActor, allow } from "./auth.ts";
import { audit } from "./groups.ts";
import { cleanName, guestCopy, isPublicProgrammeName, nightsBetween, programmeBasis, programmeKind, publicProgrammeName } from "../../../domains/guest/programmes.ts";
import { roomsForStay } from "../../../domains/guest/stay.ts";
import { backupGuestEvent } from "./kiteline.ts";

const hits = new Map<string, { n: number; t: number }>();
function rateOk(key: string): boolean {
  const now = Date.now();
  const cur = hits.get(key);
  if (!cur || now - cur.t > 60_000) { hits.set(key, { n: 1, t: now }); return true; }
  cur.n += 1; return cur.n <= 8;
}

type Guest = { id: string; tenantId: string; propertyId: string; email: string; name: string };
type GuestRow = { id: string; email: string; display_name: string; access_code_hash: string | null };

const PROGRAMME_SQL = `select g.id, g.name, g.organisation, g.retreat_type, g.use_basis,
  g.arrival_date::text arrival, g.arrival_slot, to_char(g.arrival_time,'HH24:MI') arrival_time,
  g.departure_date::text departure, g.departure_slot, to_char(g.departure_time,'HH24:MI') departure_time,
  g.expected_guests, g.package_name, g.price_notes, g.sheet_text, g.spa_access,
  pk.name package_label, pk.price_twin, pk.price_single, pk.price_basis, pk.includes_spa, pk.includes_meals
from booking_group g
left join package pk on pk.id = g.package_id
where g.property_id=$1
  and g.departure_date >= current_date
  and g.status in ('PROVISIONAL','CONFIRMED','IN_HOUSE')
  and g.retreat_type in ('residential','day_retreat')
  and g.name not ilike 'HOLD%'
  and g.name not ilike '%booking%'`;

function shapeProgramme(r: any) {
  const kind = programmeKind(r.retreat_type);
  const name = publicProgrammeName(cleanName(r.name), kind);
  const about = guestCopy(r.sheet_text);
  const price = guestCopy(r.price_notes);
  return {
    id: r.id,
    name,
    host: null,   // host name removed from public view — GDPR
    kind,
    basis: programmeBasis(r.use_basis),
    arrival: r.arrival,
    arrival_slot: r.arrival_slot,
    arrival_time: r.arrival_time,
    departure: r.departure,
    departure_slot: r.departure_slot,
    departure_time: r.departure_time,
    nights: nightsBetween(r.arrival, r.departure),
    places: r.expected_guests ?? null,
    spa: !!(r.spa_access || r.includes_spa),
    meals: r.includes_meals !== false,
    package: r.package_label ?? r.package_name ?? null,
    price: price || null,
    about: about || null,
  };
}

async function requireGuest(req: any, reply: any): Promise<Guest | null> {
  const auth = req.headers.authorization;
  if (!auth?.startsWith("Bearer ")) { reply.code(401).send(problem(401, "unauthenticated", "Sign in to continue")); return null; }
  const s = (await pool.query(`select g.id, g.tenant_id, g.property_id, g.email, g.display_name
    from guest_session s join guest_account g on g.id=s.guest_id where s.token=$1 and s.expires_at > now() and g.status='ACTIVE'`, [auth.slice(7)])).rows[0];
  if (!s) { reply.code(401).send(problem(401, "unauthenticated", "Sign in to continue")); return null; }
  return { id: s.id, tenantId: s.tenant_id, propertyId: s.property_id, email: s.email, name: s.display_name };
}

async function issueGuest(guestId: string, email: string, name: string) {
  const token = randomBytes(32).toString("base64url");
  await pool.query(`insert into guest_session (token, guest_id, expires_at) values ($1,$2, now() + interval '12 hours')`, [token, guestId]);
  return { token, user: { email, name, surface: "GUEST" as const } };
}

function newAccessCode(): string {
  return String(randomInt(0, 1_000_000)).padStart(6, "0");
}
function hashAccessCode(code: string): string {
  return createHash("sha256").update(code).digest("hex");
}
function normAccessCode(v: unknown): string {
  return String(v ?? "").replace(/\s+/g, "").trim();
}
async function upsertGuestWithCode(prop: any, email: string, name: string): Promise<{ guest: GuestRow; access_code?: string }> {
  const cur = (await pool.query(`select id, email, display_name, access_code_hash from guest_account where property_id=$1 and lower(email)=$2`, [prop.id, email])).rows[0] as GuestRow | undefined;
  const issue = !cur?.access_code_hash;
  const accessCode = issue ? newAccessCode() : null;
  const accessHash = accessCode ? hashAccessCode(accessCode) : null;
  const guest = (await pool.query(`insert into guest_account (tenant_id, property_id, email, display_name, access_code_hash)
      values ($1,$2,$3,$4,$5)
      on conflict (property_id, email) do update
      set display_name=excluded.display_name,
          access_code_hash=coalesce(guest_account.access_code_hash, excluded.access_code_hash)
      returning id, email, display_name, access_code_hash`,
      [prop.tenant_id, prop.id, email, name, accessHash])).rows[0] as GuestRow;
  return accessCode ? { guest, access_code: accessCode } : { guest };
}

async function propertyRow() {
  return (await pool.query(`select p.id, p.tenant_id, p.name, p.check_in_from::text, p.check_out_by::text, t.currency,
      coalesce(p.settings->>'website','https://www.thevedanta.org/') as website,
      (select count(*) from room r where r.property_id=p.id and not r.staff_only)::int as rooms
    from property p join tenant t on t.id=p.tenant_id order by p.created_at limit 1`)).rows[0];
}

export default async function guestPortal(f: FastifyInstance) {
  f.get("/guest/property", async () => {
    const r = await propertyRow();
    return {
      name: r?.name ?? "The Vedanta Way",
      kicker: "Retreat Center",
      tagline: "Luxury retreat centre",
      about: "A beautiful grade II-listed luxury retreat centre. Nestled amongst 75 acres of woodlands, meadows and lakes in Lincolnshire — a Grade II listed Elizabethan estate.",
      welcome: "Host your retreats and events with us for an unforgettably meaningful experience. When you arrive, the house is ready. We take care of the rest.",
      address: "Lincoln Rd, Branston, Lincolnshire, LN4 1PD",
      website: r?.website ?? "https://www.thevedanta.org/",
      company: "The Vedanta Way Ltd",
      check_in_from: (r?.check_in_from ?? "15:00").slice(0, 5),
      check_out_by: (r?.check_out_by ?? "11:00").slice(0, 5),
      currency: r?.currency ?? "GBP",
      rooms: r?.rooms ?? 41,
    };
  });

  f.get("/guest/packages", async () => {
    const prop = await propertyRow();
    const r = await pool.query(`select code, name, price_basis, price_twin, price_single, includes_spa, includes_meals
      from package where property_id=$1 and active and code not in ('VENUE_HIRE') order by sort`, [prop.id]);
    return {
      items: r.rows.map(p => ({
        code: p.code,
        name: p.name,
        basis: p.price_basis === "PER_PERSON_PER_NIGHT" ? "Per person per night" : p.price_basis === "FIXED" ? "Fixed" : "Per person",
        twin: p.price_twin != null ? Number(p.price_twin) : null,
        single: p.price_single != null ? Number(p.price_single) : null,
        spa: !!p.includes_spa,
        meals: !!p.includes_meals,
      })),
    };
  });

  // Programmes require a valid guest session — no public browsing of house dates.
  f.get("/guest/programmes", async (req, reply) => {
    const g = await requireGuest(req, reply); if (!g) return;
    const prop = await propertyRow();
    const r = await pool.query(`${PROGRAMME_SQL} order by g.arrival_date, g.arrival_slot`, [prop.id]);
    return { items: r.rows.filter(x => isPublicProgrammeName(x.name)).map(shapeProgramme) };
  });

  f.get("/guest/programmes/:id", async (req: any, reply) => {
    const g = await requireGuest(req, reply); if (!g) return;
    const prop = await propertyRow();
    const r = (await pool.query(`${PROGRAMME_SQL} and g.id=$2`, [prop.id, req.params.id])).rows[0];
    if (!r || !isPublicProgrammeName(r.name)) return reply.code(404).send(problem(404, "not_found", "That programme is not open"));
    return shapeProgramme(r);
  });

  f.post("/guest/register", async (req: any, reply) => {
    if (!emailLoginEnabled()) return reply.code(404).send(problem(404, "not_found", "Guest registration is not open"));
    if (!rateOk(`greg:${req.ip || "x"}`)) return reply.code(429).send(problem(429, "rate_limited", "Please wait a minute"));
    const email = String(req.body?.email ?? "").trim().toLowerCase();
    const name = String(req.body?.name ?? "").trim();
    if (!name || !email.includes("@")) return reply.code(422).send(problem(422, "validation", "Name and email are required"));
    const prop = await propertyRow();
    const r = await upsertGuestWithCode(prop, email, name);
    void backupGuestEvent({ id: `guest_reg_${r.guest.id}`, kind: "register", name: r.guest.display_name, email: r.guest.email });
    const session = await issueGuest(r.guest.id, r.guest.email, r.guest.display_name);
    return { ...session, access_code: r.access_code ?? null };
  });

  f.post("/guest/enquiries", async (req: any, reply) => {
    if (!rateOk(`enq:${req.ip || "x"}`)) return reply.code(429).send(problem(429, "rate_limited", "Please wait a minute before sending another enquiry"));
    const b = req.body ?? {};
    const email = String(b.email ?? "").trim().toLowerCase();
    const name = String(b.name ?? "").trim();
    const people = Number(b.people);
    if (!name || !email.includes("@") || !(people > 0)) return reply.code(422).send(problem(422, "validation", "Name, email and number of people are required"));
    const prop = await propertyRow();
    let arrival = b.arrival ?? null;
    let departure = b.departure ?? null;
    let programmeId: string | null = b.programme_id || null;
    if (programmeId) {
      const p = (await pool.query(`${PROGRAMME_SQL} and g.id=$2`, [prop.id, programmeId])).rows[0];
      if (!p || !isPublicProgrammeName(p.name)) return reply.code(404).send(problem(404, "not_found", "That programme is not open"));
      arrival = p.arrival;
      departure = p.departure;
    }
    if (!arrival || !departure) return reply.code(422).send(problem(422, "validation", "Choose a programme, or give arrival and departure dates"));
    if (departure < arrival) return reply.code(422).send(problem(422, "validation", "Departure must be on or after arrival"));
    const r = await upsertGuestWithCode(prop, email, name);
    const guest = r.guest;
    const e = (await pool.query(`insert into guest_enquiry (tenant_id,property_id,guest_id,name,email,people,arrival_date,departure_date,notes,programme_id)
      values ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10) returning id, status`, [prop.tenant_id, prop.id, guest.id, name, email, people, arrival, departure, b.notes ?? null, programmeId])).rows[0];
    const session = await issueGuest(guest.id, email, name);
    void backupGuestEvent({
      id: `guest_enq_${e.id}`,
      kind: programmeId ? "programme" : "dates",
      name, email, people, arrival, departure, notes: b.notes ?? null, programme_id: programmeId,
    });
    return { id: e.id, status: e.status, ...session, access_code: r.access_code ?? null };
  });

  f.post("/guest/login", async (req: any, reply) => {
    if (!emailLoginEnabled()) return reply.code(404).send(problem(404, "not_found", "Guest sign-in is not open"));
    if (!rateOk(`glogin:${req.ip || "x"}`)) return reply.code(429).send(problem(429, "rate_limited", "Too many sign-in attempts"));
    const email = String(req.body?.email ?? "").trim().toLowerCase();
    const code = normAccessCode(req.body?.access_code);
    const g = (await pool.query(`select id, display_name, email, access_code_hash from guest_account where lower(email)=$1 and status='ACTIVE'`, [email])).rows[0];
    if (!g) return reply.code(401).send(problem(401, "unknown_user", "No guest book under that email. Register first."));
    if (!g.access_code_hash) return reply.code(401).send(problem(401, "guest_code_required", "Your guest book now needs an access code. Register again to receive your private code."));
    if (!code || hashAccessCode(code) !== g.access_code_hash) return reply.code(401).send(problem(401, "wrong_code", "That access code is not correct for this email."));
    return issueGuest(g.id, g.email, g.display_name);
  });

  f.get("/guest/me", async (req, reply) => {
    const g = await requireGuest(req, reply); if (!g) return;
    return { email: g.email, name: g.name, surface: "GUEST" };
  });

  async function roomsByBooking(bookingIds: string[]) {
    if (!bookingIds.length) return [];
    const r = await pool.query(`select o.group_id as booking_id, r.number, r.section
      from room_occupancy o join room r on r.id=o.room_id
      where o.group_id = any($1::uuid[])
      group by o.group_id, r.number, r.section`, [bookingIds]);
    return r.rows as { booking_id: string; number: string; section: string | null }[];
  }

  function shapeStay(x: any, rooms: { booking_id: string; number: string; section: string | null }[]) {
    return {
      id: x.id,
      people: x.people,
      arrival: x.arrival,
      departure: x.departure,
      notes: x.notes,
      status: x.status,
      programme_name: x.programme_name ? cleanName(x.programme_name) : null,
      rooms: roomsForStay(x.booking_id, rooms),
    };
  }

  f.get("/guest/enquiries", async (req, reply) => {
    const g = await requireGuest(req, reply); if (!g) return;
    const r = await pool.query(`select e.id, e.people, e.arrival_date::text arrival, e.departure_date::text departure, e.notes, e.status,
        e.programme_id, e.booking_id, bg.name programme_name
      from guest_enquiry e
      left join booking_group bg on bg.id = e.programme_id
      where e.guest_id=$1 order by e.created_at desc`, [g.id]);
    const rooms = await roomsByBooking(r.rows.map((x: { booking_id: string | null }) => x.booking_id).filter(Boolean) as string[]);
    return { items: r.rows.map((x: any) => shapeStay(x, rooms)) };
  });

  f.get("/guest/stay", async (req, reply) => {
    const g = await requireGuest(req, reply); if (!g) return;
    const r = await pool.query(`select e.id, e.people, e.arrival_date::text arrival, e.departure_date::text departure, e.notes, e.status,
        e.programme_id, e.booking_id, bg.name programme_name
      from guest_enquiry e
      left join booking_group bg on bg.id = e.programme_id
      where e.guest_id=$1 order by e.arrival_date desc, e.created_at desc`, [g.id]);
    const rooms = await roomsByBooking(r.rows.map((x: { booking_id: string | null }) => x.booking_id).filter(Boolean) as string[]);
    return { name: g.name, email: g.email, items: r.rows.map((x: any) => shapeStay(x, rooms)) };
  });

  f.get("/v1/guest-enquiries", async (req, reply) => {
    const a = await requireActor(req, reply, "ADMIN"); if (!a || !allow(a, "group.read", reply)) return;
    const r = await pool.query(`select e.id, e.name, e.email, e.people, e.arrival_date::text arrival, e.departure_date::text departure, e.notes, e.status, e.created_at,
        e.programme_id, e.booking_id, bg.name programme_name
      from guest_enquiry e
      left join booking_group bg on bg.id = e.programme_id
      where e.property_id=$1 and e.status='ENQUIRY' order by e.created_at desc limit 50`, [a.propertyId]);
    return { items: r.rows.map(x => ({ ...x, programme_name: x.programme_name ? cleanName(x.programme_name) : null })) };
  });

  f.get("/v1/guest-stays", async (req, reply) => {
    const a = await requireActor(req, reply, "ADMIN"); if (!a || !allow(a, "group.read", reply)) return;
    const r = await pool.query(`select e.id, e.name, e.email, e.people, e.arrival_date::text arrival, e.departure_date::text departure, e.notes, e.status,
        e.programme_id, e.booking_id, bg.name programme_name
      from guest_enquiry e
      left join booking_group bg on bg.id = e.programme_id
      where e.property_id=$1 order by e.created_at desc limit 80`, [a.propertyId]);
    const rooms = await roomsByBooking(r.rows.map((x: { booking_id: string | null }) => x.booking_id).filter(Boolean) as string[]);
    return {
      items: r.rows.map((x: any) => ({
        id: x.id,
        name: x.name,
        email: x.email,
        people: x.people,
        arrival: x.arrival,
        departure: x.departure,
        notes: x.notes,
        status: x.status,
        booking_id: x.booking_id,
        programme_name: x.programme_name ? cleanName(x.programme_name) : null,
        rooms: roomsForStay(x.booking_id, rooms),
      })),
    };
  });

  f.post("/v1/guest-stays/:id/rooms", async (req: any, reply) => {
    const a = await requireActor(req, reply, "ADMIN"); if (!a || !allow(a, "occupancy.write", reply)) return;
    const numbers: string[] = Array.isArray(req.body?.rooms) ? req.body.rooms.map((n: unknown) => String(n).trim()).filter(Boolean) : [];
    const one = String(req.body?.room ?? "").trim();
    if (one) numbers.push(one);
    if (!numbers.length) return reply.code(422).send(problem(422, "validation", "Give at least one room number"));
    return tx(async c => {
      const e = (await c.query(`select * from guest_enquiry where id=$1 and property_id=$2 for update`, [req.params.id, a.propertyId])).rows[0];
      if (!e) { reply.code(404); return problem(404, "not_found", "No such guest stay"); }
      let bookingId = e.booking_id as string | null;
      if (!bookingId) {
        const n = await c.query(`select count(*) from booking_group where property_id=$1`, [a.propertyId]);
        const created = (await c.query(`insert into booking_group(tenant_id,property_id,name,organisation,contact_email,arrival_date,arrival_slot,departure_date,departure_slot,
            expected_guests,expected_rooms,status,booking_form_status,notes,colour,source)
          values($1,$2,$3,$4,$5,$6,'PM',$7,'AM',$8,$9,'ENQUIRY','NOT_SENT',$10,$11,'GUEST_BOOK') returning id`,
          [a.tenantId, a.propertyId, e.name, e.name, e.email, e.arrival_date, e.departure_date, e.people, numbers.length, e.notes,
           ["#1F3A32", "#8A6A3B", "#4F6758", "#6B3A32"][Number(n.rows[0].count) % 4]])).rows[0];
        bookingId = created.id;
        await c.query(`update guest_enquiry set booking_id=$2 where id=$1`, [e.id, bookingId]);
      }
      const placed: string[] = [];
      for (const number of numbers) {
        const room = (await c.query(`select id, max_capacity, staff_only, status from room where property_id=$1 and number=$2`, [a.propertyId, number])).rows[0];
        if (!room) { reply.code(404); return problem(404, "not_found", `No room ${number}`); }
        if (room.staff_only) { reply.code(409); return problem(409, "staff_room", `${number} is a staff room`); }
        if (["OUT_OF_SERVICE", "OUT_OF_ORDER"].includes(room.status)) { reply.code(409); return problem(409, "out_of_use", `Room ${number} is out of use`); }
        const clash = (await c.query(`select occupant_label from room_occupancy where room_id=$1 and group_id is distinct from $2 and on_date >= $3 and on_date < greatest($4::date, $3::date + 1) limit 1`,
          [room.id, bookingId, e.arrival_date, e.departure_date])).rows[0];
        if (clash) { reply.code(409); return problem(409, "room_taken", `Room ${number} is already held for another stay`); }
        await c.query(`insert into room_occupancy(tenant_id,room_id,group_id,occupant_label,on_date,slot)
          select $1,$2,$3,$4,d::date,s
          from generate_series($5::date, greatest($6::date - 1, $5::date), interval '1 day') d
          cross join (values ('AM'),('PM')) v(s)
          on conflict do nothing`,
          [a.tenantId, room.id, bookingId, e.name, e.arrival_date, e.departure_date]);
        placed.push(number);
      }
      await audit(c, a, "guest_enquiry", e.id, "guest.rooms.assign", { payload: { rooms: placed, booking_id: bookingId } });
      return { id: e.id, booking_id: bookingId, rooms: placed };
    });
  });

  f.post("/v1/guest-enquiries/:id/take", async (req: any, reply) => {
    const a = await requireActor(req, reply, "ADMIN"); if (!a || !allow(a, "group.create", reply)) return;
    return tx(async c => {
      const e = (await c.query(`select * from guest_enquiry where id=$1 and property_id=$2 for update`, [req.params.id, a.propertyId])).rows[0];
      if (!e) { reply.code(404); return problem(404, "not_found", "No such enquiry"); }
      if (e.status !== "ENQUIRY" && e.booking_id) return { id: e.booking_id, name: e.name, already: true };
      let bookingId = e.booking_id as string | null;
      if (!bookingId) {
        const n = await c.query(`select count(*) from booking_group where property_id=$1`, [a.propertyId]);
        const g = (await c.query(`insert into booking_group(tenant_id,property_id,name,organisation,contact_email,arrival_date,arrival_slot,departure_date,departure_slot,
            expected_guests,status,booking_form_status,notes,colour,source)
          values($1,$2,$3,$4,$5,$6,'PM',$7,'AM',$8,'ENQUIRY','NOT_SENT',$9,$10,'GUEST_BOOK') returning id, name`,
          [a.tenantId, a.propertyId, e.name, e.name, e.email, e.arrival_date, e.departure_date, e.people, e.notes,
           ["#1F3A32", "#8A6A3B", "#4F6758", "#6B3A32"][Number(n.rows[0].count) % 4]])).rows[0];
        bookingId = g.id;
      }
      await c.query(`update guest_enquiry set status='CONVERTED', booking_id=$2 where id=$1`, [e.id, bookingId]);
      await audit(c, a, "booking_group", bookingId, "group.create", { to: "ENQUIRY", payload: { from_enquiry: e.id, private: true } });
      void backupGuestEvent({
        id: `guest_take_${e.id}`,
        kind: e.programme_id ? "converted_programme" : "converted_dates",
        name: e.name,
        email: e.email,
        people: e.people,
        booking_group_id: bookingId,
        programme_id: e.programme_id ?? null,
        arrival: e.arrival_date,
        departure: e.departure_date,
        notes: e.notes ?? null,
      });
      return { id: bookingId, name: e.name, private: true };
    });
  });
}
