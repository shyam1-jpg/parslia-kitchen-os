import type { FastifyInstance } from "fastify";
import { pool, tx } from "./db.ts";
import { requireActor, allow, problem } from "./auth.ts";
import { audit } from "./groups.ts";

/** Staff accounts. Sign-in proves identity (Microsoft); this decides who has access and as what. */
export default async function routes(f: FastifyInstance) {
  f.get("/users", async (req, reply) => {
    const a = await requireActor(req, reply); if (!a || !allow(a, "user.manage", reply)) return;
    const r = await pool.query(`select u.id, u.email, u.display_name name, u.status, r.code role, r.name role_name, d.code department, u.created_at,
        (select max(created_at) from session s where s.user_id=u.id) last_sign_in
      from app_user u left join membership m on m.user_id=u.id and m.property_id=$2 left join role r on r.id=m.role_id left join department d on d.id=m.department_id
      where u.tenant_id=$1 order by u.status, r.code, u.display_name`, [a.tenantId, a.propertyId]);
    const roles = await pool.query(`select code, name from role where tenant_id=$1 order by code`, [a.tenantId]);
    const depts = await pool.query(`select code, name from department where property_id=$1 order by name`, [a.propertyId]);
    return { items: r.rows, roles: roles.rows, departments: depts.rows };
  });

  f.post<{ Body: { email: string; name: string; role: string; department?: string } }>("/users", async (req, reply) => {
    const a = await requireActor(req, reply); if (!a || !allow(a, "user.manage", reply)) return;
    const { email, name, role, department } = req.body ?? {};
    if (!email?.includes("@") || !name || !role) return reply.code(422).send(problem(422, "validation", "email, name and role are required"));
    return tx(async c => {
      const dup = await c.query(`select 1 from app_user where tenant_id=$1 and lower(email)=lower($2)`, [a.tenantId, email]);
      if (dup.rowCount) { reply.code(409); return problem(409, "exists", "There is already a user with that email"); }
      const ro = (await c.query(`select id from role where tenant_id=$1 and code=$2`, [a.tenantId, role])).rows[0];
      if (!ro) { reply.code(422); return problem(422, "validation", "Unknown role"); }
      const dep = department ? (await c.query(`select id from department where property_id=$1 and code=$2`, [a.propertyId, department])).rows[0] : null;
      const u = (await c.query(`insert into app_user (tenant_id, email, display_name, status) values ($1, lower($2), $3, 'ACTIVE') returning id`, [a.tenantId, email.trim(), name.trim()])).rows[0];
      await c.query(`insert into membership (tenant_id, user_id, property_id, role_id, department_id) values ($1,$2,$3,$4,$5)`, [a.tenantId, u.id, a.propertyId, ro.id, dep?.id ?? null]);
      await audit(c, a, "app_user", u.id, "user.create", { payload: { email, role } });
      reply.code(201); return { id: u.id };
    });
  });

  f.patch<{ Params: { id: string }; Body: { role?: string; status?: string; name?: string; department?: string } }>("/users/:id", async (req, reply) => {
    const a = await requireActor(req, reply); if (!a || !allow(a, "user.manage", reply)) return;
    const { role, status, name, department } = req.body ?? {};
    if (req.params.id === a.userId && status && status !== "ACTIVE") return reply.code(409).send(problem(409, "self", "You cannot deactivate yourself"));
    return tx(async c => {
      const u = (await c.query(`select id from app_user where id=$1 and tenant_id=$2`, [req.params.id, a.tenantId])).rows[0];
      if (!u) { reply.code(404); return problem(404, "not_found", "No such user"); }
      if (name) await c.query(`update app_user set display_name=$2 where id=$1`, [u.id, name.trim()]);
      if (status) {
        if (!["ACTIVE", "SUSPENDED", "LEFT"].includes(status)) { reply.code(422); return problem(422, "validation", "Bad status"); }
        await c.query(`update app_user set status=$2 where id=$1`, [u.id, status]);
        if (status !== "ACTIVE") await c.query(`delete from session where user_id=$1`, [u.id]);  // signs them out everywhere
      }
      if (role) {
        const ro = (await c.query(`select id from role where tenant_id=$1 and code=$2`, [a.tenantId, role])).rows[0];
        if (!ro) { reply.code(422); return problem(422, "validation", "Unknown role"); }
        if (u.id === a.userId && a.role === "SYSTEM_OWNER" && role !== "SYSTEM_OWNER") { reply.code(409); return problem(409, "self", "You cannot remove your own system-owner role"); }
        const dep = department ? (await c.query(`select id from department where property_id=$1 and code=$2`, [a.propertyId, department])).rows[0] : null;
        await c.query(`delete from membership where user_id=$1 and property_id=$2`, [u.id, a.propertyId]);
        await c.query(`insert into membership (tenant_id, user_id, property_id, role_id, department_id) values ($1,$2,$3,$4,$5)`, [a.tenantId, u.id, a.propertyId, ro.id, dep?.id ?? null]);
        await c.query(`delete from session where user_id=$1`, [u.id]);  // new permissions take effect at next sign-in
      }
      await audit(c, a, "app_user", u.id, "user.update", { payload: req.body });
      return { ok: true };
    });
  });
}
