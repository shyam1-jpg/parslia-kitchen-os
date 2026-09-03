/**
 * The house, as it stands today — property facts plus who is arriving, in residence, and leaving.
 * Built so the staff home screen can last: one read model, no client-side guessing about dates.
 */
import type { FastifyInstance } from "fastify";
import { pool } from "./db.ts";
import { requireActor, allow } from "./auth.ts";
import { coversFor } from "./occupancy.ts";

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

    const groups = (await pool.query(`
      select id, name, organisation, status, expected_guests, expected_rooms,
             arrival_date::text arrival, arrival_slot, departure_date::text departure, departure_slot, colour
      from booking_group
      where property_id=$1 and status not in ('CANCELLED')
        and (status = 'IN_HOUSE'
          or (arrival_date = $2 and status in ('CONFIRMED','PROVISIONAL','IN_HOUSE'))
          or (departure_date = $2 and status in ('CONFIRMED','PROVISIONAL','IN_HOUSE'))
          or (status = 'CONFIRMED' and arrival_date > $2))
      order by arrival_date, arrival_slot`, [a.propertyId, today])).rows;

    const inHouse = groups.filter((g: { status: string; arrival: string; departure: string }) =>
      g.status === "IN_HOUSE" || (g.arrival <= today && g.departure >= today && ["CONFIRMED", "PROVISIONAL", "IN_HOUSE"].includes(g.status) && g.arrival < today));
    const arriving = groups.filter((g: { arrival: string; status: string }) => g.arrival === today && g.status !== "COMPLETED");
    const departing = groups.filter((g: { departure: string; status: string }) => g.departure === today && g.status !== "COMPLETED");
    const next = (await pool.query(`
      select name, organisation, arrival_date::text arrival, arrival_slot, expected_guests
      from booking_group
      where property_id=$1 and status in ('CONFIRMED','PROVISIONAL') and arrival_date > $2
      order by arrival_date, arrival_slot limit 1`, [a.propertyId, today])).rows[0] ?? null;

    const occ = await pool.query(`
      select count(distinct o.room_id)::int as rooms
      from room_occupancy o join room r on r.id=o.room_id
      where r.property_id=$1 and o.on_date=$2 and o.slot='PM'`, [a.propertyId, today]);
    const covers = await coversFor(a.propertyId, today, today);
    const dinner = covers.days[0]?.dinner ?? 0;
    const settings = prop.settings ?? {};

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
      },
      arriving,
      departing,
      in_house: inHouse,
      next,
    };
  });
}
