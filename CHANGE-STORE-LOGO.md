# Change Parslia logo (official outer wordmark)

The hexagonal green tile icon is **removed** from store assets.  
All store icons now use the official **Parslia Kitchen OS** outer logo (ribbon **P** + arslia + KITCHEN OS).

| Asset | Path |
|-------|------|
| App Store / Play icon 1024×1024 | `assets/parslia-app-icon-1024.png` |
| Play feature graphic 1024×500 | `assets/parslia-play-feature-1024x500.png` |
| Marketing header logo | `assets/USE_THIS_parslia_header_logo_clean.png` |
| iOS Xcode icon | `native/ios/.../AppIcon.appiconset/AppIcon-512@2x.png` |
| Android launchers | `native/android/.../mipmap-*/ic_launcher*.png` |

---

## App Store Connect — where to change it

**Wrong page:** https://appstoreconnect.apple.com/access/users  
That page is only for **team users**, not the app logo.

**Correct places:**

### A) App icon (home screen / store)
1. Rebuild/upload a new iOS build that includes the new icon (from `native/` after merge), **or**
2. App Store Connect → your app **Parslia Kitchen OS** → version → **App Icon** comes from the uploaded build’s Assets.

On a Mac after pulling latest:
```bash
cd native
npm install
npx cap sync ios
npx cap open ios
```
Xcode → Archive → Upload again so Apple gets the new icon.

### B) Optional marketing / promo art
App Store Connect → your app → **Product Page** / screenshots / preview images — upload art that uses `USE_THIS_parslia_header_logo_clean.png`.

### C) Account / team picture (Users page)
If you meant the small avatar on **Users and Access**:
1. https://appleid.apple.com → sign in  
2. Update your Apple ID photo  
   (App Store Connect Users does not set the Parslia product logo.)

---

## Google Play
Play Console → your app → **Main store listing**:
- App icon → upload `assets/parslia-app-icon-1024.png` (scale to 512 if asked)
- Feature graphic → `assets/parslia-play-feature-1024x500.png`
