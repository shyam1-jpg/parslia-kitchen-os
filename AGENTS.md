# Parslia Kitchen OS — Landing Site

Single-page static marketing/landing website (plain HTML/CSS/vanilla JS, no framework, no build step, no backend). The whole page is `index.html`, styled by `styles.css`, with behavior in `script.js`. The early-access form does not POST anywhere — on submit it opens a prefilled `mailto:hello@parslia.app` link.

## Cursor Cloud specific instructions

- No dependencies, package manager, or build step. There is nothing to install; the update script is a no-op.
- To run locally, serve the repo root with any static server, e.g. `python3 -m http.server 8000`, then open `http://localhost:8000/`. Or run `./preview.sh` (Linux/macOS) or `PREVIEW.bat` (Windows).
- There is no lint/test tooling in this repo. "Testing" means loading the page and exercising the UI (nav anchors + the early-access form).
- Logos and favicon live in `assets/` and are referenced from `index.html`.
- Deployment is automatic via GitHub Pages on push to `main` (`.github/workflows/jekyll-gh-pages.yml`); `.nojekyll` disables Jekyll processing. No local build is needed.
- Optional: regenerate `vegetarian-recipes.txt` with `python3 scripts/build-recipes-txt.py` (requires `vegetarian-recipes.json`).
