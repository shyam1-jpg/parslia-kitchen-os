# Codex: finish Microsoft Store resubmit (Parslia Kitchen OS)

Put this file on the Windows Desktop (`C:\Users\shyam prasad\Desktop\`) or keep it in the Desktop repo folder `C:\Users\shyam prasad\Desktop\parslia-kitchen-os\`.

Cloud already did the **code**. Codex has the PC, Downloads, and Partner Center — finish the Store resubmit from this file.

## Repo

- GitHub: https://github.com/shyam1-jpg/parslia-kitchen-os
- Branch: `cursor/microsoft-store-resubmit-5f72`
- PR: https://github.com/shyam1-jpg/parslia-kitchen-os/pull/100
- Base: `main`
- Local folder: `C:\Users\shyam prasad\Desktop\parslia-kitchen-os\`

## What Cloud already did (do not redo / do not undo)

1. Windows Store PWA
   - Start page: `app.html` (this is the Store start URL, **not** the marketing homepage)
   - Manifest: `manifest.webmanifest`
     - name: **Parslia Kitchen OS**
     - short_name: **Parslia** (reserve **both** names in Partner Center)
     - display: standalone
     - theme: `#063F32`
     - icons: `assets/pwa-icon-192.png`, `assets/pwa-icon-512.png`
   - Service worker: `sw.js` (shell + legal pages only)
   - `app.js` sets `window.ParsliaNativeStorefront = 'microsoft'`
   - Kitchen app loaded: `https://parslia-kitchen-os-667132.onhercules.app/`
   - Fallback if iframe is blocked: Open kitchen workspace (never a coming-soon dead end)

2. Marketing page Store policy (`index.html`, `script.js`, `styles.css`)
   - Hides Apple / Google badges in Microsoft Store context
   - Detects `window.Windows`, referrer `microsoft-store`, or `?storefront=microsoft`
   - Preview after go-live: `https://parslia.app/index.html?storefront=microsoft#get-app`

3. Legal pages (Windows + web + iOS, not Apple-only)
   - `privacy.html`
   - `terms.html`
   - `support.html`
   - `subscription-terms.html`
   - Live generative AI disclosed
   - Report AI: `mailto:hello@parslia.app?subject=Report%20AI%20content`

4. Partner Center paste kit
   - `MICROSOFT-STORE-RESUBMISSION.md`
   - Listing description, 7 search terms, age ratings, Notes for certification, PWABuilder steps, screenshot sizes

## What Codex must do on the PC

### 1. Merge and publish

Merge PR **#100** into `main` so GitHub Pages updates. Then confirm these load (they 404 until merge):

- https://parslia.app/app.html
- https://parslia.app/manifest.webmanifest
- https://parslia.app/privacy.html
- https://parslia.app/support.html

### 2. Read the real Microsoft rejection

On the PC open Partner Center **or** Downloads:

- `C:\Users\shyam prasad\Downloads`

Search for Parslia, certification, Partner, Store. Open the report. Match policy numbers to `MICROSOFT-STORE-RESUBMISSION.md`. Fix anything the report cites that is not already covered.

### 3. Demo reviewer account

Create a working kitchen login. Put email + password in Partner Center **Notes for certification**. Template is in `MICROSOFT-STORE-RESUBMISSION.md`. Without this Microsoft can fail **10.3.1**.

### 4. Package (PWABuilder)

Package **only**:

```
https://parslia.app/app.html
```

Do **not** package `https://parslia.app/` (marketing page).

Reserve both names: `Parslia Kitchen OS` and `Parslia`.

Upload `.msixbundle` and `.classic.appxbundle`.

PWABuilder: https://www.pwabuilder.com/

### 5. Fill listing and Submit

- Category: Business
- Privacy: https://parslia.app/privacy.html
- Support: https://parslia.app/support.html and hello@parslia.app
- Declare live generative AI
- 4+ desktop screenshots of the **real** Hercules kitchen app, 1366×768 or larger, not the landing mock
- Paste Notes for certification from `MICROSOFT-STORE-RESUBMISSION.md`
- Click **Submit for certification**

Partner Center: https://partner.microsoft.com/

### 6. After Microsoft approves

Replace the Microsoft Store badge `href` in `index.html` (currently `app.html`) with the live Store URL.

## Do not undo

- Do not point the Store start URL at `index.html`
- Do not make legal pages Apple-only again
- Do not show App Store / Google Play badges inside the Microsoft Store app

Support / AI reports: hello@parslia.app
