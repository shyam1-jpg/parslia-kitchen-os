# Kiteline IncidentGuard (apply in `shyam1-jpg/kitline1`)

## Apply

```bash
cd kitline1
git checkout -b cursor/kiteline-incidentguard-18ca
git apply /path/to/kitline1-incidentguard.patch
git add -A && git commit -m "Add Kiteline IncidentGuard module and landing page"
git push -u origin cursor/kiteline-incidentguard-18ca
```

Hard refresh the app after deploy (**Ctrl+Shift+R**).

## What you get

- Marketing: `https://kiteline.uk/incident-management.html` (Pilot)
- App: **Kitchen Compliance → IncidentGuard** (`#incidents`)
- Report form with kitchen categories, severity, evidence notes
- Lifecycle: Reported → Manager Review → Investigation → Action Required → Awaiting Verification → Closed
- CAPA actions with owner / due / verify
- RIDDOR guidance banner (never auto-submits)
- QR poster links that open a pre-filled report

## Not in this slice (later)

Offline anonymous kiosk, photo upload storage, SMS escalation, AI drafts,
deep links into temps/recipes/batches, Parslia API bridge.
