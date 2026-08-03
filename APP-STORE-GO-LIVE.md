# Parslia Kitchen OS — App Store go-live

Sell Parslia on the Apple App Store. This file is the single checklist.

| Item | Value |
|------|--------|
| App name | **Parslia Kitchen OS** |
| Bundle ID | `app.parslia.kitchen` |
| Marketing | https://parslia.app |
| Privacy (required) | https://parslia.app/privacy/ |
| Terms | https://parslia.app/terms/ |
| Kitchen OS (package this) | https://parslia-kitchen-os-667132.onhercules.app |
| Branded host (optional) | https://app.parslia.app (GoDaddy DNS — `APP-DOMAIN-DNS.md`) |
| Native project | `native/` (Capacitor iOS) |
| App icon 1024×1024 | `assets/parslia-app-icon-1024.png` |
| Support email | hello@parslia.app |

**Do not package** the marketing homepage (`parslia.app`) in PWA Builder / store tooling. Package **Kitchen OS**.

---

## Status

| Step | Who | Status |
|------|-----|--------|
| Marketing site live | — | Done (`parslia.app` → GitHub Pages) |
| Privacy + Terms pages | Cloud | Done in repo (`/privacy/`, `/terms/`) — live after merge to `main` |
| Capacitor iOS shell | Cloud | Done scaffolding in `native/` |
| 1024 App Store icon | Cloud | Done (`assets/parslia-app-icon-1024.png`) |
| Listing copy | Cloud | Ready in `CLOUD-LAUNCH-APP-STORE.md` § B3 |
| `app.parslia.app` DNS | Owner (GoDaddy + Hercules) | Pending |
| Apple Developer Program ($99/yr) | Owner | Required |
| Mac + Xcode Archive | Owner | Required |
| App Store Connect app + screenshots | Owner | Required |
| Demo reviewer login | Owner | Required |
| Submit for review | Owner | Required |

---

## A) Owner — Apple account (once)

1. Enrol: https://developer.apple.com/programs/  
2. Sign in to https://appstoreconnect.apple.com  
3. **My Apps → + → New App**  
   - Platforms: iOS  
   - Name: `Parslia Kitchen OS`  
   - Primary language: English (U.K.)  
   - Bundle ID: register `app.parslia.kitchen` if needed  
   - SKU: `parslia-kitchen-os`  
4. Pricing: set your sell price / freemium + IAP later if needed.

---

## B) Owner — build on a Mac

```bash
cd native
npm install
npx cap sync ios
npx cap open ios
```

In Xcode:

1. Signing & Capabilities → Team = your Apple Developer team  
2. Bundle Identifier = `app.parslia.kitchen`  
3. Deployment target iOS 15+  
4. App Icons → drag `assets/parslia-app-icon-1024.png` (no transparency)  
5. Confirm `Info.plist` usage strings (added by sync / see `native/ios/.../Info.plist`):  
   - Microphone — AI Voice Finder  
   - Camera / Photo Library — AI Image uploads  
6. Product → Archive → Distribute App → App Store Connect → Upload  

After DNS for `app.parslia.app` is live, change `native/capacitor.config.json` → `server.url` to `https://app.parslia.app`, then `npx cap sync ios` and archive again.

---

## C) Owner — App Store Connect listing

Paste copy from `CLOUD-LAUNCH-APP-STORE.md` (name, subtitle, description, keywords).

| Field | URL |
|-------|-----|
| Privacy Policy | https://parslia.app/privacy/ |
| Support | https://parslia.app |
| Marketing | https://parslia.app |

Screenshots (minimum): iPhone 6.7" and 6.1" — dashboard, recipes, AI Image, AI Voice Finder, menu planner, allergens/logs.

**App Review notes** (fill email/password):

```
Parslia Kitchen OS is a B2B kitchen operations app.
Demo login:
  Email: [YOUR DEMO EMAIL]
  Password: [YOUR DEMO PASSWORD]
AI Image and AI Voice Finder need network access.
Microphone is only used for AI Voice Finder.
```

---

## D) Sell / go live

1. TestFlight → internal test (AI Image + Voice Finder)  
2. Submit for App Review  
3. On **Ready for Sale**, set availability and price  
4. Put the App Store URL into landing badges in `index.html` (`#get-app`)  
5. Optional: Google Play later (`npx cap add android` in `native/`)

---

## E) PWA Builder (Windows packaging alternative)

1. Open https://www.pwabuilder.com  
2. Enter `https://parslia-kitchen-os-667132.onhercules.app` (not parslia.app)  
3. Package for Stores → iOS / Android  
4. Still need Apple Developer + Xcode/Transporter for App Store upload  

---

## Blocked without you

Cloud cannot log into Apple, pay the developer fee, sign with your certificates, or click Submit.
After privacy/terms are on `main` and you have a Mac + Apple account, follow sections A–D above.
