# Apply ALL phases (A–D + E) to kitline1 → kiteline.uk

This agent **cannot push** `shyam1-jpg/kitline1` or change Render. Run these on a machine with write access.

## Fast path (recommended)

```bash
git clone https://github.com/shyam1-jpg/kitline1.git
cd kitline1
git checkout -b cursor/kiteline-saas-all

# From parslia-kitchen-os checkout:
node /path/to/parslia-kitchen-os/kiteline-saas/scripts/apply-all-to-kitline1.js .

git add -A
git commit -m "Kiteline SaaS: schema, tenancy, screens, stock/orders, security hardening"
git push -u origin HEAD
```

Or one combined patch:

```bash
git apply /path/to/kiteline-saas/deploy/kitline1-saas-all.patch
```

## Neon schema (Phase A)

```bash
DATABASE_URL='postgres://...' ./saas/apply-schema.sh
psql "$DATABASE_URL" -v ON_ERROR_STOP=1 -f saas/isolation_test.sql
```

## Render env (Phase E — required)

```
DEMO_MODE=false
NODE_ENV=production
APP_URL=https://kiteline.uk
OWNER_EMAIL=shyam_1@hotmail.co.uk
OWNER_PASSWORD=<new strong password>
INGEST_KEY=<openssl rand -hex 32>
VEDANTA_API_KEY=<openssl rand -hex 32>
DATABASE_URL=<neon>
KITELINE_DB_MODE=json
```

Rotate Vedanta staff PINs + SMTP app password. See `HARDENING.md`.

## Deploy & accept

1. Deploy kitline1 on Render (Blueprint / existing service)
2. Hard-refresh kitchen devices
3. Checks:

```bash
curl -s https://kiteline.uk/api/health          # build …saas-bcd
curl -s https://kiteline.uk/api/config          # "demo": false
curl -s -o /dev/null -w "%{http_code}\n" https://kiteline.uk/api/vedanta/store   # 401
```

| Login | Expect |
|-------|--------|
| Owner | All locations; Stock/Orders; company reports |
| Manager | One location; Stock/Orders for that site |
| Staff | One location; no Stock mutate; no company reports |

Full matrix: `docs/ALL_PHASES.md` + `PRODUCTION_CHECKLIST.md`.
