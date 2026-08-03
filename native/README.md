# Parslia Kitchen OS — native shell (Capacitor)

Wraps the live Kitchen OS web app for App Store / Play packaging.

- **App ID:** `app.parslia.kitchen`
- **Loads:** `https://parslia-kitchen-os-667132.onhercules.app` (change to `https://app.parslia.app` after DNS)
- **iOS go-live:** [`../APP-STORE-GO-LIVE.md`](../APP-STORE-GO-LIVE.md)
- **Android / Play:** [`../GOOGLE-PLAY-GO-LIVE.md`](../GOOGLE-PLAY-GO-LIVE.md)

## iOS (Mac + Xcode)

```bash
cd native
npm install
npx cap sync ios
npx cap open ios
```

Archive → Distribute in Xcode with your Apple Developer team.

## Android (Android Studio)

```bash
cd native
npm install
npx cap sync android
npx cap open android
```

Build → Generate Signed Bundle → upload `.aab` in [Play Console](https://play.google.com/console).  
Paste listing from [`../GOOGLE-PLAY-CONNECT-PASTE.md`](../GOOGLE-PLAY-CONNECT-PASTE.md).
