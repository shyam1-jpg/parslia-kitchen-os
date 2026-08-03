# Parslia domain map — marketing vs Kitchen OS

| Host | Role | Current host |
|------|------|--------------|
| `parslia.app` / `www` | Public marketing / early-access site | **GitHub Pages** (live) |
| `app.parslia.app` | Working **Kitchen OS** (PWA / store packaging) | Target: **Hercules** |
| `https://parslia-kitchen-os-667132.onhercules.app` | Temporary Kitchen OS URL | Hercules (live today) |

## Who holds DNS?

**GoDaddy.**

Public nameservers for `parslia.app`:

- `ns63.domaincontrol.com`
- `ns64.domaincontrol.com`

Those are GoDaddy (`domaincontrol.com`) nameservers. DNS is **not** Cloudflare, Namecheap, or Wix for this domain.

Login: [GoDaddy Domain Portfolio](https://dcc.godaddy.com/) → `parslia.app` → **DNS** / **Manage DNS**.

---

## Why PWA Builder failed on parslia.app

`https://parslia.app` is the marketing site (this repo’s `index.html`). It has no installable web-app manifest or service worker for Kitchen OS.

The working app already exposes PWA assets on Hercules:

- Manifest: `/site.webmanifest`
- Service worker: `/sw.js`

Package **Kitchen OS**, not the marketing homepage. Use:

1. `https://parslia-kitchen-os-667132.onhercules.app` now, or  
2. `https://app.parslia.app` after the DNS steps below.

---

## Make `app.parslia.app` live (owner steps)

Cloud / agents **cannot** change GoDaddy DNS or the Hercules Domains tab without your login.

### 1) Hercules — add the custom domain

1. Open the Parslia Hercules app → **Domains**.
2. **Add Domain** / connect existing domain: `app.parslia.app`.
3. Copy the exact records Hercules shows (CNAME / TXT / ACME challenge). Values can differ per app; use the dashboard values if they disagree with the examples below.
4. Docs: [Connect an existing domain](https://hercules.app/docs/apps/publish/connect-existing-domain).

### 2) GoDaddy — add only the `app` subdomain records

Keep the existing apex (`@`) GitHub Pages A records so **marketing stays on** `parslia.app`.

Typical Hercules subdomain pattern (confirm in Hercules before saving):

| Type | Name | Value | Notes |
|------|------|-------|--------|
| CNAME | `app` | `cname.onhercules.app` | Or the host Hercules displays for `app.parslia.app` |
| CNAME or TXT | (as shown) | (as shown) | `_acme-challenge` / `_cf-custom-hostname` if Hercules requires them for `app` |

Do **not** repoint `@` to Hercules — that would replace the marketing site.

### 3) Verify

```bash
dig CNAME app.parslia.app +short
curl -sI https://app.parslia.app | head -20
```

Expect HTTPS 200 and `x-onhercules-app: true` (same app as the `.onhercules.app` URL).

Then re-run **PWA Builder** against `https://app.parslia.app`. “Package for Stores” should unlock once the manifest + service worker are served from that origin.

### 4) After DNS is live

1. In this repo, set `KITCHEN_OS_URL` / CTA links from the temporary Hercules URL to `https://app.parslia.app` (see `index.html` / `script.js`).
2. Prefer `https://app.parslia.app` for Capacitor / store packaging (see `CLOUD-LAUNCH-APP-STORE.md`).

---

## Current apex DNS (do not break)

`parslia.app` already resolves to GitHub Pages (`185.199.108–111.153`, `server: GitHub.com`).

| Type | Name | Value |
|------|------|--------|
| A | `@` | `185.199.108.153` |
| A | `@` | `185.199.109.153` |
| A | `@` | `185.199.110.153` |
| A | `@` | `185.199.111.153` |
| CNAME | `www` | `shyam1-jpg.github.io` |

---

## Access needed to finish without the owner clicking DNS

To complete this end-to-end from Cloud, provide one of:

1. GoDaddy login (or a temporary collaborator / API token) for `parslia.app` DNS, **and** Hercules Domains access for the Kitchen OS app, or  
2. Confirmation that you added the Hercules-provided records for `app.parslia.app` so we can flip marketing CTAs and re-check PWA Builder.
