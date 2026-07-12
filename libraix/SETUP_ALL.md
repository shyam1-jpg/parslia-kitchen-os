# Libraix — Full Setup Checklist (Owner)

Complete these once after code is merged to `main`. Netlify and Render auto-deploy from GitHub.

## Already done in code (no action needed)

- GPT-4o as default chat model (ChatGPT 4o quality)
- Markdown formatting in chat (headings, lists, code blocks)
- `render.yaml` with all env var placeholders
- Admin portal at https://libraix.ai/admin/login
- Legal pages, cookie consent, SEO

---

## 1. Render (backend) — https://dashboard.render.com

Open service **libraix-api** → **Environment**. Confirm or add:

| Variable | Value | Required |
|----------|-------|----------|
| `OPENAI_API_KEY` | Your OpenAI API key | **Yes** (you said this is set) |
| `OPENAI_MODEL_FAST` | `gpt-4o` | Auto from render.yaml |
| `OPENAI_MODEL_SMART` | `gpt-4o` | Auto from render.yaml |
| `OPENAI_MODEL_ADVANCED` | `o3-mini` | Auto from render.yaml |
| `OPENAI_TEMPERATURE` | `0.7` | Optional |
| `OPENAI_MAX_TOKENS` | `4096` | Optional |
| `FRONTEND_URL` | `https://libraix.ai` | Yes |
| `COMPANY_ADDRESS` | 23 Lincoln Road, Branston, Lincoln LN4 1PE, United Kingdom | Yes |

Click **Save Changes** → **Manual Deploy** if env vars were updated.

### Owner admin account (one-time)

Render → libraix-api → **Shell**:

```bash
cd libraix/backend
OWNER_EMAIL=shyam_1@hotmail.co.uk OWNER_INITIAL_PASSWORD='YourSecurePassword123!' npm run seed:owner
```

Then log in at https://libraix.ai/admin/login and enable **2FA**.

---

## 2. Netlify (frontend) — https://app.netlify.com

- Site linked to `shyam1-jpg/parslia-kitchen-os`, branch `main`
- Domain `libraix.ai` pointed to this site
- Build: base `libraix/frontend`, publish `dist`
- `/api/*` proxies to `https://libraix-api.onrender.com` (in `netlify.toml`)

Trigger **Deploy site** after merging latest `main`.

---

## 3. Email (password reset + signup verification)

Pick **Resend** (recommended):

1. https://resend.com → sign up
2. Add domain `libraix.ai` (DNS records at your registrar)
3. Create API key
4. On Render set:
   - `RESEND_API_KEY` = `re_...`
   - `EMAIL_FROM` = `Libraix <noreply@libraix.ai>`

Test: https://libraix.ai/forgot-password

---

## 4. Stripe (Pro subscriptions — when ready)

1. https://stripe.com → Products → Pro £9/month → copy Price ID
2. Webhook: `https://libraix-api.onrender.com/api/billing/stripe/webhook`
3. On Render set: `STRIPE_SECRET_KEY`, `STRIPE_PRO_PRICE_ID`, `STRIPE_WEBHOOK_SECRET`

---

## 5. Test chat quality

1. Hard refresh https://libraix.ai/app (`Ctrl+Shift+R`)
2. Ask: *"Explain photosynthesis with bullet points and a simple diagram in markdown"*
3. Under the reply you should see: **Generated using Libraix Fast (openai)**
4. Reply should have formatted headings, bullets, and code/markdown — not plain text

---

## 6. Transfer ownership (recommended)

Transfer to your accounts:

- GitHub repo
- Render service
- Netlify site
- Domain registrar (libraix.ai)
- OpenAI billing
- Resend / Stripe when configured

---

## Quick links

| What | URL |
|------|-----|
| Customer app | https://libraix.ai/app |
| Admin dashboard | https://libraix.ai/admin/login |
| Owner email | shyam_1@hotmail.co.uk |
| API health | https://libraix-api.onrender.com/health |
