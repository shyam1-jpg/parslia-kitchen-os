# Kiteline — JSON tenants → Postgres migration plan

## Source (today)

- File: `server/data/db.json`
- Shape: `db.users[]`, `db.tenants[tenantId]` workspace blobs
- Sites → locations; `team[]` → memberships + location_memberships
- Ops arrays (`sensors` history, `checklists`, `waste`, …) → normalized tables

## Target

Apply in order:

1. `schema/001_core_tenancy.sql`
2. `schema/002_ops_compliance.sql`
3. `schema/003_commercial.sql`
4. `schema/004_rls_policies.sql`

## Cutover steps (Phase E)

1. **Backup** production `db.json` + Render disk snapshot.
2. **Provision** Neon DB; set `DATABASE_URL` on Render (do not commit).
3. **Apply schema** via `scripts/apply-schema.sh`.
4. **Dry-run migrate** `node scripts/migrate-json-to-postgres.js --dry-run`.
5. **Migrate** `node scripts/migrate-json-to-postgres.js`.
6. **Verify isolation tests** against migrated DB.
7. **Deploy** hardened Kiteline build (`DEMO_MODE=false`, rotated secrets).
8. **Smoke** production checklist in `deploy/PRODUCTION_CHECKLIST.md`.
9. Keep JSON write path as read-only backup for one release window, then disable whole-state `PUT /api/state` for migrated tenants.

## Field mapping (high level)

| JSON | Postgres |
|------|----------|
| `tenantId` | `companies.legacy_tenant_id` |
| `org.name` | `companies.name` |
| `sites[]` | `locations` (`legacy_site_id`) |
| `team[]` + `access` | `memberships` + `location_memberships` |
| clock / PIN data | `staff_pins`, `clock_events` |
| temps / cleaning / HACCP / … | matching `*_logs` / checklists |
| `recipes[]` | `recipes` |
| `waste[]` | `waste_logs` |
| Stripe customer on user/org | `companies.stripe_customer_id`, `subscriptions` |

## Rollback

- Restore previous Render deploy + `db.json` backup.
- Neon DB retained for forensics; app ignores Postgres until `KITELINE_DB_MODE=postgres`.
