# Kiteline Phase B + C

## Phase B — Core tenancy API

New module: `server/saas/`

| Endpoint | Purpose |
|----------|---------|
| `GET /api/saas/context` | Company, role, allowed locations, permissions |
| `POST /api/saas/location` | Switch current location (allowed only) |
| `GET /api/saas/team` | Team list for allowed locations |
| `PATCH /api/saas/team/role` | Update role / site assignment |
| `GET /api/saas/reports?scope=location\|company` | Scoped analytics |
| `POST /api/saas/clock/pin-check` | Location-bound PIN check |

Also:

- `GET /api/state` returns **location-filtered** workspace + `_saas` metadata
- `PUT /api/state` merges safely (no cross-location writes; tenant ids server-owned)
- Optional Postgres enrichment when `KITELINE_DB_MODE=postgres` + `DATABASE_URL`

## Phase C — Screens (same design)

`js/saas.js` enhances existing UI without theme changes:

- Header switcher: `Company · Location`
- Team: role labels (Admin/Owner, Location Manager, Staff)
- Clock: copy clarifies PIN is location-bound
- Reports: **This location / All locations** toggle for Admin/Owner

## Apply

```bash
node kiteline-saas/scripts/apply-bc-to-kitline1.js /path/to/kitline1
# or
cd kitline1 && git apply /path/to/kiteline-saas/deploy/kitline1-saas-bc.patch
```

## Verify

```bash
node kiteline-saas/tests/saas-unit-test.js
# then run kitline1 and login:
# Owner → all locations + company reports
# Manager → one location; company reports 403
# Staff → one location; company reports 403
```
