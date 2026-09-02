import type { FastifyInstance } from "fastify";
import { pool, tx } from "./db.ts";
import { requireActor, allow, problem } from "./auth.ts";
import { audit } from "./groups.ts";

export const ALLERGENS = ["celery", "cereals_gluten", "crustaceans", "eggs", "fish", "lupin", "milk", "molluscs", "mustard", "nuts", "peanuts", "sesame", "soya", "sulphites"];
const SEVERITY = ["PREFERENCE", "INTOLERANCE", "ALLERGY", "ANAPHYLAXIS"];
const COLS = `p.id, p.given_name, p.family_name, p.email, p.phone, p.organisation, p.notes, p.updated_at,
  d.diet, d.allergens, d.severity, d.notes diet_notes, d.declared_at,
  (select count(distinct (o.room_id, o.on_date)) from room_occupancy o where o.person_id=p.id) nights_on_board`;

/** Guest records. Dietary/allergen data is a safety record: every change is audited and the kitchen sees it. */
export default async function routes(f: FastifyInstance) {
  f.get<{ Querystring: { q?: string; allergens?: string; limit?: string } }>("/guests", async (req, reply) => {
    const a = await requireActor(req, reply); if (!a || !allow(a, "guest.read", reply)) return;
    const q = (req.query.q ?? "").trim();
    const r = await pool.query(`select ${COLS} from person p left join diet_profile d on d.person_id=p.id
      where p.tenant_id=$1 and ($2 = '' or (p.given_name || ' ' || p.family_name) ilike '%' || $2 || '%' or p.email ilike '%' || $2 || '%' or p.organisation ilike '%' || $2 || '%')
        and ($3::boolean is not true or coalesce(array_length(d.allergens,1),0) > 0)
      order by p.family_name, p.given_name limit $4`, [a.tenantId, q, req.query.allergens === "1", Number(req.query.limit ?? 100)]);
    return { items: r.rows, allergens: ALLERGENS, severities: SEVERITY };
  });

  f.post<{ Body: { given_name: string; family_name: string; email?: string; phone?: string; organisation?: string; notes?: string } }>("/guests", async (req, reply) => {
    const a = await requireActor(req, reply); if (!a || !allow(a, "guest.write", reply)) return;
    const b = req.body ?? {} as any;
    if (!b.given_name?.trim() || !b.family_name?.trim()) return reply.code(422).send(problem(422, "validation", "First and last name are required"));
    return tx(async c => {
      const r = await c.query(`insert into person (tenant_id, given_name, family_name, email, phone, organisation, notes) values ($1,$2,$3,$4,$5,$6,$7) returning id`,
        [a.tenantId, b.given_name.trim(), b.family_name.trim(), b.email?.trim() || null, b.phone?.trim() || null, b.organisation?.trim() || null, b.notes || null]);
      await audit(c, a, "person", r.rows[0].id, "guest.create", { payload: { name: `${b.given_name} ${b.family_name}` } });
      reply.code(201); return { id: r.rows[0].id };
    });
  });

  f.patch<{ Params: { id: string }; Body: Record<string, string | null> }>("/guests/:id", async (req, reply) => {
    const a = await requireActor(req, reply); if (!a || !allow(a, "guest.write", reply)) return;
    const allowed = ["given_name", "family_name", "email", "phone", "organisation", "notes"];
    const sets: string[] = []; const vals: unknown[] = [];
    for (const k of allowed) if (k in (req.body ?? {})) { vals.push(req.body[k] || null); sets.push(`${k}=$${vals.length}`); }
    if (!sets.length) return reply.code(422).send(problem(422, "validation", "Nothing to change"));
    vals.push(req.params.id, a.tenantId);
    const r = await pool.query(`update person set ${sets.join(",")} where id=$${vals.length - 1} and tenant_id=$${vals.length}`, vals);
    if (!r.rowCount) return reply.code(404).send(problem(404, "not_found", "No such guest"));
    return { ok: true };
  });

  /** Replace the dietary declaration. */
  f.put<{ Params: { id: string }; Body: { diet?: string[]; allergens?: string[]; severity?: string | null; notes?: string | null } }>("/guests/:id/diet", async (req, reply) => {
    const a = await requireActor(req, reply); if (!a || !allow(a, "diet.write", reply)) return;
    const b = req.body ?? {};
    const allergens = (b.allergens ?? []).filter(x => ALLERGENS.includes(x));
    if (b.severity && !SEVERITY.includes(b.severity)) return reply.code(422).send(problem(422, "validation", "Bad severity"));
    if (allergens.length && !b.severity) return reply.code(422).send(problem(422, "validation", "Say how serious the allergy is"));
    return tx(async c => {
      const p = (await c.query(`select id from person where id=$1 and tenant_id=$2`, [req.params.id, a.tenantId])).rows[0];
      if (!p) { reply.code(404); return problem(404, "not_found", "No such guest"); }
      const prev = (await c.query(`select diet, allergens, severity from diet_profile where person_id=$1`, [p.id])).rows[0];
      await c.query(`insert into diet_profile (tenant_id, person_id, diet, allergens, severity, notes, declared_by_user_id, declared_at, version)
        values ($1,$2,$3,$4,$5,$6,$7, now(), 1)
        on conflict (person_id) do update set diet=excluded.diet, allergens=excluded.allergens, severity=excluded.severity, notes=excluded.notes, declared_by_user_id=excluded.declared_by_user_id, declared_at=now(), version=diet_profile.version+1`,
        [a.tenantId, p.id, b.diet ?? [], allergens, b.severity ?? null, b.notes ?? null, a.userId]);
      await audit(c, a, "person", p.id, "diet.declare", { payload: { from: prev ?? null, to: { diet: b.diet ?? [], allergens, severity: b.severity ?? null } } });
      return { ok: true };
    });
  });

  /** Attach a person record to a name on the board (all half-days of that name in that room around the date). */
  f.post<{ Body: { room: string; label: string; date: string; person_id: string | null } }>("/guests/attach", async (req, reply) => {
    const a = await requireActor(req, reply); if (!a || !allow(a, "guest.write", reply)) return;
    const { room, label, date, person_id } = req.body ?? {} as any;
    if (!room || !label || !date) return reply.code(422).send(problem(422, "validation", "room, label and date are required"));
    const r = await pool.query(`update room_occupancy o set person_id=$4 from room r where r.id=o.room_id and r.property_id=$1 and r.number=$2 and o.occupant_label=$3 and o.on_date between $5::date - 30 and $5::date + 30`, [a.propertyId, room, label, person_id, date]);
    return { ok: true, rows: r.rowCount };
  });

  /** Who is in house with a declared allergy or diet, per day — for the kitchen. */
  f.get<{ Querystring: { from: string; to: string } }>("/guests/in-house", async (req, reply) => {
    const a = await requireActor(req, reply); if (!a || !allow(a, "diet.read", reply)) return;
    const r = await pool.query(`select o.on_date::text date, p.id, p.given_name || ' ' || p.family_name name, r.number room, d.diet, d.allergens, d.severity, d.notes, g.name group_name
      from room_occupancy o join room r on r.id=o.room_id join person p on p.id=o.person_id join diet_profile d on d.person_id=p.id left join booking_group g on g.id=o.group_id
      where r.property_id=$1 and o.on_date between $2 and $3 and (coalesce(array_length(d.allergens,1),0) > 0 or coalesce(array_length(d.diet,1),0) > 0)
      group by o.on_date, p.id, r.number, d.diet, d.allergens, d.severity, d.notes, g.name order by o.on_date, d.severity desc nulls last, name`, [a.propertyId, req.query.from, req.query.to]);
    return { items: r.rows };
  });
}
