# Libraix Admin Guide

## Login

- URL: https://libraix.ai/admin/login
- Use your Super Admin email only (created via `npm run seed:owner`)
- Public customer signup **cannot** create admin accounts

## Dashboard tabs

### Overview
- Total users, active today/week, suspended count
- Plan breakdown (free/pro/enterprise)
- Messages, tokens, AI cost (today)
- Estimated monthly revenue, AI cost, profit (approximate until Stripe fully connected)

### Users
- **Toggle suspend** — blocks customer login
- **Set Pro / Set Free** — manual plan override (also used if Stripe webhook delayed)
- **Delete** — permanent (Super Admin only; cannot delete Super Admin)

### Config
- **Plan limits** — change daily messages, premium messages, image limits per plan without redeploying code
- **Maintenance mode** — returns 503 to customers; admin routes still work
- **Announcement** — banner text (wire to frontend in next iteration)

### Audit
- Super Admin only
- All admin login, config changes, user actions

### Security
- Set up TOTP 2FA with authenticator app
- Recovery: re-run `npm run seed:owner` on server

## Changing prices

1. Update display price in admin `Config` → `pricing` (API) or Stripe Dashboard for actual charges
2. Update `STRIPE_PRO_PRICE_ID` if you create a new Stripe price
3. Pro monthly display default: £9 (configurable in site_config)

## Emergency: disable all customer AI

1. Admin → Config → enable **Maintenance mode**
2. Or remove `OPENAI_API_KEY` on Render (chat stops; site stays up)

## Seed owner account

```bash
cd libraix/backend
OWNER_EMAIL=shyam_1@hotmail.co.uk OWNER_INITIAL_PASSWORD='ChangeMeNow123!' npm run seed:owner
```

Run on Render via Shell after deploy.
