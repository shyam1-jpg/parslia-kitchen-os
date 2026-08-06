'use strict';

const { siteIdOf } = require('./context');

const SITE_SCOPED_KEYS = [
  'sensors', 'checklists', 'records', 'alerts', 'menus', 'labels', 'waste',
  'recipes', 'workflows', 'deliveries', 'batches', 'cooling', 'phlogs',
  'holding', 'incidents', 'maintenance', 'assets', 'training',
];

function inAllowed(row, allowed) {
  const sid = siteIdOf(row);
  if (!sid) return true; // company-wide rows visible
  return allowed.has(sid);
}

/** Return a shallow-cloned state filtered to allowed locations (read path). */
function filterStateForAccess(state, access) {
  if (!state) return state;
  const allowed = new Set(access.allowedSiteIds || []);
  const out = Object.assign({}, state);
  out.sites = (state.sites || []).filter((s) => allowed.has(s.id));
  if (access.canViewAllLocations) {
    out.sites = (state.sites || []).slice();
  }
  const siteSet = new Set((out.sites || []).map((s) => s.id));
  SITE_SCOPED_KEYS.forEach((key) => {
    if (!Array.isArray(state[key])) return;
    out[key] = state[key].filter((row) => {
      const sid = siteIdOf(row);
      if (!sid) return true;
      return siteSet.has(sid);
    });
  });
  out.team = (state.team || []).filter((m) => {
    if (access.canViewAllLocations) return true;
    const ids = [];
    if (m.siteId) ids.push(m.siteId);
    if (Array.isArray(m.siteIds)) ids.push(...m.siteIds);
    if (!ids.length) return access.email && (m.email || '').toLowerCase() === access.email;
    return ids.some((id) => siteSet.has(id));
  });
  if (out.currentSite && !siteSet.has(out.currentSite)) {
    out.currentSite = (out.sites[0] && out.sites[0].id) || out.currentSite;
  }
  out._saas = {
    role: access.role,
    uiAccess: access.uiAccess,
    companyId: access.companyId,
    companyName: access.companyName,
    allowedSiteIds: [...siteSet],
    canViewAllLocations: !!access.canViewAllLocations,
    permissions: access.permissions,
  };
  return out;
}

/**
 * Merge client PUT safely: staff/managers cannot invent other locations' rows.
 * Tenant metadata always comes from previous server state.
 */
function mergeStatePut(prev, next, access) {
  if (!prev) return { ok: false, error: 'no_workspace' };
  if (!next || typeof next !== 'object') return { ok: false, error: 'invalid_state' };

  const allowed = new Set(access.allowedSiteIds || []);
  const merged = JSON.parse(JSON.stringify(prev));
  const canAll = !!access.canViewAllLocations;

  // Always preserve server tenancy tags
  merged._tenantId = prev._tenantId;
  merged._tenantPrivate = prev._tenantPrivate;
  merged._isPrivate = prev._isPrivate;
  merged._isDemo = prev._isDemo;

  if (canAll) {
    // Admins/owners may replace collections but not spoof tenant ids
    SITE_SCOPED_KEYS.forEach((key) => {
      if (Array.isArray(next[key])) merged[key] = next[key];
    });
    if (Array.isArray(next.sites)) merged.sites = next.sites;
    if (Array.isArray(next.team)) merged.team = next.team;
    if (next.org && typeof next.org === 'object') merged.org = Object.assign({}, prev.org || {}, next.org);
    if (next.currentSite) merged.currentSite = next.currentSite;
    // pass through other top-level arrays used by app
    ['activity', 'allergens', 'menus', 'clock', 'rota'].forEach((key) => {
      if (next[key] !== undefined) merged[key] = next[key];
    });
    return { ok: true, state: merged };
  }

  // Location-scoped users: only upsert rows for allowed sites
  SITE_SCOPED_KEYS.forEach((key) => {
    if (!Array.isArray(next[key])) return;
    const kept = (prev[key] || []).filter((row) => {
      const sid = siteIdOf(row);
      return sid && !allowed.has(sid); // keep other locations untouched
    });
    const incoming = next[key].filter((row) => inAllowed(row, allowed));
    // drop any attempt to write foreign locations
    const rejected = next[key].filter((row) => {
      const sid = siteIdOf(row);
      return sid && !allowed.has(sid);
    });
    if (rejected.length) {
      // silent strip — still ok
    }
    merged[key] = kept.concat(incoming);
  });

  if (Array.isArray(next.team)) {
    const otherTeam = (prev.team || []).filter((m) => {
      const sid = m.siteId;
      return sid && !allowed.has(sid);
    });
    const incomingTeam = next.team.filter((m) => !m.siteId || allowed.has(m.siteId));
    merged.team = otherTeam.concat(incomingTeam);
  }

  if (next.currentSite && allowed.has(next.currentSite)) {
    merged.currentSite = next.currentSite;
  }

  ['activity', 'clock', 'rota'].forEach((key) => {
    if (next[key] !== undefined) merged[key] = next[key];
  });

  return { ok: true, state: merged };
}

function aggregateReport(state, siteIds) {
  const set = new Set(siteIds || []);
  const sites = (state.sites || []).filter((s) => set.has(s.id));
  const sensors = (state.sensors || []).filter((s) => set.has(s.siteId));
  const records = (state.records || []).filter((r) => set.has(r.site));
  const alerts = (state.alerts || []).filter((a) => set.has(a.site));
  const waste = (state.waste || []).filter((w) => set.has(w.site));
  const breach = sensors.filter((s) => {
    if (typeof s.temp !== 'number') return false;
    if (typeof s.min === 'number' && s.temp < s.min) return true;
    if (typeof s.max === 'number' && s.temp > s.max) return true;
    return false;
  }).length;
  const compliance = Math.round(((sensors.length - breach) / (sensors.length || 1)) * 100);
  return {
    siteIds: [...set],
    siteNames: sites.map((s) => s.name),
    sensors: sensors.length,
    records: records.length,
    alerts: alerts.length,
    alertsResolved: alerts.filter((a) => a.status === 'resolved').length,
    wasteEntries: waste.length,
    wasteKg: waste.reduce((n, w) => n + (Number(w.kg) || 0), 0),
    compliance,
    sensorsDetail: sensors.map((s) => ({
      name: s.name,
      siteId: s.siteId,
      target: s.target,
      temp: s.temp,
      status: (typeof s.min === 'number' && s.temp < s.min) || (typeof s.max === 'number' && s.temp > s.max)
        ? 'breach' : 'ok',
    })),
  };
}

module.exports = {
  SITE_SCOPED_KEYS,
  filterStateForAccess,
  mergeStatePut,
  aggregateReport,
};
