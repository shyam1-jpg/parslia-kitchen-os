# Kiteline — Screen / dashboard changes (same design)

No theme or layout replacement. Teal/ink sidebar and cards stay.

| Area | Change in later build phases |
|------|------------------------------|
| Top bar | Clear **Company · Location** label using existing site switcher styling |
| Home / Dashboard | Location KPIs; Owner “All locations” toggle |
| Team | Explicit role enum + multi-location assignment + PIN status |
| Clock | Location-bound PIN; manager override |
| Sites | Keep route; label as Locations in copy only |
| Reports | This location / All locations |
| Settings | Billing / plan for `company_owner` |
| Stock / Orders | New modules in existing card style (Phase D — not in A/E) |
| Super Admin | Separate platform page — not mixed into kitchen nav |

Phase A/E delivers schema, roles, migration, isolation tests, and deploy hardening — not the full UI rebuild.
