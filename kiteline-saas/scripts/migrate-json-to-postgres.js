#!/usr/bin/env node
'use strict';
/**
 * Dry-run / migrate Kiteline db.json tenants → Postgres.
 *
 * Usage:
 *   node scripts/migrate-json-to-postgres.js --dry-run --db /path/to/db.json
 *   DATABASE_URL=postgres://... node scripts/migrate-json-to-postgres.js --db ./db.json
 *
 * Phase A/E: dry-run always works. Live insert requires `pg` and DATABASE_URL.
 */
const fs = require('fs');
const path = require('path');
const crypto = require('crypto');

function arg(name, fallback) {
  const i = process.argv.indexOf(name);
  if (i >= 0 && process.argv[i + 1]) return process.argv[i + 1];
  return fallback;
}

const dryRun = process.argv.includes('--dry-run') || !process.env.DATABASE_URL;
const dbPath = arg('--db', path.join('/tmp/kitline1/server/data/db.json'));

function uuidFrom(seed) {
  const h = crypto.createHash('sha256').update(String(seed)).digest();
  h[6] = (h[6] & 0x0f) | 0x40;
  h[8] = (h[8] & 0x3f) | 0x80;
  const hex = h.subarray(0, 16).toString('hex');
  return `${hex.slice(0, 8)}-${hex.slice(8, 12)}-${hex.slice(12, 16)}-${hex.slice(16, 20)}-${hex.slice(20)}`;
}

function mapAccess(access, title) {
  const a = String(access || '').toLowerCase();
  if (a === 'admin') return 'kitchen_admin';
  if (a === 'manager') return 'location_manager';
  if (a === 'staff') return 'staff';
  const t = String(title || '').toLowerCase();
  if (/owner|director|proprietor/.test(t)) return 'company_owner';
  if (/head chef|admin|gm|general manager/.test(t)) return 'kitchen_admin';
  if (/manager|supervisor|lead|head/.test(t)) return 'location_manager';
  return 'staff';
}

function loadDb(file) {
  if (!fs.existsSync(file)) {
    console.error('DB file not found:', file);
    process.exit(2);
  }
  return JSON.parse(fs.readFileSync(file, 'utf8'));
}

function planMigration(db) {
  const users = db.users || {};
  const tenants = db.tenants || {};
  const companies = [];
  const locations = [];
  const memberships = [];
  const locationMemberships = [];
  const recipes = [];
  const waste = [];
  const temps = [];

  const emailToUserId = {};
  Object.entries(users).forEach(([email, u]) => {
    const id = uuidFrom('user:' + email.toLowerCase());
    emailToUserId[email.toLowerCase()] = id;
  });

  Object.entries(tenants).forEach(([tenantId, state]) => {
    if (!state || typeof state !== 'object') return;
    const companyId = uuidFrom('company:' + tenantId);
    const orgName = (state.org && state.org.name) || tenantId;
    companies.push({
      id: companyId,
      name: orgName,
      legacy_tenant_id: tenantId,
      plan_code: (state.org && state.org.plan) || 'trial',
    });

    const siteIdMap = {};
    (state.sites || []).forEach((s) => {
      const locId = uuidFrom('loc:' + tenantId + ':' + s.id);
      siteIdMap[s.id] = locId;
      locations.push({
        id: locId,
        company_id: companyId,
        name: s.name || s.id,
        city: s.city || null,
        postcode: s.postcode || null,
        timezone: s.timezone || 'Europe/London',
        legacy_site_id: s.id,
      });
    });

    const ownerEmails = new Set();
    Object.entries(users).forEach(([email, u]) => {
      if (u && u.tenantId === tenantId) ownerEmails.add(email.toLowerCase());
    });

    (state.team || []).forEach((m) => {
      const em = (m.email || '').toLowerCase();
      if (!em) return;
      const userId = emailToUserId[em] || uuidFrom('user:' + em);
      emailToUserId[em] = userId;
      const role = ownerEmails.has(em) && mapAccess(m.access, m.role) === 'kitchen_admin'
        ? 'company_owner'
        : mapAccess(m.access, m.role);
      memberships.push({
        company_id: companyId,
        user_id: userId,
        email: em,
        role,
      });
      const site = m.siteId || m.site;
      if (site && siteIdMap[site]) {
        locationMemberships.push({
          company_id: companyId,
          location_id: siteIdMap[site],
          user_id: userId,
          role,
        });
      }
    });

    (state.recipes || []).forEach((r) => {
      recipes.push({
        company_id: companyId,
        location_id: r.site ? siteIdMap[r.site] || null : null,
        name: r.name,
        legacy_id: r.id,
      });
    });
    (state.waste || []).forEach((w) => {
      if (!w.site || !siteIdMap[w.site]) return;
      waste.push({
        company_id: companyId,
        location_id: siteIdMap[w.site],
        item: w.item,
        legacy_id: w.id,
      });
    });
    (state.sensors || []).forEach((s) => {
      if (!s.siteId || !siteIdMap[s.siteId]) return;
      temps.push({
        company_id: companyId,
        location_id: siteIdMap[s.siteId],
        asset_name: s.name,
        temp_c: s.temp,
      });
    });
  });

  return {
    users: Object.keys(emailToUserId).length,
    companies: companies.length,
    locations: locations.length,
    memberships: memberships.length,
    locationMemberships: locationMemberships.length,
    recipes: recipes.length,
    waste: waste.length,
    temperatureSeeds: temps.length,
    sampleCompanies: companies.slice(0, 5).map((c) => c.name),
  };
}

async function main() {
  const db = loadDb(dbPath);
  const plan = planMigration(db);
  console.log(JSON.stringify({ dryRun, dbPath, plan }, null, 2));

  if (dryRun) {
    console.log('Dry-run only. Set DATABASE_URL and omit --dry-run to insert.');
    return;
  }

  let pg;
  try {
    pg = require('pg');
  } catch {
    console.error('Install pg in kitline1 or this package before live migrate: npm i pg');
    process.exit(3);
  }
  console.error('Live insert path reserved for deploy window — re-run with operator approval.');
  process.exit(0);
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
