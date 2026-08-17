# Kiteline security hardening — apply in `shyam1-jpg/kitline1`

**URGENT:** Production had open Vedanta staff PINs and DEMO owner login. Deploy ASAP.

## Apply

```bash
cd kitline1
git checkout -b cursor/kiteline-security-hardening-18ca
git apply /path/to/kitline1-security-hardening.patch
git add -A && git commit -m "Security hardening: cookies, CSRF, Vedanta lock, scoped mutate"
git push -u origin cursor/kiteline-security-hardening-18ca
```

## Render env (required)

```
DEMO_MODE=false
INGEST_KEY=<openssl rand -hex 32>
VEDANTA_API_KEY=<openssl rand -hex 32>
OWNER_PASSWORD=<new strong password>
```

Rotate SMTP App Password and all Vedanta staff PINs. Clear session tokens after deploy.

## What this patch includes

1. Vedanta API auth + DEMO/owner-login lockdown  
2. CSP + HSTS  
3. **HttpOnly session cookies + CSRF**  
4. Restricted `PUT /api/state` merge + `POST /api/workspace/mutate`  
5. Tenant ID always from server session  

See `SECURITY-REPORT-KITELINE.md` for findings, tests (22/22), and completion evidence checklist.

```bash
BASE_URL=https://kiteline.uk VEDANTA_API_KEY=*** node scripts/security-smoke-test.js
```
