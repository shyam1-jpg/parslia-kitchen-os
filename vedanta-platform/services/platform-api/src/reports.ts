import type { FastifyInstance } from "fastify";
import { pool } from "./db.ts";
import { requireActor, allow } from "./auth.ts";
import { bookingValue } from "./packages.ts";

/** Monthly figures. Room-nights come from the board (a room with anyone in it on a PM = one room-night);
 *  guest-nights from booking guest counts; covers from the same meal rules as the kitchen view. */
export default async function routes(f: FastifyInstance) {
  f.get<{ Querystring: { year?: string } }>("/reports/monthly", async (req, reply) => {
    const a = await requireActor(req, reply); if (!a || !allow(a, "report.read", reply)) return;
    const year = Number(req.query.year ?? new Date().getFullYear());
    const sellable = (await pool.query(`select count(*)::int n from room where property_id=$1 and not staff_only`, [a.propertyId])).rows[0].n;
    const r = await pool.query(`
      with months as (select generate_series(make_date($2::int,1,1), make_date($2::int,12,1), '1 month')::date m),
      nights as (select date_trunc('month', on_date)::date m, count(distinct (room_id, on_date)) room_nights, count(distinct (room_id, on_date, occupant_label)) bed_nights
                 from room_occupancy o join room r on r.id=o.room_id where r.property_id=$1 and slot='PM' and extract(year from on_date)=$2::int group by 1),
      grp as (select date_trunc('month', arrival_date)::date m,
                     count(*) filter (where status not in ('CANCELLED')) bookings,
                     count(*) filter (where status = 'CANCELLED') cancelled,
                     sum(expected_guests) filter (where status not in ('CANCELLED')) guests,
                     sum(expected_guests * greatest(departure_date - arrival_date, 1)) filter (where status not in ('CANCELLED') and retreat_type not in ('day_retreat','venue_hire')) guest_nights,
                     count(*) filter (where retreat_type in ('day_retreat','venue_hire') and status not in ('CANCELLED')) day_events,
                     count(*) filter (where retreat_type = 'wedding' and status not in ('CANCELLED')) weddings,
                     count(*) filter (where use_basis = 'EXCLUSIVE' and status not in ('CANCELLED')) exclusive
              from booking_group where property_id=$1 and extract(year from arrival_date)=$2 group by 1)
      select to_char(months.m,'YYYY-MM') as ym, to_char(months.m,'Mon') as label,
             coalesce(g.bookings,0)::int bookings, coalesce(g.cancelled,0)::int cancelled, coalesce(g.guests,0)::int guests, coalesce(g.guest_nights,0)::int guest_nights,
             coalesce(g.day_events,0)::int day_events, coalesce(g.weddings,0)::int weddings, coalesce(g.exclusive,0)::int exclusive,
             coalesce(n.room_nights,0)::int room_nights, coalesce(n.bed_nights,0)::int bed_nights,
             (extract(day from (months.m + interval '1 month - 1 day'))::int * $3) available_room_nights
      from months left join grp g on g.m=months.m left join nights n on n.m=months.m order by months.m`, [a.propertyId, year, sellable]);
    const priced = await pool.query(`select to_char(g.arrival_date,'YYYY-MM') ym, g.agreed_total, g.agreed_price_twin, g.agreed_price_single, g.expected_guests, g.singles_count, g.arrival_date::text, g.departure_date::text, pk.price_basis, pk.price_twin, pk.price_single
      from booking_group g left join package pk on pk.id=g.package_id where g.property_id=$1 and extract(year from g.arrival_date)=$2::int and g.status <> 'CANCELLED'`, [a.propertyId, year]);
    const rev: Record<string, { value: number; priced: number; unpriced: number }> = {};
    for (const g of priced.rows) { const v = bookingValue(g); const m = rev[g.ym] ??= { value: 0, priced: 0, unpriced: 0 }; if (v == null) m.unpriced++; else { m.value += v; m.priced++; } }
    const items = r.rows.map(x => ({ ...x, occupancy_pct: x.available_room_nights ? Math.round(100 * x.room_nights / x.available_room_nights) : 0, revenue: Math.round(rev[x.ym]?.value ?? 0), bookings_priced: rev[x.ym]?.priced ?? 0, bookings_unpriced: rev[x.ym]?.unpriced ?? 0 }));
    const orgs = await pool.query(`select coalesce(nullif(organisation,''), name) organisation, count(*)::int bookings, sum(expected_guests)::int guests
      from booking_group where property_id=$1 and extract(year from arrival_date)=$2::int and status <> 'CANCELLED' group by 1 order by 2 desc, 3 desc limit 12`, [a.propertyId, year]);
    return { year, sellable_rooms: sellable, items, top_organisations: orgs.rows, note: "Revenue = agreed total, or package price × guests (× nights for nightly packages). Bookings without a package or agreed price are counted as unpriced." };
  });
}
