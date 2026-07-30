# Kiteline.uk Security Review Report

**Date:** 2026-07-30  
**Scope:** `shyam1-jpg/kitline1` (production `https://kiteline.uk`, build reviewed `2026-07-02-pilot-sites`)  
**Hardening build:** `2026-07-30-security-hardening`  
**Method:** Source audit + live production probes + local hardened-server tests  
**Note:** Disabling Inspect / right-click is **not** used and is **not** recommended.

---

## Executive verdict

Production had **critical open access** issues that are **not** solved by browser tricks. The highest-severity findings were live on `kiteline.uk` at review time. This change set closes the worst holes in code; **you must deploy immediately and rotate credentials**.

---

## Critical issues found (production evidence)

| # | Severity | Issue | Evidence |
|---|----------|-------|----------|
| 1 | **Critical** | `DEMO_MODE` enabled on production → any email/password creates an account | `GET /api/config` → `"demo": true`. Login as `nobody@example.com` returned HTTP 200 + session token |
| 2 | **Critical** | `/app/owner-login` issued a live **owner** session with no password | `GET https://kiteline.uk/app/owner-login` returned HTML that wrote `kiteline.token` for `shyam_1@hotmail.co.uk` |
| 3 | **Critical** | Vedanta staff store publicly readable (staff, rota, clock, **PINs**) | `GET /api/vedanta/store` → HTTP 200, ~201KB, pins included (`admin:0000`, `foh:1111`, …) |
| 4 | **Critical** | Vedanta store publicly writable | `POST /api/vedanta/patch` → HTTP 200 without auth |
| 5 | **High** | Unauthenticated report send + SMTP/path leakage | `POST /api/vedanta/reports/send` succeeded; response included SMTP error and `/opt/render/...` path |
| 6 | **High** | Session tokens stored in `localStorage` (XSS → account takeover) | `js/api.js` `kiteline.token` |
| 7 | **High** | Full kitchen workspace synced to browser (`GET/PUT /api/state`) | Architectural — all business data available after login |
| 8 | **High** | Default `INGEST_KEY=kiteline-demo-key` risk; UI previously displayed it | `server/server.js`, `js/views.js` |
| 9 | **Medium** | No `Content-Security-Policy` / no `Strict-Transport-Security` on app responses | Production response headers |
| 10 | **Medium** | Demo passwords embedded in login UI when demo on | `demo1234`, `shyam` in `js/app.js` |
| 11 | **Medium** | Owner backup API returned password hashes (`pass` scrypt fields) | `/api/backup` payload shape in source |
| 12 | **Medium** | Firebase web config hardcoded in Vedanta rota page | `site/vedanta-rota/index.html` (web API key — restrict via Firebase rules/domains) |
| 13 | **Low** | Client-side role checks for nav only; server trusts whole-state PUT within tenant | Expected for current architecture; tenant ID spoof now blocked |

**Not found:** live `sk_live_` / `STRIPE_SECRET_KEY` / `OPENAI_API_KEY` / `DATABASE_URL` values in frontend JS or GitHub source. Stripe/OpenAI are server `process.env` only. No public `.js.map` files (404). No fake anti-Inspect code.

**Database:** Kiteline uses a file/JSON store (+ optional Neon for Academy), **not** Supabase RLS. Tenant isolation is application-layer via `server/tenants.js`.

---

## Credentials that must be treated as compromised

Rotate/revoke **immediately** after deploy (this agent cannot rotate Render/Firebase/Google secrets for you):

1. **All Kiteline session tokens** on production (clear `tokens` in server DB or restart with wiped token map) — owner token was obtainable via `/app/owner-login`.
2. **Owner password** (`OWNER_PASSWORD` / account `shyam_1@hotmail.co.uk`) — assume known if demo password `shyam` was ever valid.
3. **Vedanta staff PINs** published via open `/api/vedanta/store` — change every PIN in the rota app.
4. **`INGEST_KEY`** if it was ever the demo default or shown in UI.
5. **`SMTP_PASS` / Google App Password** — SMTP credentials failed in report response but treat as exposed diagnostic; rotate App Password.
6. **`VEDANTA_API_KEY`** — generate new (`openssl rand -hex 32`) and set on Render (new in this hardening).
7. **Firebase** — review Firestore rules for `the-vedanta`; restrict API key HTTP referrers in Google Cloud Console.
8. Any accounts created while `demo: true` was live (e.g. test emails) — delete unknown users from production DB.

**No plaintext Stripe/OpenAI secrets were found in the repo or browser bundles to revoke by value.** Confirm Render env vars were never committed.

---

## Fixes implemented in this hardening pass

