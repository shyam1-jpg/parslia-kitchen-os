/**
 * House manuals — living Look / Act chapters. Defaults seed from code;
 * house edits are never overwritten. Guests never see this.
 */
import type { FastifyInstance } from "fastify";
import { pool } from "./db.ts";
import { requireActor, problem } from "./auth.ts";
import { departmentLabel, parseDepartment } from "../../../domains/ops/board.ts";
import {
  chapterToPocketBody,
  HOUSE_MANUALS,
  MANUAL_KIND_LABEL,
  parseManualStatus,
} from "../../../domains/ops/manual.ts";

async function requireManualReader(req: any, reply: any) {
  const a = await requireActor(req, reply, ["ADMIN", "STAFF"]);
  if (!a) return null;
  if (a.perms.has("sop.read") || a.perms.has("group.read") || a.perms.has("cover.read")) return a;
  reply.code(403).send(problem(403, "forbidden", "You cannot open the house manual"));
  return null;
}

function shape(row: any) {
  return {
    id: row.id,
    slug: row.slug,
    department: row.department,
    department_label: departmentLabel(row.department),
    kind: row.kind,
    kind_label: MANUAL_KIND_LABEL[row.kind as keyof typeof MANUAL_KIND_LABEL] ?? row.kind,
    title: row.title,
    summary: row.summary,
    body: row.body,
    steps: row.steps ?? [],
    diagram: row.diagram ?? [],
    status: row.status,
    sort_order: row.sort_order,
    updated_at: row.updated_at,
  };
}

async function ensureDefaults(tenantId: string, propertyId: string) {
  const have = new Set(
    (await pool.query(`select slug from house_manual where property_id=$1`, [propertyId])).rows.map((r: { slug: string }) => r.slug),
  );
  for (const ch of HOUSE_MANUALS) {
    if (have.has(ch.slug)) continue;
    await pool.query(
      `insert into house_manual (
         tenant_id, property_id, slug, department, kind, title, summary, body, steps, diagram, sort_order
       ) values ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11)
       on conflict (property_id, slug) do nothing`,
      [tenantId, propertyId, ch.slug, ch.department, ch.kind, ch.title, ch.summary, ch.body, JSON.stringify(ch.steps), JSON.stringify(ch.diagram), ch.sort_order],
    );
  }
}

