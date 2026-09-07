/**
 * Organiser booking form. Staff generate a link for a booking; the organiser (no sign-in) opens it,
 * sees the booking summary, and submits the attendee list with dietary needs and room preferences.
 * Submissions create guest records + dietary declarations and mark the booking form COMPLETE.
 */
import { randomBytes } from "node:crypto";
import type { FastifyInstance } from "fastify";
import { pool, tx } from "./db.ts";
import { requireActor, allow, problem } from "./auth.ts";
import { audit } from "./groups.ts";
import { ALLERGENS } from "./guests.ts";

export default async function routes(f: FastifyInstance) {
  // Staff: create (or return) the form link
  f.post<{ Params: { id: string } }>("/v1/groups/:id/form-link", async (req, reply) => {
    const a = await requireActor(req, reply); if (!a || !allow(a, "group.update", reply)) return;
    return tx(async c => {
      const g = (await c.query(`select id, form_token from booking_group where id=$1 and property_id=$2 for update`, [req.params.id, a.propertyId])).rows[0];
      if (!g) { reply.code(404); return problem(404, "not_found", "No such booking"); }
      let token = g.form_token;
      if (!token) { token = randomBytes(18).toString("base64url"); await c.query(`update booking_group set form_token=$2 where id=$1`, [g.id, token]); }
      await c.query(`update booking_group set form_sent_at=coalesce(form_sent_at, now()), booking_form_status=case when booking_form_status='COMPLETE' then 'COMPLETE' else 'SENT' end, version=version+1 where id=$1`, [g.id]);
      await audit(c, a, "booking_group", g.id, "form.link", {});
      const web = process.env.WEB_URL ?? "http://localhost:3000";
      return { token, url: `${web}/form/?t=${token}` };
    });
  });

  // Staff: see what was submitted
  f.get<{ Params: { id: string } }>("/v1/groups/:id/attendees", async (req, reply) => {
    const a = await requireActor(req, reply); if (!a || !allow(a, "guest.read", reply)) return;
    const r = await pool.query(`select p.id person_id, p.given_name, p.family_name, p.email, p.phone, ga.room_preference, ga.arrives_early, d.diet, d.allergens, d.severity, d.notes diet_notes
      from group_attendee ga join person p on p.id=ga.person_id left join diet_profile d on d.person_id=p.id where ga.group_id=$1 order by p.family_name, p.given_name`, [req.params.id]);
    return { items: r.rows };
  });

  // Public: what the organiser sees
  f.get<{ Params: { token: string } }>("/public/form/:token", async (req, reply) => {
    const g = (await pool.query(`select g.id, g.name, g.organisation, g.arrival_date::text arrival, g.arrival_slot, g.arrival_time::text, g.departure_date::text departure, g.departure_slot, g.departure_time::text,
        g.expected_guests, g.expected_rooms, g.retreat_type, g.form_submitted_at, g.status, pk.name package_name, p.name property_name,
        (select count(*) from group_attendee ga where ga.group_id=g.id)::int attendees
      from booking_group g join property p on p.id=g.property_id left join package pk on pk.id=g.package_id where g.form_token=$1`, [req.params.token])).rows[0];
    if (!g) return reply.code(404).send(problem(404, "not_found", "This link is not valid"));
    if (g.status === "CANCELLED") return reply.code(410).send(problem(410, "gone", "This booking has been cancelled"));
    return { ...g, allergens: ALLERGENS };
  });

  // Public: submit attendees (can be re-submitted; matches on name within the group)
  f.post<{ Params: { token: string }; Body: { organiser_name?: string; organiser_email?: string; notes?: string; attendees: { given_name: string; family_name: string; email?: string; phone?: string; diet?: string[]; allergens?: string[]; severity?: string; diet_notes?: string; room_preference?: string; arrives_early?: boolean }[] } }>("/public/form/:token", async (req, reply) => {
    const b = req.body ?? {} as any;
    if (!Array.isArray(b.attendees) || b.attendees.length === 0) return reply.code(422).send(problem(422, "validation", "Add at least one attendee"));
    if (b.attendees.length > 200) return reply.code(422).send(problem(422, "validation", "Too many attendees in one submission"));
    for (const [i, at] of b.attendees.entries()) {
      if (!at.given_name?.trim() || !at.family_name?.trim()) return reply.code(422).send(problem(422, "validation", `Attendee ${i + 1} needs a first and last name`));
      if ((at.allergens ?? []).length && !at.severity) return reply.code(422).send(problem(422, "validation", `Say how serious ${at.given_name}'s allergy is`));
    }
    return tx(async c => {
      const g = (await c.query(`select id, tenant_id, name, status from booking_group where form_token=$1 for update`, [req.params.token])).rows[0];
      if (!g) { reply.code(404); return problem(404, "not_found", "This link is not valid"); }
      if (g.status === "CANCELLED") { reply.code(410); return problem(410, "gone", "This booking has been cancelled"); }
      let created = 0, updated = 0;
      for (const at of b.attendees) {
        const existing = (await c.query(`select p.id from group_attendee ga join person p on p.id=ga.person_id where ga.group_id=$1 and lower(p.given_name)=lower($2) and lower(p.family_name)=lower($3)`, [g.id, at.given_name.trim(), at.family_name.trim()])).rows[0];
        let pid: string;
        if (existing) { pid = existing.id; updated++; await c.query(`update person set email=coalesce($2,email), phone=coalesce($3,phone) where id=$1`, [pid, at.email?.trim() || null, at.phone?.trim() || null]); }
        else { pid = (await c.query(`insert into person (tenant_id, given_name, family_name, email, phone, organisation) values ($1,$2,$3,$4,$5,$6) returning id`, [g.tenant_id, at.given_name.trim(), at.family_name.trim(), at.email?.trim() || null, at.phone?.trim() || null, b.organiser_name ? null : null])).rows[0].id; created++; }
        await c.query(`insert into group_attendee (tenant_id, group_id, person_id, room_preference, arrives_early) values ($1,$2,$3,$4,$5) on conflict (group_id, person_id) do update set room_preference=excluded.room_preference, arrives_early=excluded.arrives_early, submitted_at=now()`, [g.tenant_id, g.id, pid, at.room_preference ?? null, !!at.arrives_early]);
        const allergens = (at.allergens ?? []).filter((x: string) => ALLERGENS.includes(x));
        await c.query(`insert into diet_profile (tenant_id, person_id, diet, allergens, severity, notes, declared_at, version) values ($1,$2,$3,$4,$5,$6, now(), 1)
          on conflict (person_id) do update set diet=excluded.diet, allergens=excluded.allergens, severity=excluded.severity, notes=excluded.notes, declared_at=now(), version=diet_profile.version+1`,
          [g.tenant_id, pid, at.diet ?? [], allergens, allergens.length ? at.severity : (at.severity || null), at.diet_notes || null]);
      }
      await c.query(`update booking_group set booking_form_status='COMPLETE', form_submitted_at=now(), expected_guests=greatest(coalesce(expected_guests,0), (select count(*) from group_attendee where group_id=$1)),
        notes=case when $2::text is null or $2='' then notes else coalesce(notes,'') || E'\nOrganiser form: ' || $2 end, version=version+1 where id=$1`, [g.id, b.notes ?? null]);
      await c.query(`insert into audit_event (tenant_id, actor_type, entity_type, entity_id, action, payload) values ($1,'INTEGRATION','booking_group',$2,'form.submit',$3)`, [g.tenant_id, g.id, JSON.stringify({ created, updated, organiser: b.organiser_name ?? null })]);
      return { ok: true, created, updated };
    });
  });
}
