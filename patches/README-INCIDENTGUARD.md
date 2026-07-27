# Kiteline IncidentGuard (full) — apply in `shyam1-jpg/kitline1`

## Apply

```bash
cd kitline1
git checkout -b cursor/kiteline-incidentguard-18ca
git apply /path/to/kitline1-incidentguard.patch
git add -A && git commit -m "Add full Kiteline IncidentGuard module"
git push -u origin cursor/kiteline-incidentguard-18ca
```

Hard refresh (**Ctrl+Shift+R**).

## Included

### Marketing
- `/incident-management.html` — product / pilot page
- `/incident-report.html` — **public report (no login)**

### App (`#incidents` → IncidentGuard)
- Kitchen categories + lifecycle statuses + CAPA
- Photos, GPS, speech-to-text, voice note capture
- Safety intelligence dashboard (open / critical / overdue / allergen / temp / avg close)
- AI drafts: summarise, root-cause, CAPA, toolbox talk, translate (uses Recipe AI access)
- Monthly AI allowance + Settings cap
- Feedback to reporter
- Link incidents to sensors / recipes / deliveries / batches / assets
- RIDDOR guidance (never auto-submits)
- QR posters: public + staff app URLs
- Severity escalation: Low dashboard · Medium email · High/Critical email+SMS

### APIs
- `POST /api/incidents/public-report`
- `POST /api/incident-ai/{summarise|root-cause|capa|toolbox|translate|structure-voice}`
- `POST /api/incidents/escalate`
- `GET /api/incidents/stats`
- `GET /api/incidents/bridge` (auth)
- `POST /api/incidents/bridge-pull` (API key → Parslia / external)

### Env (optional)
- `INCIDENT_REPORT_KEY` — lock public kiosk
- `PARSLIA_BRIDGE_KEY` or `INGEST_KEY` — bridge pull
- Recipe AI / `OPENAI_API_KEY` — AI drafts

## Still policy / ops (not magic)
- SMS needs Twilio + Team mobiles / `NOTIFY_PHONE`
- Email needs SMTP
- AI needs Recipe AI enabled or BYOK
- Browser must allow mic / camera / GPS
