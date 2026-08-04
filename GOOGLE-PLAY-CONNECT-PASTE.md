# Google Play Console — paste kit (Parslia Kitchen OS)

Use while waiting for Apple review.  
Open: https://play.google.com/console

**Fee:** Google Play Console one-time registration is usually **$25** (separate from Apple).

---

## 1) Create the app

1. Play Console → **Create app**
2. App name: `Parslia Kitchen OS`
3. Default language: English (United Kingdom) — or English (United States)
4. App or game: **App**
5. Free or paid: choose **Paid** (or Free + later subscriptions)
6. Declarations: accept Play policies / US export laws as shown

---

## 2) Store listing (Main store listing)

| Field | Paste |
|-------|--------|
| App name | Parslia Kitchen OS |
| Short description | Smarter kitchens. Calmer chefs. AI Image + AI Voice Finder for pro kitchens. |
| Full description | *(same block as Apple — below)* |

**Full description:**

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
Privacy: https://parslia.app/privacy/
```

**Graphics**
| Asset | File |
|-------|------|
| App icon (512×512) | Scale from `assets/parslia-app-icon-1024.png` (Play accepts 512; 1024 also fine to downscale) |
| Feature graphic (1024×500) | `assets/parslia-play-feature-1024x500.png` |
| Phone screenshots | At least 2 (dashboard, recipes, AI Image, Voice Finder recommended) |

**Contact**
| Field | Value |
|-------|--------|
| Email | hello@parslia.app |
| Website | https://parslia.app |
| Privacy policy | https://parslia.app/privacy/ |

---

## 3) App content / policy

| Section | Suggested |
|---------|-----------|
| Privacy policy | `https://parslia.app/privacy/` |
| Ads | No |
| Target audience | 18+ (business kitchen tool) — or as console wizard suggests for productivity |
| News app | No |
| COVID-19 | No |
| Data safety | Collect account email / app activity / photos&videos / audio if AI features used — for app functionality; not sold |
| Government apps | No |

Fill Data safety honestly: account info, photos (optional AI Image), microphone audio (optional Voice Finder), app interactions.

---

## 4) Package / application ID

Already set in Capacitor:

- **Application ID:** `app.parslia.kitchen`
- Project: `native/android`

---

## 5) Build & upload (needs Android Studio on your PC/Mac)

```bash
git clone https://github.com/shyam1-jpg/parslia-kitchen-os.git
cd parslia-kitchen-os/native
npm install
npx cap sync android
npx cap open android
```

In Android Studio:
1. Wait for Gradle sync  
2. **Build → Generate Signed Bundle / APK → Android App Bundle**  
3. Create/upload a Play upload keystore (keep it safe)  
4. Build **release** `.aab`  
5. Play Console → **Production** (or Testing → Internal testing first) → **Create release** → upload the `.aab`

**Recommended:** start with **Internal testing** → then **Closed/Open testing** → then **Production**.

---

## 6) Pricing & countries

1. **Monetise → Products / Pricing** (or App pricing)  
2. Set sell price / paid app price, or Free  
3. Countries: start with United Kingdom (or all you want)

---

## 7) Send for review

Complete Dashboard checklist (green ticks) → **Send for review** / **Publish**.

---

## Review notes (optional)

```
Parslia Kitchen OS is a B2B kitchen operations app.
Demo login:
  Email: [DEMO EMAIL]
  Password: [DEMO PASSWORD]
Microphone is used only for AI Voice Finder.
Camera/photos only when the user adds images for AI Image or recipes.
```
