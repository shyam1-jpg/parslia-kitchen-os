# Add Kiteline to ChatGPT

Kiteline is a **multipurpose** business and hospitality-management platform. It is not limited to vegetarian businesses or any single cuisine, religion, diet or venue type.

Supported organisations include hotels, restaurants, catering companies, commercial kitchens, schools and colleges, care homes, retreat centres, cafés, bakeries, event venues and other food businesses.

## Security model

- Each company has its own workspace (tenant).
- ChatGPT authenticates with a **company-bound** AI token (`kl_ai_…`) or OAuth grant.
- Tools only return data for that company (and sites allowed on the token).
- Dietary rules (vegetarian, vegan, Jain, Ekadashi, halal, kosher, gluten-free, …) are **per-company settings**. They are never forced on every Kiteline customer.

## Endpoints

| Purpose | URL |
|---------|-----|
| OpenAPI (GPT Actions) | `https://kiteline.uk/api/ai/openapi.json` |
| Health | `https://kiteline.uk/api/ai/health` |
| MCP discovery / JSON-RPC | `https://kiteline.uk/mcp` |
| Setup page | `https://kiteline.uk/chatgpt.html` |

## First tools

1. Search recipes, products and dishes — `GET /api/ai/recipes?q=`
2. Create and manage menus — `GET/POST /api/ai/menus`
3. Search stock and suppliers — `GET /api/ai/stock`, `GET /api/ai/suppliers`
4. Generate shopping / ordering lists — `GET/POST /api/ai/shopping-list`
5. Read and add temperature records — `GET/POST /api/ai/temperature-logs`
6. Allergen and nutrition reports — `GET /api/ai/allergens`, `GET /api/ai/nutrition`
7. Staff rotas and operational records — `GET /api/ai/rota`
8. Business, cost and compliance reports — `GET /api/ai/reports?type=compliance|cost|full`
9. Business / dietary settings — `GET/PUT /api/ai/business`

## Admin setup (in app)

1. Sign in as Admin → **Settings → Connect ChatGPT**
2. Optionally configure **Dietary rules (this company only)**
3. Create an AI token with the permissions you want
4. Import the OpenAPI schema into a Custom GPT Actions panel
5. Authenticate with the token (Bearer) or OAuth

## Env (Render)

| Variable | Purpose |
|----------|---------|
| `AI_OAUTH_CLIENT_ID` | Defaults to `kiteline-chatgpt` |
| `AI_OAUTH_CLIENT_SECRET` | Required to enable OAuth for customers |
| `APP_URL` | `https://kiteline.uk` |

## Local smoke test

```bash
npm start
curl -s http://localhost:4000/api/ai/health
curl -s http://localhost:4000/mcp
curl -s http://localhost:4000/api/ai/openapi.json | head
```
