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

After deploy, add **`OPENAI_API_KEY`** in the Render dashboard.

Service URL: `https://libraix-api.onrender.com`

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
