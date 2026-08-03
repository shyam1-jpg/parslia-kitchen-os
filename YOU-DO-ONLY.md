# What only you can do (Apple will not let Cloud log in as you)

I (Cloud) already prepared the app code, privacy/terms, Capacitor iOS project, icon, and listing paste kit.

Apple requires **your** Apple ID for payment, signing, and Submit. After you pay, do only this:

## 1) Finish enrollment (you — now)
1. Pay on https://developer.apple.com/enroll/app  
2. Wait until status is **Active** (email from Apple)

## 2) Merge the prep PR (you — 1 click)
Open and merge: https://github.com/shyam1-jpg/parslia-kitchen-os/pull/68  

That makes live:
- https://parslia.app/privacy/
- https://parslia.app/terms/

## 3) Create the app record (you — ~5 min)
1. https://appstoreconnect.apple.com → **My Apps** → **+**  
2. Paste fields from **`APP-STORE-CONNECT-PASTE.md`**

## 4) Upload the build (you — needs a Mac)
```bash
cd native
npm install
npx cap sync ios
npx cap open ios
```
Xcode → Team = you → **Archive** → Upload to App Store Connect.

## 5) Demo login + Submit (you)
1. Make a demo user in Kitchen OS (Hercules)  
2. Paste email/password into App Review notes  
3. Add screenshots  
4. Click **Submit to App Review**

---

When enrollment shows **Active**, reply **“Active”** and I will walk you click-by-click through step 3 using the paste kit (still your mouse — I cannot open your Apple account).
