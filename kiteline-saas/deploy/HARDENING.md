# Kiteline.uk — Phase E hardening (must deploy)

Production was still on build `2026-07-02-pilot-sites` with open demo/Vedanta issues when last probed. Schema alone does **not** secure the live site.

## Required code hardening (existing patch)

Apply from `parslia-kitchen-os` branch `cursor/kiteline-security-hardening-18ca`:

- `patches/kitline1-security-hardening.patch`
- Docs: `patches/README-SECURITY.md`, `patches/SECURITY-REPORT-KITELINE.md`

That patch covers:

1. `DEMO_MODE` only when explicitly `true` (no Render auto-on)
2. Vedanta `/api/vedanta/store|patch|reports` require API key
3. HttpOnly cookies + CSRF direction
4. Scoped workspace mutate / block tenant id spoof
5. Security headers (CSP/HSTS)

## Required with SaaS schema (this package)

1. Never trust client `company_id` / `location_id`
2. Set Postgres session vars on each request before queries
3. Use `kiteline_app` DB role (RLS forced)
4. Retire whole-state `PUT /api/state` after migrate
5. Store PIN hashes only (`staff_pins.pin_hash`)
6. Audit sensitive actions into `audit_logs`

## Live smoke (after deploy)

```bash
curl -s https://kiteline.uk/api/health
curl -s https://kiteline.uk/api/config          # demo:false
curl -s -o /dev/null -w "%{http_code}\n" https://kiteline.uk/api/vedanta/store   # 401
```
