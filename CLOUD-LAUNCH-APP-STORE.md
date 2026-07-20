# Parslia — Cloud handoff: launch strips + Apple App Store

**Give this whole file to Hercules / Cursor Cloud.**  
Local marketing page is already updated with launch strips and App Store section.

| Item | Value |
|------|--------|
| Repo | https://github.com/shyam1-jpg/parslia-kitchen-os |
| Local folder | `C:\Users\shyam prasad\Desktop\parslia-kitchen-os\` |
| Landing page | `index.html` + `styles.css` + `script.js` |
| Domain | https://parslia.app |
| Contact | hello@parslia.app |
| Product | Parslia Kitchen OS |
| Must advertise | **AI Image** + **AI Voice Finder** |

---

## Already done (landing page)

- [x] Launch strip: AI Image · AI Voice Finder · Recipe library · Menu planner · Allergen control · App Store ready  
- [x] Audience strip: kitchens / catering / retreats / hotels / vegetarian / food production  
- [x] `#get-app` section with App Store + Google Play badges (link to early access until real store URLs exist)  
- [x] Privacy + Terms stubs (`#privacy`, `#terms`) for store listing readiness  
- [x] Hero / features / modules mention AI Image + AI Voice Finder  

**Cloud task A — publish landing**

1. Pull latest `main` from `shyam1-jpg/parslia-kitchen-os`.  
2. Confirm `index.html` has `#get-app` and launch strips.  
3. Fix GoDaddy DNS so `parslia.app` points to **GitHub Pages** (not Website Builder):  
   - A `@` → `185.199.108.153`, `185.199.109.153`, `185.199.110.153`, `185.199.111.153`  
   - CNAME `www` → `shyam1-jpg.github.io`  
   - Turn off GoDaddy Website Builder for this domain  
4. GitHub → Settings → Pages → custom domain `parslia.app` → Enforce HTTPS.  
5. Verify https://parslia.app shows the Parslia landing (not a GoDaddy template).  
6. After Apple / Play approve the apps, replace badge `href="#early-access"` with real store URLs.

---

## Cannot be done without the owner

Cloud / agent **cannot** finish these without Shyam’s accounts and approval:

- Apple Developer Program login / payment  
- App Store Connect app creation and submission  
- Signing certificates / provisioning profiles on his Mac  
- Final privacy policy legal text (lawyer optional)  
- Real App Store screenshots from a running iOS build  

---

## Cloud task B — make iOS App Store build (Capacitor)

Parslia currently has a web landing + `libraix/` web app. There is **no Capacitor/Xcode project yet**. Build one.

### B1. Prerequisites (owner must provide)

- Apple Developer account (paid): https://developer.apple.com  
- Mac with Xcode 15+ installed  
- Bundle ID decision, e.g. `app.parslia.kitchen`  
- App name: **Parslia Kitchen OS**  
- Support URL: `https://parslia.app`  
- Privacy URL: `https://parslia.app/privacy` (create real page first)  
- Marketing URL: `https://parslia.app`

### B2. Wrap the web app (or PWA) for iOS

1. Choose the app shell to wrap:  
   - Prefer production web app URL once hosted (e.g. `https://app.parslia.app`), **or**  
   - Build static/PWA from `libraix/frontend` and point Capacitor at it.  
2. In the app project root:

```bash
npm i @capacitor/core @capacitor/cli @capacitor/ios
npx cap init "Parslia Kitchen OS" app.parslia.kitchen
npx cap add ios
npx cap sync ios
npx cap open ios
```

3. In Xcode:  
   - Set Team = Shyam’s Apple Developer team  
   - Bundle Identifier = `app.parslia.kitchen`  
   - Deployment target iOS 15+  
   - Add App Icon from `assets/USE_THIS_parslia_app_icon_1024.png` (1024×1024, no alpha for App Store)  
   - Enable capabilities needed: Microphone (AI Voice Finder), Camera/Photos if AI Image uses them  
4. Add `Info.plist` usage strings:  
   - `NSMicrophoneUsageDescription` — “Parslia uses the microphone for AI Voice Finder.”  
   - `NSCameraUsageDescription` / `NSPhotoLibraryUsageDescription` if image capture/upload is used  
