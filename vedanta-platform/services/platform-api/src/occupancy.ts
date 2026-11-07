import type { FastifyInstance } from "fastify";
import { pool, tx } from "./db.ts";
import { requireActor, allow, problem } from "./auth.ts";
import { halfDays, audit } from "./groups.ts";

export async function coversFor(propertyId: string, from: string, to: string) {
    const req = { query: { from, to } } as { query: { from: string; to: string } };
    const a = { propertyId };
    const r = await pool.query(`select id, name, organisation, arrival_date::text arrival, arrival_slot, arrival_time::text, departure_date::text departure, departure_slot, departure_time::text,
        expected_guests, retreat_type, meals_from, meals_to, dietary_notes, notes, colour, status
      from booking_group where property_id=$1 and status in ('PROVISIONAL','CONFIRMED','IN_HOUSE') and departure_date>=$2 and arrival_date<=$3 order by arrival_date`, [a.propertyId, req.query.from, req.query.to]);
    const days: Record<string, { date: string; breakfast: number; lunch: number; dinner: number; groups: { id: string; name: string; colour: string; guests: number; meals: string[]; note?: string; dietary?: string; status: string }[] }> = {};
    const MEALS = ["BREAKFAST", "LUNCH", "DINNER"];
    for (const g of r.rows) {
      const guests = Number(g.expected_guests ?? 0);
      const d = new Date(g.arrival + "T00:00:00Z"); const end = new Date(g.departure + "T00:00:00Z");
      for (; d <= end; d.setUTCDate(d.getUTCDate() + 1)) {
        const iso = d.toISOString().slice(0, 10);
        if (iso < req.query.from || iso > req.query.to) continue;
        const first = iso === g.arrival, last = iso === g.departure;
        // Default meal logic: arrive AM → lunch onwards; arrive PM → dinner onwards; depart AM → breakfast only; depart PM → up to lunch.
        let meals = [...MEALS];
        if (first) { const from = g.meals_from ?? (g.arrival_slot === "AM" ? "LUNCH" : "DINNER"); meals = from === "NONE" ? [] : meals.slice(MEALS.indexOf(from)); }
        if (last) { const to = g.meals_to ?? (g.departure_slot === "AM" ? "BREAKFAST" : "LUNCH"); meals = to === "NONE" ? [] : meals.filter(m => MEALS.indexOf(m) <= MEALS.indexOf(to)); }
        if (g.retreat_type === "day_retreat" || g.retreat_type === "venue_hire") meals = meals.filter(m => m !== "BREAKFAST");
        const day = days[iso] ??= { date: iso, breakfast: 0, lunch: 0, dinner: 0, groups: [] };
        for (const m of meals) (day as unknown as Record<string, number>)[m.toLowerCase()] += guests;
        day.groups.push({ id: g.id, name: g.name, colour: g.colour, guests, meals: meals.map(m => m.toLowerCase()), note: first ? `arrive ${g.arrival_slot}${g.arrival_time ? " " + g.arrival_time.slice(0, 5) : ""}` : last ? `depart ${g.departure_slot}${g.departure_time ? " " + g.departure_time.slice(0, 5) : ""}` : undefined, dietary: g.dietary_notes ?? undefined, status: g.status });
      }
    }
    return { max_covers: 130, days: Object.values(days).sort((x, y) => x.date.localeCompare(y.date)) };
}

