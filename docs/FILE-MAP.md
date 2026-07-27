# Repository file map

Clean layout for **parslia-kitchen-os**. Two products share this repo; folders keep them apart.

```
parslia-kitchen-os/
│
├── index.html              Parslia marketing site (GitHub Pages)
├── styles.css
├── script.js
├── PREVIEW.bat             Double-click to preview landing page
├── TIDY-DESKTOP.bat        Double-click on Windows to clean Desktop mess
├── CNAME                   parslia.app
├── .nojekyll
│
├── assets/                 Parslia logos & app icon (USE THESE)
│   ├── USE_THIS_parslia_header_logo_clean.png
│   └── USE_THIS_parslia_app_icon_1024.png
│
├── docs/                   All guides (not code)
│   ├── START-HERE-TIDY-DESKTOP.md ← messy Desktop? start here
│   ├── DESKTOP-ORGANIZATION.md
│   ├── WHERE-IS-EVERYTHING.md
│   ├── LIBRAIX_OWNER_DESKTOP_GUIDE.md
│   ├── CLOUD-LAUNCH-APP-STORE.md
│   └── FILE-MAP.md               ← this file
│
├── recipes/                Recipe data (not the website)
│   ├── vegetarian-recipes.txt
│   └── build-recipes-txt.py
│
├── libraix/                Libraix AI product (libraix.ai)
│   ├── frontend/           Netlify
│   ├── backend/            Render
│   ├── docs/               Libraix technical docs
│   ├── DEPLOY.md
│   └── SETUP_ALL.md
│
├── netlify.toml            Libraix frontend deploy
├── render.yaml             Libraix API deploy
├── README.md
└── .github/workflows/      CI / Pages / keep-warm
```

## What stays at root (and why)

| Item | Why at root |
|------|-------------|
| `index.html` + CSS/JS | GitHub Pages serves the site from repo root |
| `assets/` | Landing page image paths |
| `CNAME` / `.nojekyll` | Custom domain for parslia.app |
| `netlify.toml` / `render.yaml` | Hosting config for Libraix |
| `libraix/` | Separate product in the same repo |

## Do not put here

- Kiteline / Academy files (different product — separate Desktop folder)
- Password files (keep only on your PC under `04-Accounts-Passwords`)
- Duplicate logos outside `assets/`

## Quick start

| Task | Do this |
|------|---------|
| Preview Parslia site | Run `PREVIEW.bat` or open `index.html` |
| Read owner guides | Open `docs/` |
| Work on Libraix | Go to `libraix/` |
| Organize Windows Desktop | Follow `docs/DESKTOP-ORGANIZATION.md` |
