#!/usr/bin/env bash
# Apply Kiteline ChatGPT 1.2.2 fix to a local kitline1 clone, push, open editor + logo.
set -euo pipefail
ROOT="$(cd "$(dirname "$0")" && pwd)"
LOGO="$ROOT/chatgpt-gpt-logo.png"

if [[ ! -f "$LOGO" ]]; then
  echo "Missing logo: $LOGO" >&2
  exit 1
fi

KIT="${1:-}"
if [[ -z "$KIT" ]]; then
  for c in \
    "$HOME/Desktop/kitline1" \
    "$HOME/kitline1" \
    "/tmp/kitline1" \
    "$HOME/Desktop/kiteline/kitline1"
  do
    if [[ -d "$c/.git" ]]; then KIT="$c"; break; fi
  done
fi

if [[ -z "${KIT:-}" || ! -d "$KIT/.git" ]]; then
  echo "Usage: $0 /path/to/kitline1" >&2
  exit 1
fi

echo "Using kitline1 at: $KIT"
cd "$KIT"
git fetch origin
git checkout main
git pull origin main
git checkout -B cursor/chatgpt-cors-logo-4a85

cp -f "$ROOT/server/server.js" server/server.js
cp -f "$ROOT/server/security.js" server/security.js
cp -f "$ROOT/server/ai-openapi.js" server/ai-openapi.js
cp -f "$ROOT/server/ai-mcp.js" server/ai-mcp.js
cp -f "$ROOT/server/ai-connector.js" server/ai-connector.js
mkdir -p site
cp -f "$ROOT/site/chatgpt.html" site/chatgpt.html
cp -f "$LOGO" chatgpt-gpt-logo.png
cp -f "$LOGO" site/chatgpt-gpt-logo.png
cp -f "$ROOT/CHATGPT.md" CHATGPT.md

git add server/server.js server/security.js server/ai-openapi.js server/ai-mcp.js \
  server/ai-connector.js site/chatgpt.html chatgpt-gpt-logo.png site/chatgpt-gpt-logo.png CHATGPT.md
git commit -m "Fix ChatGPT Something went wrong (CORS) + add GPT logo" || true
git push -u origin cursor/chatgpt-cors-logo-4a85

echo
echo "Open PR: https://github.com/shyam1-jpg/kitline1/compare/main...cursor/chatgpt-cors-logo-4a85?expand=1"
echo "GPT editor: https://chatgpt.com/gpts/editor/g-6a65392fc7b88191923de8c0e7094f71"
echo "Logo file: $LOGO"
echo "After merge/deploy: curl -s https://kiteline.uk/api/ai/health"
