# Apply: Add Kiteline to ChatGPT (multipurpose, company-scoped)

## Why this package is in parslia-kitchen-os

This cloud agent can push to `parslia-kitchen-os` but **not** to `shyam1-jpg/kitline1`.
Kiteline production deploys from **kitline1** on Render → https://kiteline.uk

## What was fixed / added

1. **Critical:** `server.js` was missing `require('./ai-connector')` — live `/api/ai/*` and `/mcp` returned `aiConnector is not defined`.
2. **ChatGPT GPT Actions** OpenAPI expanded (`/api/ai/openapi.json`) for multipurpose hospitality.
3. **MCP** JSON-RPC at `POST /mcp` (`tools/list`, `tools/call`) + discovery `GET /mcp`.
4. **Company-scoped tools:** recipes/dishes search, menus, stock, suppliers, shopping lists, temperature logs, allergen + nutrition reports, rota, business/cost/compliance reports, business settings.
5. **Dietary rules** are per-company (`org.dietary.enabledRules`) — vegetarian/vegan/Jain/Ekadashi/halal/kosher/gluten-free etc. are optional and never forced globally.
6. Setup page: `/chatgpt.html` · guide: `CHATGPT.md`
7. Registration business types expanded (hotel, bakery, school, care home, retreat, event venue, …).

## Apply to kitline1 and deploy

```bash
cd kitline1
git checkout main
git pull
git checkout -b cursor/kiteline-chatgpt-mcp-32ab
git am /path/to/kiteline-chatgpt-mcp/kiteline-chatgpt-mcp.patch
# or copy server/, js/, site/, CHATGPT.md from this folder over the repo, then commit
git push -u origin cursor/kiteline-chatgpt-mcp-32ab
# merge to main → Render redeploys kiteline.uk
```

## Verify after deploy

```bash
curl -s https://kiteline.uk/api/ai/health
curl -s https://kiteline.uk/mcp
# Open Settings → Connect ChatGPT, create token, import:
# https://kiteline.uk/api/ai/openapi.json
```

## Connect ChatGPT

1. Admin signs in → Settings → Connect ChatGPT
2. Optionally set Dietary rules for **this company only**
3. Create AI token
4. Custom GPT → Actions → import OpenAPI schema
5. Auth: Bearer `kl_ai_…` (or OAuth when `AI_OAUTH_CLIENT_SECRET` is set on Render)
