import type { FastifyInstance } from "fastify";
import { pool, tx } from "./db.ts";
import { requireActor, allow, problem } from "./auth.ts";
import { audit } from "./groups.ts";

/** Booking value from package + agreed prices. Returns null when nothing is priced. */
export function bookingValue(g: { agreed_total: string | number | null; price_basis?: string | null; price_twin?: string | number | null; price_single?: string | number | null;
  agreed_price_twin: string | number | null; agreed_price_single: string | number | null; expected_guests: number | null; singles_count: number | null; arrival_date: string; departure_date: string }): number | null {
  if (g.agreed_total != null) return Number(g.agreed_total);
  if (!g.price_basis) return null;
  const twin = g.agreed_price_twin ?? g.price_twin; const single = g.agreed_price_single ?? g.price_single;
  if (g.price_basis === "FIXED") return twin == null ? null : Number(twin);
  const guests = g.expected_guests ?? 0; const singles = Math.min(guests, g.singles_count ?? 0);
  const nights = Math.max(1, Math.round((+new Date(g.departure_date) - +new Date(g.arrival_date)) / 86400000));
  const per = (guests - singles) * Number(twin ?? 0) + singles * Number(single ?? twin ?? 0);
  return g.price_basis === "PER_PERSON_PER_NIGHT" ? per * nights : per;
}

export default async function routes(f: FastifyInstance) {
  f.get("/packages", async (req, reply) => {
    const a = await requireActor(req, reply); if (!a || !allow(a, "group.read", reply)) return;
    const r = await pool.query(`select id, code, name, price_basis, price_twin, price_single, includes_spa, includes_meals, active, sort from package where property_id=$1 order by sort, name`, [a.propertyId]);
    return { items: r.rows };
  });
  f.post<{ Body: Record<string, unknown> }>("/packages", async (req, reply) => {
    const a = await requireActor(req, reply); if (!a || !allow(a, "package.manage", reply)) return;
    const b = req.body; if (!b.code || !b.name || !b.price_basis) return reply.code(422).send(problem(422, "validation", "code, name and price_basis are required"));
    return tx(async c => {
      const r = await c.query(`insert into package (tenant_id, property_id, code, name, price_basis, price_twin, price_single, includes_spa, includes_meals, sort) values ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10) returning id`,
        [a.tenantId, a.propertyId, String(b.code).toUpperCase().replace(/\W+/g, "_"), b.name, b.price_basis, b.price_twin ?? null, b.price_single ?? null, !!b.includes_spa, b.includes_meals !== false, b.sort ?? 100]);
      await audit(c, a, "package", r.rows[0].id, "package.create", { payload: b }); reply.code(201); return { id: r.rows[0].id };
    });
  });
  f.patch<{ Params: { id: string }; Body: Record<string, unknown> }>("/packages/:id", async (req, reply) => {
    const a = await requireActor(req, reply); if (!a || !allow(a, "package.manage", reply)) return;
    const allowed = ["name", "price_basis", "price_twin", "price_single", "includes_spa", "includes_meals", "active", "sort"];
    const sets: string[] = []; const vals: unknown[] = [];
    for (const k of allowed) if (k in req.body) { vals.push(req.body[k]); sets.push(`${k}=$${vals.length}`); }
    if (!sets.length) return reply.code(422).send(problem(422, "validation", "Nothing to change"));
    vals.push(req.params.id, a.propertyId);
    return tx(async c => {
      const r = await c.query(`update package set ${sets.join(",")} where id=$${vals.length - 1} and property_id=$${vals.length}`, vals);
      if (!r.rowCount) { reply.code(404); return problem(404, "not_found", "No such package"); }
      await audit(c, a, "package", req.params.id, "package.update", { payload: req.body }); return { ok: true };
    });
  });
}
