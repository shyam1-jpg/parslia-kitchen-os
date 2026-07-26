# Add Kiteline to ChatGPT

Kiteline is a **multipurpose** hospitality platform. ChatGPT connects with a **company-bound** AI token (`kl_ai_…`) — never a user password.

GPT editor (example): `https://chatgpt.com/gpts/editor/g-6a65392fc7b88191923de8c0e7094f71`

## Important: GPT Instructions must not mention The Grove Hotel

**The Grove Hotel** is Kiteline **demo/sample** data only. It is not a real workplace for the account owner.  
If your Custom GPT Instructions say “The Grove Hotel”, replace them — see **`GPT-INSTRUCTIONS.md`**.

## Endpoints

| Purpose | URL |
|---------|-----|
| OpenAPI (GPT Actions) | `https://kiteline.uk/api/ai/openapi.json` |
| Health | `https://kiteline.uk/api/ai/health` |
| MCP | `https://kiteline.uk/mcp` |
| Setup page | `https://kiteline.uk/chatgpt.html` |
| **GPT logo (512×512)** | `https://kiteline.uk/chatgpt-gpt-logo.png` |
| Privacy (required for Actions) | `https://kiteline.uk/privacy.html` |

## Fix: “Something went wrong” when typing

Root cause we fixed in **1.2.2**: global `OPTIONS` CORS only allowed `kiteline.uk`, so ChatGPT browser preflight to `/mcp` (and AI routes) failed and ChatGPT showed a generic error.

After deploy of 1.2.2+:

1. `curl -s https://kiteline.uk/api/ai/health` → `"ok":true` and `"version":"1.2.2"`
2. Preflight must echo ChatGPT’s origin:

```bash
curl -sI -X OPTIONS 'https://kiteline.uk/mcp' \
  -H 'Origin: https://chatgpt.com' \
  -H 'Access-Control-Request-Method: POST' \
  -H 'Access-Control-Request-Headers: content-type,authorization,mcp-session-id'
# Expect: access-control-allow-origin: https://chatgpt.com
```

3. In the GPT editor → Actions: re-import OpenAPI, set Bearer/`x-api-key` to a fresh `kl_ai_…` token from **Settings → Connect ChatGPT**.
4. Privacy policy URL: `https://kiteline.uk/privacy.html`

## Fix: no logo when searching for the GPT

ChatGPT **does not** pull the logo from the API. Upload it once in the editor:

1. Open your GPT in the editor → **Configure**
2. Click the profile / logo circle
3. Upload `https://kiteline.uk/chatgpt-gpt-logo.png` (or download from `/chatgpt.html`)
4. Save / Update the GPT

## Connect (Custom GPT Actions)

1. Admin → **Settings → Connect ChatGPT** → create AI token
2. GPT → **Actions** → import `https://kiteline.uk/api/ai/openapi.json`
3. Auth: API Key / Bearer with `kl_ai_…`
4. Upload the GPT logo (above)

## Connect (ChatGPT Apps / MCP)

1. ChatGPT → Developer mode on
2. Create app → MCP URL `https://kiteline.uk/mcp`
3. Auth with `kl_ai_…` for `tools/call`

## Env (Render)

| Variable | Purpose |
|----------|---------|
| `AI_OAUTH_CLIENT_ID` | Defaults to `kiteline-chatgpt` |
| `AI_OAUTH_CLIENT_SECRET` | Enables OAuth |
| `APP_URL` | `https://kiteline.uk` |
| `ALLOWED_ORIGINS` | Optional; ChatGPT origins are allowed by default in 1.2.2+ |
