# Parslia Kitchen OS — marketing site

**Marketing site:** https://parslia.app (GitHub Pages)  
**Kitchen OS (live):** https://parslia-kitchen-os-667132.onhercules.app  
**Kitchen OS (branded host):** https://app.parslia.app — needs GoDaddy DNS (see `APP-DOMAIN-DNS.md`)  
**GitHub:** https://github.com/shyam1-jpg/parslia-kitchen-os

## Files

| File | Purpose |
|------|---------|
| `index.html` | Full landing page |
| `styles.css` | Styling |
| `script.js` | Menu + early access form + Kitchen OS CTA URLs |
| `APP-DOMAIN-DNS.md` | GoDaddy DNS map for `parslia.app` vs `app.parslia.app` |
| `assets/USE_THIS_parslia_header_logo_clean.png` | Header logo |
| `assets/USE_THIS_parslia_app_icon_1024.png` | App icon / favicon |

## Preview locally (Windows)

Double-click **`PREVIEW.bat`** or run:

```bat
python -m http.server 8000
```

Open http://localhost:8000

## Raw GitHub links

- [index.html](https://raw.githubusercontent.com/shyam1-jpg/parslia-kitchen-os/main/index.html)
- [styles.css](https://raw.githubusercontent.com/shyam1-jpg/parslia-kitchen-os/main/styles.css)
- [script.js](https://raw.githubusercontent.com/shyam1-jpg/parslia-kitchen-os/main/script.js)
- [Logo PNG](https://raw.githubusercontent.com/shyam1-jpg/parslia-kitchen-os/main/USE_THIS_parslia_header_logo_clean.png)

## Cursor artifacts (original build)

- https://cursor.com/artifacts/v/art-4019db19-1595-4fd0-9188-c1c8ff5c6288
- https://cursor.com/artifacts/v/art-a83a6a46-6892-4258-a7e1-e7dec9a979e4
- https://cursor.com/artifacts/v/art-e15bc4f8-923a-4858-8359-e5baeef338c3

## Domain split (important)

| Host | What it is |
|------|------------|
| `parslia.app` | Marketing / early access (this repo) |
| `app.parslia.app` | Working Kitchen OS on Hercules (PWA / store packaging) |

**DNS registrar:** GoDaddy (`ns63/ns64.domaincontrol.com`). Full steps: `APP-DOMAIN-DNS.md`.

Apex marketing DNS is already on GitHub Pages. Next owner step: add Hercules records for the `app` subdomain only — do not repoint `@` to Hercules.

## Not included yet (backend)

- User registration / login
- Stripe payments
- Newsletter API

Kitchen OS product UI is live on Hercules (link above). See `WHERE-IS-EVERYTHING.md` for full map.
