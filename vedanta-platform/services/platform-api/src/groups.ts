import type { FastifyInstance } from "fastify";
import { pool, tx, type Q } from "./db.ts";
import { requireActor, allow, problem, type Actor } from "./auth.ts";

type Slot = "AM" | "PM";
export type GroupRow = { id: string; name: string; organisation: string | null; arrival_date: string; arrival_slot: Slot; departure_date: string; departure_slot: Slot; status: string; expected_rooms: number | null; version: number };

const STATUS_FLOW: Record<string, Record<string, string>> = {
  ENQUIRY: { hold: "PROVISIONAL", confirm: "CONFIRMED", cancel: "CANCELLED" },
  PROVISIONAL: { confirm: "CONFIRMED", cancel: "CANCELLED" },
  CONFIRMED: { check_in: "IN_HOUSE", cancel: "CANCELLED" },
  IN_HOUSE: { check_out: "COMPLETED" },
  COMPLETED: {}, CANCELLED: {},
};
const CMD_PERM: Record<string, string> = { hold: "group.confirm", confirm: "group.confirm", check_in: "group.confirm", check_out: "group.confirm", cancel: "group.cancel" };
const PALETTE = ["#2C6E8A", "#5B7B5A", "#B8632B", "#7A4E8A", "#8A5A2C", "#A2382C", "#3C7A7A"];

export function* halfDays(g: { arrival_date: string; arrival_slot: Slot; departure_date: string; departure_slot: Slot }) {
  const d = new Date(g.arrival_date + "T00:00:00Z"); const end = new Date(g.departure_date + "T00:00:00Z");
  let first = true;
  for (; d <= end; d.setUTCDate(d.getUTCDate() + 1)) {
    const iso = d.toISOString().slice(0, 10); const last = iso === g.departure_date;
    for (const slot of ["AM", "PM"] as Slot[]) {
      if (first && g.arrival_slot === "PM" && slot === "AM") continue;
      if (last && g.departure_slot === "AM" && slot === "PM") continue;
      yield { date: iso, slot };
    }
    first = false;
  }
}

export async function audit(c: Q, a: Actor, entity: string, id: string, action: string, extra: { from?: string; to?: string; reason?: string; version?: number; payload?: object } = {}) {
  await c.query(`insert into audit_event(tenant_id,property_id,actor_user_id,entity_type,entity_id,action,from_state,to_state,reason,entity_version,payload)
    values($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11)`, [a.tenantId, a.propertyId, a.userId, entity, id, action, extra.from ?? null, extra.to ?? null, extra.reason ?? null, extra.version ?? null, extra.payload ?? {}]);
}

const GROUP_COLS = `id, name, organisation, contact_email, contact_phone, arrival_date::text arrival, arrival_slot, arrival_time::text, departure_date::text departure, departure_slot, departure_time::text,
  retreat_type, use_basis, expected_guests, expected_rooms, package_name, price_basis, price_notes, spa_access, status, booking_form_status, terms_signed, terms_document, feedback_form_status,
  meals_from, meals_to, dietary_notes, notes, colour, version, source, external_ref, updated_at, review_reason, sheet_text,
  package_id, agreed_price_twin, agreed_price_single, singles_count, agreed_total, form_token, form_sent_at, form_submitted_at,
  (select json_build_object('code', pk.code, 'name', pk.name, 'price_basis', pk.price_basis, 'price_twin', pk.price_twin, 'price_single', pk.price_single) from package pk where pk.id=booking_group.package_id) package,
  (select count(*) from group_attendee ga where ga.group_id=booking_group.id)::int attendees`;

export async function freeRooms(c: Q | typeof pool, propertyId: string, g: { arrival_date: string; arrival_slot: Slot; departure_date: string; departure_slot: Slot }, excludeGroup?: string) {
  const hds = [...halfDays(g)];
  const r = await c.query(`select r.number from room r where r.property_id=$1 and not r.staff_only and r.status not in ('OUT_OF_SERVICE','OUT_OF_ORDER')
     and not exists (select 1 from room_occupancy o where o.room_id=r.id and ($3::uuid is null or o.group_id<>$3)
       and (o.on_date::text, o.slot) in (select * from unnest($2::text[], $4::text[]))) order by r.number`,
    [propertyId, hds.map(h => h.date), excludeGroup ?? null, hds.map(h => h.slot)]);
  return r.rows.map(x => x.number as string);
}

