# Libraix Owner Handover Report

**Date:** July 2026  
**Status:** Partial handover — admin system built; external account transfers require owner action

---

## Your owner access (created today)

| Item | Value |
|------|--------|
| **Admin login URL** | https://libraix.ai/admin/login |
| **Admin dashboard** | https://libraix.ai/admin |
| **Owner email** | shyam_1@hotmail.co.uk |
| **Role** | Super Admin (manual seed only — not via public signup) |

### Create / reset your owner password (on Render shell or locally)

```bash
cd libraix/backend
OWNER_EMAIL=shyam_1@hotmail.co.uk OWNER_INITIAL_PASSWORD='YourSecurePassword123!' npm run seed:owner
```

The script prints a **temporary password once**. Store it in a password manager and change it after first login.

### Password reset (owner)

1. Go to https://libraix.ai/forgot-password (works if email delivery is configured)
2. **Recovery if locked out:** run `npm run seed:owner` again on the server (resets Super Admin password)

### Enable two-factor authentication

1. Log in at https://libraix.ai/admin/login  
2. Open **Security** tab → **Set up 2FA**  
3. Scan QR code with Google Authenticator / Authy  
4. Enter 6-digit code to enable  

---

## Customer vs owner routes

| Route | Purpose |
|-------|---------|
| `/login` | Customer login |
| `/signup` | Customer registration |
| `/app` | Customer AI workspace |
| `/app/settings` | Profile, memory, privacy, account deletion |
| `/app/billing` | Subscription, Stripe portal |
| `/admin/login` | **Owner only** — private login |
| `/admin` | **Owner dashboard** |

---

## What the admin dashboard does today

### Working now
- Overview: users, active users, plan breakdown, messages/tokens/cost, revenue estimates
- User management: suspend, change plan, delete (Super Admin)
- **Edit plan limits without code** (free/pro/enterprise daily messages, premium, images)
- Maintenance mode + site announcement banner
- Admin audit log (Super Admin)
- Owner 2FA setup (TOTP)
- Separate admin session (not mixed with customer session)

### Partially working
- Revenue/profit figures are **estimates** from plan counts + token costs (not live Stripe MRR until Stripe connected)
- Model/tool toggles in DB scaffold — plan limits fully editable; per-model overrides API exists, UI basic
- Support/privacy request tables — backend ready, customer submit forms coming soon

### Not yet built (roadmap)
- Discount codes, promotions UI
- Refund processing in dashboard (use Stripe Dashboard until built)
- Device management / revoke other sessions
- Full email template suite
- Automated daily backups to S3
- PagerDuty-style alerting

---

## Feature status matrix

| Area | Status | Notes |
|------|--------|-------|
| Customer email auth | **Working** | Signup, login, logout |
| Password reset email | **Ready** | Needs Resend/SMTP on Render |
| Google/Apple/Microsoft OAuth | **Not configured** | Buttons hidden until env vars set |
| Chat (Libraix Fast) | **Ready** | Needs `OPENAI_API_KEY` |
| Stripe Pro checkout | **Ready** | Needs Stripe keys + price ID |
| Stripe billing portal | **Ready** | Manage subscription on Account/Billing |
| Admin dashboard | **Working** | Deploy + run seed:owner |
| PDF/web/voice/image tools | **Coming Soon** | Marked on landing page |
| SOC 2 badge | **Removed** | Never shown without audit |
| Browser API keys | **Removed** | Server-side only |

Full technical matrix: `libraix/docs/LAUNCH_READINESS.md`

---

## Services you must own (transfer checklist)

Transfer or create under **your** email — not the developer’s:

- [ ] Domain: libraix.ai (registrar + DNS)
- [ ] Netlify (frontend hosting)
- [ ] Render (backend hosting)
- [ ] GitHub repo: shyam1-jpg/parslia-kitchen-os
- [ ] OpenAI API account + billing
- [ ] Stripe account
- [ ] Resend or SMTP (email)
- [ ] Google Cloud (OAuth) — when needed
- [ ] Apple Developer (OAuth) — when needed
- [ ] Microsoft Azure (OAuth) — when needed

**An admin dashboard alone is not full ownership.** You need the accounts above.

---

## Environment variables (Render)

See `libraix/backend/.env.example` and `libraix/DEPLOY.md`.

**Minimum for launch:**
- `OPENAI_API_KEY`
- `SESSION_SECRET` (auto)
- `FRONTEND_URL=https://libraix.ai`

**For email reset:**
- `RESEND_API_KEY` or `SMTP_*`

**For payments:**
- `STRIPE_SECRET_KEY`, `STRIPE_PRO_PRICE_ID`, `STRIPE_WEBHOOK_SECRET`

**For owner seed (one-time on server):**
- `OWNER_EMAIL=shyam_1@hotmail.co.uk`
- `OWNER_INITIAL_PASSWORD=...`

---

## Model routing reference

| Libraix name | Provider | API model | Tier | Status |
|--------------|----------|-----------|------|--------|
| Libraix Fast | OpenAI | gpt-4o-mini | Free | Live |
| Libraix Smart | OpenAI | gpt-4o | Pro | Beta |
| Libraix Advanced | OpenAI | o3-mini | Pro | Beta |
| Libraix Image | OpenAI | dall-e-3 | Pro | Coming Soon |

Override via env: `OPENAI_MODEL_FAST`, `OPENAI_MODEL_SMART`, `OPENAI_MODEL_ADVANCED`

---

## Security confirmation

- Passwords: bcrypt hashed
- Sessions: httpOnly cookies, separate customer vs admin
- API keys: server environment only — **never in browser**
- Super Admin: **cannot** be created via public `/signup`
- Admin actions: audit logged
- Rate limiting: auth + admin + AI endpoints

**You should:** rotate `SESSION_SECRET` and all API keys if old site exposed keys in browser.

---

## Monthly running costs (estimate)

| Scale | Hosting | OpenAI | Total (approx) |
|-------|---------|--------|----------------|
| Starting | $0–25 | $20–100 | **$20–125/mo** |
| 1k daily users | $25–50 | $150–500 | **$175–550/mo** |
| 100k daily users | $200–1000+ | $15k–50k | **$15k+/mo** |

---

## Final acceptance criteria

Libraix is **not fully handed over** until you confirm:

1. You logged into https://libraix.ai/admin/login as Super Admin  
2. You control domain, Netlify, Render, GitHub, Stripe, OpenAI  
3. You ran seed:owner and changed the temporary password  
4. Chat works with your OpenAI key  
5. Stripe test checkout completes (if taking payments)  
6. You received repo admin access  

---

## Admin guide (quick)

1. **Dashboard → Overview** — daily metrics  
2. **Users** — suspend abusers, upgrade/downgrade plans  
3. **Config** — change message limits, turn on maintenance mode  
4. **Audit** — see who changed what (Super Admin)  
5. **Security** — enable 2FA  

Detailed ops: `libraix/docs/ADMIN_GUIDE.md`

---

## Contact

Technical issues during handover: document in GitHub Issues on `shyam1-jpg/parslia-kitchen-os`.

**Developer note:** Do not mark Libraix complete until owner confirms independent admin login and service account control.
