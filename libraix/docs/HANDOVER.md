# Libraix Owner Handover Report

**Date:** 12 July 2026  
**Status:** Admin portal live in code — **handover incomplete until you control all external accounts and log in independently**

---

## Critical answer: where is your owner login?

The customer workspace at `/app` is **not** the owner dashboard. Your private owner portal is separate:

| URL | Purpose |
|-----|---------|
| **https://libraix.ai/admin/login** | Owner login (Super Admin only) |
| **https://libraix.ai/admin** | Owner management dashboard |

Customer routes remain:

| URL | Purpose |
|-----|---------|
| https://libraix.ai/login | Customer login |
| https://libraix.ai/signup | Customer registration |
| https://libraix.ai/app | Customer AI workspace |
| https://libraix.ai/app/settings | Profile, privacy, account deletion |
| https://libraix.ai/app/billing | Subscriptions and invoices |
| https://libraix.ai/support | Support and privacy requests |

---

## Your Super Admin account

| Item | Value |
|------|--------|
| Email | **shyam_1@hotmail.co.uk** |
| Role | **Super Admin** |
| Created via | Manual seed script only — **not** public signup |

### Step 1 — Create your account on production (Render Shell)

After the latest deploy, open **Render → libraix-api → Shell** and run:

```bash
cd libraix/backend
OWNER_EMAIL=shyam_1@hotmail.co.uk OWNER_INITIAL_PASSWORD='ChooseAStrongPassword123!' npm run seed:owner
```

The script prints a **one-time temporary password**. Store it in a password manager.

### Step 2 — Log in

1. Go to **https://libraix.ai/admin/login**
2. Enter `shyam_1@hotmail.co.uk` and your temporary password
3. Change the password after first login (re-run seed with a new password, or use forgot-password once email is configured)

### Password reset

- **With email configured:** https://libraix.ai/forgot-password
- **If locked out:** re-run `npm run seed:owner` on Render (resets Super Admin password)

### Enable two-factor authentication

1. Log in at `/admin/login`
2. Open **Security** tab → **Set up 2FA**
3. Scan QR code with Google Authenticator or Authy
4. Enter the 6-digit code → **Enable 2FA**

### Backup recovery

If you lose your authenticator device, run `npm run seed:owner` on the server to reset password and disable 2FA, then set up 2FA again.

---

## What the admin dashboard contains (today)

### Overview
- Total users, active today/week, new registrations, suspended count
- Free / Pro / Enterprise breakdown
- Messages, tokens, AI cost (today)
- Estimated monthly revenue, AI cost, profit
- Provider health status
- Recent system errors

### Users
- Suspend / unsuspend accounts
- Set plan (Free, Pro, Enterprise)
- Delete users (Super Admin only; cannot delete Super Admin)

### Config (no code deploy required)
- **Display pricing** (Pro / Enterprise GBP)
- **Plan limits** — daily messages, premium messages, image limits per plan
- **Model availability** — enable/disable models, change tier
- **Feature flags** — disabled / internal / beta / enabled
- **Maintenance mode** and **site announcement banner**

### Support & Privacy
- Inbox for customer support requests (`/support`)
- Privacy / GDPR request queue (export, deletion, correction)

### Audit (Super Admin)
- Full log of admin logins, config changes, user actions

### Security
- TOTP 2FA setup
- Recovery instructions

---

## Today's status report

### Completed today (built and deployed to `main`)

| Item | Status |
|------|--------|
| Private `/admin/login` and `/admin` dashboard | **Done** |
| Super Admin seed script (`npm run seed:owner`) | **Done** |
| Separate admin session from customer session | **Done** |
| User suspend / delete / plan override | **Done** |
| Plan limits editable from dashboard | **Done** |
| Model toggles and feature flags from dashboard | **Done** |
| Display pricing editable from dashboard | **Done** |
| Maintenance mode + announcement banner | **Done** |
| Admin audit logs | **Done** |
| Owner 2FA (TOTP) | **Done** |
| Support form + admin inbox | **Done** |
| Privacy request form + admin inbox | **Done** |
| Customer routes `/app/settings`, `/app/billing` | **Done** |
| API keys server-side only | **Done** |
| Real OpenAI model IDs (not fake GPT-5.6) | **Done** |
| Email password reset (Resend/SMTP) | **Done** (needs env vars) |
| Stripe checkout + billing portal | **Done** (needs env vars) |
| HANDOVER + ADMIN_GUIDE documentation | **Done** |

### Working and tested (requires your env vars on Render)

| Item | Notes |
|------|-------|
| Customer signup / login | Tested locally and on production |
| Chat (Libraix Fast) | Needs `OPENAI_API_KEY` on Render |
| Password reset email | Needs `RESEND_API_KEY` or SMTP |
| Stripe Pro checkout | Needs Stripe keys + webhook |
| Admin dashboard API | Builds pass; login requires seed on production |

