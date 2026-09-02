import type { FastifyInstance } from "fastify";
import { pool, tx } from "./db.ts";
import { requireActor, allow, problem } from "./auth.ts";
import { audit } from "./groups.ts";
import { transitionRoom, type RoomCommand, type RoomStatus } from "../../../domains/housekeeping/room-state.ts";

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
             (select to_status || ' · ' || coalesce(u.display_name,'') || ' · ' || to_char(e.at at time zone 'Europe/London','HH24:MI') from room_status_event e left join app_user u on u.id=e.by_user_id where e.room_id=r.id order by e.at desc limit 1) last_change
      from room r left join today t on t.room_id=r.id left join yday y on y.room_id=r.id
      where r.property_id=$1
      order by array_position(array['Ground Floor','Pink Corridor','First Floor','Green Corridor','Second Floor'], r.section), r.number`, [a.propertyId, date]);
    const rooms = r.rows.map(x => ({ ...x,
      // What housekeeping should do with this room today.
      task: x.staff_only ? null : ["OUT_OF_SERVICE", "OUT_OF_ORDER"].includes(x.status) ? "out"
        : x.occupied_last_night && !x.occupied_tonight ? "departure_clean"
        : x.occupied_last_night && x.occupied_tonight ? "stayover"
        : !x.occupied_last_night && x.occupied_tonight ? "arrival_prepare"
        : "vacant" }));
    const counts = Object.fromEntries(["departure_clean", "stayover", "arrival_prepare", "vacant", "out"].map(k => [k, rooms.filter(x => x.task === k).length]));
    return { date, rooms, counts };
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
