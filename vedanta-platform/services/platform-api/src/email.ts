/**
 * Outbound email. With SMTP_URL set (e.g. smtp://user:pass@smtp.office365.com:587) mail is sent;
 * without it, every email is logged as LOGGED so staff can copy the text — nothing silently vanishes.
 */
import nodemailer from "nodemailer";
import type { FastifyInstance } from "fastify";
import { pool, tx } from "./db.ts";
import { requireActor, allow, problem, type Actor } from "./auth.ts";
import { audit } from "./groups.ts";
import { bookingValue } from "./packages.ts";

const transport = process.env.SMTP_URL ? nodemailer.createTransport(process.env.SMTP_URL) : null;
const FROM = process.env.MAIL_FROM ?? "The Vedanta Way Retreat Center <bookings@thevedanta.org>";
export const emailConfigured = () => !!transport;

export async function sendEmail(a: Actor, m: { to: string; subject: string; body: string; kind: string; related_type?: string; related_id?: string }) {
  const row = (await pool.query(`insert into outbound_email (tenant_id, property_id, to_email, subject, body, kind, related_type, related_id, sent_by_user_id, status)
    values ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10) returning id`, [a.tenantId, a.propertyId, m.to, m.subject, m.body, m.kind, m.related_type ?? null, m.related_id ?? null, a.userId, transport ? "QUEUED" : "LOGGED"])).rows[0];
  if (!transport) return { id: row.id, status: "LOGGED" as const };
  try { await transport.sendMail({ from: FROM, to: m.to, subject: m.subject, text: m.body }); await pool.query(`update outbound_email set status='SENT', sent_at=now() where id=$1`, [row.id]); return { id: row.id, status: "SENT" as const }; }
  catch (e: any) { await pool.query(`update outbound_email set status='FAILED', error=$2 where id=$1`, [row.id, String(e.message ?? e)]); return { id: row.id, status: "FAILED" as const, error: String(e.message ?? e) }; }
}

const fmtDate = (d: string) => new Date(d + "T00:00:00").toLocaleDateString("en-GB", { weekday: "long", day: "numeric", month: "long", year: "numeric" });
const t = (s: string | null) => s ? s.slice(0, 5) : "";

export function renderFormLink(g: any, url: string, signer: string) {
  return { subject: `${g.name} — guest list for your stay at The Vedanta Way Retreat Center`,
    body: `Dear ${g.contact_name ?? g.organisation ?? "organiser"},

Thank you for booking ${g.name} with us, ${fmtDate(g.arrival_date)} (${g.arrival_slot}${g.arrival_time ? " " + t(g.arrival_time) : ""}) to ${fmtDate(g.departure_date)} (${g.departure_slot}${g.departure_time ? " " + t(g.departure_time) : ""}).

Please use the link below to give us the names of everyone staying, along with any dietary needs or allergies. It takes a couple of minutes and you can come back to it to add names later.

${url}

The kitchen reads exactly what is entered here, so please be specific about allergies.

With warm regards,
${signer}
The Vedanta Way Retreat Center, Luxury Holistic · The Vedanta Way Ltd · https://www.thevedanta.org/` };
}

export function renderConfirmation(g: any, signer: string) {
  const v = bookingValue(g);
  return { subject: `Booking confirmed — ${g.name} at The Vedanta Way Retreat Center`,
    body: `Dear ${g.contact_name ?? g.organisation ?? "organiser"},

We are pleased to confirm ${g.name}.

Arrive:   ${fmtDate(g.arrival_date)} — ${g.arrival_slot}${g.arrival_time ? " from " + t(g.arrival_time) : ""}
Depart:   ${fmtDate(g.departure_date)} — ${g.departure_slot}${g.departure_time ? " by " + t(g.departure_time) : ""}
Guests:   ${g.expected_guests ?? "to be confirmed"}${g.expected_rooms ? `\nRooms:    ${g.expected_rooms}` : ""}
Use:      ${g.use_basis === "EXCLUSIVE" ? "Exclusive use of the venue" : "Shared use"}
${g.package_name ? `Package:  ${g.package_name}\n` : ""}${g.price_notes ? `Price:    ${g.price_notes}\n` : ""}${v != null ? `Total:    £${v.toLocaleString("en-GB", { maximumFractionDigits: 0 })}\n` : ""}
Your booking form is complete and we hold your signed terms and conditions. If anything above is not right, reply to this email.

We look forward to welcoming you.

${signer}
The Vedanta Way Retreat Center, Luxury Holistic · The Vedanta Way Ltd · https://www.thevedanta.org/` };
}