export default async function manuals(f: FastifyInstance) {
  f.get("/v1/manuals", async (req: any, reply) => {
    const a = await requireManualReader(req, reply); if (!a) return;
    await ensureDefaults(a.tenantId, a.propertyId);
    const withdrawn = String(req.query?.include ?? "") === "withdrawn" && a.perms.has("sop.manage");
    const dept = String(req.query?.department ?? "").trim();
    const r = await pool.query(
      `select id, slug, department, kind, title, summary, body, steps, diagram, status, sort_order, updated_at
       from house_manual
       where property_id=$1
         and ($2 = '' or department=$2)
         and ($3 or status='live')
       order by sort_order, title`,
      [a.propertyId, dept, withdrawn],
    );
    return { items: r.rows.map(shape), can_edit: a.perms.has("sop.manage") };
  });

  f.get("/v1/manuals/:slug", async (req: any, reply) => {
    const a = await requireManualReader(req, reply); if (!a) return;
    await ensureDefaults(a.tenantId, a.propertyId);
    const row = (await pool.query(
      `select id, slug, department, kind, title, summary, body, steps, diagram, status, sort_order, updated_at
       from house_manual where property_id=$1 and slug=$2`,
      [a.propertyId, req.params.slug],
    )).rows[0];
    if (!row) return reply.code(404).send(problem(404, "not_found", "No such chapter"));
    if (row.status === "withdrawn" && !a.perms.has("sop.manage")) {
      return reply.code(404).send(problem(404, "not_found", "That chapter has been withdrawn"));
    }
    return shape(row);
  });

  f.patch("/v1/manuals/:slug", async (req: any, reply) => {
    const a = await requireManualReader(req, reply); if (!a) return;
    if (!a.perms.has("sop.manage")) return reply.code(403).send(problem(403, "forbidden", "Only the house can edit a chapter"));
    const b = req.body ?? {};
    const row = (await pool.query(`select id from house_manual where property_id=$1 and slug=$2`, [a.propertyId, req.params.slug])).rows[0];
    if (!row) return reply.code(404).send(problem(404, "not_found", "No such chapter"));
    const title = b.title != null ? String(b.title).trim() : null;
    const summary = b.summary != null ? String(b.summary) : null;
    const body = b.body != null ? String(b.body) : null;
    const steps = Array.isArray(b.steps) ? b.steps : null;
    const diagram = Array.isArray(b.diagram) ? b.diagram : null;
    const department = b.department != null ? parseDepartment(b.department, "HOUSE") : null;
    await pool.query(
      `update house_manual set
         title = coalesce($3, title),
         summary = coalesce($4, summary),
         body = coalesce($5, body),
         steps = coalesce($6, steps),
         diagram = coalesce($7, diagram),
         department = coalesce($8, department),
         updated_by = $9,
         updated_at = now()
       where id=$1 and property_id=$2`,
      [row.id, a.propertyId, title, summary, body, steps ? JSON.stringify(steps) : null, diagram ? JSON.stringify(diagram) : null, department, a.userId],
    );
    return { ok: true };
  });

  f.post("/v1/manuals/:slug/withdraw", async (req: any, reply) => {
    const a = await requireManualReader(req, reply); if (!a) return;
    if (!a.perms.has("sop.manage")) return reply.code(403).send(problem(403, "forbidden", "Only the house can withdraw a chapter"));
    const status = parseManualStatus(req.body?.status ?? "withdrawn");
    const r = await pool.query(
      `update house_manual set status=$3, updated_by=$4, updated_at=now()
       where property_id=$1 and slug=$2 returning id, status`,
      [a.propertyId, req.params.slug, status, a.userId],
    );
    if (!r.rowCount) return reply.code(404).send(problem(404, "not_found", "No such chapter"));
    return { ok: true, status: r.rows[0].status };
  });

  f.post("/v1/manuals/:slug/send", async (req: any, reply) => {
    const a = await requireManualReader(req, reply); if (!a) return;
    if (!a.perms.has("sop.manage")) return reply.code(403).send(problem(403, "forbidden", "Only the house can send a chapter"));
    const ch = (await pool.query(
      `select * from house_manual where property_id=$1 and slug=$2`,
      [a.propertyId, req.params.slug],
    )).rows[0];
    if (!ch) return reply.code(404).send(problem(404, "not_found", "No such chapter"));
    if (ch.status === "withdrawn") return reply.code(409).send(problem(409, "withdrawn", "Restore the chapter before sending it"));
    const pocket = chapterToPocketBody({ summary: ch.summary, body: ch.body, steps: ch.steps ?? [] });
    const sop = (await pool.query(
      `insert into staff_sop (tenant_id, property_id, title, body, created_by, department, slug, status)
       values ($1,$2,$3,$4,$5,$6,$7,'live') returning id`,
      [a.tenantId, a.propertyId, ch.title, pocket, a.userId, ch.department, ch.slug],
    )).rows[0];
    let ids: string[] = Array.isArray(req.body?.user_ids) ? req.body.user_ids.map(String) : [];
    if (!ids.length) {
      const team = await pool.query(
        `select u.id from app_user u
         join membership m on m.user_id=u.id
         left join department d on d.id=m.department_id
         where m.property_id=$1 and u.status='ACTIVE'
           and ($2='HOUSE' or d.code=$2 or $2='NIGHT' and d.code='FRONT')`,
        [a.propertyId, ch.department],
      );
      ids = team.rows.map((r: { id: string }) => r.id);
    }
    for (const id of ids) {
      await pool.query(`insert into staff_sop_assignment (sop_id, user_id) values ($1,$2) on conflict do nothing`, [sop.id, id]);
    }
    return { id: sop.id, sent: ids.length };
  });
}
