/**
 * The house, as it stands today — property facts plus who is arriving, in residence, and leaving.
 * Built so the staff home screen can last: one read model, no client-side guessing about dates.
 */
import type { FastifyInstance } from "fastify";
import { pool } from "./db.ts";
import { requireActor, allow } from "./auth.ts";
import { coversFor } from "./occupancy.ts";
import { guestHeadcount, houseDayBeats, roomStatusCounts } from "../../../domains/ops/pulse.ts";

export default async function estate(f: FastifyInstance) {
  f.get("/estate", async (req, reply) => {
    const a = await requireActor(req, reply); if (!a || !allow(a, "group.read", reply)) return;
    const todayR = await pool.query(`select (timezone('Europe/London', now()))::date::text as today`);
    const today = todayR.rows[0].today as string;

    const prop = (await pool.query(`
      select p.name, p.code, p.check_in_from::text, p.check_out_by::text, p.settings,
             t.currency, t.timezone, t.country,
             (select count(*) from room r where r.property_id=p.id and not r.staff_only)::int as guest_rooms,
             (select json_build_object('name', s.name, 'seats', s.seats, 'max_covers', s.max_covers)
                from space s where s.property_id=p.id and s.kind='RESTAURANT' order by s.max_covers desc nulls last limit 1) as dining
      from property p join tenant t on t.id=p.tenant_id where p.id=$1`, [a.propertyId])).rows[0];

    // Operational pulse only: sales-stage ENQUIRY / PROVISIONAL records do not count as
    // people physically in the house. Confirmed arrivals and checked-in stays do.
    const groups = (await pool.query(`
      select id, name, organisation, status, expected_guests, expected_rooms,
             arrival_date::text arrival, arrival_slot, departure_date::text departure, departure_slot, colour
      from booking_group
      where property_id=$1
        and status in ('CONFIRMED','IN_HOUSE')
        and arrival_date <= $2 and departure_date >= $2
      order by arrival_date, arrival_slot`, [a.propertyId, today])).rows;

    const arriving = groups.filter((g: { arrival: string; status: string }) => g.arrival === today && g.status === "CONFIRMED");
    const departing = groups.filter((g: { departure: string; status: string }) => g.departure === today && g.status === "IN_HOUSE");
    const inHouse = groups.filter((g: { status: string }) => g.status === "IN_HOUSE");
    const next = (await pool.query(`
      select name, organisation, arrival_date::text arrival, arrival_slot, expected_guests
      from booking_group
      where property_id=$1 and status='CONFIRMED' and arrival_date > $2
      order by arrival_date, arrival_slot limit 1`, [a.propertyId, today])).rows[0] ?? null;

    const occ = await pool.query(`
      select count(distinct o.room_id)::int as rooms
      from room_occupancy o join room r on r.id=o.room_id
      join booking_group g on g.id=o.group_id
      where r.property_id=$1 and o.on_date=$2 and o.slot='PM'
        and g.status in ('CONFIRMED','IN_HOUSE')`, [a.propertyId, today]);
    const covers = await coversFor(a.propertyId, today, today);
    const dinner = covers.days[0]?.dinner ?? 0;
    const settings = prop.settings ?? {};
    const rooms = await pool.query(`select status, staff_only from room where property_id=$1`, [a.propertyId]);
    const hk = roomStatusCounts(rooms.rows);
    const guestsNow = guestHeadcount(inHouse);
    let openTasks = 0;
    let critical = 0;
    try {
      const t = await pool.query(`select
        count(*) filter (where status not in ('completed','verified','cancelled'))::int as open,
        count(*) filter (where severity='critical' and status not in ('completed','verified','cancelled'))::int as critical
        from ops_task where property_id=$1`, [a.propertyId]);
      openTasks = t.rows[0]?.open ?? 0;
      critical = t.rows[0]?.critical ?? 0;
    } catch { /* task engine migration may not be on an older copy */ }

    return {
      property: {
        name: prop.name,
        code: prop.code,
        legal_entity: settings.legal_entity ?? "The Vedanta Way Ltd",
        website: settings.website ?? "https://www.thevedanta.org/",
        currency: prop.currency,
        timezone: prop.timezone,
        country: prop.country,
        check_in_from: (prop.check_in_from as string).slice(0, 5),
        check_out_by: (prop.check_out_by as string).slice(0, 5),
        guest_rooms: prop.guest_rooms,
        dining: prop.dining,
      },
      today,
      pulse: {
        in_house: inHouse.length,
        arriving: arriving.length,
        departing: departing.length,
        rooms_tonight: occ.rows[0]?.rooms ?? 0,
        guest_rooms: prop.guest_rooms,
        dinner,
        in_house_guests: guestsNow,
        rooms_ready: hk.ready,
        rooms_dirty: hk.dirty,
        rooms_inspected: hk.inspected,
        rooms_cleaning: hk.cleaning,
        out_of_order: hk.out_of_order,
        out_of_service: hk.out_of_service,
        open_tasks: openTasks,
        critical_issues: critical,
        payments_due: null, // folio module not yet built — always null; UI shows — via money() helper
      },
      arriving,
      departing,
      in_house: inHouse,
      next,
      timeline: houseDayBeats((prop.check_in_from as string).slice(0, 5), (prop.check_out_by as string).slice(0, 5)),
    };
  });
}
