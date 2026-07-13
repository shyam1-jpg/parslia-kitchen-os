#!/usr/bin/env bash
# Quick production smoke test for libraix.ai (no auth required).
set -euo pipefail

API="${LIBRAIX_API_URL:-https://libraix-api.onrender.com}"
FRONTEND="${LIBRAIX_FRONTEND_URL:-https://libraix.ai}"
EXPECTED_COMMIT="${EXPECTED_COMMIT:-}"

fail() { echo "FAIL: $1" >&2; exit 1; }
pass() { echo "OK: $1"; }

echo "Smoke testing Libraix"
echo "  API: $API"
echo "  Frontend: $FRONTEND"
echo ""

health="$(curl -fsS "$API/health")"
echo "$health" | grep -q '"ok":true' || fail "API health"
pass "API health"

if echo "$health" | grep -q '"asyncFileIndexing":true'; then
  pass "orchestrator + async indexing build deployed"
else
  echo "WARN: API missing feature flags — Render may still be on an older deploy"
fi

if [[ -n "$EXPECTED_COMMIT" ]]; then
  echo "$health" | grep -q "$EXPECTED_COMMIT" || fail "expected commit $EXPECTED_COMMIT not in health response"
  pass "commit $EXPECTED_COMMIT verified"
fi

catalog="$(curl -fsS "$API/api/catalog")"
echo "$catalog" | grep -q '"modelCount"' || fail "catalog"
pass "catalog ($API/api/catalog)"

config="$(curl -fsS "$API/api/auth/config")"
echo "$config" | grep -q '"providers"' || fail "auth config"
pass "auth config"

code="$(curl -sS -o /dev/null -w "%{http_code}" "$FRONTEND/")"
[[ "$code" == "200" ]] || fail "frontend HTTP $code"
pass "frontend $FRONTEND ($code)"

proxy="$(curl -sS -o /dev/null -w "%{http_code}" "$FRONTEND/api/health")"
[[ "$proxy" == "200" ]] || fail "frontend API proxy HTTP $proxy"
pass "Netlify API proxy ($proxy)"

echo ""
echo "Smoke test complete."
