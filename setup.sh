#!/usr/bin/env bash
set -euo pipefail

cd "$(dirname "$0")"

echo "Parslia Kitchen OS — setup"
echo "=========================="
echo
echo "This is a static site. No packages to install."
echo
echo "Quick start:"
echo "  ./preview.sh          # local preview on http://localhost:8000"
echo "  python3 -m http.server 8000   # same thing, manual"
echo
echo "Project layout:"
echo "  index.html, styles.css, script.js   — landing page"
echo "  assets/                             — logos and favicon"
echo "  scripts/build-recipes-txt.py        — optional recipe export"
echo "  WHERE-IS-EVERYTHING.md              — full project map"
echo

if [[ ! -f assets/USE_THIS_parslia_header_logo_clean.png ]]; then
  echo "Warning: assets/USE_THIS_parslia_header_logo_clean.png is missing."
  exit 1
fi

echo "Assets OK. Run ./preview.sh to start."
