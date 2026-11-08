# Kiteline payment system

Complete Stripe + invoice billing for **kiteline.uk** (`shyam1-jpg/kitline1`).

This package lives in `parslia-kitchen-os` because cloud agents cannot push to `kitline1`. Apply the drop-in files on that repo, then set Stripe keys on Render.

## What you get

- Team plans: Starter £19 / Team 5 £40 / Team 10 £72 / Team 20 £130 / Team 50 £275
- Site allowances: 1 / 1 / 2 / 5 / 10
- Annual checkout (10× monthly = 2 months free)
- 14-day trial (no card) then Stripe Checkout, remaining trial days carried into Stripe
- Webhooks: `checkout.session.completed`, `customer.subscription.updated|deleted`, `invoice.paid|payment_failed|payment_action_required`
- Signed, idempotent webhooks
- Organisation-wide access (teammates inherit the payer plan)
- Owner invoice grant / revoke (Settings → Owner billing)
- Recipe AI add-on checkout
- Academy one-time courses **and** Starter/Pro monthly subscriptions
- Local mock (`BILLING_DEV_MODE=true` or `STRIPE_SECRET_KEY=sk_test_kiteline_dev`) so checkout works without a Stripe account

## Apply to kitline1

```bash
git clone https://github.com/shyam1-jpg/kitline1.git
node kiteline-billing/scripts/apply-to-kitline1.js ./kitline1
# or
git apply kiteline-billing/deploy/kitline1-payment.patch
```

Then commit and push **from the kitline1 repo**, and deploy on Render.

## Stripe Dashboard (live or test)

1. Create products matching the five team plans (and optional Recipe AI + Academy Starter/Pro).
2. Copy Price IDs into Render if you want Dashboard-managed prices:
   `STRIPE_PRICE_USERS_1` … `STRIPE_PRICE_USERS_50`, `STRIPE_PRICE_RECIPE_AI`, `STRIPE_PRICE_ACADEMY_STARTER`, `STRIPE_PRICE_ACADEMY_PRO`.
   If those are empty, Checkout still works with inline `price_data`.
3. Developers → Webhooks → Add endpoint:
   `https://kiteline.uk/api/billing/webhook`
   Events: `checkout.session.completed`, `customer.subscription.updated`, `customer.subscription.deleted`, `invoice.paid`, `invoice.payment_failed`, `invoice.payment_action_required`
4. Settings → Billing → Customer portal → Enable (needed for Manage subscription).
5. On Render set:

```
APP_URL=https://kiteline.uk
STRIPE_SECRET_KEY=sk_live_...   # or sk_test_...
STRIPE_WEBHOOK_SECRET=whsec_...
DEMO_MODE=false
```

No VAT is charged (Kiteline is not VAT-registered).

## Local demo (this repo)

```bash
cd kiteline-billing
npm test
BILLING_DEV_MODE=true node demo/server.js
# open http://127.0.0.1:4011  — Subscribe monthly completes without Stripe
```

## Owner invoice path

Until live keys are on Render, use Settings → Owner billing (signed in as `OWNER_EMAIL`) or:

```
POST /api/billing/admin/grant
{ "email": "chef@kitchen.uk", "plan": "users_5", "months": 3, "note": "PO-12" }
```
