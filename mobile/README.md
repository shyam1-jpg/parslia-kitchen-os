# Parslia Kitchen OS — iOS (Capacitor)

This folder is the **native App Store shell**. Cloud agents prepare it; **you finish on a Mac** with Xcode and your Apple Developer team.

## Prerequisites (owner)

- Paid [Apple Developer Program](https://developer.apple.com/programs/) membership
- Mac with **Xcode 15+**
- Bundle ID: `app.parslia.kitchen`
- App icon: `../assets/app-store-icon-1024.png` (1024×1024, no alpha)

## One-time setup on your Mac

```bash
cd mobile
npm install
npm run build:www
npx cap add ios          # creates ios/ (Mac only)
npx cap sync ios
npx cap open ios
```

### In Xcode

1. Select the **App** target → **Signing & Capabilities**
2. Team = your Apple Developer team  
3. Bundle Identifier = `app.parslia.kitchen`  
4. Deployment target **iOS 15+**
5. Replace App Icon with `../assets/app-store-icon-1024.png` (Assets.xcassets → AppIcon)
6. Add privacy strings from `ios-config/Info.plist.additions.xml`:
   - Microphone → AI Voice Finder  
   - Camera / Photo Library → AI Image  
7. Product → **Archive** → **Distribute App** → App Store Connect

## What the shell loads

`capacitor.config.ts` currently points at **https://parslia.app**.  
When the full kitchen web app is live (e.g. `https://app.parslia.app`), change `server.url` and run `npm run sync` again.

## App Store Connect

Paste listing copy from [`../APP_STORE_CONNECT.md`](../APP_STORE_CONNECT.md).  
Upload screenshots from `../assets/app-store-screenshots/1284x2778/`.

## After Apple approves

1. Copy the App Store URL  
2. In `../index.html`, change the App Store badge `href="#early-access"` to that URL  
3. Commit and push so parslia.app badges go live  
