# Parslia — Google Play go-live (while Apple waits)

| Item | Value |
|------|--------|
| App name | Parslia Kitchen OS |
| Application ID | `app.parslia.kitchen` |
| Native project | `native/android` |
| Privacy | https://parslia.app/privacy/ |
| Terms | https://parslia.app/terms/ |
| Icon | `assets/parslia-app-icon-1024.png` |
| Feature graphic | `assets/parslia-play-feature-1024x500.png` |
| Paste kit | `GOOGLE-PLAY-CONNECT-PASTE.md` |
| Kitchen OS URL | https://parslia-kitchen-os-667132.onhercules.app |

## Status

| Step | Who | Status |
|------|-----|--------|
| Capacitor Android shell | Cloud | Done (`native/android`) |
| Mic/camera permissions | Cloud | Done in `AndroidManifest.xml` |
| Launcher icons + feature graphic | Cloud | Done |
| Listing paste kit | Cloud | `GOOGLE-PLAY-CONNECT-PASTE.md` |
| Merge PR #68 (privacy live) | Owner | Still required if privacy 404 |
| Google Play Console account ($25) | Owner | Required |
| Android Studio signed AAB upload | Owner | Required |
| Submit for review | Owner | Required |

## Owner steps (short)

1. Merge https://github.com/shyam1-jpg/parslia-kitchen-os/pull/68 if not merged  
2. Pay / open https://play.google.com/console (one-time ~$25)  
3. Create app → paste `GOOGLE-PLAY-CONNECT-PASTE.md`  
4. On a computer with Android Studio:
   ```bash
   cd native
   npm install
   npx cap sync android
   npx cap open android
   ```
   Build signed **AAB** → upload → Internal testing → Production  
5. Send for review  

Cloud cannot log into Google Play Console or sign the release keystore as you.
