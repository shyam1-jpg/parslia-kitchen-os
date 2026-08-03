# App Store Connect — paste kit (Parslia Kitchen OS)

Use this **after** Apple Developer enrollment is **Active**.  
Open: https://appstoreconnect.apple.com → **My Apps** → **+** → **New App**

---

## New App form

| Field | Paste |
|-------|--------|
| Platforms | iOS |
| Name | Parslia Kitchen OS |
| Primary Language | English (U.K.) |
| Bundle ID | Register new: `app.parslia.kitchen` |
| SKU | parslia-kitchen-os |
| User Access | Full Access |

---

## App Information

| Field | Paste |
|-------|--------|
| Name | Parslia Kitchen OS |
| Subtitle | Smarter kitchens. Calmer chefs. |
| Category (Primary) | Business |
| Category (Secondary) | Food & Drink |
| Content Rights | Does not contain third-party content (or declare if you use stock later) |
| Age Rating | 4+ (no unrestricted web browsing; no UGC social) |

**Privacy Policy URL:**  
`https://parslia.app/privacy/`

**Support URL:**  
`https://parslia.app`

**Marketing URL (optional):**  
`https://parslia.app`

---

## Description

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

**Promotional text (170 chars max):**
```
Now with AI Image and AI Voice Finder — create dish photos and find recipes by voice.
```

**Keywords:**
```
kitchen,chef,recipe,menu,allergen,catering,stock,rota,HACCP,AI
```

---

## App Review Information

| Field | Value |
|-------|--------|
| First name | (your name) |
| Last name | (your name) |
| Phone | (your phone) |
| Email | hello@parslia.app |

**Notes for review:**
```
Parslia Kitchen OS is a B2B kitchen operations app for professional kitchens.

Demo login for App Review:
  Email: [PASTE DEMO EMAIL]
  Password: [PASTE DEMO PASSWORD]

AI Image and AI Voice Finder require network access.
Microphone permission is only used for AI Voice Finder.
Camera/Photos only when the user chooses to add images for AI Image or recipes.
```

Create a demo kitchen login in Hercules **before** submit, then paste email/password above.

---

## Pricing

1. **Pricing and Availability** → set your sell price (or Free + later In‑App Purchase).
2. Availability: all countries you want to sell in (or start with United Kingdom only).

---

## Build upload (needs a Mac)

```bash
cd native
npm install
npx cap sync ios
npx cap open ios
```

Xcode → select your **Team** → Product → **Archive** → **Distribute App** → App Store Connect → Upload.  
Then in App Store Connect → your version → **Build** → select the uploaded build.

---

## Screenshots (required)

Minimum: iPhone **6.7"** and **6.1"**. Suggested order:

1. Dashboard  
2. Recipe library  
3. AI Image  
4. AI Voice Finder  
5. Menu planner  
6. Allergens / logs  

Capture from Simulator or a device after the Xcode build runs.

---

## Submit

Version page → **Add for Review** → **Submit to App Review**.
