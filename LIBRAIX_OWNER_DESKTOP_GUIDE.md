# Libraix — Owner Guide & Launch Checklist

**For:** shyam_1@hotmail.co.uk  
**Date:** July 2026  
**Website:** https://libraix.ai

---

## YOUR LOGIN & DASHBOARD

| What | URL |
|------|-----|
| **Owner admin login** | https://libraix.ai/admin/login |
| **Owner dashboard** | https://libraix.ai/admin |
| **Your email** | shyam_1@hotmail.co.uk |
| **Role** | Super Admin |

### Customer areas (NOT your admin)

| What | URL |
|------|-----|
| Customer login | https://libraix.ai/login |
| Customer signup | https://libraix.ai/signup |
| Customer workspace | https://libraix.ai/app |
| Customer settings | https://libraix.ai/app/settings |
| Customer billing | https://libraix.ai/app/billing |

---

## CREATE / RESET YOUR OWNER PASSWORD

On **Render → libraix-api → Shell**, run:

```bash
cd libraix/backend
OWNER_EMAIL=shyam_1@hotmail.co.uk OWNER_INITIAL_PASSWORD='YourStrongPassword123!' npm run seed:owner
```

- Replace the password with one you choose
- Save it in a password manager
- Log in at https://libraix.ai/admin/login
- Enable **2FA** in admin → Security tab

**If locked out:** run the same command again with a new password.

---

## RENDER ENVIRONMENT VARIABLES

Go to: https://dashboard.render.com → **libraix-api** → **Environment**

### Required (chat works)

| Variable | Value |
|----------|-------|
| `OPENAI_API_KEY` | From https://platform.openai.com/api-keys |
| `FRONTEND_URL` | `https://libraix.ai` |
| `NODE_ENV` | `production` |
| `SESSION_SECRET` | Long random string (Render may auto-generate) |

### Email (password reset)

| Variable | Value |
|----------|-------|
| `RESEND_API_KEY` | From https://resend.com |
| `EMAIL_FROM` | `Libraix <noreply@libraix.ai>` |

### Stripe (ONLY when ready for payments — skip for now)

| Variable | Value |
|----------|-------|
| `STRIPE_SECRET_KEY` | From Stripe dashboard |
| `STRIPE_PRO_PRICE_ID` | `price_...` |
| `STRIPE_WEBHOOK_SECRET` | `whsec_...` |

After saving → Render redeploys automatically.

---

## WHAT YOU CAN DO IN ADMIN DASHBOARD

After login at https://libraix.ai/admin:

| Tab | You can |
|-----|---------|
| **Overview** | See users, usage, tokens, AI cost, revenue estimates, errors |
| **Users** | Suspend users, set Free/Pro/Enterprise, delete accounts |
| **Config** | Change prices, message limits, models, feature flags, maintenance mode, announcements — **no code needed** |
| **Support** | View customer support requests |
| **Privacy** | View GDPR / data deletion requests |
| **Audit** | See all admin actions (Super Admin only) |
| **Security** | Set up 2FA, recovery instructions |

---

## ACCOUNTS YOU MUST OWN

