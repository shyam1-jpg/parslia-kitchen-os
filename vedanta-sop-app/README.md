# Vedanta Limited — Veg SOP Pocket App

Mobile pocket app for **Vedanta Limited** vegetarian kitchen SOPs.  
Works on **Android** and **iPhone / iPad** as an installable Progressive Web App (PWA).

## Open the app

After this branch is on GitHub, use one of these:

### Live preview (branch)

https://raw.githack.com/shyam1-jpg/parslia-kitchen-os/cursor/vedanta-vegetarian-sops-8cdc/vedanta-sop-app/index.html

### Repo folder

https://github.com/shyam1-jpg/parslia-kitchen-os/tree/cursor/vedanta-vegetarian-sops-8cdc/vedanta-sop-app

## Install on your phone

### Android (Chrome)
1. Open the app link in Chrome.  
2. Menu ⋮ → **Install app** or **Add to Home screen**.  
3. Open from the home screen icon.

### iPhone / iPad (Safari)
1. Open the app link in **Safari**.  
2. Tap Share □↑ → **Add to Home Screen**.  
3. Tap **Add**. Open from the home screen.

## What’s inside

- Home with Vedanta Limited branding  
- All SOPs VV-00 → VV-08  
- Hard rules (no onion / no garlic / no chai SOP)  
- Search  
- Offline support after first open  

## Local preview

```bash
cd vedanta-sop-app
python3 -m http.server 8765
```

Open http://localhost:8765 on your phone (same Wi‑Fi) or in a mobile browser emulator.

## Source SOPs

Markdown masters live in `docs/sops/vedanta-vegetarian/`.  
App content is embedded in `data/sops.js` for offline use.
