# Parslia Kitchen OS — native shell (Capacitor)

Wraps the live Kitchen OS web app for App Store / Play packaging.

- **Bundle ID:** `app.parslia.kitchen`
- **Loads:** `https://parslia-kitchen-os-667132.onhercules.app` (change to `https://app.parslia.app` after DNS)
- **Full go-live steps:** [`../APP-STORE-GO-LIVE.md`](../APP-STORE-GO-LIVE.md)

## Mac commands

```bash
cd native
npm install
npx cap sync ios
npx cap open ios
```

Then Archive → Distribute in Xcode with your Apple Developer team.
