# Apply: Fix ChatGPT “Something went wrong” + GPT logo (Kiteline 1.2.2)

## Why this is in parslia-kitchen-os

This cloud agent can push to `parslia-kitchen-os` but **not** to `shyam1-jpg/kitline1`.
Kiteline production deploys from **kitline1** on Render → https://kiteline.uk

## What was wrong

1. **“Something went wrong” when typing in ChatGPT**  
   Global `OPTIONS` in `server/server.js` always returned  
   `Access-Control-Allow-Origin: https://kiteline.uk`  
   and omitted `Mcp-Session-Id`.  
   ChatGPT’s browser preflight from `https://chatgpt.com` to `/mcp` (and AI routes) failed → generic error even though Kiteline was “connected” and logged in.

2. **No logo when searching for the GPT**  
   Custom GPT profile images must be uploaded in the GPT editor.  
   We added a 512×512 Kiteline mark at `/chatgpt-gpt-logo.png` plus a setup page.

3. **OpenAPI hardened for GPT Actions**  
   Switched schema to OpenAPI **3.0.1**, linked privacy/terms, removed bad GET `requestBody`, marked writes as consequential.

## Apply to kitline1 and deploy

```bash
cd kitline1
git checkout main
git pull
git checkout -b cursor/chatgpt-cors-logo-4a85

# Option A — patch
git am /path/to/kiteline-chatgpt-mcp/kiteline-chatgpt-logo-cors-1.2.2.patch

# Option B — copy files
cp kiteline-chatgpt-mcp/server/{server,security,ai-openapi,ai-mcp,ai-connector}.js server/
cp kiteline-chatgpt-mcp/chatgpt-gpt-logo.png .
cp kiteline-chatgpt-mcp/site/chatgpt.html site/
cp kiteline-chatgpt-mcp/CHATGPT.md .

git add -A
git commit -m "Fix ChatGPT CORS Something went wrong + add GPT logo"
git push -u origin cursor/chatgpt-cors-logo-4a85
# merge to main → Render redeploys kiteline.uk
```

## Verify after deploy

```bash
curl -s https://kiteline.uk/api/ai/health
# expect version 1.2.2

curl -sI -X OPTIONS 'https://kiteline.uk/mcp' \
  -H 'Origin: https://chatgpt.com' \
  -H 'Access-Control-Request-Method: POST' \
  -H 'Access-Control-Request-Headers: content-type,authorization,mcp-session-id'
# expect: access-control-allow-origin: https://chatgpt.com

curl -sI https://kiteline.uk/chatgpt-gpt-logo.png | head
curl -sI https://kiteline.uk/chatgpt.html | head
```

## Immediately (logo for GPT editor — works before kiteline deploy)

Upload this PNG in ChatGPT GPT editor → Configure → profile circle:

- In this PR: `kiteline-chatgpt-mcp/chatgpt-gpt-logo.png`
- After merge to main (raw):  
  `https://raw.githubusercontent.com/shyam1-jpg/parslia-kitchen-os/main/kiteline-chatgpt-mcp/chatgpt-gpt-logo.png`
- After kiteline deploy: `https://kiteline.uk/chatgpt-gpt-logo.png`

GPT editor link from the report:  
https://chatgpt.com/gpts/editor/g-6a65392fc7b88191923de8c0e7094f71

## After deploy — reconnect ChatGPT

1. Kiteline Admin → Settings → Connect ChatGPT → create/refresh `kl_ai_…` token  
2. GPT Actions → re-import `https://kiteline.uk/api/ai/openapi.json`  
3. Auth = Bearer / API key with that token (not password)  
4. Privacy policy = `https://kiteline.uk/privacy.html`  
5. Upload GPT logo (above) → Save/Update  
6. Test a simple message (e.g. “List my menus”)
