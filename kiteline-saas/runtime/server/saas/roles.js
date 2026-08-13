'use strict';

/** Canonical SaaS roles (DB enum) ↔ legacy Kiteline UI access labels */
const RANK = {
  staff: 1,
  location_manager: 2,
  kitchen_admin: 3,
  company_owner: 4,
  super_admin: 5,
};

const UI_ACCESS = {
  staff: 'Staff',
  location_manager: 'Manager',
  kitchen_admin: 'Admin',
  company_owner: 'Admin',
  super_admin: 'Admin',
};

const ACCESS_TO_ROLE = {
  Staff: 'staff',
  Manager: 'location_manager',
  Admin: 'kitchen_admin',
};

function mapTitleToRole(title) {
  const t = String(title || '').toLowerCase();
  if (/owner|director|proprietor/.test(t)) return 'company_owner';
  if (/head chef|admin|gm|general manager/.test(t)) return 'kitchen_admin';
  if (/manager|compliance|supervisor|lead|head/.test(t)) return 'location_manager';
  return 'staff';
}

function resolveMemberRole(member, opts) {
  if (!member) return 'staff';
  if (opts && opts.forceOwner) return 'company_owner';
  if (member.saasRole && RANK[member.saasRole]) return member.saasRole;
  if (member.access && ACCESS_TO_ROLE[member.access]) {
    // Preserve owner title even when UI access says Admin
    if (ACCESS_TO_ROLE[member.access] === 'kitchen_admin' && /owner|director|proprietor/i.test(member.role || '')) {
      return 'company_owner';
    }
    return ACCESS_TO_ROLE[member.access];
  }
  return mapTitleToRole(member.role);
}

function roleAtLeast(role, min) {
  return (RANK[role] || 0) >= (RANK[min] || 99);
}

function permissionsFor(role) {
  const p = {
    manage_billing: false,
    manage_locations: false,
    manage_team: false,
    manage_pins: false,
    clock_self: true,
    clock_others: false,
    log_temps: true,
    log_cleaning: true,
    manage_maintenance: false,
    manage_stock: false,
    manage_orders: false,
    manage_recipes: false,
    view_costing: false,
    view_reports_location: true,
    view_reports_company: false,
    manage_subscription: false,
  };
  if (roleAtLeast(role, 'location_manager')) {
    Object.assign(p, {
      manage_team: true,
      manage_pins: true,
      clock_others: true,
      manage_maintenance: true,
      manage_stock: true,
      manage_orders: true,
      manage_recipes: true,
      view_costing: true,
    });
  }
  if (roleAtLeast(role, 'kitchen_admin')) {
    Object.assign(p, {
      manage_locations: true,
      view_reports_company: true,
    });
  }
  if (roleAtLeast(role, 'company_owner')) {
    Object.assign(p, {
      manage_billing: true,
      manage_subscription: true,
    });
  }
  return p;
}

module.exports = {
  RANK,
  UI_ACCESS,
  ACCESS_TO_ROLE,
  mapTitleToRole,
  resolveMemberRole,
  roleAtLeast,
  permissionsFor,
};
