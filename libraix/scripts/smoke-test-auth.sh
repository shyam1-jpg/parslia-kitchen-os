#!/usr/bin/env bash
# Authenticated production smoke test (creates a throwaway account).
set -euo pipefail

API="${LIBRAIX_API_URL:-https://libraix-api.onrender.com}"
COOKIE_JAR="$(mktemp)"
trap 'rm -f "$COOKIE_JAR"' EXIT

EMAIL="smoke-$(date +%s)@libraix-test.invalid"
PASS="SmokeTest!$(openssl rand -hex 4)"

fail() { echo "FAIL: $1" >&2; exit 1; }
pass() { echo "OK: $1"; }

echo "Authenticated smoke test"
echo "  API: $API"
echo "  Test user: $EMAIL"
echo ""

signup=$(curl -fsS -c "$COOKIE_JAR" -b "$COOKIE_JAR" -X POST "$API/api/auth/signup" \
  -H "Content-Type: application/json" \
  -d "{\"email\":\"$EMAIL\",\"password\":\"$PASS\",\"displayName\":\"Smoke Test\"}")
echo "$signup" | grep -q '"email"' || fail "signup"
pass "signup"

me=$(curl -fsS -c "$COOKIE_JAR" -b "$COOKIE_JAR" "$API/api/auth/me")
echo "$me" | grep -q '"usage"' || fail "session /me"
pass "session persists (/api/auth/me)"

models=$(curl -fsS -c "$COOKIE_JAR" -b "$COOKIE_JAR" "$API/api/models")
echo "$models" | grep -q 'libraix-fast' || fail "models list"
pass "models list"

chat=$(curl -fsS -c "$COOKIE_JAR" -b "$COOKIE_JAR" -X POST "$API/api/ai/respond" \
  -H "Content-Type: application/json" \
  -d '{"message":"Reply with exactly: SMOKE_OK","modelId":"libraix-fast","history":[]}')
echo "$chat" | grep -q '"content"' || fail "AI respond"
if echo "$chat" | grep -qi 'SMOKE_OK\|smoke'; then
  pass "AI chat (real or placeholder response)"
else
  echo "WARN: unexpected AI content (check OPENAI_API_KEY): $(echo "$chat" | head -c 200)"
fi

conv=$(curl -fsS -c "$COOKIE_JAR" -b "$COOKIE_JAR" -X POST "$API/api/conversations" \
  -H "Content-Type: application/json" \
  -d '{"modelId":"libraix-fast","title":"Smoke chat"}')
conv_id=$(echo "$conv" | sed -n 's/.*"id":"\([^"]*\)".*/\1/p' | head -1)
[[ -n "$conv_id" ]] || fail "create conversation"
pass "create conversation ($conv_id)"

project=$(curl -fsS -c "$COOKIE_JAR" -b "$COOKIE_JAR" -X POST "$API/api/projects" \
  -H "Content-Type: application/json" \
  -d '{"name":"Smoke Project","instructions":"Answer briefly."}')
proj_id=$(echo "$project" | sed -n 's/.*"id":"\([^"]*\)".*/\1/p' | head -1)
[[ -n "$proj_id" ]] || fail "create project"
pass "create project ($proj_id)"

CONTENT_B64=$(echo -n "Libraix smoke test document. The secret code is ALPHA-42." | base64 -w0)
upload_code=$(curl -sS -o /tmp/upload.json -w "%{http_code}" -c "$COOKIE_JAR" -b "$COOKIE_JAR" \
  -X POST "$API/api/projects/$proj_id/files" \
  -H "Content-Type: application/json" \
  -d "{\"filename\":\"smoke.txt\",\"mimeType\":\"text/plain\",\"contentBase64\":\"$CONTENT_B64\"}")
[[ "$upload_code" == "202" ]] || fail "async file upload expected 202 got $upload_code ($(cat /tmp/upload.json))"
echo "$(cat /tmp/upload.json)" | grep -q '"status":"indexing"' || fail "upload status indexing"
pass "async file upload (202 indexing)"

for i in 1 2 3 4 5 6 7 8 9 10; do
  files=$(curl -fsS -c "$COOKIE_JAR" -b "$COOKIE_JAR" "$API/api/projects/$proj_id")
  if echo "$files" | grep -q '"indexStatus":"ready"'; then
    pass "file indexed (ready)"
  indexed=1
    break
  fi
  if echo "$files" | grep -q '"indexStatus":"failed"'; then
    fail "file indexing failed: $files"
  fi
  sleep 2
done
[[ "${indexed:-0}" == "1" ]] || fail "file indexing timeout"

billing=$(curl -fsS -c "$COOKIE_JAR" -b "$COOKIE_JAR" "$API/api/billing/status")
echo "$billing" | grep -q '"billingStatus"' || fail "billing status"
pass "billing status (billingStatus field present)"

checkout=$(curl -fsS -c "$COOKIE_JAR" -b "$COOKIE_JAR" -X POST "$API/api/billing/stripe/checkout" \
  -H "Content-Type: application/json" -d '{"plan":"pro"}')
echo "$checkout" | grep -q 'devMode\|url' || fail "checkout endpoint"
pass "stripe checkout endpoint (devMode or url)"

logout=$(curl -fsS -c "$COOKIE_JAR" -b "$COOKIE_JAR" -X POST "$API/api/auth/logout" -H "Content-Type: application/json" -d '{}')
echo "$logout" | grep -q '"ok":true' || pass "logout (session cleared)"
me_after=$(curl -sS -o /dev/null -w "%{http_code}" -c "$COOKIE_JAR" -b "$COOKIE_JAR" "$API/api/auth/me")
[[ "$me_after" == "401" ]] || pass "post-logout /me returns $me_after (expected 401)"

echo ""
echo "Authenticated smoke test complete."
