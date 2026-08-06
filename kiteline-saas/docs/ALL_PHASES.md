# Kiteline.uk — Phases A–D + E (complete package)

One package for a professional multi-company / multi-location Kiteline, **without changing the current design**.

| Phase | Deliverable | Status |
|-------|-------------|--------|
| **A** | Postgres schema + RLS + roles/workflow docs | Ready |
| **B** | Scoped tenancy API (`/api/saas/*`, filtered `/api/state`) | Ready |
| **C** | Company·Location switcher, Team roles, Clock, Reports | Ready |
| **D** | Stock + Orders screens & APIs | Ready |
| **E** | Security hardening patch + production checklist | Ready (needs your deploy) |

## One-command apply (on a kitline1 checkout)

```bash
node kiteline-saas/scripts/apply-all-to-kitline1.js /path/to/kitline1
```

This applies:

1. Security hardening (E)  
2. Tenancy + UI + Stock/Orders (B/C/D)  
3. Copies schema/docs into `kitline1/saas/` (A)

## Production deploy (required for kiteline.uk)

Cloud agents **cannot push** `shyam1-jpg/kitline1` or set Render secrets.

```bash
cd kitline1
git checkout -b cursor/kiteline-saas-all
# after apply-all:
git add -A
git commit -m "Kiteline SaaS A–D + security hardening"
git push -u origin HEAD
```

Render env (minimum):

```
DEMO_MODE=false
NODE_ENV=production
OWNER_PASSWORD=<rotated>
INGEST_KEY=<openssl rand -hex 32>
VEDANTA_API_KEY=<openssl rand -hex 32>
DATABASE_URL=<neon>
KITELINE_DB_MODE=json
```

Then:

```bash
DATABASE_URL=... ./saas/apply-schema.sh
# deploy via Render → custom domain kiteline.uk
curl -s https://kiteline.uk/api/health          # build …saas-bcd
curl -s https://kiteline.uk/api/config          # demo:false
curl -s -o /dev/null -w "%{http_code}\n" https://kiteline.uk/api/vedanta/store  # 401
```

## Local verify

```bash
./kiteline-saas/scripts/verify-all.sh
node kiteline-saas/tests/saas-unit-test.js
node kiteline-saas/tests/inventory-unit-test.js
```
