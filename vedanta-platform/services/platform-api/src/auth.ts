/**
 * Authentication rules:
 * - Staff email-only sign-in is a development/trial convenience only and is NEVER
 *   accepted when NODE_ENV=production. Production staff use Microsoft 365.
 * - Guest email + access-code routes are separate; `emailLoginEnabled` is retained
 *   as the guest-portal feature flag because guestPortal.ts imports it.
 * - SYSTEM_OWNER is honoured in production only when the email is explicitly
 *   allow-listed through deployment secrets. This neutralises old/public trial seeds.
 */
import { randomBytes } from "node:crypto";
import type { FastifyInstance, FastifyReply, FastifyRequest } from "fastify";
import { pool } from "./db.ts";

function truthy(v: string | undefined): boolean {
  if (v == null) return false;
  return ["1", "true", "yes", "on"].includes(v.trim().toLowerCase());
}

/** Guest registration / email+code sign-in feature flag. Enabled by default. */
export function emailLoginEnabled(): boolean {
  const v = process.env.GUEST_PORTAL_ENABLED;
  return v == null ? true : truthy(v);
}

/** Insecure staff email-only sign-in. Never available in production. */
export function staffEmailLoginEnabled(): boolean {
  if (process.env.NODE_ENV === "production") return false;
  const v = process.env.ALLOW_EMAIL_LOGIN;
  return v == null ? true : truthy(v);
}

function configuredOwnerEmails(): Set<string> {
  const values = [
    process.env.BOOTSTRAP_OWNER_EMAIL,
    ...(process.env.BOOTSTRAP_ADMIN_EMAILS ?? "").split(","),
    ...(process.env.SYSTEM_OWNER_ALLOWLIST ?? "").split(","),
  ];
  return new Set(values.map(x => x?.trim().toLowerCase()).filter(Boolean) as string[]);
}

/** Production SYSTEM_OWNER privilege requires an explicit deployment allowlist. */
export function productionOwnerAllowed(email: string): boolean {
  if (process.env.NODE_ENV !== "production") return true;
  return configuredOwnerEmails().has(email.trim().toLowerCase());
}

export type Audience = "ADMIN" | "STAFF";
export type Actor = { userId: string; tenantId: string; propertyId: string; email: string; name: string; role: string; roleName: string; department: string | null; perms: Set<string>; audience: Audience; propertyName?: string | null; propertyKicker?: string | null };

const loginHits = new Map<string, { n: number; t: number }>();
function rateOk(key: string, max = 8, windowMs = 60_000): boolean {
  const now = Date.now();
  const cur = loginHits.get(key);
  if (!cur || now - cur.t > windowMs) { loginHits.set(key, { n: 1, t: now }); return true; }
  cur.n += 1;
  return cur.n <= max;
}

export function problem(status: number, code: string, detail: string, extra: object = {}) {
  return { status, code, title: code.replace(/_/g, " "), detail, ...extra };
}

async function loadActor(where: string, param: string): Promise<Actor | null> {
  const { rows } = await pool.query(`
    select u.id user_id, u.tenant_id, u.email, u.display_name, m.property_id, r.code role, r.name role_name, d.code department,
           p.name property_name,
           coalesce(p.settings->>'kicker', 'Retreat Center') property_kicker,
           coalesce(array_agg(rp.permission_code) filter (where rp.permission_code is not null), '{}') perms
    from app_user u join membership m on m.user_id = u.id join role r on r.id = m.role_id
    left join department d on d.id = m.department_id
    left join role_permission rp on rp.role_id = r.id
    left join property p on p.id = m.property_id
    ${where} and u.status = 'ACTIVE'
    group by u.id, m.property_id, r.code, r.name, d.code, p.name, p.settings limit 1`, [param]);
  const r = rows[0]; if (!r) return null;
  if (r.role === "SYSTEM_OWNER" && !productionOwnerAllowed(r.email)) return null;
  return { userId: r.user_id, tenantId: r.tenant_id, propertyId: r.property_id, email: r.email, name: r.display_name, role: r.role, roleName: r.role_name, department: r.department ?? null, perms: new Set(r.perms), audience: "ADMIN", propertyName: r.property_name ?? null, propertyKicker: r.property_kicker ?? null };
}

