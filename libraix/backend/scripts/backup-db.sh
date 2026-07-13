#!/usr/bin/env bash
# Snapshot the Libraix SQLite database (safe with WAL mode).
set -euo pipefail

DB_PATH="${DATABASE_PATH:-./data/libraix.db}"
BACKUP_DIR="${BACKUP_DIR:-./data/backups}"
STAMP="$(date -u +%Y%m%dT%H%M%SZ)"
DEST="${BACKUP_DIR}/libraix-${STAMP}.db"

if [[ ! -f "$DB_PATH" ]]; then
  echo "Database not found: $DB_PATH" >&2
  exit 1
fi

mkdir -p "$BACKUP_DIR"
sqlite3 "$DB_PATH" ".backup '$DEST'"
echo "Backup written to $DEST"
