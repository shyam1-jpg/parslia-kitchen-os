#!/usr/bin/env bash
set -euo pipefail

cd "$(dirname "$0")"
PORT="${PORT:-8000}"

echo
echo "  Parslia landing page: http://localhost:${PORT}"
echo "  Folder: $(pwd)"
echo "  Press Ctrl+C to stop."
echo

if command -v xdg-open >/dev/null 2>&1; then
  (sleep 1 && xdg-open "http://localhost:${PORT}") >/dev/null 2>&1 &
elif command -v google-chrome >/dev/null 2>&1; then
  (sleep 1 && google-chrome "http://localhost:${PORT}") >/dev/null 2>&1 &
fi

exec python3 -m http.server "$PORT"
