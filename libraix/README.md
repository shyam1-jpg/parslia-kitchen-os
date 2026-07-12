# Libraix — Authentication, UI & OpenAI Integration Rebuild

Rebuilt architecture separating the public marketing site from the authenticated AI workspace.

## Architecture

| Route | Purpose | Auth |
|-------|---------|------|
| `/` | Public landing page only | None |
| `/login` | Login & registration | Public only |
| `/pricing` | Plan comparison | None |
| `/app` | AI workspace | Required |
| `/account` | Profile & usage | Required |
| `/settings` | User preferences | Required |
| `/privacy`, `/terms` | Legal pages | None |

## Project structure

```
libraix/
├── backend/          # Express API (sessions, AI proxy, usage)
│   └── src/config/models.ts   # Single source of truth for models/tools
└── frontend/         # React + Vite SPA
    └── src/pages/    # Separate page components per route
```

## Key fixes vs old libraix.ai

- **Separated** public homepage from app workspace (no chat UI on landing page)
- **Single auth state** from backend session (no contradictory login/usage display)
- **No OpenAI API key in browser** — keys only in server `OPENAI_API_KEY`
- **Central model catalog** — homepage, pricing, app selector all read from `/api/catalog`
- **Updated model names** — Libraix Fast/Smart/Advanced/Image (GPT-5.6 family)
- **Usage from database** — not hard-coded frontend counters
- **Clean workspace UI** — sidebar, new chat, model selector, composer (no emoji nav)

## Quick start

### Backend

```bash
cd libraix/backend
cp .env.example .env
npm install
npm run dev
```

### Frontend

```bash
cd libraix/frontend
npm install
npm run dev
```

Open http://localhost:5173

## Environment variables

| Variable | Description |
|----------|-------------|
| `OPENAI_API_KEY` | Server-side OpenAI key (never exposed to browser) |
| `SESSION_SECRET` | Session signing secret |
| `FRONTEND_URL` | Frontend origin for CORS |
| `DATABASE_PATH` | SQLite database path |

## Deployment

- **Frontend**: Netlify or Vercel (build `frontend`, publish `dist`)
- **Backend**: Railway, Render, or Fly.io
- **DNS**: `libraix.ai` → frontend, `api.libraix.ai` → backend

## Still to implement (phase 2)

- Real Google/Apple/Microsoft OAuth
- Stripe subscription webhooks
- Streaming responses (SSE)
- Multi-provider adapters (Anthropic, Google, DeepSeek)
- File upload & PDF chat backend
- Email verification & password reset
- 2FA

## Security note

Rotate any API key that was previously exposed in the old single-page frontend or localStorage.
