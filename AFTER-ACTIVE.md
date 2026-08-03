# Enrollment done — do these next (your Apple login only)

Cloud side is ready in PR #68. Apple blocks anyone else from clicking inside your account.

## Step 0 — Merge prep (required for Privacy URL)

Open and click **Merge pull request**:  
https://github.com/shyam1-jpg/parslia-kitchen-os/pull/68

Wait ~2 minutes, then check:
- https://parslia.app/privacy/  → should load (not 404)
- https://parslia.app/terms/    → should load (not 404)

---

## Step 1 — Confirm membership is Active

1. Open https://developer.apple.com/account  
2. You should see membership **Active** (not Pending / Enroll)  
3. Then open https://appstoreconnect.apple.com  

If still Pending, wait for Apple’s email — do not pay again.

---

## Step 2 — Create the app (paste kit)

1. App Store Connect → **Apps** → **+** → **New App**  
2. Paste everything from **`APP-STORE-CONNECT-PASTE.md`**  
   - Name: Parslia Kitchen OS  
   - Bundle ID: `app.parslia.kitchen`  
   - Privacy: `https://parslia.app/privacy/`  

---

## Step 3 — Upload build (Mac + Xcode)

```bash
git clone https://github.com/shyam1-jpg/parslia-kitchen-os.git
cd parslia-kitchen-os/native
npm install
npx cap sync ios
npx cap open ios
```

In Xcode:
1. Signing & Capabilities → **Team** = your new developer team  
2. Product → **Archive**  
3. **Distribute App** → App Store Connect → Upload  
4. In App Store Connect → version → select that **Build**

---

## Step 4 — Submit to sell

1. Add screenshots (iPhone 6.7" + 6.1")  
2. Create a demo login in Kitchen OS and paste into App Review notes  
3. Set price under **Pricing and Availability**  
4. Click **Add for Review** → **Submit to App Review**

When Apple approves → status **Ready for Sale** = live to customers.

---

## What Cloud already finished

| Item | Location |
|------|----------|
| Privacy + Terms pages | `privacy/`, `terms/` |
| Capacitor iOS app | `native/` (`app.parslia.kitchen`) |
| 1024 icon | `assets/parslia-app-icon-1024.png` |
| Listing text | `APP-STORE-CONNECT-PASTE.md` |
| Mic/camera privacy strings | `native/ios/App/App/Info.plist` |
| Kitchen OS URL wrapped | Hercules live app |

Cloud **cannot**: sign in as you, Archive on your Mac, or click Submit.
