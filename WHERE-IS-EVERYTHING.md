# Parslia Kitchen OS — where everything is

> **Keep products separate.** See `PRODUCTS.md`.  
> Kiteline = `shyam1-jpg/kitline1` + kiteline.uk only.  
> Do not mix Kiteline / Academy / ChatGPT code into this Parslia repo.

## The real landing page (Hercules / GitHub)

| Item | Location |
|------|----------|
| **GitHub repo** | https://github.com/shyam1-jpg/parslia-kitchen-os |
| **Local copy** | `C:\Users\shyam prasad\Desktop\parslia-kitchen-os\` |
| **Main page** | `index.html` + `styles.css` + `script.js` |
| **GitHub Pages** | Configured for **parslia.app** (deployed 6 Jul 2026) |

This is the **full marketing page** from Hercules:
- Hero: Smarter kitchens. Calmer chefs.
- App preview mockup
- Features, modules, early access form
- **AI Image** and **AI Voice Finder** called out on the landing page
- Correct Parslia logo files

---

## Why parslia.app shows the wrong site

**Two hosts are fighting:**

| Host | What it shows |
|------|----------------|
| **GoDaddy DNS** (current) | GoDaddy Website Builder template |
| **GitHub Pages** (intended) | Your Hercules landing page |

GitHub Pages is set to `parslia.app`, but **GoDaddy DNS still points to GoDaddy**, not GitHub.

### Fix DNS in GoDaddy (for GitHub Pages)

1. Turn off GoDaddy Website Builder for parslia.app
2. In DNS, set **A records** for `@`:

   - `185.199.108.153`
   - `185.199.109.153`
   - `185.199.110.153`
   - `185.199.111.153`

3. Set **CNAME** for `www` → `shyam1-jpg.github.io`

4. In GitHub → repo **Settings → Pages** → custom domain `parslia.app` → enforce HTTPS

---

## Other folders (not the main page)

| Folder | What it is |
|--------|------------|
| `Desktop\parslia-site\` | Cursor copy (simpler) — **use GitHub repo instead** |
| `Desktop\parslia-brand\` | Logo SVGs only |
| `kitchen-os\` | **Kiteline** — separate product, not Parslia |

---

## What exists vs what you still need

### Exists now (frontend marketing only)

- [x] Marketing landing page (`index.html`)
- [x] Mobile menu + styling
- [x] Early access form (opens email — **no server**)
- [x] GitHub Pages deploy workflow

### Missing (backend + product)

- [ ] **Backend API** (Node/Express or similar)
- [ ] **User registration / login**
- [ ] **Stripe payments**
- [ ] **Newsletter** (e.g. Mailchimp, Resend, Buttondown)
- [ ] **Contact form** saved to database (not mailto)
- [ ] **Parslia Kitchen OS app** (recipes, stock, rota — the tablet UI in your video)

---

## Video reference

`Downloads\Parshilia.mp4` — brand promo (logo + app on tablet + kitchen photos)

## Hercules (online, login required)

https://hercules.app/dashboard/app/01KRRZFRR3VVK2SZH1VB8KNXWH?threadId=01KWSDMG33E9MVSWWZZ9XDRBQN

---

## Launch + App Store (give to Cloud)

**Full step-by-step for Hercules / Cursor Cloud:**  
→ `CLOUD-LAUNCH-APP-STORE.md`

Landing already has launch strips + App Store section (`#get-app`).  
Apple submission still needs the owner’s Apple Developer account (Cloud cannot log in as you).

## Next steps

1. Fix GoDaddy DNS → GitHub Pages (landing page goes live)
2. Give `CLOUD-LAUNCH-APP-STORE.md` to Cloud / Hercules
3. Create full privacy + terms pages before App Store submit
4. Capacitor iOS wrap + TestFlight + App Store Connect
5. Add `server/` backend for auth, payments, newsletter
