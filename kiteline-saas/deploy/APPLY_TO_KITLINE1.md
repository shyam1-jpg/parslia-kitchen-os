# Apply Phase A/B/C/E package into kitline1

This agent cannot push to `shyam1-jpg/kitline1`. On a machine with write access:

```bash
cd kitline1

# 1) Security hardening (Phase E)
git apply /path/to/parslia-kitchen-os/kiteline-saas/deploy/kitline1-security-hardening.patch

# 2) Tenancy API + screens (Phase B/C)
git apply /path/to/parslia-kitchen-os/kiteline-saas/deploy/kitline1-saas-bc.patch
# or: node /path/to/kiteline-saas/scripts/apply-bc-to-kitline1.js .

# 3) Schema (Phase A) — Neon
DATABASE_URL=postgres://... /path/to/kiteline-saas/scripts/apply-schema.sh
psql "$DATABASE_URL" -v ON_ERROR_STOP=1 -f /path/to/kiteline-saas/tests/isolation_test.sql

# 4) Render env — see PRODUCTION_CHECKLIST.md
#    DEMO_MODE=false
#    DATABASE_URL=...
#    KITELINE_DB_MODE=json   # use postgres after migrate
# 5) Deploy → kiteline.uk
# 6) Smoke: /api/health build contains saas-bc; /api/saas/context after login
```

## Quick B/C checks after deploy

| Login | Expect |
|-------|--------|
| Owner | All locations in switcher; company reports OK |
| Manager | One location; company reports 403 |
| Staff | One location; company reports 403 |
