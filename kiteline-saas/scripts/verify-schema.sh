#!/usr/bin/env bash
# Create local DB, apply schema, run isolation tests.
set -euo pipefail
ROOT="$(cd "$(dirname "$0")/.." && pwd)"
DB_NAME="${KITELINE_TEST_DB:-kiteline_saas_test}"
ADMIN_URL="${DATABASE_URL:-postgresql:///postgres}"

echo ">> Ensuring role/db"
sudo -u postgres psql -v ON_ERROR_STOP=1 <<SQL
SELECT 1;
DO \$\$ BEGIN
  CREATE ROLE kiteline WITH LOGIN PASSWORD 'kiteline';
EXCEPTION WHEN duplicate_object THEN NULL; END \$\$;
DROP DATABASE IF EXISTS ${DB_NAME};
CREATE DATABASE ${DB_NAME} OWNER kiteline;
SQL

URL="postgresql://kiteline:kiteline@127.0.0.1:5432/${DB_NAME}"
# peer/local may need trust — also try via sudo postgres
APPLY_URL="postgresql:///${DB_NAME}"

echo ">> Apply schema"
sudo -u postgres psql -d "$DB_NAME" -v ON_ERROR_STOP=1 -f "$ROOT/schema/001_core_tenancy.sql"
sudo -u postgres psql -d "$DB_NAME" -v ON_ERROR_STOP=1 -f "$ROOT/schema/002_ops_compliance.sql"
sudo -u postgres psql -d "$DB_NAME" -v ON_ERROR_STOP=1 -f "$ROOT/schema/003_commercial.sql"
sudo -u postgres psql -d "$DB_NAME" -v ON_ERROR_STOP=1 -f "$ROOT/schema/004_rls_policies.sql"

echo ">> Isolation tests"
sudo -u postgres psql -d "$DB_NAME" -v ON_ERROR_STOP=1 -f "$ROOT/tests/isolation_test.sql"

echo ">> Table count check"
sudo -u postgres psql -d "$DB_NAME" -v ON_ERROR_STOP=1 -c "\dt" | tee /tmp/kiteline-schema-tables.txt
COUNT=$(sudo -u postgres psql -d "$DB_NAME" -tAc "SELECT count(*) FROM information_schema.tables WHERE table_schema='public' AND table_type='BASE TABLE'")
echo "tables=$COUNT"
if [[ "$COUNT" -lt 30 ]]; then
  echo "ERROR: expected >= 30 tables" >&2
  exit 1
fi
echo "OK: schema verified + isolation tests passed"
