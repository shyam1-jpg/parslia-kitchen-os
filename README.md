# Parslia Kitchen OS — marketing site

**Live domain (when DNS points to GitHub Pages):** https://parslia.app  
**GitHub:** https://github.com/shyam1-jpg/parslia-kitchen-os

## Files

| File | Purpose |
|------|---------|
| `index.html` | Full landing page |
| `styles.css` | Styling |
| `script.js` | Menu + early access form |
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

## Go live on parslia.app

GitHub Pages is already configured with custom domain **parslia.app**.

In **GoDaddy DNS**, point `@` to GitHub Pages A records:

- `185.199.108.153`
- `185.199.109.153`
- `185.199.110.153`
- `185.199.111.153`

CNAME `www` → `shyam1-jpg.github.io`

Turn off GoDaddy Website Builder.

## Not included yet (backend)

- User registration / login
- Stripe payments
- Newsletter API
- Kitchen OS app (recipes, stock, rota)

See `WHERE-IS-EVERYTHING.md` for full map.
