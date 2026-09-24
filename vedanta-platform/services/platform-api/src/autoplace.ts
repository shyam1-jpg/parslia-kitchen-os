/**
 * Auto-place attendees from the organiser form onto the room board.
 * Honours: singles → a room alone (smallest first); "share_with:<name>" pairs together; everyone else
 * filled into twins/triples in list order. Only touches free rooms and unplaced attendees; staff adjust after.
 */
import type { FastifyInstance } from "fastify";
import { pool, tx } from "./db.ts";
import { requireActor, allow, problem } from "./auth.ts";
import { audit, freeRooms, halfDays } from "./groups.ts";

export default async function routes(f: FastifyInstance) {
  f.post<{ Params: { id: string }; Body: { dry_run?: boolean } }>("/groups/:id/auto-place", async (req, reply) => {
    const a = await requireActor(req, reply); if (!a || !allow(a, "occupancy.write", reply)) return;
    return tx(async c => {
      const g = (await c.query(`select id, name, status, arrival_date::text, arrival_slot, departure_date::text, departure_slot from booking_group where id=$1 and property_id=$2 for update`, [req.params.id, a.propertyId])).rows[0];
      if (!g) { reply.code(404); return problem(404, "not_found", "No such booking"); }
      if (["CANCELLED", "COMPLETED"].includes(g.status)) { reply.code(409); return problem(409, "closed", "Booking is closed"); }
      const att = (await c.query(`select p.id, p.given_name || ' ' || p.family_name name, ga.room_preference pref from group_attendee ga join person p on p.id=ga.person_id
        where ga.group_id=$1 and not exists (select 1 from room_occupancy o where o.person_id=p.id and o.group_id=$1) order by ga.submitted_at, p.family_name`, [g.id])).rows as { id: string; name: string; pref: string | null }[];
      if (!att.length) return { placed: [], unplaced: [], note: "Everyone from the form is already on the board (or nobody has been submitted yet)." };
      const freeNums = await freeRooms(c, a.propertyId, g);
      const rooms = (await c.query(`select number, max_capacity cap from room where property_id=$1 and number = any($2::text[]) order by max_capacity, number`, [a.propertyId, freeNums])).rows as { number: string; cap: number }[];
      // Build parties: share_with pairs, singles, then the rest.
      const byName = new Map(att.map(x => [x.name.toLowerCase(), x])); const used = new Set<string>(); const parties: { people: typeof att; single: boolean }[] = [];
      for (const x of att) {
        if (used.has(x.id)) continue;
        const m = x.pref?.match(/^share_with:(.+)$/i); const mate = m ? [...byName.values()].find(y => !used.has(y.id) && y.id !== x.id && y.name.toLowerCase().includes(m[1].trim().toLowerCase())) : null;
        if (mate) { parties.push({ people: [x, mate], single: false }); used.add(x.id); used.add(mate.id); }
        else if (x.pref === "single") { parties.push({ people: [x], single: true }); used.add(x.id); }
      }
      const rest = att.filter(x => !used.has(x.id));
      for (let i = 0; i < rest.length; i += 2) parties.push({ people: rest.slice(i, i + 2), single: false });
      // Assign: singles take the smallest rooms; pairs need cap ≥ 2.
      const placed: { room: string; names: string[] }[] = []; const unplaced: string[] = []; const avail = [...rooms];
      for (const p of parties.sort((x, y) => Number(y.single) - Number(x.single))) {
        const i = avail.findIndex(r => r.cap >= p.people.length); if (i < 0) { unplaced.push(...p.people.map(x => x.name)); continue; }
        const r = avail.splice(i, 1)[0]; placed.push({ room: r.number, names: p.people.map(x => x.name) });
        if (!req.body?.dry_run) {
          const rid = (await c.query(`select id from room where property_id=$1 and number=$2`, [a.propertyId, r.number])).rows[0].id;
          for (const x of p.people) for (const h of halfDays(g)) await c.query(`insert into room_occupancy (tenant_id, room_id, group_id, person_id, occupant_label, on_date, slot) values ($1,$2,$3,$4,$5,$6,$7) on conflict do nothing`, [a.tenantId, rid, g.id, x.id, x.name, h.date, h.slot]);
        }
      }
      if (!req.body?.dry_run) await audit(c, a, "booking_group", g.id, "occupancy.auto_place", { payload: { placed, unplaced } });
      return { placed, unplaced, rooms_free_before: rooms.length, note: unplaced.length ? `${unplaced.length} could not be placed — not enough free rooms for the dates.` : undefined };
    });
  });
}
