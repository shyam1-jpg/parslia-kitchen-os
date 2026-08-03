# Parslia Kitchen OS — where everything is

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

## Domain ownership

**Registrar / DNS:** **GoDaddy** (`ns63.domaincontrol.com`, `ns64.domaincontrol.com`).

| Host | Purpose | Status |
|------|---------|--------|
| `parslia.app` | Marketing site (this repo / GitHub Pages) | Live |
| `app.parslia.app` | Working Kitchen OS (Hercules) | DNS not set yet |
| `parslia-kitchen-os-667132.onhercules.app` | Temporary Kitchen OS URL | Live (use for PWA Builder today) |

Full DNS map + GoDaddy steps: **`APP-DOMAIN-DNS.md`**.

---

## Apex marketing DNS (already correct)

`parslia.app` already serves this GitHub Pages landing (`server: GitHub.com`). Keep:

1. **A** `@` → `185.199.108.153`, `185.199.109.153`, `185.199.110.153`, `185.199.111.153`
2. **CNAME** `www` → `shyam1-jpg.github.io`
3. GitHub → Settings → Pages → custom domain `parslia.app` → HTTPS

Do **not** point apex `@` at Hercules — that would replace the marketing site.

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

### Missing (backend + branded app host)

- [ ] **GoDaddy DNS** for `app.parslia.app` → Hercules (owner login required)
- [ ] **Hercules Domains** entry for `app.parslia.app`
- [ ] **Backend API** (Node/Express or similar) if not fully on Hercules
- [ ] **User registration / login** (if still needed beyond Hercules auth)
- [ ] **Stripe payments**
- [ ] **Newsletter** (e.g. Mailchimp, Resend, Buttondown)
- [ ] **Contact form** saved to database (not mailto)

Kitchen OS product is already live on Hercules — package that URL (or `app.parslia.app` after DNS), not the marketing homepage.

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

1. In GoDaddy + Hercules Domains, connect `app.parslia.app` (see `APP-DOMAIN-DNS.md`)
2. Re-run PWA Builder on `https://app.parslia.app` (or the Hercules URL until DNS propagates)
3. Give `CLOUD-LAUNCH-APP-STORE.md` to Cloud / Hercules for store packaging
4. Create full privacy + terms pages before App Store submit
5. Capacitor iOS wrap + TestFlight + App Store Connect
