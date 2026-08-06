# Kiteline SaaS — Phase A + B + C + E package

Professional multi-company / multi-location foundation for **kiteline.uk**, without changing the current teal/ink UI.

## What’s included

| Path | Purpose |
|------|---------|
| `schema/*.sql` | Postgres schema + RLS (A) |
| `runtime/server/saas/*` | Tenancy API + scoped state (B) |
| `runtime/js/saas.js` | Switcher / Team / Clock / Reports (C) |
| `docs/*` | Roles, workflow, migration, Phase B/C |
| `tests/isolation_test.sql` | DB isolation proof (A/E) |
| `tests/saas-unit-test.js` | API scoping unit tests (B) |
| `scripts/verify-schema.sh` | Schema verify |
| `scripts/apply-schema.sh` | Apply schema to Neon |
| `scripts/apply-bc-to-kitline1.js` | Install B/C into kitline1 |
| `deploy/kitline1-saas-bc.patch` | Unified B/C patch |
| `deploy/*` | Hardening + production checklist (E) |

## Verify locally

```bash
./scripts/verify-schema.sh
node tests/saas-unit-test.js
node scripts/migrate-json-to-postgres.js --dry-run --db tests/fixtures/sample-db.json
```

## Apply to kitline1

```bash
node scripts/apply-bc-to-kitline1.js /path/to/kitline1
# optional schema:
DATABASE_URL='postgres://...' ./scripts/apply-schema.sh
```

Then deploy kitline1 to Render (this agent cannot push `kitline1`).

## Still later (Phase D)

- First-class Stock / Orders screens
- Full Postgres cutover for ops data (beyond context enrichment)
