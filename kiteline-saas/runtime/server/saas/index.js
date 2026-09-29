'use strict';

const context = require('./context');
const scope = require('./scope');
const roles = require('./roles');
const pg = require('./pg');
const { createHandler } = require('./router');

function demoEmailAliases(email) {
  const em = (email || '').toLowerCase().trim();
  const out = new Set([em]);
  // Demo UI buttons use @kiteline.uk; seed team often uses @kiteline.app
  if (em.endsWith('@kiteline.uk')) out.add(em.replace(/@kiteline\.uk$/, '@kiteline.app'));
  if (em.endsWith('@kiteline.app')) out.add(em.replace(/@kiteline\.app$/, '@kiteline.uk'));
  return out;
}

/**
 * In DEMO_MODE, attach users listed on the demo team to tenant_demo
 * so Manager/Staff logins get a scoped workspace.
 */
function ensureDemoTeamAccess(db, email, tenants) {
  const em = (email || '').toLowerCase().trim();
  if (!em || !db || !tenants) return false;
  const user = db.users && db.users[em];
  if (!user) return false;
  const demo = tenants.getDemoState(db);
  if (!demo) return false;
  const aliases = demoEmailAliases(em);
  const member = (demo.team || []).find((t) => aliases.has((t.email || '').toLowerCase()));
  if (!member && !tenants.isOwner(em)) return false;
  let changed = false;
  if (user.tenantId !== tenants.DEMO_TENANT_ID) {
    user.tenantId = tenants.DEMO_TENANT_ID;
    changed = true;
  }
  // Keep team email aligned with the signed-in demo account
  if (member && (member.email || '').toLowerCase() !== em) {
    member.email = em;
    changed = true;
  }
  return changed;
}

function attach(deps) {
  const handler = createHandler(deps);
  return {
    context,
    scope,
    roles,
    pg,
    handler,
    ensureDemoTeamAccess,
    /** Scope GET /api/state payload */
    scopedStateFor(meEmail, state, isOwnerFn) {
      const access = context.resolveAccess(state, meEmail, {
        isPlatformOwner: isOwnerFn ? isOwnerFn(meEmail) : false,
      });
      return {
        access,
        state: scope.filterStateForAccess(state, access),
      };
    },
    /** Safe PUT /api/state merge */
    mergePut(meEmail, prev, next, isOwnerFn) {
      const access = context.resolveAccess(prev, meEmail, {
        isPlatformOwner: isOwnerFn ? isOwnerFn(meEmail) : false,
      });
      return scope.mergeStatePut(prev, next, access);
    },
  };
}

module.exports = { attach, context, scope, roles, pg };
