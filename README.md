# Parslia Kitchen OS — marketing site

**Live domain (when DNS points to GitHub Pages):** https://parslia.app  
**GitHub:** https://github.com/shyam1-jpg/parslia-kitchen-os

## Folder layout (systematic)

| Path | Purpose |
|------|---------|
| `index.html` + `styles.css` + `script.js` | Parslia landing page |
| `assets/` | Official logos & app icon |
| `docs/` | Owner guides & maps |
| `recipes/` | Recipe text data |
| `libraix/` | Libraix AI app (separate product) |

Full map → **[docs/FILE-MAP.md](docs/FILE-MAP.md)**  
**Organize your Windows Desktop** → **[docs/DESKTOP-ORGANIZATION.md](docs/DESKTOP-ORGANIZATION.md)**

## Landing page files

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

## Guides

| Guide | Path |
|-------|------|
| Desktop tidy (Windows folders) | [docs/DESKTOP-ORGANIZATION.md](docs/DESKTOP-ORGANIZATION.md) |
| Where everything is | [docs/WHERE-IS-EVERYTHING.md](docs/WHERE-IS-EVERYTHING.md) |
| Libraix owner checklist | [docs/LIBRAIX_OWNER_DESKTOP_GUIDE.md](docs/LIBRAIX_OWNER_DESKTOP_GUIDE.md) |
| App Store / launch | [docs/CLOUD-LAUNCH-APP-STORE.md](docs/CLOUD-LAUNCH-APP-STORE.md) |
| Repo file map | [docs/FILE-MAP.md](docs/FILE-MAP.md) |

## Go live on parslia.app

GitHub Pages is already configured with custom domain **parslia.app**.

In **GoDaddy DNS**, point `@` to GitHub Pages A records:

- `185.199.108.153`
- `185.199.109.153`
- `185.199.110.153`
- `185.199.111.153`

CNAME `www` → `shyam1-jpg.github.io`

Turn off GoDaddy Website Builder.

## Not included yet (Parslia backend)

- User registration / login
- Stripe payments
- Newsletter API
- Kitchen OS app (recipes, stock, rota)

See [docs/WHERE-IS-EVERYTHING.md](docs/WHERE-IS-EVERYTHING.md) for the full map.
