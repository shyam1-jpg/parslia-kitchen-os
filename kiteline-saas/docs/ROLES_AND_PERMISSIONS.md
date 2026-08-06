# Kiteline — Roles & Permissions

Design style and sidebar stay as today. Access is enforced in API + Postgres RLS.

## Roles

| Role | Scope | Summary |
|------|--------|---------|
| `super_admin` | Platform | All companies (support / founder). Separate from kitchen UI. |
| `company_owner` | One company | Locations, billing, invites, all-location reports. |
| `kitchen_admin` | Company / selected locations | Team, PINs, compliance setup, recipes, suppliers, stock. |
| `location_manager` | Assigned location(s) | Day ops, clock override, logs, location reports. |
| `staff` | Assigned location(s) | Clock PIN, assigned tasks, permitted logging. |

Mapping from current Kiteline access labels:

| Current UI `access` | New role |
|---------------------|----------|
| Admin (account owner) | `company_owner` or `kitchen_admin` |
| Admin | `kitchen_admin` |
| Manager | `location_manager` |
| Staff | `staff` |

## Permission matrix

| Permission | Owner | Kitchen Admin | Location Manager | Staff |
|------------|:-----:|:-------------:|:----------------:|:-----:|
| `manage_billing` | ✓ | | | |
| `manage_locations` | ✓ | ✓ | | |
| `manage_team` | ✓ | ✓ | location only | |
| `manage_pins` | ✓ | ✓ | location only | |
| `clock_self` | ✓ | ✓ | ✓ | ✓ |
| `clock_others` | ✓ | ✓ | ✓ | |
| `log_temps` | ✓ | ✓ | ✓ | ✓ |
| `log_cleaning` | ✓ | ✓ | ✓ | ✓ |
| `manage_maintenance` | ✓ | ✓ | ✓ | |
| `manage_stock` | ✓ | ✓ | ✓ | |
| `manage_orders` | ✓ | ✓ | ✓ | |
| `manage_recipes` | ✓ | ✓ | read/edit local | read |
| `view_costing` | ✓ | ✓ | ✓ | |
| `view_reports_location` | ✓ | ✓ | ✓ | |
| `view_reports_company` | ✓ | ✓ | | |
| `manage_subscription` | ✓ | | | |

## Isolation rules

1. Session always carries `user_id`, `company_id`, optional `location_id`.
2. API never trusts client-supplied `company_id` / `location_id` for authorization.
3. Staff/manager queries filter to `location_memberships`.
4. Owner / kitchen_admin may use “All locations” for reports only.
5. Cross-company reads/writes must fail (RLS + API tests).
