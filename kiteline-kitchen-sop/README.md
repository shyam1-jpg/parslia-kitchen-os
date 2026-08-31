# Kiteline — Kitchen SOP + short videos

Pocket app for **professional commercial kitchens** (hotels, restaurants, catering, schools, production).  
Not home cooking. Not the Vedanta vegetarian pack.

## Live URL (Kiteline)

**Intended production URL (same host as the rota):**  
https://kiteline.uk/kitchen-sop/

The rota is at https://kiteline.uk/vedanta-rota/. This SOP is a matching static PWA under `site/kitchen-sop/` on [kitline1](https://github.com/shyam1-jpg/kitline1) (Render → kiteline.uk).

Drop-in + apply script for the Kiteline product repo: [`../kiteline-uk-dropin/`](../kiteline-uk-dropin/).

This `parslia-kitchen-os` repo does **not** deploy to kiteline.uk. GitHub Pages here is `parslia.app`. Until kitline1 is merged and Render redeploys, kiteline.uk will 404 `/kitchen-sop/`.

## Open on a phone (after kitline1 deploy)

Open https://kiteline.uk/kitchen-sop/ then: Android Chrome → Add to Home screen · iPhone Safari → Share → Add to Home Screen.

## What’s inside

- **13 SOPs** CK-00 → CK-12: brigade, opening, goods-in, stores, mise en place, HACCP temps, allergens, pass, cleaning, close-down, lifting, knives, raw vs RTE
- **Short video** on every SOP (50–65 second briefing, play/pause)
- **Videos tab** — sort by station: Hygiene, Stores, Line, Service, Safety, Close-down
- House rules for the pass
- Offline PWA after first open (scope `/kitchen-sop/`)

## Local preview

```bash
cd kiteline-kitchen-sop
python3 -m http.server 8766
```

Open http://localhost:8766

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
