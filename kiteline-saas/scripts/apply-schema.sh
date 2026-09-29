#!/usr/bin/env bash
# Apply Kiteline SaaS schema to a Postgres database.
# Usage:
#   DATABASE_URL=postgres://... ./scripts/apply-schema.sh
#   ./scripts/apply-schema.sh postgres://kiteline:kiteline@127.0.0.1:5432/kiteline_saas
set -euo pipefail
ROOT="$(cd "$(dirname "$0")/.." && pwd)"
URL="${1:-${DATABASE_URL:-}}"
if [[ -z "${URL}" ]]; then
  echo "ERROR: pass DATABASE_URL or postgres URL argument" >&2
  exit 1
fi

for f in \
  "$ROOT/schema/001_core_tenancy.sql" \
  "$ROOT/schema/002_ops_compliance.sql" \
  "$ROOT/schema/003_commercial.sql" \
  "$ROOT/schema/004_rls_policies.sql"
do
  echo ">> Applying $(basename "$f")"
  psql "$URL" -v ON_ERROR_STOP=1 -f "$f"
done
echo "OK: schema applied"
