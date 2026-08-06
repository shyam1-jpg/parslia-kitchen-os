# Phase A + E verification evidence

Date: 2026-08-06

## Schema verification (local Postgres 16)

Command: `./scripts/verify-schema.sh`

Result: **PASS**
- 33 base tables created
- RLS policies applied
- Isolation tests (`tests/isolation_test.sql`) passed:
  - Company A owner sees only Company A rows
  - Staff A location-scoped
  - Cross-tenant insert blocked
  - Company B owner cannot see Company A

## Migration dry-run

Command: `node scripts/migrate-json-to-postgres.js --dry-run --db tests/fixtures/sample-db.json`

Result: **PASS** (plan printed; no writes)

```
users: 5
companies: 1
locations: 2
memberships: 4
locationMemberships: 4
recipes: 5
waste: 2
temperatureSeeds: 3
```

## Phase B/C API + UI (local kitline1 apply)

Command: `node scripts/apply-bc-to-kitline1.js` + `node tests/saas-unit-test.js`

Result: **PASS** (7/7 unit tests)

Live local server (`DEMO_MODE=true`, build `2026-08-06-saas-bc`):

| Login | Role | Locations | Company reports |
|-------|------|-----------|-----------------|
| Owner | company_owner | all (16) | 200 |
| sarah@kiteline.uk | kitchen_admin | all | 200 |
| lena@kiteline.uk | location_manager | site_dock only | 403 |
| james@kiteline.uk | staff | site_grove only | 403 |

## Live kiteline.uk (pre-deploy status)

Probed 2026-08-06:
- `/api/health` → build `2026-07-02-pilot-sites` (old)
- `/api/config` → `"demo": true`
- `/api/vedanta/store` → HTTP **200** (still open)

**Conclusion:** A/B/C/E package verified locally. Production still needs owner apply + Render deploy.
