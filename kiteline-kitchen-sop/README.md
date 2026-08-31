# Kiteline — Kitchen SOP + short videos

Pocket app for **professional commercial kitchens** (hotels, restaurants, catering, schools, production).  
Not home cooking. Not the Vedanta vegetarian pack.

## Open on a phone

**[Open Kiteline Kitchen SOP](https://htmlpreview.github.io/?https://raw.githubusercontent.com/shyam1-jpg/parslia-kitchen-os/cursor/kiteline-commercial-kitchen-sop-fd29/kiteline-kitchen-sop/standalone.html)**

Then: Android Chrome → Add to Home screen · iPhone Safari → Share → Add to Home Screen.

## What’s inside

- **13 SOPs** CK-00 → CK-12: brigade, opening, goods-in, stores, mise en place, HACCP temps, allergens, pass, cleaning, close-down, lifting, knives, raw vs RTE
- **Short video** on every SOP (50–65 second briefing, play/pause)
- **Videos tab** — sort by station: Hygiene, Stores, Line, Service, Safety, Close-down
- House rules for the pass
- Offline PWA after first open

## Local preview

```bash
cd kiteline-kitchen-sop
python3 -m http.server 8766
```

Open http://localhost:8766

## Source

- App: this folder
- Markdown masters: `docs/sops/kiteline-commercial/`
- Copy to Kiteline live later: `kiteline.uk` / `site/` on [kitline1](https://github.com/shyam1-jpg/kitline1)
