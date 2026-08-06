# Apply Phase A/E package into kitline1

This agent cannot push to `shyam1-jpg/kitline1`. On a machine with write access:

```bash
cd kitline1
mkdir -p saas
# copy this folder's contents into kitline1/saas/
cp -R /path/to/parslia-kitchen-os/kiteline-saas/* ./saas/

# 1) Apply security hardening first (from parslia-kitchen-os)
git apply /path/to/parslia-kitchen-os/patches/kitline1-security-hardening.patch
# (checkout that file from branch cursor/kiteline-security-hardening-18ca if needed)

# 2) Provision Neon and apply schema
DATABASE_URL=postgres://... ./saas/scripts/apply-schema.sh
psql "$DATABASE_URL" -v ON_ERROR_STOP=1 -f saas/tests/isolation_test.sql

# 3) Set Render env from deploy/PRODUCTION_CHECKLIST.md
# 4) Deploy to Render → kiteline.uk
# 5) Re-run live smoke checks in HARDENING.md
```
