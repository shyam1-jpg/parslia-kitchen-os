# Phase A–D + E verification evidence

Date: 2026-08-06

## A — Schema + RLS
Command: `./scripts/verify-schema.sh`  
Result: **PASS** — 33 tables, isolation tests passed

## B — Tenancy API
Command: `node tests/saas-unit-test.js`  
Result: **PASS** — 7/7

## C/D — Integrated server (security + BCD)
Build: `2026-08-06-saas-bcd`

| Check | Result |
|-------|--------|
| Owner context | company_owner, 16 locations |
| Stock seeded | 8 SKUs |
| views-inventory.js / saas.js | HTTP 200 |
| Inventory unit tests | 5/5 PASS |

## E — Hardened mode (`DEMO_MODE=false`, `NODE_ENV=production`)

| Check | Result |
|-------|--------|
| `/api/config` demo | **false** |
| `/api/vedanta/store` anon | **401** |
| `/api/vedanta/store` + API key | **200** |
| `/app/owner-login` | **302** (no passwordless session) |

## apply-all script
`node scripts/apply-all-to-kitline1.js` on fresh kitline1 → **OK**

## Live kiteline.uk (still pre-deploy)
- build `2026-07-02-pilot-sites`
- `demo: true`
- Vedanta store open

**Conclusion:** Full A–D+E package verified locally. Production requires owner apply + Render deploy via `APPLY_TO_KITLINE1.md`.
