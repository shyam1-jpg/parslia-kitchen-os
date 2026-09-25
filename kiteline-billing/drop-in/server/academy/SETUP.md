# Kitline Academy — production setup

Set these environment variables on **Render** (or in `server/.env` locally).

## Required for full production

| Variable | Purpose |
|----------|---------|
| `DATABASE_URL` | Neon Postgres connection string (encrypted cloud DB) |
| `STRIPE_SECRET_KEY` | Stripe payments for course enrolment |
| `STRIPE_WEBHOOK_SECRET` | Verify Stripe webhooks (same endpoint as Kiteline billing) |
| `TURNSTILE_SITE_KEY` | Cloudflare Turnstile CAPTCHA (public) |
| `TURNSTILE_SECRET_KEY` | Turnstile server verification |

Alternatives: use `RECAPTCHA_SITE_KEY` + `RECAPTCHA_SECRET_KEY` instead of Turnstile.

## Optional

| Variable | Default | Purpose |
|----------|---------|---------|
| `ACADEMY_FOUNDER_EMAILS` | `contact@kiteline.uk` | Comma-separated founder emails — full course preview when signed in |
| `OWNER_EMAIL` | (see Kiteline billing) | Also grants founder preview on Academy |
| `ACADEMY_STAFF_ID` | `KITELINE-STAFF-2026` | Staff login ID for `/academy/staff.html` — unlocks all courses in preview mode |
| `ACADEMY_ADMIN_KEY` | (owner only) | Staff admin panel — student list and CSV export |
| `ACADEMY_SESSION_DAYS` | `7` | HttpOnly cookie session length |
| `ACADEMY_REQUIRE_CAPTCHA` | `false` | Fail register/login if CAPTCHA not configured |
| `ACADEMY_REQUIRE_EMAIL_VERIFY` | auto when SMTP set | Require email verify before login |

## Neon Postgres

1. Create a project at [neon.tech](https://neon.tech)
2. Copy the connection string → `DATABASE_URL` on Render
3. Schema runs automatically on server start (`server/academy/schema.sql`)
4. Existing `db.json` academy users migrate on first boot

## Stripe Academy courses

- Individual courses use one-time **payment** mode (`metadata.type=academy_course`).
- Starter (£9.99/mo) and Pro Student (£19.99/mo) use **subscription** mode (`metadata.type=academy_plan`).
- Same webhook as Kiteline: `https://kiteline.uk/api/billing/webhook`
- Optional Price IDs: `STRIPE_PRICE_ACADEMY_STARTER`, `STRIPE_PRICE_ACADEMY_PRO`

## Security features enabled

- **2FA** — authenticator app (TOTP) in Student dashboard → Security
- **CAPTCHA** — register + login when Turnstile/reCAPTCHA keys set
- **HttpOnly cookies** — session token in `ka_session` cookie (not localStorage)
- **Admin** — `/academy/#admin` → Students tab with CSV export (admin key)

## GDPR

Privacy policy: https://kiteline.uk/academy/privacy.html
