# Your clicks only (Cloud cannot use your Apple ID)

Enrollment / payment is on you. After that, Cloud prep is in PR:

**Merge this now:** https://github.com/shyam1-jpg/parslia-kitchen-os/pull/68  

Then follow **`AFTER-ACTIVE.md`** (create app → Xcode upload → Submit).

Paste fields from **`APP-STORE-CONNECT-PASTE.md`**.

---

## Checklist — Apple

- [ ] Apple Developer membership **Active** — https://developer.apple.com/account  
- [ ] Merge PR #68 (privacy/terms go live)  
- [ ] App Store Connect → New App (`app.parslia.kitchen`)  
- [ ] Mac: `cd native && npm i && npx cap sync ios && npx cap open ios` → Archive → Upload  
- [ ] Screenshots + demo login → **Submit for Review**  
- [ ] Set price → wait for **Ready for Sale**

## Checklist — Google Play (can do while Apple waits)

- [ ] Merge PR #68 (same privacy URL)  
- [ ] https://play.google.com/console → register (~$25) → Create app  
- [ ] Paste `GOOGLE-PLAY-CONNECT-PASTE.md` + upload feature graphic  
- [ ] `cd native && npm i && npx cap sync android && npx cap open android` → signed AAB  
- [ ] Internal testing → Production → Send for review  

Reply **“Play”** when you’re in Play Console and I’ll guide the next screen.
