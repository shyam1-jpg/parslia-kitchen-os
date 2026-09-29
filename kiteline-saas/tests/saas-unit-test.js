#!/usr/bin/env node
'use strict';

const path = require('path');
const assert = require('assert');
const context = require('../runtime/server/saas/context');
const scope = require('../runtime/server/saas/scope');
const roles = require('../runtime/server/saas/roles');

function sampleState() {
  return {
    _tenantId: 'tenant_a',
    org: { name: 'Company A' },
    currentSite: 'site_a1',
    sites: [
      { id: 'site_a1', name: 'Kitchen A1' },
      { id: 'site_a2', name: 'Kitchen A2' },
    ],
    team: [
      { id: 'u1', name: 'Owner', email: 'owner@a.com', role: 'Owner', access: 'Admin', siteId: 'site_a1' },
      { id: 'u2', name: 'Mgr', email: 'mgr@a.com', role: 'Manager', access: 'Manager', siteId: 'site_a1' },
      { id: 'u3', name: 'Staff', email: 'staff@a.com', role: 'KP', access: 'Staff', siteId: 'site_a2' },
    ],
    sensors: [
      { id: 's1', name: 'Fridge A1', siteId: 'site_a1', temp: 3, min: 1, max: 5 },
      { id: 's2', name: 'Fridge A2', siteId: 'site_a2', temp: 8, min: 1, max: 5 },
    ],
    records: [
      { id: 'r1', site: 'site_a1', type: 'Delivery' },
      { id: 'r2', site: 'site_a2', type: 'Cooking' },
    ],
    alerts: [],
    waste: [],
    recipes: [
      { id: 'rc1', site: 'site_a1', name: 'Soup' },
      { id: 'rc2', site: 'site_a2', name: 'Curry' },
    ],
  };
}

let passed = 0;
function test(name, fn) {
  try {
    fn();
    passed += 1;
    console.log('PASS', name);
  } catch (e) {
    console.error('FAIL', name, e.message);
    process.exitCode = 1;
  }
}

test('owner role maps to company_owner', () => {
  const a = context.resolveAccess(sampleState(), 'owner@a.com');
  assert.strictEqual(a.role, 'company_owner');
  assert.strictEqual(a.canViewAllLocations, true);
  assert.deepStrictEqual(a.allowedSiteIds.sort(), ['site_a1', 'site_a2']);
});

test('manager only sees assigned location', () => {
  const a = context.resolveAccess(sampleState(), 'mgr@a.com');
  assert.strictEqual(a.role, 'location_manager');
  assert.deepStrictEqual(a.allowedSiteIds, ['site_a1']);
  assert.strictEqual(a.permissions.view_reports_company, false);
});

test('staff filtered state hides other location recipes', () => {
  const state = sampleState();
  const a = context.resolveAccess(state, 'staff@a.com');
  const filtered = scope.filterStateForAccess(state, a);
  assert.strictEqual(filtered.sites.length, 1);
  assert.strictEqual(filtered.sites[0].id, 'site_a2');
  assert.strictEqual(filtered.recipes.length, 1);
  assert.strictEqual(filtered.recipes[0].id, 'rc2');
  assert.ok(filtered._saas);
});

test('staff cannot merge foreign location sensor writes', () => {
  const prev = sampleState();
  const a = context.resolveAccess(prev, 'staff@a.com');
  const next = JSON.parse(JSON.stringify(prev));
  next.sensors.push({ id: 'hack', name: 'Hack', siteId: 'site_a1', temp: 99, min: 0, max: 1 });
  next.sensors = next.sensors.map((s) => (s.id === 's2' ? Object.assign({}, s, { temp: 2 }) : s));
  const merged = scope.mergeStatePut(prev, next, a);
  assert.ok(merged.ok);
  const hack = merged.state.sensors.find((s) => s.id === 'hack');
  assert.strictEqual(hack, undefined);
  const s2 = merged.state.sensors.find((s) => s.id === 's2');
  assert.strictEqual(s2.temp, 2);
  const s1 = merged.state.sensors.find((s) => s.id === 's1');
  assert.strictEqual(s1.temp, 3);
});

test('tenant metadata cannot be spoofed on put', () => {
  const prev = sampleState();
  const a = context.resolveAccess(prev, 'owner@a.com');
  const next = JSON.parse(JSON.stringify(prev));
  next._tenantId = 'tenant_OTHER';
  const merged = scope.mergeStatePut(prev, next, a);
  assert.strictEqual(merged.state._tenantId, 'tenant_a');
});

test('company report aggregates locations', () => {
  const r = scope.aggregateReport(sampleState(), ['site_a1', 'site_a2']);
  assert.strictEqual(r.sensors, 2);
  assert.strictEqual(r.records, 2);
  assert.ok(r.compliance < 100); // site_a2 breach
});

test('role permissions ladder', () => {
  assert.strictEqual(roles.permissionsFor('staff').manage_team, false);
  assert.strictEqual(roles.permissionsFor('location_manager').manage_team, true);
  assert.strictEqual(roles.permissionsFor('company_owner').manage_billing, true);
});

console.log(`\n${passed} tests passed`);
if (process.exitCode) process.exit(process.exitCode);