export async function requireActor(req: FastifyRequest, reply: FastifyReply, audience: Audience | Audience[] = "ADMIN"): Promise<Actor | null> {
  const want = Array.isArray(audience) ? audience : [audience];
  const auth = req.headers.authorization;
  const xuser = req.headers["x-user"] as string | undefined;
  let a: Actor | null = null;
  let sessAudience: Audience | null = null;
  if (auth?.startsWith("Bearer ")) {
    const tok = auth.slice(7);
    const s = (await pool.query(`select user_id, audience from session where token=$1 and expires_at > now()`, [tok])).rows[0];
    if (s) { a = await loadActor("where u.id = $1", s.user_id); sessAudience = s.audience; }
  } else if (xuser && process.env.NODE_ENV !== "production") {
    a = await loadActor("where lower(u.email) = $1", xuser.toLowerCase());
    sessAudience = "ADMIN";
  }
  if (!a || !sessAudience || !want.includes(sessAudience)) { reply.code(401).send(problem(401, "unauthenticated", "Sign in to continue")); return null; }
  a.audience = sessAudience;
  return a;
}

export function allow(a: Actor, perm: string, reply: FastifyReply): boolean {
  if (a.perms.has(perm)) return true;
  reply.code(403).send(problem(403, "forbidden", `Your role (${a.role.replace(/_/g, " ").toLowerCase()}) cannot ${perm.replace(".", " ")}`));
  return false;
}

export default async function authRoutes(f: FastifyInstance) {
  const devOnly = (reply: FastifyReply) => { if (process.env.NODE_ENV === "production") { reply.code(404).send(problem(404, "not_found", "Development sign-in is disabled in production")); return false; } return true; };
  const staffEmailLoginOk = (reply: FastifyReply) => {
    if (staffEmailLoginEnabled()) return true;
    reply.code(404).send(problem(404, "not_found", "Email-only staff sign-in is disabled. Use Microsoft 365."));
    return false;
  };
  f.get("/auth/users", async (_req, reply) => {
    if (!devOnly(reply)) return;
    const { rows } = await pool.query(`select u.email, u.display_name name, r.name role from app_user u join membership m on m.user_id=u.id join role r on r.id=m.role_id where u.status='ACTIVE' order by r.code, u.display_name`);
    return { items: rows };
  });
  f.post("/auth/login", async (req: FastifyRequest<{ Body: { email?: string; surface?: string } }>, reply) => {
    if (!staffEmailLoginOk(reply)) return;
    const ip = req.ip || "local";
    if (!rateOk(`login:${ip}`)) return reply.code(429).send(problem(429, "rate_limited", "Too many sign-in attempts. Wait a minute."));
    const email = req.body?.email?.trim().toLowerCase();
    const surface = (req.body?.surface === "staff" ? "STAFF" : "ADMIN") as Audience;
    const a = email ? await loadActor("where lower(u.email) = $1", email) : null;
    if (!a) return reply.code(401).send(problem(401, "sign_in_failed", "Sign-in was not recognised"));
    const token = randomBytes(32).toString("base64url");
    await pool.query(`insert into session (token, user_id, property_id, audience, expires_at) values ($1,$2,$3,$4, now() + interval '12 hours')`, [token, a.userId, a.propertyId, surface]);
    a.audience = surface;
    return { token, user: { email: a.email, name: a.name, role: a.role, role_name: a.roleName, department: a.department, permissions: [...a.perms], surface } };
  });
  f.post("/auth/logout", async (req, reply) => {
    const auth = req.headers.authorization; if (auth?.startsWith("Bearer ")) await pool.query(`delete from session where token=$1`, [auth.slice(7)]);
    return reply.code(204).send();
  });
  f.get("/me", async (req, reply) => { const a = await requireActor(req, reply, ["ADMIN", "STAFF"]); if (!a) return; return { email: a.email, name: a.name, role: a.role, role_name: a.roleName, department: a.department, permissions: [...a.perms], surface: a.audience, property_name: a.propertyName ?? null, property_kicker: a.propertyKicker ?? null }; });
}
