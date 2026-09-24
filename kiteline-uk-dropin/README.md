# Kiteline.uk drop-in — Kitchen SOP

**Intended live URL:** https://kiteline.uk/kitchen-sop/

Same hosting pattern as the rota (`site/vedanta-rota/` → https://kiteline.uk/vedanta-rota/).

## Why this folder exists

`kiteline.uk` is served by the **kitline1** repo on Render (`node server/server.js`, custom domain kiteline.uk).

This workspace is **parslia-kitchen-os**. It deploys to `parslia.app` / Libraix — **not** kiteline.uk.

GitHub credentials in this environment have **no push** to https://github.com/shyam1-jpg/kitline1 (`permissions.push: false`). There is no Render/Netlify deploy hook in this environment.

Until someone with kitline1 write access runs the apply script, commits, and lets Render redeploy, **https://kiteline.uk/kitchen-sop/ will 404**.

## Apply onto kitline1 (one command)

```bash
git clone https://github.com/shyam1-jpg/kitline1.git
python3 kiteline-uk-dropin/apply.py ./kitline1
cd kitline1
git checkout -b cursor/kitchen-sop-live-fd29
git add site/kitchen-sop server/server.js site/index.html js/views.js js/store.js
git commit -m "Serve Kitchen SOP at /kitchen-sop/ next to the rota"
git push -u origin cursor/kitchen-sop-live-fd29
```

Render auto-deploys from `main` (see kitline1 `.github/workflows/deploy-render.yml`). Merge the branch to `main` so kiteline.uk updates.

## What the script changes on kitline1

| File | Change |
|------|--------|
| `site/kitchen-sop/` | SOP PWA (index, app.js, styles, data, icons, sw.js, manifest). Relative URLs, `start_url` `./`, SW scope `./` |
| `server/server.js` | Redirect `/kitchen-sop` → `/kitchen-sop/`; serve index; `Service-Worker-Allowed: /kitchen-sop/` for `sw.js`; no-cache like other PWAs |
| `site/index.html` | Nav, mobile menu, footer, use-case card → `/kitchen-sop/` labelled **Kitchen SOP** |
| `js/views.js` | App hub tile + Training page link |
| `js/store.js` | Pilot-site links include Kitchen SOP |

Static files under `site/kitchen-sop/*` are also reachable via the existing `safeJoin(site, pathname)` fallback (same as `/vedanta-rota/manifest.json`).

## After deploy, verify

```bash
curl -sI https://kiteline.uk/kitchen-sop/ | head
curl -s https://kiteline.uk/kitchen-sop/ | grep -o "Kiteline · Kitchen SOP"
```

Expect HTTP 200 HTML (not the JSON `{ "error": "Not found" }` 404 used for unknown API/static paths).
