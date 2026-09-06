# Microsoft Store resubmission — Parslia Kitchen OS

Use this file in Partner Center after the site changes are live on `https://parslia.app`.
The certification email is generic. Open **Apps and games → Parslia Kitchen OS → Certification report** and confirm the policy numbers before you click Submit.

This product must be submitted as a **PWA of the kitchen workspace**, not the marketing landing page.

| Item | Value |
|------|--------|
| Product name | Parslia Kitchen OS |
| Short name to reserve | Parslia |
| Start URL | `https://parslia.app/app.html` |
| Kitchen app | `https://parslia-kitchen-os-667132.onhercules.app/` |
| Privacy URL | `https://parslia.app/privacy.html` |
| Support URL | `https://parslia.app/support.html` |
| Terms URL | `https://parslia.app/terms.html` |
| Website | `https://parslia.app/` |
| Support email | hello@parslia.app |
| Category | Business |
| Secondary category | Productivity (or Food & dining if offered) |
| Product type | MSIX or PWA app — not a Game |

Reserve **both** `Parslia Kitchen OS` and `Parslia` under Manage app names. PWABuilder uses `short_name` as the package display name.

## Store listing copy

**Description** (plain text, no HTML or URLs):

```
Parslia Kitchen OS is professional kitchen software for chefs, caterers, retreat centres and hospitality teams.

Plan menus, manage recipes, control allergens, track stock and suppliers, run rota and kitchen logs in one system.

This product uses live generative AI. AI Image creates dish and recipe photos. AI Voice Finder finds recipes and kitchen information from speech. Network access is required for those features. Outputs can be incomplete or inaccurate and must be checked by a competent person, especially allergens and food-safety information.

Paid plans may be offered at checkout. Typical list prices range from £39 per month for Starter to £149 per month for Business, plus an optional £9.99 AI Image Booster. The price shown at checkout controls. Web checkout is processed by Hercules Commerce. Deleting the app does not cancel a subscription.

Report inappropriate AI content to hello@parslia.app with the subject Report AI content.
```

**Product features**

- AI Image — live generative dish and recipe photos
- AI Voice Finder — hands-free recipe and kitchen search
- Recipe library with scaling and print
- Menu planner for service, retreats and events
- Allergen control
- Stock and suppliers
- Staff rota
- Fridge, freezer, cleaning and compliance logs

**Search terms** (max 7, no prices, no other product titles)

```
kitchen software
chef
recipe
menu planner
allergen
catering
rota
```

**What’s new in this version**

```
Windows Store PWA opens the live kitchen workspace. Privacy, terms and support cover Windows, web and iOS. Live generative AI is disclosed, with a report path for AI content.
```

## Properties

- Privacy policy: Yes — `https://parslia.app/privacy.html`
- Support info: `https://parslia.app/support.html` and `hello@parslia.app`
- Internet connection: Required
- Product declarations: This product uses live generative AI
- Display mode: Prefer Windows 11 / desktop
- System requirements: 64-bit Windows, internet required, microphone optional for AI Voice Finder, camera optional for AI Image

## Age ratings questionnaire

Answer for a professional B2B kitchen app. Re-check if the shipping build changes.

| Topic | Answer |
|-------|--------|
| Users interact or share with others online | Yes if customers can invite staff into a shared kitchen workspace; otherwise No and describe private workspace uploads in notes |
| Users can communicate online | Typically No unless the build adds public chat |
| Users can share their location | No unless a later build adds it |
| Users can upload user-generated content | Yes — recipes, photos, menus and kitchen files |
| The product contains live generative AI | Yes |
| Unrestricted web browsing | No |
| Alcohol, tobacco, weapons, drugs as a theme | No |
| Medical or treatment information | No. Allergen and food-safety tools require professional verification and do not diagnose |
| Targeting children | No |
| Offensive language | No |

## Notes for certification

Paste into Submission options. Replace the demo login before submit.

```
Parslia Kitchen OS is a professional kitchen operations PWA.

Start URL: https://parslia.app/app.html
The first-run screen explains the product. Click Enter kitchen to open the live workspace at https://parslia-kitchen-os-667132.onhercules.app/

Demo account for review:
  Email: [PROVIDE REVIEWER EMAIL]
  Password: [PROVIDE REVIEWER PASSWORD]

Internet is required. AI Image and AI Voice Finder are live generative AI features and need network access. Microphone permission is only used for AI Voice Finder. Camera/photos are only used when the reviewer chooses AI Image.

This is a non-game PC product. Digital subscriptions may use Hercules Commerce (secure third-party checkout) as shown in the product. Microsoft Store in-product purchase APIs are not required for this PC business app.

Privacy: https://parslia.app/privacy.html
Support: https://parslia.app/support.html
Report AI content: hello@parslia.app
```

## Screenshots

Partner Center needs at least one desktop PNG. Provide four or more.

- Size: 1366 × 768 or larger, PNG, under 50 MB, opaque
- Capture the real kitchen workspace, not the marketing mock on the landing page
- Suggested set: dashboard, recipe library, AI Image, AI Voice Finder, menu planner, allergen/logs
- Keep important text in the top three-quarters of the image

## Package with PWABuilder

1. Confirm `https://parslia.app/manifest.webmanifest` and `https://parslia.app/app.html` are live (GitHub Pages after merge to `main`).
2. Open [PWABuilder](https://www.pwabuilder.com/).
3. Enter `https://parslia.app/app.html` (or `https://parslia.app/` — start_url still resolves to `/app.html`).
4. Fix any Action Items for icons, name, short_name, HTTPS, or service worker.
5. Package for Microsoft Store using the Partner Center Package/Publisher IDs.
6. Upload the `.msixbundle` and `.classic.appxbundle` on the Packages page.
7. Do not package the marketing page as the only start experience.

## Owner-only steps this agent cannot do

1. Open the Partner Center certification report and match each cited policy.
2. Create a working reviewer demo account and put it in Notes for certification.
3. Run PWABuilder, upload packages, complete age ratings, and click **Submit for certification**.
4. After approval, replace the Microsoft Store badge `href` in `index.html` with the live Store URL.

## Policy map for this update

| Policy | What we changed |
|--------|-----------------|
| 10.1.1 / 10.1.2 | PWA start URL is a working kitchen shell, not a coming-soon landing page |
| 10.1.3 | Search terms limited to seven relevant phrases |
| 10.1.5 | Apple and Google badges hide in Microsoft Store context |
| 10.3.1 / 10.3.2 | Certification notes ask for a demo account; kitchen URL is the live server |
| 10.5.1 | Privacy policy covers Windows, web, Apple, AI providers and checkout |
| 10.8.4 / 10.8.6 | Subscription terms and listing disclose plan names and price range |
| 11.11 | Age-ratings answers documented |
| 11.16 | Live generative AI disclosed; report path is hello@parslia.app |