export default async function routes(f: FastifyInstance) {
  f.get("/rooms", async (req, reply) => {
    const a = await requireActor(req, reply); if (!a) return;
    const r = await pool.query(`select r.id, r.number, r.section, t.code type, r.beds_single, r.beds_double, r.beds_king, r.mattresses, r.max_capacity, r.features, r.notes, r.staff_only, r.status, r.version
      from room r join room_type t on t.id=r.room_type_id where r.property_id=$1 order by r.section, r.number`, [a.propertyId]);
    return { items: r.rows };
  });

  f.get<{ Querystring: { from: string; to: string } }>("/occupancy", async (req, reply) => {
    const a = await requireActor(req, reply); if (!a || !allow(a, "group.read", reply)) return;
    const r = await pool.query(`select r.number room, o.on_date::text date, o.slot, o.occupant_label label, o.group_id, g.colour
      from room_occupancy o join room r on r.id=o.room_id left join booking_group g on g.id=o.group_id
      where r.property_id=$1 and o.on_date between $2 and $3 order by o.on_date, o.slot`, [a.propertyId, req.query.from, req.query.to]);
    return { items: r.rows };
  });

  async function checkRoom(c: import("./db.ts").Q, propertyId: string, number: string, groupId: string, adding: number) {
    const room = await c.query(`select id, max_capacity, staff_only, status from room where property_id=$1 and number=$2`, [propertyId, number]);
    if (!room.rowCount) return { err: problem(404, "not_found", `No room ${number}`) };
    const r = room.rows[0];
    if (r.staff_only) return { err: problem(409, "staff_room", "That is a staff room.") };
    if (["OUT_OF_SERVICE", "OUT_OF_ORDER"].includes(r.status)) return { err: problem(409, "out_of_use", `Room ${number} is out of use.`) };
    const g = await c.query(`select arrival_date::text, arrival_slot, departure_date::text, departure_slot, status from booking_group where id=$1`, [groupId]);
    if (!g.rowCount) return { err: problem(404, "not_found", "No such booking") };
    if (["CANCELLED", "COMPLETED"].includes(g.rows[0].status)) return { err: problem(409, "closed", "Booking is closed.") };
    const hds = [...halfDays(g.rows[0])];
    const clash = await c.query(`select o.occupant_label, o.on_date::text, o.slot from room_occupancy o where o.room_id=$1 and o.group_id<>$2 and (o.on_date::text,o.slot) in (select * from unnest($3::text[],$4::text[])) limit 1`, [r.id, groupId, hds.map(h => h.date), hds.map(h => h.slot)]);
    if (clash.rowCount) return { err: problem(409, "room_taken", `Room ${number} is taken by ${clash.rows[0].occupant_label} on ${clash.rows[0].on_date} ${clash.rows[0].slot}.`) };
    const cnt = await c.query(`select count(distinct occupant_label) n from room_occupancy where room_id=$1 and group_id=$2`, [r.id, groupId]);
    if (Number(cnt.rows[0].n) + adding > r.max_capacity) return { err: problem(409, "room_full", `Room ${number} sleeps ${r.max_capacity}.`) };
    return { roomId: r.id as string, hds };
  }

  f.post<{ Body: { room: string; group_id: string; label: string } }>("/occupancy/place", async (req, reply) => {
    const a = await requireActor(req, reply); if (!a || !allow(a, "occupancy.write", reply)) return;
    const { room, group_id, label } = req.body;
    if (!room || !group_id || !label?.trim()) return reply.code(422).send(problem(422, "validation", "room, group_id and label are required"));
    return tx(async c => {
      const chk = await checkRoom(c, a.propertyId, room, group_id, 1);
      if ("err" in chk) { reply.code(chk.err!.status); return chk.err; }
      await c.query(`insert into room_occupancy(tenant_id,room_id,group_id,occupant_label,on_date,slot) select $1,$2,$3,$4,d,s from unnest($5::date[],$6::text[]) as x(d,s) on conflict do nothing`,
        [a.tenantId, chk.roomId, group_id, label.trim(), chk.hds.map(h => h.date), chk.hds.map(h => h.slot)]);
      await audit(c, a, "room_occupancy", chk.roomId, "occupancy.place", { payload: { room, group_id, label } });
      return { ok: true, half_days: chk.hds.length };
    });
  });

  f.post<{ Body: { room: string; group_id: string; label: string } }>("/occupancy/remove", async (req, reply) => {
    const a = await requireActor(req, reply); if (!a || !allow(a, "occupancy.write", reply)) return;
    const { room, group_id, label } = req.body;
    return tx(async c => {
      const r = await c.query(`delete from room_occupancy o using room r where r.id=o.room_id and r.property_id=$1 and r.number=$2 and o.group_id is not distinct from $3 and o.occupant_label=$4`, [a.propertyId, room, group_id || null, label]);
      const rid = (await c.query(`select id from room where property_id=$1 and number=$2`, [a.propertyId, room])).rows[0]?.id;
      await audit(c, a, "room_occupancy", group_id || rid, "occupancy.remove", { payload: { room, label, rows: r.rowCount, unlinked: !group_id } });
      return { ok: true, removed: r.rowCount };
    });
  });

  /** Link a placement imported from the sheet (no group) to a booking that is in house on that date. */
  f.post<{ Body: { room: string; label: string; date: string; group_id: string } }>("/occupancy/link", async (req, reply) => {
    const a = await requireActor(req, reply); if (!a || !allow(a, "occupancy.write", reply)) return;
    const { room, label, date, group_id } = req.body;
    if (!room || !label || !date || !group_id) return reply.code(422).send(problem(422, "validation", "room, label, date and group_id are required"));
    return tx(async c => {
      const g = (await c.query(`select id, name, arrival_date::text, arrival_slot, departure_date::text, departure_slot, status from booking_group where id=$1 and property_id=$2`, [group_id, a.propertyId])).rows[0];
      if (!g) { reply.code(404); return problem(404, "not_found", "No such booking"); }
      if (g.status === "CANCELLED") { reply.code(409); return problem(409, "closed", "Booking is cancelled."); }  // completed is fine: linking history
      // The stay is the contiguous run of this name in this room around the clicked date; link all of it that falls inside the booking.
      const r = await c.query(`
        with stay as (
          select o.id, o.on_date, o.slot from room_occupancy o join room r on r.id=o.room_id
          where r.property_id=$1 and r.number=$2 and o.occupant_label=$3 and o.group_id is null
            and o.on_date between $4::date - 30 and $4::date + 30)
        update room_occupancy o set group_id=$5 from stay
        where o.id=stay.id and (stay.on_date > $6 or (stay.on_date = $6 and (stay.slot = 'PM' or $7 = 'AM')))
          and (stay.on_date < $8 or (stay.on_date = $8 and (stay.slot = 'AM' or $9 = 'PM')))`,
        [a.propertyId, room, label, date, group_id, g.arrival_date, g.arrival_slot, g.departure_date, g.departure_slot]);
      if (!r.rowCount) { reply.code(409); return problem(409, "outside_stay", `${label} has no unlinked half-days inside ${g.name}'s dates.`); }
      await audit(c, a, "room_occupancy", group_id, "occupancy.link", { payload: { room, label, date, rows: r.rowCount } });
      return { ok: true, linked: r.rowCount, group: g.name };
    });
  });

  /** Bulk-link: every unlinked placement in the given rooms, within the booking's dates, goes to that booking. */
  f.post<{ Body: { rooms: string[]; group_id: string; from?: string; to?: string } }>("/occupancy/link-bulk", async (req, reply) => {
    const a = await requireActor(req, reply); if (!a || !allow(a, "occupancy.write", reply)) return;
    const { rooms, group_id } = req.body;
    if (!rooms?.length || !group_id) return reply.code(422).send(problem(422, "validation", "rooms and group_id are required"));
    return tx(async c => {
      const g = (await c.query(`select id, name, arrival_date::text, arrival_slot, departure_date::text, departure_slot, status from booking_group where id=$1 and property_id=$2`, [group_id, a.propertyId])).rows[0];
      if (!g) { reply.code(404); return problem(404, "not_found", "No such booking"); }
      if (g.status === "CANCELLED") { reply.code(409); return problem(409, "closed", "Booking is cancelled."); }
      const from = req.body.from && req.body.from > g.arrival_date ? req.body.from : g.arrival_date;
      const to = req.body.to && req.body.to < g.departure_date ? req.body.to : g.departure_date;
      const r = await c.query(`
        update room_occupancy o set group_id=$1 from room r
        where r.id=o.room_id and r.property_id=$2 and r.number = any($3::text[]) and o.group_id is null
          and o.on_date between $4 and $5
          and not (o.on_date = $6 and o.slot = 'AM' and $7 = 'PM') and not (o.on_date = $8 and o.slot = 'PM' and $9 = 'AM')`,
        [group_id, a.propertyId, rooms, from, to, g.arrival_date, g.arrival_slot, g.departure_date, g.departure_slot]);
      await audit(c, a, "room_occupancy", group_id, "occupancy.link_bulk", { payload: { rooms, from, to, rows: r.rowCount } });
      return { ok: true, linked: r.rowCount, group: g.name };
    });
  });

  f.post<{ Body: { from_room: string; to_room: string; group_id: string; labels: string[] } }>("/occupancy/move", async (req, reply) => {
    const a = await requireActor(req, reply); if (!a || !allow(a, "occupancy.write", reply)) return;
    const { from_room, to_room, group_id, labels } = req.body;
    if (!labels?.length) return reply.code(422).send(problem(422, "validation", "labels required"));
    return tx(async c => {
      const chk = await checkRoom(c, a.propertyId, to_room, group_id, labels.length);
      if ("err" in chk) { reply.code(chk.err!.status); return chk.err; }
      const r = await c.query(`update room_occupancy o set room_id=$1 from room r where r.id=o.room_id and r.property_id=$2 and r.number=$3 and o.group_id=$4 and o.occupant_label = any($5::text[])`, [chk.roomId, a.propertyId, from_room, group_id, labels]);
      await audit(c, a, "room_occupancy", chk.roomId, "occupancy.move", { payload: { from_room, to_room, labels, rows: r.rowCount } });
      return { ok: true, moved: r.rowCount };
    });
  });

  // Kitchen: covers per meal per day, from groups in house, plus dietary flags.
  f.get<{ Querystring: { from: string; to: string } }>("/covers", async (req, reply) => {
    const a = await requireActor(req, reply); if (!a || !allow(a, "covers.read", reply)) return;
    return coversFor(a.propertyId, req.query.from, req.query.to);
  });

  f.get<{ Querystring: { entity_id?: string; limit?: string } }>("/audit", async (req, reply) => {
    const a = await requireActor(req, reply); if (!a) return;
    const r = await pool.query(`select e.id, e.occurred_at, u.display_name actor, e.entity_type, e.entity_id, e.action, e.from_state, e.to_state, e.reason, e.entity_version, e.payload
      from audit_event e left join app_user u on u.id=e.actor_user_id where e.tenant_id=$1 and ($2::uuid is null or e.entity_id=$2) order by e.id desc limit $3`, [a.tenantId, req.query.entity_id ?? null, Math.min(Number(req.query.limit ?? 50), 200)]);
    return { items: r.rows };
  });
}
