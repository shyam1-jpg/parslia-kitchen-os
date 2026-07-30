# Kiteline security hardening — apply in `shyam1-jpg/kitline1`

**URGENT:** Production had open Vedanta staff PINs and DEMO owner login. Deploy ASAP.

## Apply

```bash
cd kitline1
git checkout -b cursor/kiteline-security-hardening-18ca
git apply /path/to/kitline1-security-hardening.patch
git add -A && git commit -m "Security hardening: lock Vedanta API, disable prod demo auth"
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

See `SECURITY-REPORT-KITELINE.md` for full findings and test evidence.
