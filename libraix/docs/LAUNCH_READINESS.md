# Libraix Launch Readiness Report

Last updated: July 2026  
Environment tested: production `https://libraix.ai` + Render backend

## Architecture separation

| Route | Purpose | Auth | Status |
|-------|---------|------|--------|
| `/` | Public marketing | None | **Live** — React SPA, no app/settings in HTML source |
| `/login`, `/signup` | Authentication | Public only | **Live** |
| `/app` | AI workspace | Required (`ProtectedRoute`) | **Live** — unauthenticated users redirect to `/login` |
| `/account`, `/settings` | Account management | Required | **Live** |
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
| Chat (Libraix Fast) | **Live** | OpenAI `gpt-4o-mini` via Chat Completions | Requires `OPENAI_API_KEY` on Render |
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
| Stripe Pro checkout | **Not configured** | Stripe | Inline message when unavailable |
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
