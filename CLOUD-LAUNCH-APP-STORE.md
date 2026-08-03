# Parslia — Cloud handoff: launch strips + Apple App Store

**Give this whole file to Hercules / Cursor Cloud.**  
Local marketing page is already updated with launch strips and App Store section.

| Item | Value |
|------|--------|
| Repo | https://github.com/shyam1-jpg/parslia-kitchen-os |
| Local folder | `C:\Users\shyam prasad\Desktop\parslia-kitchen-os\` |
| Landing page | `index.html` + `styles.css` + `script.js` |
| Marketing domain | https://parslia.app (GitHub Pages) |
| Kitchen OS (temp) | https://parslia-kitchen-os-667132.onhercules.app |
| Kitchen OS (branded) | https://app.parslia.app — GoDaddy DNS, see `APP-DOMAIN-DNS.md` |
| DNS registrar | **GoDaddy** (`ns63/ns64.domaincontrol.com`) |
| Contact | hello@parslia.app |
| Product | Parslia Kitchen OS |
| Must advertise | **AI Image** + **AI Voice Finder** |

---

## Already done (landing page)

- [x] Launch strip: AI Image · AI Voice Finder · Recipe library · Menu planner · Allergen control · App Store ready  
- [x] Audience strip: kitchens / catering / retreats / hotels / vegetarian / food production  
- [x] `#get-app` section with App Store + Google Play badges (link to early access until real store URLs exist)  
- [x] Privacy + Terms stubs (`#privacy`, `#terms`) for store listing readiness  
- [x] Full legal pages: `/privacy/`, `/terms/` (App Store URLs)  
- [x] Capacitor iOS shell in `native/` (bundle `app.parslia.kitchen`)  
- [x] 1024×1024 App Store icon: `assets/parslia-app-icon-1024.png`  
- [x] Go-live checklist: `APP-STORE-GO-LIVE.md`  
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

1. Wrap **Kitchen OS** (Hercules), not marketing and not `libraix/`.  
   Capacitor project already lives in `native/` with `server.url` → Hercules.  
2. On a Mac:

```bash
cd native
npm install
npx cap sync ios
npx cap open ios
```

3. In Xcode:  
   - Set Team = Shyam’s Apple Developer team  
   - Bundle Identifier = `app.parslia.kitchen` (already set)  
   - Deployment target iOS 15+ (already set)  
   - App Icon from `assets/parslia-app-icon-1024.png` (already copied into Assets)  
   - Microphone / Camera / Photos usage strings already in `Info.plist`  
4. Archive → Distribute App → App Store Connect.  
5. Full click-path: **`APP-STORE-GO-LIVE.md`**.

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

1. ~~Create real pages~~ → Done: `/privacy/`, `/terms/` in repo.  
2. Merge to `main` so GitHub Pages serves https://parslia.app/privacy/ and `/terms/`.  
3. In App Store Connect set Privacy Policy URL to `https://parslia.app/privacy/`.  
4. Footer on landing already links to these pages.

---

## Cloud task E — launch checklist (do in order)

1. Marketing DNS → GitHub Pages live on parslia.app *(done)*  
2. Owner: GoDaddy + Hercules Domains → `app.parslia.app` for Kitchen OS (`APP-DOMAIN-DNS.md`)  
3. PWA Builder / store package against Kitchen OS URL (not marketing homepage)  
4. Full privacy + terms live  
5. Production app URL stable (HTTPS) — prefer `https://app.parslia.app`  
6. Capacitor iOS build signed  
7. Screenshots + listing text uploaded  
8. TestFlight internal test (AI Image + AI Voice Finder)  
9. Submit for App Review  
10. On approval: paste App Store URL into `index.html` store badge  
11. Announce early-access list via hello@parslia.app  

---

## Owner-only secrets (do not commit)

- Apple ID + Developer enrollment  
- App Store Connect API key (if automating)  
- OpenAI / AI API keys for Image + Voice  
- Demo reviewer login password  

---

## Hercules thread reference

https://hercules.app/dashboard/app/01KRRZFRR3VVK2SZH1VB8KNXWH?threadId=01KRRZFRVRF2M443ETX6RQ6AK5

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
