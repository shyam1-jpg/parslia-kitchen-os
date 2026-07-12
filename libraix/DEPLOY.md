# Deploy Libraix Live

## 1. Backend (Render — free tier)

1. Go to [render.com](https://render.com) → **New** → **Blueprint**
2. Connect repo `shyam1-jpg/parslia-kitchen-os` branch `main`
3. Render reads `render.yaml` and creates `libraix-api`
4. Add environment variables in Render dashboard:
   - `OPENAI_API_KEY` — your OpenAI project key
   - `STRIPE_SECRET_KEY` (optional)
   - `STRIPE_PRO_PRICE_ID` (optional)
5. Note the service URL (default: `https://libraix-api.onrender.com`)

## 2. Update Netlify API proxy

Edit `netlify.toml` if your Render URL differs:

```toml
[[redirects]]
  from = "/api/*"
  to = "https://YOUR-RENDER-URL.onrender.com/api/:splat"
```

## 3. Frontend (Netlify — libraix.ai)

1. Netlify dashboard → site for **libraix.ai**
2. **Build settings:**
   - Base directory: `libraix/frontend`
   - Build command: `npm install && npm run build`
   - Publish directory: `libraix/frontend/dist`
3. Connect to GitHub repo `shyam1-jpg/parslia-kitchen-os`, branch `main`
4. Custom domain: `libraix.ai`
5. Deploy

Or add GitHub secrets `NETLIFY_AUTH_TOKEN` + `NETLIFY_SITE_ID` for auto-deploy via Actions.

## 4. Verify

- https://libraix.ai — public landing only
- https://libraix.ai/login — auth
- https://libraix.ai/app — workspace (after login)
- https://libraix.ai/api/health — should return `{"ok":true}` via Netlify proxy

## 5. Rotate keys

Rotate any OpenAI key previously exposed in the old single-page libraix.ai frontend.