export default async function routes(f: FastifyInstance) {
  f.get("/v1/email/status", async (req, reply) => { const a = await requireActor(req, reply); if (!a) return; return { configured: emailConfigured() }; });

  f.get<{ Querystring: { related_id?: string } }>("/v1/email", async (req, reply) => {
    const a = await requireActor(req, reply); if (!a || !allow(a, "group.read", reply)) return;
    const r = await pool.query(`select e.id, e.to_email, e.subject, e.kind, e.status, e.error, e.created_at, e.sent_at, u.display_name sent_by from outbound_email e left join app_user u on u.id=e.sent_by_user_id
      where e.property_id=$1 and ($2::uuid is null or e.related_id=$2) order by e.created_at desc limit 50`, [a.propertyId, req.query.related_id ?? null]);
    return { items: r.rows };
  });

  /** Preview or send a templated email for a booking. kind = form_link | confirmation. */
  f.post<{ Params: { id: string; kind: string }; Body: { to?: string; send?: boolean; subject?: string; body?: string } }>("/v1/groups/:id/email/:kind", async (req, reply) => {
    const a = await requireActor(req, reply); if (!a || !allow(a, "email.send", reply)) return;
    const g = (await pool.query(`select g.*, g.arrival_date::text arrival_date, g.departure_date::text departure_date, g.arrival_time::text, g.departure_time::text, pk.price_basis, pk.price_twin, pk.price_single,
      (select p.given_name from person p where p.id=g.organiser_person_id) contact_name from booking_group g left join package pk on pk.id=g.package_id where g.id=$1 and g.property_id=$2`, [req.params.id, a.propertyId])).rows[0];
    if (!g) return reply.code(404).send(problem(404, "not_found", "No such booking"));
    let draft: { subject: string; body: string };
    if (req.params.kind === "form_link") {
      if (!g.form_token) return reply.code(409).send(problem(409, "no_form", "Create the form link first"));
      draft = renderFormLink(g, `${process.env.WEB_URL ?? "http://localhost:3000"}/form/?t=${g.form_token}`, a.name);
    } else if (req.params.kind === "confirmation") {
      if (g.status !== "CONFIRMED" && g.status !== "IN_HOUSE") return reply.code(409).send(problem(409, "not_confirmed", "Confirm the booking before sending a confirmation"));
      draft = renderConfirmation(g, a.name);
    } else return reply.code(404).send(problem(404, "unknown_kind", "Unknown email kind"));
    if (req.body?.subject) draft.subject = req.body.subject; if (req.body?.body) draft.body = req.body.body;
    const to = req.body?.to ?? g.contact_email;
    if (!req.body?.send) return { to, ...draft, configured: emailConfigured() };
    if (!to?.includes("@")) return reply.code(422).send(problem(422, "validation", "A recipient email address is needed"));
    const res = await sendEmail(a, { to, ...draft, kind: req.params.kind, related_type: "booking_group", related_id: g.id });
    await tx(async c => {
      if (req.params.kind === "form_link") await c.query(`update booking_group set booking_form_status=case when booking_form_status='COMPLETE' then 'COMPLETE' else 'SENT' end, form_sent_at=coalesce(form_sent_at, now()) where id=$1`, [g.id]);
      await audit(c, a, "booking_group", g.id, "email." + req.params.kind, { payload: { to, status: res.status } });
    });
    return { ...res, to, subject: draft.subject };
  });
}
