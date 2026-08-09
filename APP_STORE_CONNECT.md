# Parslia Kitchen OS — App Store Connect setup

Use this file while creating the app in [App Store Connect](https://appstoreconnect.apple.com).

## Already prepared in this repo

| Item | Location |
|------|----------|
| Screenshots (1284×2778) | `assets/app-store-screenshots/1284x2778/` |
| Screenshots (1242×2688) | `assets/app-store-screenshots/1242x2688/` |
| App icon 1024×1024 (no alpha) | `assets/app-store-icon-1024.png` |
| Privacy URL | https://parslia.app/privacy (`privacy.html`) |
| Terms / marketing | https://parslia.app · https://parslia.app/terms |
| Capacitor iOS shell | `mobile/` |
| Owner Mac steps | `mobile/README.md` |

## App identity

| Field | Value |
|-------|--------|
| Name | Parslia Kitchen OS |
| Bundle ID | `app.parslia.kitchen` |
| SKU | `parslia-kitchen-os` |
| Primary language | English (U.K.) |
| Category | Business |
| Secondary | Food & Drink |
| Age rating | 4+ |
| Support URL | https://parslia.app |
| Marketing URL | https://parslia.app |
| Privacy Policy URL | https://parslia.app/privacy |

## Listing copy (paste)

**Subtitle** (30 characters max):  
`Smarter kitchens. Calmer chefs.`

**Promotional text** (170 characters):  
`Now with AI Image and AI Voice Finder — create dish photos and find recipes by voice.`

**Description:**

```
Parslia Kitchen OS is professional kitchen software for chefs, caterers, retreat centres and hospitality teams.

Plan menus, manage recipes, control allergens, track stock and suppliers, run rota and kitchen logs — all in one calm system.

AI FEATURES
• AI Image — generate professional dish and recipe photos for menus, boards and training
• AI Voice Finder — speak to find recipes, ingredients and kitchen information hands-free during prep and service

ALSO INCLUDES
• Recipe library with scaling and print
• Menu planner for breakfast, lunch, dinner, retreats and events
• Allergen control
• Stock and suppliers
• Staff rota
• Fridge, freezer, cleaning and compliance logs
• Labels and reports

Built for vegetarian-friendly and sattvic kitchen operations as well as general professional kitchens.

Website: https://parslia.app
Support: hello@parslia.app
```

**Keywords:**  
`kitchen,chef,recipe,menu,allergen,catering,stock,rota,HACCP,AI`

## Screenshots upload

1. App Store Connect → your app → **iOS App** → **App Store** tab → Screenshots.
2. Upload all 10 PNGs from **`assets/app-store-screenshots/1284x2778/`** (exact Apple size).
3. Do not mix with 1242×2688 in the same device set.
4. Suggested order: Recipe Library → Dashboard → AI Image → AI Voice → Menu → Allergens → Portions → Logs → Stock → Rota.

## App Review notes (paste)

```
Parslia Kitchen OS is a B2B kitchen operations app.
Demo login for review:
  Email: [PROVIDE BEFORE SUBMIT]
  Password: [PROVIDE BEFORE SUBMIT]
AI Image and AI Voice Finder require network access.
Microphone permission is only used for AI Voice Finder.
Privacy policy: https://parslia.app/privacy
```

## Owner-only clicks (cannot be done by Cloud)

1. Enrol in [Apple Developer Program](https://developer.apple.com/programs/) (~£79/year) if not already.
2. App Store Connect → **My Apps** → **+** → New App → iOS → name **Parslia Kitchen OS** → Bundle ID `app.parslia.kitchen`.
3. On a Mac: follow `mobile/README.md` (Xcode, signing, Archive, upload).
4. Fill listing using copy above; upload icon + screenshots.
5. Add demo login in Review Notes.
6. Submit for review.
7. After approval, replace `#early-access` App Store badge in `index.html` with the real App Store URL.
