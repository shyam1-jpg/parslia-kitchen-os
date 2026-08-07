# Kiteline Compliance Phase 1 — Implementation

**Status:** Implemented in `kiteline-saas` (apply to kitline1 to go live on kiteline.uk).  
**Brand:** Original Kiteline system — not a competitor clone.

## Workflow

```text
Schedule → Complete → Validate → Detect failure → Raise corrective action
→ Resolve → Manager verification → Report
```

## Included

| Feature | Delivery |
|---------|----------|
| Checklist template builder | Sections/questions, reorder (drag), draft/publish, version on edit of published |
| Scheduling | Frequency + window + grace; auto-miss; per-location schedules |
| Staff completion | Kitchen-friendly controls, pause/resume, autosave drafts |
| Validation | Mandatory, N/A, min/max, pass/fail, yes/no expected |
| Defects + CAPA | Auto-raise on fail/out-of-range; separate permanent CA records |
| Independent verification | Critical/high: completer ≠ verifier |
| Temperature packs | Seed fridge/freezer/delivery/cook/hot-hold/calibration templates |
| Dashboard | Due / missed / defects / overdue / awaiting verification |
| Notifications | In-app (+ legacy alerts list). Email/SMS not claimed live |
| Exports | CSV + print/PDF summary |
| Permissions | Mapped to Admin / Manager / Staff ranks |
| Audit trail | Append-only event log for key actions |
| Postgres schema | `005_compliance_phase1.sql` (RLS-ready) |

## Apply to kitline1

```bash
node kiteline-saas/scripts/apply-compliance-phase1.js /path/to/kitline1
```

Then open **Compliance checks** in the app sidebar, or `#compliance-p1-dashboard`.

Optional Postgres:

```bash
psql "$DATABASE_URL" -f kitline1/saas/schema/005_compliance_phase1.sql
```

JSON mode stores data under `db.complianceV1` and works without Postgres.

## Seed templates (original Kiteline wording)

- Kitchen opening checks  
- Kitchen closing checks  
- Fridge temperature record (with fail follow-ups)  
- Freezer temperature record  
- Delivery acceptance  
- Hot holding record  
- Cooking temperature record  
- Probe calibration  

## Not in Phase 1 (later)

Risk assessment builder, document file registry, training LMS, full incident cases, equipment QR ops, offline sync queue, AI assist, SMS, inspector ZIP evidence pack.

## Legal note

Kiteline helps organise records for inspections. It does **not** guarantee legal compliance.
