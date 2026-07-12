# Deploy Libraix — one-click links

## Claimed Netlify site (you did this)

| | |
|---|---|
| **Site ID** | `551984bf-05ea-447b-a82b-86ad4374e6e3` |
| **Preview** | https://rainbow-rolypoly-51c433.netlify.app |
| **Still needed** | Point `libraix.ai` domain to this site + link GitHub repo |

When you're back (3 min in Netlify):
1. Open claimed site → **Domain management** → add `libraix.ai` (remove from old site if conflict)
2. **Link repository** → `shyam1-jpg/parslia-kitchen-os` → branch `main`
3. **Trigger deploy**

## Backend (Render) — click once

[![Deploy to Render](https://render.com/images/deploy-to-render-button.svg)](https://render.com/deploy?repo=https://github.com/shyam1-jpg/parslia-kitchen-os)

After deploy, add **`OPENAI_API_KEY`** in the Render dashboard (Environment → libraix-api → Add variable). Without it, chat works in **dev placeholder mode** only (echoes your message). With a valid key, chat uses real OpenAI models:

| Libraix model | Default OpenAI model | Override env var |
|---|---|---|
| Libraix Fast | `gpt-4o` | `OPENAI_MODEL_FAST` |
| Libraix Smart | `gpt-4o` | `OPENAI_MODEL_SMART` |
| Libraix Advanced | `o3-mini` | `OPENAI_MODEL_ADVANCED` |

Optional tuning on Render:

| Variable | Default | Purpose |
|---|---|---|
| `OPENAI_TEMPERATURE` | `0.7` | Response creativity |
| `OPENAI_MAX_TOKENS` | `4096` | Max reply length |

Service URL: `https://libraix-api.onrender.com`

## Email (password reset)

Choose **one** provider on Render:

### Option A — Resend (recommended)

1. Sign up at [resend.com](https://resend.com)
2. Verify domain `libraix.ai` (DNS records)
3. Create API key
4. On Render, set:

| Variable | Example |
|---|---|
| `RESEND_API_KEY` | `re_...` |
| `EMAIL_FROM` | `Libraix <noreply@libraix.ai>` |

### Option B — SMTP (SendGrid, Gmail, etc.)

| Variable | Example |
|---|---|
| `SMTP_HOST` | `smtp.sendgrid.net` |
| `SMTP_PORT` | `587` |
| `SMTP_USER` | `apikey` |
| `SMTP_PASS` | your SMTP password |
| `EMAIL_FROM` | `Libraix <noreply@libraix.ai>` |

Test: `/forgot-password` → check inbox for reset link.

## Stripe (Pro subscriptions)

1. Create account at [stripe.com](https://stripe.com)
2. **Products** → create **Pro** subscription → £9/month → copy **Price ID** (`price_...`)
3. **Developers → Webhooks** → add endpoint:
   - URL: `https://libraix-api.onrender.com/api/billing/stripe/webhook`
   - Events: `checkout.session.completed`, `customer.subscription.updated`, `customer.subscription.deleted`
   - Copy **Signing secret** (`whsec_...`)
4. On Render, set:

| Variable | Value |
|---|---|
| `STRIPE_SECRET_KEY` | `sk_live_...` or `sk_test_...` |
| `STRIPE_PRO_PRICE_ID` | `price_...` |
| `STRIPE_WEBHOOK_SECRET` | `whsec_...` |

5. **Customer portal** (for Manage subscription): Stripe Dashboard → Settings → Billing → Customer portal → Enable

Test: Log in → Pricing → **Start Pro** → complete test checkout → Account shows Pro plan.

## Super Admin (owner) account

**Not created via public signup.** After first deploy, open Render Shell:

```bash
cd libraix/backend
OWNER_EMAIL=shyam_1@hotmail.co.uk OWNER_INITIAL_PASSWORD='YourSecurePassword123!' npm run seed:owner
```

Then log in at **https://libraix.ai/admin/login**

Full handover checklist: `libraix/docs/HANDOVER.md`

## Frontend (Netlify) — connect repo once

1. [Netlify](https://app.netlify.com) → Add new site → Import from Git
2. Repo: `shyam1-jpg/parslia-kitchen-os`, branch `main`
3. Build settings (auto from `netlify.toml`):
   - Base: `libraix/frontend`
   - Publish: `libraix/frontend/dist`
4. Domain: `libraix.ai`

## GitHub Pages (preview — live automatically)

https://shyam1-jpg.github.io/parslia-kitchen-os/

(API requires Render backend; set `netlify.toml` proxy or use Render URL in frontend)

## Verify live

- `/` — public landing only
- `/login` — auth
- `/app` — workspace
- `/api/health` — `{"ok":true}` (Netlify proxy → Render)
