# Your clicks to finish the Apple App Store (Shyam)

Cloud prepared the listing pack, legal pages, screenshots, icon, and Capacitor shell.  
**Only you can finish these steps** (Apple login + Mac required).

## A. Apple account (once)

1. Open https://developer.apple.com/programs/  
2. Enrol / renew Apple Developer Program (~£79/year) with your Apple ID  
3. Wait until membership shows **Active**

## B. Create the app in App Store Connect

1. Open https://appstoreconnect.apple.com → **My Apps** → **+** → **New App**  
2. Platforms: **iOS**  
3. Name: **Parslia Kitchen OS**  
4. Primary language: English (U.K.)  
5. Bundle ID: register `app.parslia.kitchen` if needed, then select it  
6. SKU: `parslia-kitchen-os`  
7. Create the app record  

## C. Paste listing (from `APP_STORE_CONNECT.md`)

1. Subtitle, promotional text, description, keywords  
2. Support URL: `https://parslia.app`  
3. Marketing URL: `https://parslia.app`  
4. Privacy Policy URL: `https://parslia.app/privacy`  
5. Category: Business (+ Food & Drink)  
6. Age rating: 4+  

## D. Upload media

1. App icon: `assets/app-store-icon-1024.png` (1024×1024)  
2. **iPhone** screenshots: all 10 in `assets/app-store-screenshots/1284x2778/`  
3. **Mac** screenshots (computer): all 10 in `assets/app-store-screenshots/mac/2560x1600/`  

## E. Build on your Mac

```bash
cd mobile
npm install
npm run build:www
npx cap add ios
npx cap sync ios
npx cap open ios
```

In Xcode: set Team, Bundle ID `app.parslia.kitchen`, App Icon, privacy strings from `mobile/ios-config/Info.plist.additions.xml`, then **Archive → Distribute → App Store Connect**.

Full notes: `mobile/README.md`.

## F. App Review

1. Add a working demo login in Review Notes (see `APP_STORE_CONNECT.md`)  
2. Submit for review  

## G. After approval

1. Copy the App Store URL  
2. In `index.html`, change the App Store badge from `href="#early-access"` to that URL  
3. Push to GitHub so https://parslia.app badges go live  

## Need before submit

- [ ] Apple Developer membership active  
- [ ] Demo reviewer email + password  
- [ ] Confirm https://parslia.app/privacy loads (after this PR is on GitHub Pages)  
- [ ] Mac + Xcode archive uploaded  
