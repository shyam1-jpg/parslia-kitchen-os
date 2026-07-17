# Fix: Kiteline Academy broken on `/academy` (no trailing slash)

## Status (17 Jul 2026)

| URL | Status |
|-----|--------|
| https://kitline.uk/academy | **Dead** — domain `kitline.uk` expired (redemption / pending delete). Wrong spelling. |
| https://kiteline.uk/academy | **Live but broken** when opened without a trailing slash |

### What breaks

Opening `https://kiteline.uk/academy` (no `/` at the end) makes the browser request JS/CSS/images from the site root (`/i18n.js`, `/learn.css`, …). Those return JSON `404`, so:

- Sign in does nothing
- Start free lesson does nothing  
- Console shows MIME errors + `kaT is not defined`

`https://kiteline.uk/academy/` (with slash) works.

## Apply in `shyam1-jpg/kitline1` (deploys to kiteline.uk on Render)

```bash
cd kitline1
git apply /path/to/fix-academy-trailing-slash.patch
# or copy site/academy/*.html from this folder over site/academy/
# and replace the Academy routing block in server/server.js
# with server-academy-routes.js.snippet
git commit -am "Fix Academy assets when /academy has no trailing slash"
git push origin main
```

Render will redeploy. Then verify:

1. https://kiteline.uk/academy → redirects to `/academy/`
2. Console has no 404s for `i18n.js` / `curriculum.js` / `learn.js`
3. Sign in + Start free lesson work

## Also renew the typo domain (optional)

`kitline.uk` (no **e**) expired 2026-04-18 at GoDaddy and is in redemption / pending delete. Restore it only if you want that spelling; the live product is **kiteline.uk**.