5. Archive → Distribute App → App Store Connect.

### B3. App Store Connect listing copy (paste this)

**Name:** Parslia Kitchen OS  

**Subtitle:** Smarter kitchens. Calmer chefs.  

**Promotional text:**  
Now with AI Image and AI Voice Finder — create dish photos and find recipes by voice.

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

**Keywords:** kitchen,chef,recipe,menu,allergen,catering,stock,rota,HACCP,AI  

**Category:** Business (secondary: Food & Drink)  

**Age rating:** 4+ (no unrestricted web; no user-generated public social)  

**Support URL:** https://parslia.app  
**Marketing URL:** https://parslia.app  
**Privacy Policy URL:** https://parslia.app/privacy  

### B4. Screenshots required (create from simulator or device)

Apple needs screenshots for the device sizes you support (at minimum 6.7" and 6.1" iPhone; add iPad if iPad app).

Suggested 6 screens (in order):

1. Dashboard — “Today’s kitchen”  
2. Recipe library  
3. **AI Image** generating / showing a dish photo  
4. **AI Voice Finder** listening / search results  
5. Menu planner  
6. Allergen / logs compliance  

Export PNG, no status-bar clutter if possible. Use Parslia green `#063F32` and copper `#B87333` in framing if adding marketing frames.

### B5. App Review notes (for Apple)

```
Parslia Kitchen OS is a B2B kitchen operations app.
Demo login for review:
  Email: [PROVIDE]
  Password: [PROVIDE]
AI Image and AI Voice Finder require network access.
Microphone permission is only used for AI Voice Finder.
```

---

## Cloud task C — Google Play (optional, same week)

1. Create Google Play Console listing.  
2. Use same icon + feature graphic (1024×500).  
3. Same description; mention AI Image + AI Voice Finder.  
4. Build Android with Capacitor (`npx cap add android`) after iOS path works.  
5. Put Play Store URL into landing badge `store-google`.

---

## Cloud task D — legal pages before submit

1. Create real pages:  
   - `privacy.html` or `/privacy`  
   - `terms.html` or `/terms`  
2. Cover: account data, kitchen data, AI providers (OpenAI etc.), cookies, contact email, deletion request.  
3. Link them from footer and App Store Connect.  
4. Replace the short stubs currently in `index.html` `#privacy` / `#terms` with links to full pages.

---

## Cloud task E — launch checklist (do in order)

1. DNS → GitHub Pages live on parslia.app  
2. Full privacy + terms live  
3. Production app URL stable (HTTPS)  
4. Capacitor iOS build signed  
5. Screenshots + listing text uploaded  
6. TestFlight internal test (AI Image + AI Voice Finder)  
7. Submit for App Review  
8. On approval: paste App Store URL into `index.html` store badge  
9. Push landing update to GitHub  
10. Announce early-access list via hello@parslia.app  

---

## Owner-only secrets (do not commit)

- Apple ID + Developer enrollment  
- App Store Connect API key (if automating)  
- OpenAI / AI API keys for Image + Voice  
- Demo reviewer login password  

---

## Hercules thread reference

https://hercules.app/dashboard/app/01KRRZFRR3VVK2SZH1VB8KNXWH?threadId=01KWSDMG33E9MVSWWZZ9XDRBQN

---

## One-line prompt to paste into Cloud / Hercules

```
Open repo shyam1-jpg/parslia-kitchen-os. Follow CLOUD-LAUNCH-APP-STORE.md.
1) Publish landing (DNS + GitHub Pages) so parslia.app shows index.html with launch strips, AI Image, AI Voice Finder, and #get-app App Store section.
2) Create full /privacy and /terms pages.
3) Wrap the Parslia web app with Capacitor iOS, use bundle id app.parslia.kitchen, icon assets/USE_THIS_parslia_app_icon_1024.png, microphone + camera privacy strings for AI Voice Finder and AI Image.
4) Prepare App Store Connect listing using the copy in that file, generate screenshots, set up TestFlight.
Stop before final App Store submit if Apple Developer login is required — then list exact clicks for the owner.
```
