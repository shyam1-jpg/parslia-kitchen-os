'use strict';

const roles = require('./roles');

function siteIdOf(row) {
  if (!row) return null;
  return row.site || row.siteId || null;
}

function memberSiteIds(member) {
  if (!member) return [];
  const ids = new Set();
  if (member.siteId) ids.add(member.siteId);
  if (Array.isArray(member.siteIds)) member.siteIds.forEach((id) => ids.add(id));
  return [...ids];
}

/**
 * Resolve SaaS access from JSON workspace (Phase B dual-mode).
 * Company owners / kitchen admins see all locations; managers/staff see assigned only.
 */
function resolveAccess(state, email, opts) {
  const em = (email || '').toLowerCase().trim();
  const team = (state && state.team) || [];
  const sites = (state && state.sites) || [];
  const allSiteIds = sites.map((s) => s.id);
  const member = team.find((t) => (t.email || '').toLowerCase() === em);
  const isPlatformOwner = !!(opts && opts.isPlatformOwner);
  const forceOwner = isPlatformOwner || !!(opts && opts.isCompanyOwnerEmail);
  const role = forceOwner && !member
    ? 'company_owner'
    : roles.resolveMemberRole(member, { forceOwner });
  const canAll = roles.roleAtLeast(role, 'kitchen_admin') || isPlatformOwner;
  let allowedSiteIds = canAll ? allSiteIds.slice() : memberSiteIds(member);
  if (!allowedSiteIds.length && canAll) allowedSiteIds = allSiteIds.slice();
  if (!allowedSiteIds.length && allSiteIds.length) {
    // Fail closed for staff with no assignment: empty list
    allowedSiteIds = canAll ? allSiteIds.slice() : [];
  }
  const current = state && state.currentSite;
  const safeCurrent = allowedSiteIds.includes(current)
    ? current
    : (allowedSiteIds[0] || current || null);

  return {
    email: em,
    role,
    uiAccess: roles.UI_ACCESS[role] || 'Staff',
    rank: roles.RANK[role] || 1,
    companyId: (state && (state._tenantId || (state.org && state.org.id))) || null,
    companyName: (state && state.org && state.org.name) || 'Company',
    allowedSiteIds,
    currentSiteId: safeCurrent,
    canViewAllLocations: canAll || roles.roleAtLeast(role, 'kitchen_admin'),
    permissions: roles.permissionsFor(role),
    memberId: member && member.id,
    memberName: member ? member.name : (em ? em.split('@')[0] : 'User'),
  };
}

function assertLocationAllowed(access, locationId) {
  if (!locationId) return { ok: false, error: 'location_required' };
  if (access.canViewAllLocations) return { ok: true };
  if ((access.allowedSiteIds || []).includes(locationId)) return { ok: true };
  return { ok: false, error: 'location_forbidden' };
}

module.exports = {
  siteIdOf,
  memberSiteIds,
  resolveAccess,
  assertLocationAllowed,
};
