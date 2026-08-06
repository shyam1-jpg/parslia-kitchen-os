# Kiteline SaaS — Phase A + E package

Professional multi-company / multi-location foundation for **kiteline.uk**, without changing the current teal/ink UI.

## What’s included

| Path | Purpose |
|------|---------|
| `schema/*.sql` | Postgres schema + RLS |
| `docs/ROLES_AND_PERMISSIONS.md` | Role matrix |
| `docs/MULTI_LOCATION_WORKFLOW.md` | Location workflow |
| `docs/MIGRATION_PLAN.md` | JSON → Postgres plan |
| `docs/SCREEN_CHANGES.md` | Future UI changes (same design) |
| `tests/isolation_test.sql` | Cross-tenant isolation proof |
| `scripts/verify-schema.sh` | Apply + verify locally |
| `scripts/apply-schema.sh` | Apply to Neon/prod URL |
| `scripts/migrate-json-to-postgres.js` | Migration dry-run |
| `deploy/*` | Hardening + production checklist |

## Verify locally

```bash
./scripts/verify-schema.sh
node scripts/migrate-json-to-postgres.js --dry-run --db /path/to/kitline1/server/data/db.json
```

## Apply to Neon / production DB

```bash
DATABASE_URL='postgres://...' ./scripts/apply-schema.sh
psql "$DATABASE_URL" -v ON_ERROR_STOP=1 -f tests/isolation_test.sql
```

## Out of scope for A/E

- Full screen rebuild (Phases C/D)
- Stock/ordering UI modules
- Push/deploy to `kitline1` / Render from this agent (no write access) — owner applies + deploys using `deploy/PRODUCTION_CHECKLIST.md`
