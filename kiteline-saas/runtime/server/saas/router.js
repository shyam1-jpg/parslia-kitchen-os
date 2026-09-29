'use strict';

const context = require('./context');
const scope = require('./scope');
const roles = require('./roles');
const pg = require('./pg');
const inventory = require('./inventory');

function readBody(req) {
  return new Promise((resolve) => {
    // body already parsed by server.js in most paths — support both
    if (req._saasBody !== undefined) return resolve(req._saasBody);
    resolve({});
  });
}

/**
 * Mount under /api/saas/*
 * deps: { getDb, writeDb, tenants, me, apiSend, isOwner }
 */
function createHandler(deps) {
  const { getDb, writeDb, tenants, isOwner } = deps;

  async function handle(req, res, url, me, apiSend, body) {
    const path = (url.pathname || '').replace(/^\/api\/saas/, '') || '/';
    const db = getDb();
    const state = tenants.getStateForUser(db, me.email);
    if (!state) return apiSend(409, { error: 'No workspace for this account' });

    const access = context.resolveAccess(state, me.email, {
      isPlatformOwner: isOwner(me.email),
    });

    // Enrich from Postgres when enabled
    if (pg.enabled()) {
      try {
        const row = await pg.lookupMembershipByEmail(me.email);
        if (row) {
          access.companyId = row.company_id;
          access.companyName = row.company_name || access.companyName;
          access.role = row.company_role || access.role;
          access.uiAccess = roles.UI_ACCESS[access.role] || access.uiAccess;
          access.rank = roles.RANK[access.role] || access.rank;
          access.permissions = roles.permissionsFor(access.role);
          const locs = await pg.listCompanyLocations(row.company_id, row.user_id, row.company_role);
          if (locs.length) {
            const legacy = locs.map((l) => l.legacy_site_id).filter(Boolean);
            const byLegacy = new Set(legacy);
            const mapped = (state.sites || [])
              .filter((s) => byLegacy.has(s.id))
              .map((s) => s.id);
            if (mapped.length) access.allowedSiteIds = mapped;
            access.canViewAllLocations = roles.roleAtLeast(access.role, 'kitchen_admin');
          }
        }
      } catch (e) {
        console.warn('[saas] pg enrichment failed:', e.message);
      }
    }

    if (path === '/context' && req.method === 'GET') {
      return apiSend(200, {
        companyId: access.companyId,
        companyName: access.companyName,
        role: access.role,
        uiAccess: access.uiAccess,
        rank: access.rank,
        allowedSiteIds: access.allowedSiteIds,
        currentSiteId: access.currentSiteId,
        canViewAllLocations: access.canViewAllLocations,
        permissions: access.permissions,
        dbMode: pg.enabled() ? 'postgres' : 'json',
      });
    }

    if (path === '/location' && req.method === 'POST') {
      const siteId = body.siteId || body.locationId;
      const check = context.assertLocationAllowed(access, siteId);
      if (!check.ok) return apiSend(403, { error: 'Not allowed for this location', code: check.error });
      state.currentSite = siteId;
      tenants.setStateForUser(db, me.email, state);
      writeDb(db);
      return apiSend(200, { ok: true, currentSiteId: siteId });
    }

    if (path === '/team' && req.method === 'GET') {
      const scoped = scope.filterStateForAccess(state, access);
      const members = (scoped.team || []).map((m) => {
        const role = roles.resolveMemberRole(m, {});
        return {
          id: m.id,
          name: m.name,
          email: m.email,
          phone: m.phone || '',
          title: m.role,
          access: m.access || roles.UI_ACCESS[role],
          saasRole: role,
          siteId: m.siteId,
          siteIds: m.siteIds || (m.siteId ? [m.siteId] : []),
          hasClockPin: !!(m.clockPin || m.pin),
          initials: m.initials,
        };
      });
      return apiSend(200, { members, permissions: access.permissions });
    }

    if (path === '/team/role' && req.method === 'PATCH') {
      if (!access.permissions.manage_team) {
        return apiSend(403, { error: 'No permission to manage team' });
      }
      const memberId = body.memberId;
      const nextAccess = body.access; // Admin|Manager|Staff
      const nextRole = body.saasRole;
      const siteId = body.siteId;
      const m = (state.team || []).find((x) => x.id === memberId);
      if (!m) return apiSend(404, { error: 'Member not found' });
      if (!access.canViewAllLocations) {
        const check = context.assertLocationAllowed(access, m.siteId);
        if (!check.ok) return apiSend(403, { error: 'Member outside your locations' });
      }
      if (nextAccess && roles.ACCESS_TO_ROLE[nextAccess]) {
        m.access = nextAccess;
        m.saasRole = roles.ACCESS_TO_ROLE[nextAccess];
        if (nextAccess === 'Admin' && /owner|director/i.test(m.role || '')) m.saasRole = 'company_owner';
      }
      if (nextRole && roles.RANK[nextRole]) {
        m.saasRole = nextRole;
        m.access = roles.UI_ACCESS[nextRole];
      }
      if (siteId) {
        const check = context.assertLocationAllowed(
          access.canViewAllLocations ? Object.assign({}, access, { canViewAllLocations: true, allowedSiteIds: (state.sites || []).map((s) => s.id) }) : access,
          siteId
        );
        // owners may assign any company site
        if (access.canViewAllLocations || check.ok) m.siteId = siteId;
      }
      tenants.setStateForUser(db, me.email, state);
      writeDb(db);
      return apiSend(200, { ok: true, member: { id: m.id, access: m.access, saasRole: m.saasRole, siteId: m.siteId } });
    }

    if (path === '/reports' && req.method === 'GET') {
      const scopeMode = (url.searchParams.get('scope') || 'location').toLowerCase();
      let siteIds;
      if (scopeMode === 'company' || scopeMode === 'all') {
        if (!access.permissions.view_reports_company && !access.canViewAllLocations) {
          return apiSend(403, { error: 'Company reports require Admin / Owner' });
        }
        siteIds = access.allowedSiteIds;
      } else {
        const siteId = url.searchParams.get('siteId') || state.currentSite;
        const check = context.assertLocationAllowed(access, siteId);
        if (!check.ok) return apiSend(403, { error: 'Location not allowed' });
        siteIds = [siteId];
      }
      return apiSend(200, {
        scope: scopeMode,
        report: scope.aggregateReport(state, siteIds),
        generatedAt: new Date().toISOString(),
      });
    }

    if (path === '/clock/pin-check' && req.method === 'POST') {
      const memberId = body.memberId;
      const pin = String(body.pin || '');
      const siteId = body.siteId || state.currentSite;
      const check = context.assertLocationAllowed(access, siteId);
      if (!check.ok) return apiSend(403, { error: 'Location not allowed' });
      const m = (state.team || []).find((x) => x.id === memberId);
      if (!m) return apiSend(404, { error: 'Member not found' });
      if (m.siteId && m.siteId !== siteId && !(Array.isArray(m.siteIds) && m.siteIds.includes(siteId))) {
        return apiSend(403, { error: 'Staff not assigned to this location' });
      }
      const expected = String(m.clockPin || m.pin || '');
      if (expected && expected !== pin) return apiSend(401, { ok: false, error: 'Wrong PIN' });
      return apiSend(200, { ok: true });
    }

    // ---- Phase D: Stock & purchase orders (location-scoped) ----
    function siteFrom(bodyOrQuery) {
      return (bodyOrQuery && (bodyOrQuery.siteId || bodyOrQuery.locationId)) || state.currentSite;
    }

    if (path === '/stock' && req.method === 'GET') {
      const siteId = siteFrom({ siteId: url.searchParams.get('siteId') });
      const check = context.assertLocationAllowed(access, siteId);
      if (!check.ok) return apiSend(403, { error: 'Location not allowed' });
      if (inventory.seedSiteIfEmpty(state, siteId)) {
        tenants.setStateForUser(db, me.email, state);
        writeDb(db);
      }
      return apiSend(200, Object.assign({ siteId }, inventory.listStock(state, siteId)));
    }

    if (path === '/stock/item' && (req.method === 'POST' || req.method === 'PUT')) {
      if (!access.permissions.manage_stock) return apiSend(403, { error: 'No permission to manage stock' });
      const siteId = siteFrom(body);
      const check = context.assertLocationAllowed(access, siteId);
      if (!check.ok) return apiSend(403, { error: 'Location not allowed' });
      const result = inventory.upsertItem(state, siteId, body, me.email);
      if (!result.ok) return apiSend(400, result);
      if (!tenants.setStateForUser(db, me.email, state)) {
        return apiSend(403, { error: 'Cannot save this workspace' });
      }
      writeDb(db);
      return apiSend(200, result);
    }

    if (path === '/stock/move' && req.method === 'POST') {
      if (!access.permissions.manage_stock) return apiSend(403, { error: 'No permission to manage stock' });
      const siteId = siteFrom(body);
      const check = context.assertLocationAllowed(access, siteId);
      if (!check.ok) return apiSend(403, { error: 'Location not allowed' });
      const result = inventory.moveStock(state, siteId, body, me.email);
      if (!result.ok) return apiSend(400, result);
      if (!tenants.setStateForUser(db, me.email, state)) {
        return apiSend(403, { error: 'Cannot save this workspace' });
      }
      writeDb(db);
      return apiSend(200, result);
    }

    if (path === '/orders' && req.method === 'GET') {
      const siteId = siteFrom({ siteId: url.searchParams.get('siteId') });
      const check = context.assertLocationAllowed(access, siteId);
      if (!check.ok) return apiSend(403, { error: 'Location not allowed' });
      if (inventory.seedSiteIfEmpty(state, siteId)) {
        tenants.setStateForUser(db, me.email, state);
        writeDb(db);
      }
      const data = inventory.listOrders(state, siteId);
      return apiSend(200, Object.assign({ siteId, suggestions: inventory.suggestOrderFromLowStock(state, siteId) }, data));
    }

    if (path === '/orders' && req.method === 'POST') {
      if (!access.permissions.manage_orders) return apiSend(403, { error: 'No permission to manage orders' });
      const siteId = siteFrom(body);
      const check = context.assertLocationAllowed(access, siteId);
      if (!check.ok) return apiSend(403, { error: 'Location not allowed' });
      const result = inventory.createOrder(state, siteId, body, me.email);
      if (!result.ok) return apiSend(400, result);
      if (!tenants.setStateForUser(db, me.email, state)) {
        return apiSend(403, { error: 'Cannot save this workspace' });
      }
      writeDb(db);
      return apiSend(200, result);
    }

    if (path === '/orders' && req.method === 'PATCH') {
      if (!access.permissions.manage_orders) return apiSend(403, { error: 'No permission to manage orders' });
      const siteId = siteFrom(body);
      const check = context.assertLocationAllowed(access, siteId);
      if (!check.ok) return apiSend(403, { error: 'Location not allowed' });
      const result = inventory.updateOrder(state, siteId, body, me.email);
      if (!result.ok) return apiSend(400, result);
      if (!tenants.setStateForUser(db, me.email, state)) {
        return apiSend(403, { error: 'Cannot save this workspace' });
      }
      writeDb(db);
      return apiSend(200, result);
    }

    return apiSend(404, { error: 'Unknown SaaS route' });
  }

  return { handle, readBody };
}

module.exports = { createHandler };
