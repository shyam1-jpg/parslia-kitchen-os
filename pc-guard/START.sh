#!/usr/bin/env bash
set -euo pipefail
cd "$(dirname "$0")"

echo ""
echo "  PC Guard — who used your PC + which files"
echo ""

if ! command -v python3 >/dev/null 2>&1; then
  echo "Python 3 is required."
  exit 1
fi

PYTHON=python3
if python3 -m venv .venv 2>/dev/null; then
  # shellcheck disable=SC1091
  source .venv/bin/activate
  PYTHON=python
  python -m pip install --upgrade pip >/dev/null
  pip install -r requirements.txt
else
  echo "  (venv unavailable — installing packages for this user)"
  python3 -m pip install --user -r requirements.txt
fi

echo "  Dashboard opens automatically when ready."
echo "  If not, open: http://127.0.0.1:8787"
echo "  Screen shots are taken automatically when a file is used."
echo "  Optional face photos: $PYTHON -m pip install opencv-python-headless"
echo ""
exec "$PYTHON" app.py
