/**
 * Sign-in: POST /auth/login {email} → session token (table `session`, 12h).
 * Always on outside production. In production it is on only when ALLOW_EMAIL_LOGIN=true
 * so the first trial can start before Microsoft 365 is wired. Microsoft (microsoft.ts)
 * is the long-term path; permissions still come from app_user + membership.
 */
import { randomBytes } from "node:crypto";
import type { FastifyInstance, FastifyReply, FastifyRequest } from "fastify";
import { pool } from "./db.ts";

export function emailLoginEnabled(): boolean {
  if (process.env.NODE_ENV !== "production") return true;
  const v = (process.env.ALLOW_EMAIL_LOGIN ?? "").trim().toLowerCase();
  return v === "1" || v === "true" || v === "yes";
}

export type Actor = { userId: string; tenantId: string; propertyId: string; email: string; name: string; role: string; perms: Set<string> };

export function problem(status: number, code: string, detail: string, extra: object = {}) {
  return { status, code, title: code.replace(/_/g, " "), detail, ...extra };
}

async function loadActor(where: string, param: string): Promise<Actor | null> {
  const { rows } = await pool.query(`
    select u.id user_id, u.tenant_id, u.email, u.display_name, m.property_id, r.code role,
           coalesce(array_agg(rp.permission_code) filter (where rp.permission_code is not null), '{}') perms
    from app_user u join membership m on m.user_id = u.id join role r on r.id = m.role_id
    left join role_permission rp on rp.role_id = r.id
    ${where} and u.status = 'ACTIVE'
    group by u.id, m.property_id, r.code limit 1`, [param]);
  const r = rows[0]; if (!r) return null;
  return { userId: r.user_id, tenantId: r.tenant_id, propertyId: r.property_id, email: r.email, name: r.display_name, role: r.role, perms: new Set(r.perms) };
}

export async function requireActor(req: FastifyRequest, reply: FastifyReply): Promise<Actor | null> {
  const auth = req.headers.authorization;
  const xuser = req.headers["x-user"] as string | undefined;
  let a: Actor | null = null;
  if (auth?.startsWith("Bearer ")) {
    const tok = auth.slice(7);
    const s = (await pool.query(`select user_id from session where token=$1 and expires_at > now()`, [tok])).rows[0];
    if (s) a = await loadActor("where u.id = $1", s.user_id);
  } else if (xuser && process.env.NODE_ENV !== "production") {
    a = await loadActor("where lower(u.email) = $1", xuser.toLowerCase());
  }
  if (!a) { reply.code(401).send(problem(401, "unauthenticated", "Sign in to continue")); return null; }
  return a;
}

export function allow(a: Actor, perm: string, reply: FastifyReply): boolean {
  if (a.perms.has(perm)) return true;
  reply.code(403).send(problem(403, "forbidden", `Your role (${a.role.replace(/_/g, " ").toLowerCase()}) cannot ${perm.replace(".", " ")}`));
  return false;
}

export default async function authRoutes(f: FastifyInstance) {
  const devOnly = (reply: FastifyReply) => { if (process.env.NODE_ENV === "production") { reply.code(404).send(problem(404, "not_found", "Development sign-in is disabled in production")); return false; } return true; };
  const emailLoginOk = (reply: FastifyReply) => { if (emailLoginEnabled()) return true; reply.code(404).send(problem(404, "not_found", "Email sign-in is disabled. Use Microsoft 365, or set ALLOW_EMAIL_LOGIN=true for the trial.")); return false; };
  f.get("/auth/users", async (_req, reply) => {
    if (!devOnly(reply)) return;
    const { rows } = await pool.query(`select u.email, u.display_name name, r.name role from app_user u join membership m on m.user_id=u.id join role r on r.id=m.role_id where u.status='ACTIVE' order by r.code, u.display_name`);
    return { items: rows };
  });
  f.post("/auth/login", async (req: FastifyRequest<{ Body: { email?: string } }>, reply) => {
    if (!emailLoginOk(reply)) return;
    const email = req.body?.email?.toLowerCase();
    const a = email ? await loadActor("where lower(u.email) = $1", email) : null;
    if (!a) return reply.code(401).send(problem(401, "unknown_user", "No active user with that email"));
    const token = randomBytes(24).toString("base64url");
    await pool.query(`insert into session (token, user_id, property_id, expires_at) values ($1,$2,$3, now() + interval '12 hours')`, [token, a.userId, a.propertyId]);
    return { token, user: { email: a.email, name: a.name, role: a.role, permissions: [...a.perms] } };
  });
  f.post("/auth/logout", async (req, reply) => {
    const auth = req.headers.authorization; if (auth?.startsWith("Bearer ")) await pool.query(`delete from session where token=$1`, [auth.slice(7)]);
    return reply.code(204).send();
  });
  f.get("/me", async (req, reply) => { const a = await requireActor(req, reply); if (!a) return; return { email: a.email, name: a.name, role: a.role, permissions: [...a.perms] }; });
}
