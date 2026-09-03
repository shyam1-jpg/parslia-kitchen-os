import type { FastifyInstance } from "fastify";
import { pool, tx } from "./db.ts";
import { requireActor, allow, problem } from "./auth.ts";
import { audit } from "./groups.ts";
import { transitionRoom, type RoomCommand, type RoomStatus } from "../../../domains/housekeeping/room-state.ts";
import { stayKind, visitMinutes } from "../../../domains/housekeeping/board.ts";

const CMD_PERM: Record<RoomCommand, string> = { start_cleaning: "room.status.update", finish_cleaning: "room.status.update", pass_inspection: "room.status.update", fail_inspection: "room.status.update",
  occupy: "room.status.update", vacate: "room.status.update", set_out_of_service: "room.oos.set", set_out_of_order: "room.oos.set", restore: "room.oos.set" };

/** Housekeeping board: every room's status plus what today's board needs to know — who is leaving, who is arriving. */
export default async function routes(f: FastifyInstance) {
  f.get<{ Querystring: { date?: string } }>("/housekeeping", async (req, reply) => {
    const a = await requireActor(req, reply); if (!a || !allow(a, "group.read", reply)) return;
    const date = req.query.date ?? new Date().toISOString().slice(0, 10);
    const r = await pool.query(`
      with today as (select room_id, bool_or(slot='AM') am, bool_or(slot='PM') pm, string_agg(distinct occupant_label, ', ') names, max(g.name) grp
                     from room_occupancy o left join booking_group g on g.id=o.group_id where o.on_date=$2 group by room_id),
           yday  as (select room_id, bool_or(slot='PM') pm from room_occupancy where on_date=$2::date - 1 group by room_id)
      select r.number, r.section, r.status, r.max_capacity, r.notes, r.staff_only, r.version,
             coalesce(y.pm,false) occupied_last_night, coalesce(t.pm,false) occupied_tonight, coalesce(t.am,false) here_this_morning,
             t.names, t.grp group_name,
             (select to_status || ' · ' || coalesce(u.display_name,'') || ' · ' || to_char(e.at at time zone 'Europe/London','HH24:MI') from room_status_event e left join app_user u on u.id=e.by_user_id where e.room_id=r.id order by e.at desc limit 1) last_change,
             (select e.at from room_status_event e where e.room_id=r.id and e.to_status='CLEANING' and (e.at at time zone 'Europe/London')::date = $2::date order by e.at desc limit 1) cleaning_started_at,
             (select e.at from room_status_event e where e.room_id=r.id and e.to_status='VACANT_CLEAN' and (e.at at time zone 'Europe/London')::date = $2::date order by e.at desc limit 1) cleaning_finished_at,
             (select coalesce(u.display_name,'') from room_status_event e left join app_user u on u.id=e.by_user_id where e.room_id=r.id and e.to_status='CLEANING' and (e.at at time zone 'Europe/London')::date = $2::date order by e.at desc limit 1) attendant
      from room r left join today t on t.room_id=r.id left join yday y on y.room_id=r.id
      where r.property_id=$1
      order by array_position(array['Ground Floor','Pink Corridor','First Floor','Green Corridor','Second Floor'], r.section), r.number`, [a.propertyId, date]);
    const groups = await pool.query(`
      select g.name, g.organisation, g.arrival_date::text arrival, g.departure_date::text departure,
             g.expected_rooms, g.expected_guests,
             (select count(distinct o.room_id)::int from room_occupancy o where o.group_id=g.id and o.on_date=$2) rooms_placed
      from booking_group g
      where g.property_id=$1 and g.status not in ('CANCELLED','COMPLETED')
        and g.arrival_date <= $2::date and g.departure_date >= $2::date
      order by g.arrival_date, g.name`, [a.propertyId, date]);
    const arrivals = groups.rows.filter((g: { arrival: string }) => g.arrival === date);
    const departures = groups.rows.filter((g: { departure: string }) => g.departure === date);
    const stayovers = groups.rows.filter((g: { arrival: string; departure: string }) => g.arrival < date && g.departure > date);
    const unplaced = groups.rows.filter((g: { rooms_placed: number; expected_rooms: number | null }) => (g.expected_rooms ?? 0) > g.rooms_placed);
    const rooms = r.rows.map(x => {
      const kind = stayKind({ occupied_last_night: !!x.occupied_last_night, occupied_tonight: !!x.occupied_tonight, here_this_morning: !!x.here_this_morning });
      return {
        ...x,
        stay: kind,
        cleaning_started: x.cleaning_started_at ? new Date(x.cleaning_started_at).toISOString() : null,
        cleaning_finished: x.cleaning_finished_at ? new Date(x.cleaning_finished_at).toISOString() : null,
        duration_minutes: visitMinutes(x.cleaning_started_at, x.cleaning_finished_at),
        attendant: x.attendant || null,
        task: x.staff_only ? null : ["OUT_OF_SERVICE", "OUT_OF_ORDER"].includes(x.status) ? "out"
          : kind === "departure" ? "departure_clean"
          : kind === "stayover" ? "stayover"
          : kind === "arrival" ? "arrival_prepare"
          : "vacant",
      };
    });
    const counts = Object.fromEntries(["departure_clean", "stayover", "arrival_prepare", "vacant", "out"].map(k => [k, rooms.filter(x => x.task === k).length]));
    return {
      date, rooms, counts,
      groups: { arrivals, departures, stayovers, unplaced },
      hint: unplaced.length
        ? `${unplaced.length} group(s) in house today still need rooms on the board — place guests on the Room board first, then departure and arrival cleans will appear here.`
        : counts.departure_clean + counts.arrival_prepare + counts.stayover === 0 && (arrivals.length + departures.length + stayovers.length) > 0
          ? "Groups are in house but no room placements for today — open the Room board and assign guests to rooms."
          : null,
    };
  });

  f.post<{ Params: { number: string; cmd: RoomCommand }; Body: { reason?: string; safety_check_passed?: boolean }; Headers: { "if-match"?: string } }>("/rooms/:number/commands/:cmd", async (req, reply) => {
    const a = await requireActor(req, reply); if (!a) return;
    const perm = CMD_PERM[req.params.cmd]; if (!perm) return reply.code(404).send(problem(404, "unknown_command", `No command '${req.params.cmd}'`));
    if (!allow(a, perm, reply)) return;
    return tx(async c => {
      const r = (await c.query(`select id, status, status_before_oos, version from room where property_id=$1 and number=$2 for update`, [a.propertyId, req.params.number])).rows[0];
      if (!r) { reply.code(404); return problem(404, "not_found", "No such room"); }
      const ver = Number(req.headers["if-match"]); if (ver && ver !== r.version) { reply.code(409); return problem(409, "version_conflict", "Someone else changed this room. Reload and try again."); }
      let next; try { next = transitionRoom({ status: r.status as RoomStatus, statusBeforeOos: r.status_before_oos }, req.params.cmd, { safetyCheckPassed: !!req.body?.safety_check_passed }); }
      catch (e: any) { reply.code(409); return problem(409, "invalid_transition", e.message); }
      const u = await c.query(`update room set status=$2, status_before_oos=$3, version=version+1 where id=$1 returning status, version`, [r.id, next.status, next.statusBeforeOos]);
      await c.query(`insert into room_status_event (tenant_id, room_id, from_status, to_status, by_user_id, reason) values ($1,$2,$3,$4,$5,$6)`, [a.tenantId, r.id, r.status, next.status, a.userId, req.body?.reason ?? null]);
      await audit(c, a, "room", r.id, "room." + req.params.cmd, { from: r.status, to: next.status, reason: req.body?.reason, version: u.rows[0].version });
      return { number: req.params.number, status: u.rows[0].status, version: u.rows[0].version };
    });
  });
}
