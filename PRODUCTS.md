# Keep products separate — do not mix

Each product has its **own GitHub repo**, **own domain**, **own data**, and **own deploy**.  
Never put Kiteline code into the Parslia repo (or the reverse). Never share customer databases.

| Product | GitHub repo | Live domain | Deploy | What it is |
|---------|-------------|-------------|--------|------------|
| **Parslia Kitchen OS** | `shyam1-jpg/parslia-kitchen-os` | parslia.app | GitHub Pages / this repo | Marketing site for Parslia |
| **Libraix** | folder `libraix/` inside parslia-kitchen-os *(temporary until its own repo)* | libraix.ai | Netlify / Render (see `libraix/`) | Separate AI chat product |
| **Kiteline** | `shyam1-jpg/kitline1` **only** | kiteline.uk | Render from **kitline1** | Hospitality / kitchen ops platform |
| **Kiteline Academy** | inside `kitline1` → `site/academy/` | kiteline.uk/academy | Same as Kiteline | Learning product on Kiteline host |

## Hard rules

1. **Kiteline work** → open agents / PRs against **`kitline1`**, never `parslia-kitchen-os`.
2. **Parslia work** → only this repo’s landing files (`index.html`, `styles.css`, `script.js`, `assets/`).
3. **Libraix work** → only `libraix/frontend` + `libraix/backend` (do not change Kiteline or Parslia marketing for Libraix features).
4. **No shared customer data** between products. Each company workspace stays inside its own product database.
5. **Do not copy** Kiteline patches, Academy HTML, or ChatGPT connector files into this Parslia repo.

## If you need Kiteline ChatGPT / Academy fixes

Use repo: https://github.com/shyam1-jpg/kitline1  
Cloud Agent environment must include **`github.com/shyam1-jpg/kitline1`** with write access.

Wrong place (causes confusion): dumping Kiteline patches into `parslia-kitchen-os` PRs.
