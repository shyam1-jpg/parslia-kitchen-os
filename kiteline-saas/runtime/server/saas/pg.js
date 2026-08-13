'use strict';

/**
 * Optional Postgres adapter (Phase B).
 * When KITELINE_DB_MODE=postgres and DATABASE_URL is set, session context
 * can be loaded from normalized tables. JSON workspace remains source of
 * ops data until full cutover (Phase E migrate).
 */

let pool = null;

function enabled() {
  return process.env.KITELINE_DB_MODE === 'postgres' && !!process.env.DATABASE_URL;
}

function getPool() {
  if (!enabled()) return null;
  if (pool) return pool;
  try {
    const { Pool } = require('@neondatabase/serverless');
    pool = new Pool({ connectionString: process.env.DATABASE_URL });
    return pool;
  } catch (e) {
    console.warn('[saas/pg] pool unavailable:', e.message);
    return null;
  }
}

async function withSession(client, ctx, fn) {
  await client.query('SELECT set_config($1,$2,true)', ['kiteline.user_id', ctx.userId || '']);
  await client.query('SELECT set_config($1,$2,true)', ['kiteline.company_id', ctx.companyId || '']);
  await client.query('SELECT set_config($1,$2,true)', ['kiteline.is_super_admin', ctx.isSuperAdmin ? 'true' : 'false']);
  return fn(client);
}

async function lookupMembershipByEmail(email) {
  const p = getPool();
  if (!p) return null;
  const em = (email || '').toLowerCase().trim();
  const { rows } = await p.query(
    `SELECT u.id AS user_id, u.email, u.name,
            m.company_id, m.role AS company_role, c.name AS company_name, c.legacy_tenant_id,
            COALESCE(
              json_agg(json_build_object('location_id', lm.location_id, 'role', lm.role))
                FILTER (WHERE lm.location_id IS NOT NULL),
              '[]'::json
            ) AS locations
     FROM users u
     JOIN memberships m ON m.user_id = u.id AND m.status = 'active'
     JOIN companies c ON c.id = m.company_id
     LEFT JOIN location_memberships lm
       ON lm.user_id = u.id AND lm.company_id = m.company_id AND lm.status = 'active'
     WHERE lower(u.email) = $1
     GROUP BY u.id, u.email, u.name, m.company_id, m.role, c.name, c.legacy_tenant_id
     LIMIT 1`,
    [em]
  );
  return rows[0] || null;
}

async function listCompanyLocations(companyId, userId, role) {
  const p = getPool();
  if (!p) return [];
  if (role === 'company_owner' || role === 'kitchen_admin' || role === 'super_admin') {
    const { rows } = await p.query(
      `SELECT id, name, status, legacy_site_id
       FROM locations WHERE company_id = $1 AND status <> 'archived'
       ORDER BY name`,
      [companyId]
    );
    return rows;
  }
  const { rows } = await p.query(
    `SELECT l.id, l.name, l.status, l.legacy_site_id
     FROM locations l
     JOIN location_memberships lm ON lm.location_id = l.id AND lm.user_id = $2 AND lm.status = 'active'
     WHERE l.company_id = $1 AND l.status <> 'archived'
     ORDER BY l.name`,
    [companyId, userId]
  );
  return rows;
}

module.exports = {
  enabled,
  getPool,
  withSession,
  lookupMembershipByEmail,
  listCompanyLocations,
};
