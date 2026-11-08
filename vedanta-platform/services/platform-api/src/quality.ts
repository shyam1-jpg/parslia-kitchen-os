/**
 * Data-quality read model. Live counts from existing tables plus an optional
 * house overlay. Never invents rooms, dates or prices. Never rewrites import rows.
 */
import type { FastifyInstance } from "fastify";
import { pool } from "./db.ts";
import { requireActor, allow, problem } from "./auth.ts";
import {
  CONFIGURED_ROOM_TOTAL,
  DOCUMENTED_SKIPPED_DRY_RUN,
  DOCUMENTED_SKIPPED_PROGRESS_MD,
  QUALITY_CODES,
  buildQualityItems,
  parseQualityStatus,
  type QualityCode,
} from "../../../domains/quality/findings.ts";

export default async function routes(f: FastifyInstance) {
  f.get("/quality", async (req, reply) => {
    const a = await requireActor(req, reply); if (!a || !allow(a, "group.read", reply)) return;

    const rooms = await pool.query(
      `select number, staff_only from room where property_id=$1 order by number`,
      [a.propertyId],
    );
    const numbers = rooms.rows.map((r: { number: string }) => r.number);
    const staff = rooms.rows.filter((r: { staff_only: boolean }) => r.staff_only).length;
    const guest = rooms.rows.length - staff;

    const assumed = await pool.query(
      `select count(*)::int as n from booking_group where property_id=$1 and review_reason is not null`,
      [a.propertyId],
    );
    const groups = await pool.query(
      `select count(*)::int as n from booking_group where property_id=$1`,
      [a.propertyId],
    );
    const unlinked = await pool.query(
      `select count(*)::int as n from room_occupancy o
        join room r on r.id=o.room_id
       where r.property_id=$1 and o.group_id is null`,
      [a.propertyId],
    );
    const occupancy = await pool.query(
      `select count(*)::int as n from room_occupancy o
        join room r on r.id=o.room_id
       where r.property_id=$1`,
      [a.propertyId],
    );
    const packages = await pool.query(
      `select count(*)::int as n from package where property_id=$1`,
      [a.propertyId],
    );
    const overlay = await pool.query(
      `select f.code, f.status, f.note, f.decided_at, u.display_name as decided_by
         from data_quality_finding f
         left join app_user u on u.id=f.decided_by
        where f.property_id=$1`,
      [a.propertyId],
    );

    const items = buildQualityItems({
      configured: CONFIGURED_ROOM_TOTAL,
      actual: rooms.rows.length,
      guest,
      staff,
      numbers,
      assumedDepartures: assumed.rows[0].n,
      unlinkedPlacements: unlinked.rows[0].n,
      skippedProgressMd: DOCUMENTED_SKIPPED_PROGRESS_MD,
      skippedDryRun: DOCUMENTED_SKIPPED_DRY_RUN,
      packageCount: packages.rows[0].n,
      overlays: overlay.rows.map((r: any) => ({
        code: r.code,
        status: r.status,
        note: r.note ?? "",
        decided_by: r.decided_by ?? null,
        decided_at: r.decided_at ? new Date(r.decided_at).toISOString() : null,
      })),
    });

    return {
      generated_at: new Date().toISOString(),
      inventory: {
        configured: CONFIGURED_ROOM_TOTAL,
        actual: rooms.rows.length,
        guest,
        staff,
        numbers,
      },
      import: {
        groups: groups.rows[0].n,
        assumed_departures: assumed.rows[0].n,
        occupancy: occupancy.rows[0].n,
        unlinked_placements: unlinked.rows[0].n,
        skipped_progress_md: DOCUMENTED_SKIPPED_PROGRESS_MD,
        skipped_dry_run: DOCUMENTED_SKIPPED_DRY_RUN,
      },
      packages: { count: packages.rows[0].n },
      items,
    };
  });

  f.patch<{ Params: { code: string }; Body: { status?: unknown; note?: unknown } }>("/quality/:code", async (req, reply) => {
    const a = await requireActor(req, reply); if (!a || !allow(a, "group.update", reply)) return;
    const code = String(req.params.code ?? "").toUpperCase();
    if (!(QUALITY_CODES as readonly string[]).includes(code)) {
      return reply.code(404).send(problem(404, "not_found", "Unknown data-quality finding"));
    }
    const status = parseQualityStatus(req.body?.status);
    if (!status) return reply.code(422).send(problem(422, "validation", "Status must be VERIFIED, NEEDS_REVIEW, SOURCE_CONFLICT or MISSING"));
    const note = String(req.body?.note ?? "").trim().slice(0, 2000);
    await pool.query(
      `insert into data_quality_finding(property_id, code, status, note, decided_by, decided_at)
       values($1,$2,$3,$4,$5,now())
       on conflict (property_id, code) do update
         set status=excluded.status, note=excluded.note, decided_by=excluded.decided_by, decided_at=now()`,
      [a.propertyId, code, status, note, a.userId],
    );
    return { code: code as QualityCode, status, note, decided_by: a.name, decided_at: new Date().toISOString() };
  });
}
