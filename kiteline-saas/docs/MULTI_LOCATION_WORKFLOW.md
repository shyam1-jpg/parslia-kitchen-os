# Kiteline — Multi-location workflow

Keeps the existing Sites switcher pattern; clarifies company vs location.

```text
1. Company Owner registers
2. Company + first Location created
3. Owner invites Kitchen Admins / Location Managers
4. Managers add Staff + PINs per location
5. User signs in → membership resolved
6. If >1 allowed location → switcher (current UI style)
7. All writes use current location_id
8. Owner/Admin reports can aggregate allowed locations
```

## Day-to-day

- **Clock in/out** — PIN validates against `staff_pins` for the active location.
- **Temps / cleaning / HACCP** — stored with `company_id` + `location_id`.
- **Stock / waste / orders** — location inventory; suppliers may be company-wide.
- **Recipes** — company-shared (`location_id` null) or location-specific.
- **Billing** — company-level Stripe subscription; location limits on plan.

## Screen behaviour (no redesign)

| Screen | Behaviour |
|--------|-----------|
| Top bar / Sites | Show `Company · Location`; switch location only among allowed |
| Home / Dashboard | KPIs for current location; Owner toggle All locations |
| Team | Assign role + locations; PIN status |
| Clock | Location-scoped terminal |
| Reports | Tabs: This location / All my locations |
| Settings / Billing | Owner only |