export default async function routes(f: FastifyInstance) {
  f.get("/groups", async (req, reply) => {
    const a = await requireActor(req, reply); if (!a || !allow(a, "group.read", reply)) return;
    const r = await pool.query(`select ${GROUP_COLS}, (select count(distinct room_id) from room_occupancy o where o.group_id=booking_group.id) rooms_allocated
      from booking_group where property_id=$1 order by arrival_date, arrival_slot`, [a.propertyId]);
    return { items: r.rows };
  });

  f.get("/groups/review", async (req, reply) => {
    const a = await requireActor(req, reply); if (!a || !allow(a, "group.read", reply)) return;
    const r = await pool.query(`select ${GROUP_COLS} from booking_group where property_id=$1 and review_reason is not null
      order by (departure_date >= current_date) desc, arrival_date`, [a.propertyId]);
    return { items: r.rows, upcoming: r.rows.filter((g: any) => g.departure >= new Date().toISOString().slice(0, 10)).length };
  });

  f.post<{ Body: Record<string, unknown> }>("/groups", async (req, reply) => {
    const a = await requireActor(req, reply); if (!a || !allow(a, "group.create", reply)) return;
    const b = req.body;
    for (const k of ["name", "organisation", "arrival", "arrival_slot", "departure", "departure_slot"]) if (!b[k]) return reply.code(422).send(problem(422, "validation", `${k} is required`, { errors: [{ field: k, message: "required" }] }));
    if ((b.departure as string) < (b.arrival as string)) return reply.code(422).send(problem(422, "validation", "Departure must be on or after arrival"));
    const g = { arrival_date: b.arrival as string, arrival_slot: b.arrival_slot as Slot, departure_date: b.departure as string, departure_slot: b.departure_slot as Slot };
    const free = await freeRooms(pool, a.propertyId, g);
    const wanted = Number(b.expected_rooms ?? 0);
    if (wanted > free.length) return reply.code(409).send(problem(409, "no_availability", `Only ${free.length} rooms are free for those dates`, { free: free.length }));
    return tx(async c => {
      const n = await c.query(`select count(*) from booking_group where property_id=$1`, [a.propertyId]);
      const r = await c.query(`insert into booking_group(tenant_id,property_id,name,organisation,contact_email,contact_phone,arrival_date,arrival_slot,arrival_time,departure_date,departure_slot,departure_time,
          retreat_type,use_basis,expected_guests,expected_rooms,package_name,price_notes,spa_access,status,booking_form_status,notes,meals_from,meals_to,dietary_notes,colour,source)
        values($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13,$14,$15,$16,$17,$18,$19,'ENQUIRY','NOT_SENT',$20,$21,$22,$23,$24,'ADMIN') returning ${GROUP_COLS}`,
        [a.tenantId, a.propertyId, b.name, b.organisation, b.contact_email ?? null, b.contact_phone ?? null, b.arrival, b.arrival_slot, parseTime(b.arrival_time), b.departure, b.departure_slot, parseTime(b.departure_time),
         b.retreat_type ?? "residential", b.use_basis ?? "SHARED", b.expected_guests ?? null, wanted, b.package_name ?? null, b.price_notes ?? null, !!b.spa_access, b.notes ?? null, b.meals_from ?? null, b.meals_to ?? null, b.dietary_notes ?? null, PALETTE[Number(n.rows[0].count) % PALETTE.length]]);
      await audit(c, a, "booking_group", r.rows[0].id, "group.create", { to: "ENQUIRY", version: 1 });
      reply.code(201); return { ...r.rows[0], rooms_allocated: 0 };
    });
  });

  f.get<{ Params: { id: string } }>("/groups/:id", async (req, reply) => {
    const a = await requireActor(req, reply); if (!a || !allow(a, "group.read", reply)) return;
    const r = await pool.query(`select ${GROUP_COLS}, (select count(distinct room_id) from room_occupancy o where o.group_id=booking_group.id) rooms_allocated from booking_group where id=$1 and property_id=$2`, [req.params.id, a.propertyId]);
    if (!r.rowCount) return reply.code(404).send(problem(404, "not_found", "No such booking"));
    return r.rows[0];
  });

  f.patch<{ Params: { id: string }; Body: Record<string, unknown>; Headers: { "if-match"?: string } }>("/groups/:id", async (req, reply) => {
    const a = await requireActor(req, reply); if (!a || !allow(a, "group.update", reply)) return;
    const allowed = ["name", "organisation", "contact_email", "contact_phone", "expected_guests", "expected_rooms", "package_name", "price_notes", "spa_access", "booking_form_status", "terms_signed", "terms_document", "feedback_form_status", "notes", "meals_from", "meals_to", "dietary_notes", "retreat_type", "use_basis", "arrival_time", "departure_time",
      "arrival_date", "arrival_slot", "departure_date", "departure_slot", "review_reason", "package_id", "agreed_price_twin", "agreed_price_single", "singles_count", "agreed_total"];
    const sets: string[] = []; const vals: unknown[] = [];
    for (const k of allowed) if (k in req.body) { vals.push(k.endsWith("_time") ? parseTime(req.body[k]) : req.body[k]); sets.push(`${k}=$${vals.length}`); }
    if (!sets.length) return reply.code(422).send(problem(422, "validation", "Nothing to change"));
    const ver = Number(req.headers["if-match"]);
    const datesChange = ["arrival_date", "arrival_slot", "departure_date", "departure_slot"].some(k => k in req.body);
    return tx(async c => {
      if (datesChange) {
        const cur = (await c.query(`select arrival_date::text, arrival_slot, departure_date::text, departure_slot from booking_group where id=$1 and property_id=$2`, [req.params.id, a.propertyId])).rows[0];
        if (!cur) { reply.code(404); return problem(404, "not_found", "No such booking"); }
        const next = { ...cur, ...Object.fromEntries(["arrival_date", "arrival_slot", "departure_date", "departure_slot"].filter(k => k in req.body).map(k => [k, req.body[k]])) } as typeof cur;
        if (next.departure_date < next.arrival_date || (next.departure_date === next.arrival_date && next.arrival_slot === "PM" && next.departure_slot === "AM")) { reply.code(422); return problem(422, "validation", "Departure must be after arrival"); }
        // Room placements outside the new dates would be orphaned; trim them and say so.
        const trimmed = await c.query(`delete from room_occupancy where group_id=$1 and (on_date < $2 or on_date > $3 or (on_date = $2 and slot = 'AM' and $4 = 'PM') or (on_date = $3 and slot = 'PM' and $5 = 'AM')) returning 1`, [req.params.id, next.arrival_date, next.departure_date, next.arrival_slot, next.departure_slot]);
        if (trimmed.rowCount) reply.header("x-trimmed-placements", String(trimmed.rowCount));
      }
      vals.push(req.params.id, a.propertyId, ver);
      const r = await c.query(`update booking_group set ${sets.join(",")}, version=version+1 where id=$${vals.length - 2} and property_id=$${vals.length - 1} and version=$${vals.length} returning ${GROUP_COLS}`, vals);
      if (!r.rowCount) { reply.code(409); return problem(409, "version_conflict", "Someone else changed this booking. Reload and try again."); }
      await audit(c, a, "booking_group", req.params.id, "group.update", { version: r.rows[0].version, payload: req.body });
      return r.rows[0];
    });
  });

  f.post<{ Params: { id: string; cmd: string }; Body: { reason?: string }; Headers: { "if-match"?: string } }>("/groups/:id/commands/:cmd", async (req, reply) => {
    const a = await requireActor(req, reply); if (!a) return;
    const perm = CMD_PERM[req.params.cmd]; if (!perm) return reply.code(404).send(problem(404, "unknown_command", `No command '${req.params.cmd}'`));
    if (!allow(a, perm, reply)) return;
    const ver = Number(req.headers["if-match"]);
    return tx(async c => {
      const cur = await c.query(`select status, version, booking_form_status, terms_signed, name from booking_group where id=$1 and property_id=$2 for update`, [req.params.id, a.propertyId]);
      if (!cur.rowCount) { reply.code(404); return problem(404, "not_found", "No such booking"); }
      const g = cur.rows[0];
      if (g.version !== ver) { reply.code(409); return problem(409, "version_conflict", "Someone else changed this booking. Reload and try again."); }
      const to = STATUS_FLOW[g.status]?.[req.params.cmd];
      if (!to) { reply.code(409); return problem(409, "invalid_transition", `Cannot '${req.params.cmd}' a booking that is ${g.status.toLowerCase()}`); }
      if (to === "CONFIRMED" && (g.booking_form_status !== "COMPLETE" || !g.terms_signed)) { reply.code(409); return problem(409, "paperwork_outstanding", "Booking form and signed T&Cs are needed before confirming"); }
      const r = await c.query(`update booking_group set status=$1, version=version+1 where id=$2 returning ${GROUP_COLS}`, [to, req.params.id]);
      if (to === "CANCELLED") await c.query(`delete from room_occupancy where group_id=$1`, [req.params.id]);
      await audit(c, a, "booking_group", req.params.id, "group." + req.params.cmd, { from: g.status, to, reason: req.body?.reason, version: r.rows[0].version });
      return r.rows[0];
    });
  });

  f.get<{ Querystring: { arrival: string; arrival_slot: Slot; departure: string; departure_slot: Slot; exclude?: string } }>("/availability", async (req, reply) => {
    const a = await requireActor(req, reply); if (!a || !allow(a, "group.read", reply)) return;
    const q = req.query;
    if (!q.arrival || !q.departure || q.departure < q.arrival) return reply.code(422).send(problem(422, "validation", "arrival and departure required"));
    const free = await freeRooms(pool, a.propertyId, { arrival_date: q.arrival, arrival_slot: q.arrival_slot ?? "PM", departure_date: q.departure, departure_slot: q.departure_slot ?? "PM" }, q.exclude);
    return { free_rooms: free.length, rooms: free, max_covers: 130 };
  });
}

function parseTime(v: unknown): string | null {
  if (!v || typeof v !== "string") return null;
  const m = v.trim().toLowerCase().match(/^(\d{1,2})(?::(\d{2}))?\s*(am|pm)?$/); if (!m) return null;
  let h = +m[1]; const mi = m[2] ?? "00";
  if (m[3] === "pm" && h < 12) h += 12; if (m[3] === "am" && h === 12) h = 0;
  return `${String(h).padStart(2, "0")}:${mi}`;
}