Transfer or create under **your email** (not developer's):

- [ ] Domain: libraix.ai (registrar + DNS)
- [ ] Netlify (frontend hosting)
- [ ] Render (backend hosting)
- [ ] GitHub: shyam1-jpg/parslia-kitchen-os
- [ ] OpenAI API account + billing
- [ ] Stripe account (when payments go live)
- [ ] Resend or email provider

**An admin dashboard alone is NOT full ownership.**

---

## YOUR VERIFICATION CHECKLIST

Tick when done:

- [ ] Logged into https://libraix.ai/admin/login
- [ ] 2FA enabled on owner account
- [ ] Chat works at /app (real AI reply, not demo)
- [ ] Forgot password email works
- [ ] Changed a plan limit in admin Config and it saved
- [ ] I control Render account
- [ ] I control Netlify account
- [ ] I control GitHub repo
- [ ] I control domain libraix.ai
- [ ] I control OpenAI account

---

## DO NOT DO YET

- Do NOT run paid ads
- Do NOT enable Stripe live mode until legal pages complete
- Do NOT claim "12+ models" or "unlimited" unless provably true
- Do NOT launch until P0 checklist below has evidence

---

## DEVELOPER P0 — BLOCK LAUNCH UNTIL DONE

Send this list to your developer:

1. Merge PR #6 and deploy Netlify + Render
2. Complete Privacy Policy with company name, address, providers, retention, subprocessors
3. Complete Terms, Cookie Policy, Refund Policy, Acceptable Use
4. Cookie banner: Accept / Reject / Manage (not Accept only)
5. Add robots.txt and sitemap.xml
6. noindex on /app and /admin
7. Wire email verification on signup
8. Test password reset end-to-end
9. Mark non-working tools as Coming Soon (PDF, web search, voice, image gen)
10. Show which model was used on each chat response
11. Deliver test report with screenshots for every item

---

## LEGAL PAGES (PUBLIC)

| Page | URL | Status |
|------|-----|--------|
| Privacy | https://libraix.ai/privacy | Built — needs your company details |
| Terms | https://libraix.ai/terms | Built |
| Contact | https://libraix.ai/contact | Built (PR #6) |
| Refund | https://libraix.ai/refund-policy | Built (PR #6) |
| Cookies | https://libraix.ai/cookie-policy | Built (PR #6) |
| Support | https://libraix.ai/support | Built |
| About | https://libraix.ai/about | Built (PR #6) |
| Acceptable Use | — | NOT built |
| Subprocessors | — | NOT built |
| Security page | — | NOT built |
| Status page | — | NOT built |
| Help centre | — | NOT built |

---

## BUSINESS DETAILS TO GIVE DEVELOPER

Fill in and send to developer for legal pages:

```
Legal name: ___________________________
Trading as: Libraix
Company number: _______________________
Registered address: ____________________
Country: United Kingdom
Support email: hello@libraix.ai
Privacy email: privacy@libraix.ai
Billing email: billing@libraix.ai
```

---

## WHAT IS ALREADY FIXED

| Issue | Status |
|-------|--------|
| API key in browser | FIXED — server-side only |
| Landing + app in one HTML page | FIXED — separate routes |
| SOC 2 badge | REMOVED |
| Owner admin dashboard | BUILT at /admin |
| Forgot password route | BUILT |
| Account deletion | BUILT |
| Server-side usage limits | BUILT |
| SVG logo (not emoji) | BUILT |

---

## IF SOMETHING BREAKS

| Problem | Fix |
|---------|-----|
| Admin login fails | Re-run seed:owner on Render Shell |
| Chat shows demo text | Add OPENAI_API_KEY on Render |
| No password reset email | Add RESEND_API_KEY on Render |
| Legal pages 404 | Merge PR #6, redeploy Netlify |

---

## KEY LINKS

| Resource | URL |
|----------|-----|
| GitHub repo | https://github.com/shyam1-jpg/parslia-kitchen-os |
| PR to merge | https://github.com/shyam1-jpg/parslia-kitchen-os/pull/6 |
| Render dashboard | https://dashboard.render.com |
| Handover doc (in repo) | libraix/docs/HANDOVER.md |
| Admin guide (in repo) | libraix/docs/ADMIN_GUIDE.md |
| Deploy guide (in repo) | libraix/DEPLOY.md |

---

## FINAL ACCEPTANCE

Libraix is fully handed over when:

- [ ] I log into admin independently
- [ ] I control domain, hosting, database, GitHub, Stripe, OpenAI
- [ ] I manage users and subscriptions from admin
- [ ] I change limits/prices from admin without code
- [ ] Chat works for customers
- [ ] Legal pages are complete with my company details
- [ ] Developer delivered tested feature report with evidence

---

**Save this file to your Desktop and keep it as your Libraix owner reference.**
