# Kiteline.uk — Phase E production checklist

## Before deploy

- [ ] Backup Render disk / `server/data/db.json`
- [ ] Neon (or Postgres) provisioned; `DATABASE_URL` ready (not committed)
- [ ] Schema applied: `./scripts/apply-schema.sh "$DATABASE_URL"`
- [ ] Isolation tests passed against that DB
- [ ] Security hardening patch applied on `kitline1` (see `HARDENING.md`)
- [ ] New secrets generated:
  - `DEMO_MODE=false`
  - `OWNER_PASSWORD` (strong, rotated)
  - `INGEST_KEY` (`openssl rand -hex 32`)
  - `VEDANTA_API_KEY` (`openssl rand -hex 32`)
  - SMTP app password rotated
  - All Vedanta staff PINs rotated

## Render env (minimum)

```
NODE_ENV=production
RENDER=true
DEMO_MODE=false
APP_URL=https://kiteline.uk
OWNER_EMAIL=shyam_1@hotmail.co.uk
OWNER_PASSWORD=<rotated>
INGEST_KEY=<rotated>
VEDANTA_API_KEY=<rotated>
DATABASE_URL=<neon>
KITELINE_DB_MODE=json   # switch to postgres after migrate
```

## Deploy steps

1. Apply security hardening on `kitline1` and deploy to Render.
2. Confirm `/api/health` build string updates (not `2026-07-02-pilot-sites`).
3. Confirm `GET /api/config` → `"demo": false`.
4. Confirm `GET /api/vedanta/store` without key → **401**.
5. Confirm `/app/owner-login` does not issue a session.
6. Dry-run migrate → live migrate in maintenance window.
7. Run isolation tests + smoke script against production DB.
8. Hard-refresh kitchen tablets; re-issue staff PINs.

## Acceptance

| Check | Expected |
|-------|----------|
| Health build | New hardened / schema build id |
| Demo mode | false |
| Vedanta store anon | 401 |
| Company A cannot read Company B | Pass (RLS + API) |
| Clock PIN location-bound | Pass |
| Billing portal | Owner only |

## Note on this agent environment

Cloud agent **cannot push to `kitline1`** or set Render secrets. Owner must apply patches + deploy. This package provides verified schema, migration dry-run, isolation tests, and hardening checklist.
