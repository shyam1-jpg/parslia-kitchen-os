# Kiteline — Kitchen SOP + short videos

Pocket app for **professional commercial kitchens** (hotels, restaurants, catering, schools, production).  
Not home cooking. Not the Vedanta vegetarian pack.

## Where to open it (this repo)

Do **not** use `https://kiteline.uk/kitchen-sop/` or `https://parslia.app/kitchen-sop/` yet — both currently 404.

Open the pack from this repository:

- One file: `open-kitchen-sop.html` (opens without extra requests)
- Folder: `kitchen-sop/`
- Local: `python3 -m http.server 8766` then http://localhost:8766/open-kitchen-sop.html

Those live URLs only work after this branch is on `main` (parslia.app) and after kitline1 deploy (kiteline.uk).

The rota is at https://kiteline.uk/vedanta-rota/. This SOP is a matching static PWA under `site/kitchen-sop/` on [kitline1](https://github.com/shyam1-jpg/kitline1) (Render → kiteline.uk).

Drop-in + apply script for the Kiteline product repo: [`../kiteline-uk-dropin/`](../kiteline-uk-dropin/).

This `parslia-kitchen-os` repo does **not** deploy to kiteline.uk. GitHub Pages here is `parslia.app`. Until kitline1 is merged and Render redeploys, kiteline.uk will 404 `/kitchen-sop/`.

## Open on a phone (after kitline1 deploy)

Open https://kiteline.uk/kitchen-sop/ then: Android Chrome → Add to Home screen · iPhone Safari → Share → Add to Home Screen.

## What’s inside

- **13 SOPs** CK-00 → CK-12: brigade, opening, goods-in, stores, mise en place, HACCP temps, allergens, pass, cleaning, close-down, lifting, knives, raw vs RTE
- **Guideline B — Recipe not found**: stop rule when a controlled recipe card is missing (not a recipe). Shown on house rules and when search has no match
- **Captioned animated training** on every SOP (50–65 seconds) with optional British-English device narration, seeking, voice control and offline completion status
- **Videos tab** — sort by station: Hygiene, Stores, Line, Service, Safety, Close-down
- House rules for the pass
- Offline PWA after the first successful online load, with an offline indicator, fallback page, versioned cache and locally stored completion status (scope `/kitchen-sop/`)
- Three-question competency check for every controlled SOP, with a 100% safety pass mark and automatic retraining status
- Offline-first, exportable evidence ledger carrying SOP version, timestamps, result and pending-sync state

## Local preview

```bash
cd kiteline-kitchen-sop
python3 -m http.server 8766
```

Open http://localhost:8766. `standalone.html` is a self-contained copy of the pack (same as `open-kitchen-sop.html`).

To preview the Kiteline URL shape (`/kitchen-sop/`):

```bash
python3 kiteline-uk-dropin/apply.py /path/to/kitline1
cd /path/to/kitline1 && node server/server.js
```

Then open http://127.0.0.1:4000/kitchen-sop/

## Source

- App: this folder (relative URLs — works at `/kitchen-sop/`)
- Markdown masters: `docs/sops/kiteline-commercial/`
- Kiteline live wiring: `kiteline-uk-dropin/` → copy onto [kitline1](https://github.com/shyam1-jpg/kitline1)
