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
   - Events: `checkout.session.completed`, `customer.subscription.updated`, `customer.subscription.deleted`, `invoice.payment_failed`, `invoice.paid`
   - Copy **Signing secret** (`whsec_...`)
4. On Render, set:

| Variable | Value |
|---|---|
| `STRIPE_SECRET_KEY` | `sk_live_...` or `sk_test_...` |
| `STRIPE_PRO_PRICE_ID` | `price_...` |
| `STRIPE_WEBHOOK_SECRET` | `whsec_...` |

5. **Customer portal** (for Manage subscription): Stripe Dashboard → Settings → Billing → Customer portal → Enable

Test: Log in → Pricing → **Start Pro** → complete test checkout → Account shows Pro plan.

## OAuth (Google, Microsoft, Apple)

Libraix uses standard **OAuth 2.0** — the same pattern as ChatGPT, Notion, and most SaaS apps. Users tap a provider button, sign in on Google/Microsoft/Apple's site, and return to Libraix already logged in. Libraix never receives their provider password.

### How it works (for your users)

1. User clicks **Continue with Google** (or Microsoft).
2. Browser opens that provider's official login page.
3. User signs in there (2FA, Face ID, etc. handled by the provider).
4. Provider sends Libraix only **name + email** to create or match an account.
5. User lands on `/app`, signed in.

Security emails ("Sign-in request for Libraix") come **from Google/Microsoft/Apple**, not from Libraix — that is expected.

### Google Cloud Console

1. [Google Cloud Console](https://console.cloud.google.com/) → APIs & Services → Credentials → **Create OAuth client ID** (Web application).
2. **Authorized redirect URI:** `https://libraix.ai/api/auth/oauth/google/callback`
3. Copy **Client ID** and **Client secret** to Render:

| Variable | Value |
|---|---|
| `GOOGLE_CLIENT_ID` | `....apps.googleusercontent.com` |
| `GOOGLE_CLIENT_SECRET` | `GOCSPX-...` |

### Microsoft Entra (Azure AD)

1. [Azure Portal](https://portal.azure.com/) → Microsoft Entra ID → App registrations → **New registration**.
2. Redirect URI (Web): `https://libraix.ai/api/auth/oauth/microsoft/callback`
3. Certificates & secrets → **New client secret**.
4. API permissions → add `openid`, `email`, `profile`, `User.Read` (Microsoft Graph).

| Variable | Value |
|---|---|
| `MICROSOFT_CLIENT_ID` | Application (client) ID |
| `MICROSOFT_CLIENT_SECRET` | Client secret value |
| `MICROSOFT_TENANT_ID` | `common` (any Microsoft account) or your tenant ID |

### Apple Sign In (coming soon)

Apple requires a Services ID, Team ID, Key ID, and a `.p8` private key. The login page shows **Continue with Apple** but it is marked **Soon** until full Apple token exchange is enabled. Set these when ready:

| Variable | Purpose |
|---|---|
| `APPLE_CLIENT_ID` | Services ID (e.g. `ai.libraix.web`) |
| `APPLE_TEAM_ID` | Apple Developer Team ID |
| `APPLE_KEY_ID` | Sign in with Apple key ID |
| `APPLE_PRIVATE_KEY` | Contents of the `.p8` key |

### Verify OAuth

- `GET /api/auth/config` → `oauth: { google: true, microsoft: true, apple: false }` when keys are set.
- `/login` → social buttons redirect to provider; successful flow lands on `/app`.

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

Run the smoke test (no login required):

```bash
bash libraix/scripts/smoke-test.sh
# After Render deploy, verify commit:
EXPECTED_COMMIT=$(git rev-parse HEAD) bash libraix/scripts/smoke-test.sh
```

`/health` returns `{ ok, commit, features: { orchestrator, asyncFileIndexing, ... } }` — use this to confirm Render picked up the latest `main` build.

### GitHub Actions auto-deploy (optional secrets)

| Secret | Where to get it |
|--------|-----------------|
| `NETLIFY_AUTH_TOKEN` | Netlify → User settings → Personal access tokens |
| `NETLIFY_SITE_ID` | `551984bf-05ea-447b-a82b-86ad4374e6e3` (libraix.ai site) |
| `RENDER_DEPLOY_HOOK_URL` | Render → libraix-api → Settings → Deploy Hook |

Push to `main` runs **Deploy Libraix** workflow. Without secrets, deploy manually:

1. **Render** → libraix-api → **Manual Deploy** (or connect GitHub auto-deploy)
2. **Netlify** → libraix.ai site → **Trigger deploy** from `main`

- `/` — public landing only
- `/login` — auth
- `/app` — workspace
- `/api/health` — `{"ok":true}` (Netlify proxy → Render)