### Partially working

| Item | Notes |
|------|-------|
| Revenue / profit figures | Estimates from plan counts — live Stripe MRR when Stripe connected |
| Refunds in admin UI | Use Stripe Dashboard until built |
| Discount codes / promotions | Not built |
| Device / session management | Not built |
| OAuth (Google / Apple / Microsoft) | Stubs only; buttons hidden until configured |
| Email verification | Flag on user; send not wired |
| Annual billing / VAT / trials | Not built |

### Not working / Coming Soon

| Item | Notes |
|------|-------|
| PDF chat, web search, voice, image gen tools | Marked Coming Soon on landing page |
| Automated daily backups to S3 | Document procedure; not automated |
| Email alert monitoring | Not built |
| Light mode | Dark theme only |
| Full brand system | SVG logo done; full design system incomplete |

### Security issues to address

| Item | Action |
|------|--------|
| Owner account not yet on production | Run `seed:owner` on Render |
| Service accounts under developer email | Transfer to your ownership |
| Rotate secrets if old site exposed keys | Set new `SESSION_SECRET`, API keys |

---

## Services you must own (transfer checklist)

An admin dashboard alone is **not** full ownership. Transfer or create under **your** email:

- [ ] Domain: libraix.ai (registrar + DNS)
- [ ] Netlify (frontend)
- [ ] Render (backend)
- [ ] GitHub: shyam1-jpg/parslia-kitchen-os
- [ ] OpenAI API account
- [ ] Stripe account
- [ ] Resend or SMTP (email)
- [ ] Google Cloud (OAuth) — when needed
- [ ] Apple Developer (OAuth) — when needed
- [ ] Microsoft Azure (OAuth) — when needed

---

## Environment variables (Render)

See `libraix/backend/.env.example` and `libraix/DEPLOY.md`.

**Minimum for launch:**
- `OPENAI_API_KEY`
- `SESSION_SECRET`
- `FRONTEND_URL=https://libraix.ai`

**Email:**
- `RESEND_API_KEY` or `SMTP_*`

**Payments:**
- `STRIPE_SECRET_KEY`, `STRIPE_PRO_PRICE_ID`, `STRIPE_WEBHOOK_SECRET`

**Owner seed (one-time on Render Shell):**
- `OWNER_EMAIL=shyam_1@hotmail.co.uk`
- `OWNER_INITIAL_PASSWORD=...`

---

## Model routing reference

| Libraix name | Provider | API model | Tier | Status |
|--------------|----------|-----------|------|--------|
| Libraix Fast | OpenAI | gpt-4o | Free | Live |
| Libraix Smart | OpenAI | gpt-4o | Pro | Beta |
| Libraix Advanced | OpenAI | o3-mini | Pro | Beta |
| Libraix Image | OpenAI | dall-e-3 | Pro | Coming Soon |

Override via env: `OPENAI_MODEL_FAST`, `OPENAI_MODEL_SMART`, `OPENAI_MODEL_ADVANCED`  
Override via admin dashboard: Config → Model availability

---

## Security confirmation

- Passwords: bcrypt hashed
- Sessions: httpOnly cookies; separate customer vs admin
- API keys: server environment only — **never in browser**
- Super Admin: **cannot** be created via public `/signup`
- Admin actions: audit logged
- Rate limiting: auth, admin, and AI endpoints
- 2FA: TOTP for owner accounts

---

## Monthly running costs (estimate)

| Scale | Hosting | OpenAI | Total (approx) |
|-------|---------|--------|----------------|
| Starting | $0–25 | $20–100 | **$20–125/mo** |
| 1k daily users | $25–50 | $150–500 | **$175–550/mo** |

---

## Final acceptance criteria

Libraix is **not fully handed over** until you confirm:

1. You logged into https://libraix.ai/admin/login as Super Admin
2. You control domain, Netlify, Render, GitHub, Stripe, OpenAI
3. You ran `seed:owner` and secured your password + 2FA
4. Chat works with your OpenAI key
5. Stripe checkout completes (if taking payments)
6. You can change plan limits and feature flags without editing code
7. Backups and monitoring are operational (or documented with owner action)

---

## Documentation index

| Document | Purpose |
|----------|---------|
| `libraix/docs/ADMIN_GUIDE.md` | Day-to-day owner operations |
| `libraix/docs/LAUNCH_READINESS.md` | Feature matrix and test commands |
| `libraix/DEPLOY.md` | Deployment and env vars |

---

**Do not consider Libraix handed over until you can independently log in, manage users, manage subscriptions, change limits, review costs, and control all major external service accounts.**
