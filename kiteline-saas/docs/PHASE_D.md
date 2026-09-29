# Kiteline Phase D — Stock & Orders

Same teal/ink UI. Location-scoped inventory and purchase orders.

## Screens

| Route | Access | Features |
|-------|--------|----------|
| `#stock` | Manager+ | SKUs, on-hand, reorder, adjustments, movements |
| `#orders` | Manager+ | Draft / sent / receive POs; “From low stock” |

## API

| Method | Path | Permission |
|--------|------|------------|
| GET | `/api/saas/stock` | location access |
| POST | `/api/saas/stock/item` | `manage_stock` |
| POST | `/api/saas/stock/move` | `manage_stock` |
| GET | `/api/saas/orders` | location access |
| POST | `/api/saas/orders` | `manage_orders` |
| PATCH | `/api/saas/orders` | `manage_orders` |

Data stored on the company workspace as `stockItems`, `stockMovements`, `purchaseOrders` (JSON mode), filtered by `siteId`. Receiving a PO applies stock-in movements.

## Apply

Included in `scripts/apply-bc-to-kitline1.js` and `deploy/kitline1-saas-bc.patch` (Phases B–D).