| Fix | Result |
|-----|--------|
| `DEMO_MODE` only when `DEMO_MODE=true` (no Render auto-on) | Auto-account creation + owner one-click **off** in production |
| Vedanta `/store`, `/patch`, `/reports/*` require `x-api-key` | Unauth → 401/503 |
| `VEDANTA_API_KEY` injected into `/vedanta-rota/` HTML by server | Sync still works for the kitchen app |
| Production error sanitisation for Vedanta/SMTP | No filesystem/SMTP dumps to clients |
| CSP + HSTS + existing frame/nosniff/referrer headers | Headers present on hardened server |
| Source maps 404 in production | Confirmed |
| Backup redacts password hashes / BYOK blobs; omits tokens | Safer owner export |
| Ingest info never returns full key to browser | Masked only |
| State PUT forces server tenant metadata | Cross-tenant ID spoof fails |
| Login lockout checked before password verify | Locked accounts stay locked |
| Ingest rate limit + refuse demo key in production | Abuse resistance |
| Smoke test script | `scripts/security-smoke-test.js` |

---

## Security test results (hardened local server)

Environment: `DEMO_MODE=false NODE_ENV=production` with test keys on port 4011.

| Test | Result |
|------|--------|
| Anonymous `GET /api/vedanta/store` | **401** |
| Anonymous `POST /api/vedanta/reports/send` | **401** |
| `GET /api/vedanta/store` + valid `x-api-key` | **200** |
| Login unknown user (no demo) | **401** invalid_credentials |
| `/app/owner-login` | **302** → `/app` |
| CSP / HSTS / XFO / nosniff | **Present** |
| `/js/app.js.map` | **404** |
| Unauth `/api/state`, `/api/backup` | **401** |
| Two businesses → different `_tenantId` | **Pass** |
| Spoof `_tenantId` to other business | **Ignored**; other org unchanged |
| Non-owner `/api/backup` | **403** |
| Production live (pre-deploy) Vedanta open + demo owner-login | **Failed open** (documented above) |

---

## Confirmations (acceptance checklist)

| Requirement | Status |
|-------------|--------|
| No private Stripe/OpenAI/DB secrets in browser Inspect/Sources (repo + prod JS scan) | **Confirmed** for those key types |
| Production source maps not publicly accessible | **Confirmed** (404) |
| Server-side auth on protected Kiteline APIs (`/state`, billing, backup, AI) | **Confirmed** (401 without session) |
| Cross-business access via tenant ID change unsuccessful | **Confirmed** on hardened build |
| Database RLS (Supabase) | **N/A** — not on Supabase; tenant isolation is app-layer JSON tenants |
| Security headers (CSP, HSTS, XFO, nosniff, Referrer-Policy, Permissions-Policy, frame-ancestors) | **Implemented** in hardening build |
| Rate limiting + login protection | **Present** (login/register/forgot/AI/vedanta/ingest); lockout fixed |
| Fake anti-Inspect | **Not used** |

### Remaining / follow-up (not fully closed in one pass)

1. **Deploy this build to Render** and set `DEMO_MODE=false`, `VEDANTA_API_KEY`, strong `INGEST_KEY`, rotate SMTP/owner password.
2. Migrate sessions from `localStorage` → **HttpOnly Secure SameSite cookies** + CSRF tokens.
3. Replace whole-document `PUT /api/state` with **scoped authenticated mutations** and server-side role checks per action.
4. Move commercially sensitive costing/AI prompt logic fully server-side (partially done for Recipe AI).
5. Firebase Security Rules audit + API key referrer restrictions for Vedanta.
6. Dependency scanning in CI (`npm audit`) and encrypted offsite backups of `DATA_DIR`.
7. Tighten CSP to nonce-based scripts (remove `unsafe-inline` / `unsafe-eval` over time).

---

## Deploy checklist (urgent)

```bash
# On Render (kiteline.uk)
DEMO_MODE=false
INGEST_KEY=<openssl rand -hex 32>
VEDANTA_API_KEY=<openssl rand -hex 32>
OWNER_PASSWORD=<new strong password>
# Rotate SMTP_PASS Google App Password
# Clear/rotate session tokens after deploy
```

Apply patch from Parslia PR, redeploy, hard-refresh, then re-run:

```bash
BASE_URL=https://kiteline.uk node scripts/security-smoke-test.js
# Expect: demo false, vedanta 401 without key, owner-login blocked
```

---

## Headers implemented (hardening build)

- `Content-Security-Policy` (with frame-ancestors 'none')
- `Strict-Transport-Security: max-age=31536000; includeSubDomains; preload`
- `X-Content-Type-Options: nosniff`
- `X-Frame-Options: DENY`
- `Referrer-Policy: strict-origin-when-cross-origin`
- `Permissions-Policy: camera=(self), microphone=(self), geolocation=(self)`
- `Cross-Origin-Opener-Policy: same-origin-allow-popups`
- `X-Robots-Tag: noindex, nofollow`
