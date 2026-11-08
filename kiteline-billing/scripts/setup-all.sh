#!/bin/bash
# Apply Kiteline payments to a local kitline1 checkout, then print live-cutover steps.
set -euo pipefail
ROOT="$(cd "$(dirname "$0")/.." && pwd)"
DEST="${1:-${KITLINE1_DIR:-}}"
if [ -z "$DEST" ]; then
  echo "Usage: $0 /path/to/kitline1"
  echo "Or:    KITLINE1_DIR=/path/to/kitline1 $0"
  exit 1
fi
node "$ROOT/scripts/apply-to-kitline1.js" "$DEST"
echo
echo "Code is applied. kiteline.uk is NOT live until you:"
echo "  1. In kitline1: git add -A && git commit && git push"
echo "  2. Stripe Dashboard → Developers → Webhooks →"
echo "       https://kiteline.uk/api/billing/webhook"
echo "     Events: checkout.session.completed,"
echo "             customer.subscription.updated,"
echo "             customer.subscription.deleted,"
echo "             invoice.paid, invoice.payment_failed,"
echo "             invoice.payment_action_required"
echo "  3. Stripe → Settings → Billing → Customer portal → Enable"
echo "  4. Render (kiteline service) env:"
echo "       APP_URL=https://kiteline.uk"
echo "       STRIPE_SECRET_KEY=sk_live_...   (or sk_test_...)"
echo "       STRIPE_WEBHOOK_SECRET=whsec_..."
echo "       DEMO_MODE=false"
echo "  5. Redeploy Render, then check:"
echo "       curl -sS https://kiteline.uk/api/billing/config"
echo "     enabled should be true"
