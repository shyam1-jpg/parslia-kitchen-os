# Libraix Launch Readiness Report

Last updated: July 2026  
Environment tested: production `https://libraix.ai` + Render backend

## Architecture separation

| Route | Purpose | Auth | Status |
|-------|---------|------|--------|
| `/` | Public marketing | None | **Live** — React SPA, no app/settings in HTML source |
| `/login`, `/signup` | Authentication | Public only | **Live** |
| `/app` | AI workspace | Required (`ProtectedRoute`) | **Live** — unauthenticated users redirect to `/login` |
| `/app/settings`, `/app/billing` | Account management | Required | **Live** |
| `/admin/login` | Owner login | Public (admin only) | **Live** — Super Admin via seed script |
| `/admin` | Owner dashboard | Admin session required | **Live** |
| `/support` | Support & privacy requests | Public | **Live** |
| `/privacy`, `/terms` | Legal | None | **Live** |

The old single-page site (146KB HTML with embedded app/settings) is **not** the current deployment. Current HTML shell is ~674 bytes with code-split JS bundles.

## Security

| Requirement | Status | Evidence |
|-------------|--------|----------|
| No browser OpenAI API key | **Pass** | Settings page states server-side keys only; no key input in frontend source |
| Provider keys in env vars only | **Pass** | `OPENAI_API_KEY` read in `backend/src/providers/openai.ts` only |
| Session cookies httpOnly | **Pass** | `backend/src/index.ts` session config |
| `/app` protected | **Pass** | `frontend/src/components/ProtectedRoute.tsx` |

## Features matrix

| Feature | Status | Provider / API | Notes |
|---------|--------|----------------|-------|
| Email signup/login | **Live** | SQLite + bcrypt sessions | OAuth hidden until configured |
| Chat (Libraix Fast) | **Live** | OpenAI `gpt-4o` via Chat Completions | Requires `OPENAI_API_KEY` on Render |
| Streaming responses | **Live** | SSE `/api/ai/stream` | Same key requirement |
| Libraix Smart / Advanced | **Beta** | OpenAI `gpt-4o`, `o3-mini` | Pro plan only |
| Smart Model Router | **Beta** | Internal router | Auto mode in `/app` |
| Model Compare | **Beta** | Internal | Pro plan, feature flag |
| Personal Memory | **Beta** | SQLite | Settings page |
| Projects | **Coming soon** | SQLite scaffold | Pro gate; UI minimal |
| PDF chat | **Coming soon** | — | Not advertised as live |
| Web search | **Coming soon** | — | Button disabled in app |
| YouTube / link tools | **Coming soon** | — | Not in app UI |
| Image generation | **Coming soon** | OpenAI DALL·E (planned) | Model defined, no UI flow |
| Voice | **Disabled** | — | Feature flag off |
| Assistants | **Beta** | System prompts | Pro; no dedicated UI yet |
| Google/Apple/Microsoft OAuth | **Not configured** | — | Buttons hidden via `/api/auth/config` |
| Password reset | **Live** | Resend or SMTP | Requires `RESEND_API_KEY` or `SMTP_*` on Render |
| Stripe Pro checkout | **Live** | Stripe Checkout | Requires `STRIPE_SECRET_KEY` + `STRIPE_PRO_PRICE_ID` + webhook |
| Manage subscription | **Live** | Stripe Customer Portal | After first checkout; enable portal in Stripe Dashboard |
| Password reset | **Beta** | Email stub | Token stored; email send not wired |
| Email verification | **Planned** | — | Flag on user record |
| Account deletion | **Live** | API + Settings UI | Deletes user data |
| Conversation export | **Live** | JSON download | Per conversation |
| SOC 2 Type II badge | **Removed** | — | Never shown on new build |
| GDPR compliance badges | **Removed** | — | Replaced with factual Privacy Policy |

## Marketing accuracy

Landing page reads from `/api/catalog` with `launchStatus` per tool/model:
- **live** — available now
- **beta** — limited availability
- **coming_soon** — roadmap only (shown with badge, not counted in hero stats)

## Pre-launch checklist for owner

1. Set `OPENAI_API_KEY` on Render (required for real chat)
2. Set OpenAI spending limits in OpenAI dashboard
3. Upgrade Render from free tier (avoid cold starts)
4. Optional: Stripe keys for paid plans
5. Optional: OAuth client IDs
6. Review Privacy Policy with legal counsel before EU/UK marketing claims

## Test commands (production)

```bash
# Health
curl https://libraix.ai/api/health

# Catalog (honest launch statuses)
curl https://libraix.ai/api/catalog

# Auth config
curl https://libraix.ai/api/auth/config

# Signup + chat (replace email)
curl -c cookies.txt -X POST https://libraix.ai/api/auth/signup \
  -H "Content-Type: application/json" \
  -d '{"email":"test@example.com","password":"testpass123"}'
curl -b cookies.txt -X POST https://libraix.ai/api/ai/respond \
  -H "Content-Type: application/json" \
  -d '{"message":"hello","modelId":"libraix-fast"}'
```

## Verdict

**Not ready for paid public launch** until `OPENAI_API_KEY` is set and smoke-tested.  
**Ready for limited free beta** after key is set and owner accepts beta feature scope.

---

## External audit response (July 2026)

An independent scan reported critical issues. Below is the **current production status** after the React rebuild (homepage HTML is ~800 bytes, not the old 146KB monolithic page).

| Audit finding | Current status |
|---------------|----------------|
| Landing page embeds full app in HTML | **Fixed** — `/` serves React shell only; `/app` is a separate protected route |
| OpenAI API key box in Settings | **Fixed** — no key input in frontend; server-side only |
| Contradictory login/usage states on homepage | **Fixed** — was old site; auth state comes from `/api/auth/me` on protected routes only |
| Outdated model names (Claude 3.7, etc.) | **Fixed** — customer-facing: Libraix Fast / Smart / Advanced / Image |
| SOC 2 / unverified compliance badges | **Fixed** — removed; honest disclaimer on landing page |
| Missing legal pages | **Fixed** — `/privacy`, `/terms`, `/about`, `/contact`, `/refund-policy`, `/cookie-policy`, `/support`; `/blog` placeholder |
| `/app` and `/admin` not noindex | **Fixed** — meta robots + Netlify `X-Robots-Tag` headers |
| Forgot password | **Built** — `/forgot-password` (needs email env vars) |
| Owner dashboard | **Built** — `/admin/login`, `/admin` |
| Server-side plan enforcement | **Built** — usage limits enforced in backend before AI calls |
| Email verification | **Partial** — flag on user; send not wired |
| PDF / web / voice / image tools | **Coming Soon** — not advertised as live |
| Stripe payments | **Built** — do not enable until legal pages reviewed and Stripe under owner account |

**Note:** If a scanner still reports old content, it may be using a cached crawl of the pre-rebuild site. Verify with: `curl -s https://libraix.ai/ | wc -c` (should be ~800 bytes, not 100KB+).
