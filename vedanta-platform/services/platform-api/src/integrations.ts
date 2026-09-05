/**
 * Outbound feed for the kitchen system (Parslia Kitchen OS) and any other integration.
 * Authenticated with an integration key (X-Api-Key), stored hashed. Read-only.
 */
import { createHash, randomBytes } from "node:crypto";
import type { FastifyInstance, FastifyRequest, FastifyReply } from "fastify";
import { pool } from "./db.ts";
import { requireActor, allow, problem } from "./auth.ts";
import { coversFor } from "./occupancy.ts";

const hash = (k: string) => createHash("sha256").update(k).digest("hex");
async function requireKey(req: FastifyRequest, reply: FastifyReply, scope: string) {
  const k = req.headers["x-api-key"] as string | undefined;
  const row = k ? (await pool.query(`select id, property_id, scopes from integration_key where key_hash=$1 and revoked_at is null`, [hash(k)])).rows[0] : null;
  if (!row || !row.scopes.includes(scope)) { reply.code(401).send(problem(401, "unauthenticated", "A valid X-Api-Key with the right scope is required")); return null; }
  await pool.query(`update integration_key set last_used_at=now() where id=$1`, [row.id]);
  return row as { id: string; property_id: string; scopes: string[] };
}

export default async function routes(f: FastifyInstance) {
  // Staff: manage keys (system owner)
  f.get("/v1/integrations/keys", async (req, reply) => {
    const a = await requireActor(req, reply); if (!a || !allow(a, "config.manage", reply)) return;
    const r = await pool.query(`select id, name, scopes, created_at, last_used_at, revoked_at from integration_key where property_id=$1 order by created_at desc`, [a.propertyId]);
    return { items: r.rows };
  });
  f.post<{ Body: { name: string; scopes?: string[] } }>("/v1/integrations/keys", async (req, reply) => {
    const a = await requireActor(req, reply); if (!a || !allow(a, "config.manage", reply)) return;
    if (!req.body?.name) return reply.code(422).send(problem(422, "validation", "name is required"));
    const key = "vk_" + randomBytes(24).toString("base64url");
    await pool.query(`insert into integration_key (tenant_id, property_id, name, key_hash, scopes) values ($1,$2,$3,$4,$5)`, [a.tenantId, a.propertyId, req.body.name, hash(key), req.body.scopes ?? ["kitchen.read"]]);
    reply.code(201); return { key, note: "Shown once. Store it in the kitchen system now." };
  });
  f.delete<{ Params: { id: string } }>("/v1/integrations/keys/:id", async (req, reply) => {
    const a = await requireActor(req, reply); if (!a || !allow(a, "config.manage", reply)) return;
    await pool.query(`update integration_key set revoked_at=now() where id=$1 and property_id=$2`, [req.params.id, a.propertyId]); return { ok: true };
  });

  /** Kitchen feed: covers per service per day, groups in house, and every declared allergen/diet with room number. */
  f.get<{ Querystring: { from?: string; to?: string } }>("/integrations/kitchen/feed", async (req, reply) => {
    const k = await requireKey(req, reply, "kitchen.read"); if (!k) return;
    const from = req.query.from ?? new Date().toISOString().slice(0, 10);
    const to = req.query.to ?? new Date(Date.now() + 6 * 86400000).toISOString().slice(0, 10);
    const covers = await coversFor(k.property_id, from, to);
    const flags = await pool.query(`select o.on_date::text date, p.id person_id, p.given_name || ' ' || p.family_name name, r.number room, d.diet, d.allergens, d.severity, d.notes, g.name group_name
      from room_occupancy o join room r on r.id=o.room_id join person p on p.id=o.person_id join diet_profile d on d.person_id=p.id left join booking_group g on g.id=o.group_id
      where r.property_id=$1 and o.on_date between $2 and $3 and (coalesce(array_length(d.allergens,1),0) > 0 or coalesce(array_length(d.diet,1),0) > 0)
      group by 1,2,3,4,5,6,7,8,9 order by 1, 7 desc nulls last`, [k.property_id, from, to]);
    // Attendees declared via the organiser form but not yet placed in a room still matter to the kitchen.
    const unplaced = await pool.query(`select g.arrival_date::text arrival, g.departure_date::text departure, g.name group_name, p.given_name || ' ' || p.family_name name, d.diet, d.allergens, d.severity, d.notes
      from group_attendee ga join booking_group g on g.id=ga.group_id join person p on p.id=ga.person_id join diet_profile d on d.person_id=p.id
      where g.property_id=$1 and g.status not in ('CANCELLED') and g.departure_date >= $2 and g.arrival_date <= $3 and (coalesce(array_length(d.allergens,1),0) > 0 or coalesce(array_length(d.diet,1),0) > 0)
        and not exists (select 1 from room_occupancy o where o.person_id=p.id and o.on_date between $2 and $3)`, [k.property_id, from, to]);
    return { schema: "vedanta.kitchen-feed/1", generated_at: new Date().toISOString(), property: "VOR", from, to, max_covers: covers?.max_covers ?? 130,
      days: covers?.days ?? [], dietary: { placed: flags.rows, not_yet_placed: unplaced.rows } };
  });
}
