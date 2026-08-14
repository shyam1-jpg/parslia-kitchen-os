# Vedanta Limited — Veg SOP Pocket App

Mobile pocket app for **Vedanta Limited** vegetarian kitchen SOPs.  
Works on **Android** and **iPhone / iPad**.

## Click to open (phone browser)

**[Open Vedanta Limited Veg SOP app](https://htmlpreview.github.io/?https://raw.githubusercontent.com/shyam1-jpg/parslia-kitchen-os/cursor/vedanta-vegetarian-sops-8cdc/vedanta-sop-app/standalone.html)**

Then add it to your home screen (see below).

## Install on your phone

### Android (Chrome)
1. Open the link above in Chrome.  
2. Menu ⋮ → **Install app** or **Add to Home screen**.  
3. Open from the home screen icon.

### iPhone / iPad (Safari)
1. Open the link above in **Safari**.  
2. Tap Share □↑ → **Add to Home Screen**.  
3. Tap **Add**. Open from the home screen anytime (works offline after first open when using the full PWA folder below).

## Full PWA folder (offline install)

For the installable offline Progressive Web App (service worker + icons):

https://github.com/shyam1-jpg/parslia-kitchen-os/tree/cursor/vedanta-vegetarian-sops-8cdc/vedanta-sop-app

Serve the folder over HTTPS (or localhost), then Add to Home Screen.

## What’s inside

- Home with Vedanta Limited branding  
- All SOPs VV-00 → VV-08  
- Hard rules (no onion / no garlic / no chai SOP)  
- Search  
- Install guide tab  

## Local preview

```bash
cd vedanta-sop-app
python3 -m http.server 8765
```

Open http://localhost:8765

## Source SOPs

Markdown masters: `docs/sops/vedanta-vegetarian/`  
App content: `data/sops.js` (also inlined in `standalone.html`)
