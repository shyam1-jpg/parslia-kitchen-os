# Deploying the staff trial

The simplest path is **Render**. First sign-in is **`shyam_1@hotmail.co.uk`** (no password for this trial). A VPS with Docker is still documented at the end if you would rather run it yourself.

## 0. Fastest path — existing GitHub repo

The Vedanta code is already on the `cursor/vedanta-render-deploy-f604` branch of `parslia-kitchen-os`. You do **not** need a new repo to try it live.

1. Open [dashboard.render.com](https://dashboard.render.com) and sign in with GitHub.
2. **New → Blueprint**.
3. Repository: `parslia-kitchen-os`. Branch: `cursor/vedanta-render-deploy-f604`.
4. Blueprint file / path: **`vedanta-platform/render.monorepo.yaml`** (not the default `render.yaml` at the repo root — that one is Libraix).
5. Apply. Leave Microsoft / SMTP blank. Save.
6. Wait until **vedanta-api** and **vedanta-admin** are Live (first migrate takes a few minutes).
7. Open the **vedanta-admin** URL → type `shyam_1@hotmail.co.uk` → **Sign in**.

Do not merge that branch into Parslia `main`. A dedicated private `vedanta-platform` repo is still the cleaner long-term home (section 0b).

## 0b. Dedicated GitHub repo (optional, cleaner later)

Create a **private** repo named `vedanta-platform` on github.com, then push **this folder** (the one that contains `render.yaml`) as the repo root — not the parent Parslia repo.

```
# from the vedanta-platform folder
git init
git add -A
git commit -m "Vedanta platform"
git branch -M main
git remote add origin https://github.com/<your-username>/vedanta-platform.git
git push -u origin main
```

Then **New → Blueprint** → choose `vedanta-platform` → Apply (uses `render.yaml` at the repo root).

## 1. Deploy on Render (10 min)

1. [render.com](https://render.com) → sign in with GitHub so it can see the repo.
2. **New → Blueprint** → choose the repo from section 0 or 0b.
3. Render creates three things: `vedanta-db`, `vedanta-api`, `vedanta-admin`.
4. Leave the Microsoft / SMTP fields blank when prompted. Save.
5. Watch **vedanta-api → Logs**. You should see:

```
[migrate] applying 0001_foundation.sql
[migrate] 0001_foundation.sql ok
…
[migrate] applying imported_from_sheet_2026-09-02.sql
[migrate] imported_from_sheet_2026-09-02.sql ok
[migrate] ensuring system owner shyam_1@hotmail.co.uk
[migrate] done
```

then the server starting. The first migrate loads the schema, seed users, packages, and the sheet import (a few minutes). Later deploys skip files already in `schema_applied`.

6. Open the `vedanta-admin` URL (something like `https://vedanta-admin.onrender.com`). Type **`shyam_1@hotmail.co.uk`** and click **Sign in**. There is no password on this trial. The Microsoft button appears later, after step 2.

`ALLOW_EMAIL_LOGIN=true` is set on the Blueprint so this works before Entra is configured. Anyone who knows a seeded staff email can open admin while that flag is on — turn it off after Microsoft sign-in works.

Free / starter web services on Render sleep after idle time. The first request after a sleep can take a minute.

## 2. Microsoft sign-in (5 min, needs a Microsoft 365 admin)

Staff sign in with their existing Microsoft accounts; there are no passwords to manage.

1. [entra.microsoft.com](https://entra.microsoft.com) → **App registrations → New registration**.
   - Name: **Vedanta Admin**
   - Supported accounts: **Accounts in this organizational directory only** (the Vedanta Microsoft 365 tenant).
   - Redirect URI (Web): `https://vedanta-api.onrender.com/auth/microsoft/callback`
     (use the real `vedanta-api` URL from Render, plus `/auth/microsoft/callback`).
2. Overview → copy **Application (client) ID** and **Directory (tenant) ID**.
3. **Certificates & secrets → New client secret** → copy the *value* (shown once).
4. **API permissions** should list `openid`, `profile`, `email` under Microsoft Graph. Click **Grant admin consent**.
5. Render → **vedanta-api → Environment** → set `MS_TENANT_ID`, `MS_CLIENT_ID`, `MS_CLIENT_SECRET` → Save. It redeploys; the Microsoft button appears.

If staff use `@thevedanta.org` addresses, the seed already has system owners for **Shyam**, **Dan**, **Shannon**, **Losi** and **Gram** (`dan@thevedanta.org`, etc.). This trial also seeds **`shyam_1@hotmail.co.uk`** as system owner so a first sign-in works if that is the Microsoft account. Personal Hotmail accounts only work if the Entra app allows personal Microsoft accounts (step 1: change “who can sign in”). Otherwise add the work email on Render as `BOOTSTRAP_OWNER_EMAIL` and redeploy, or add it from **Staff access** after the first owner is in.

## 3. First sign-in

Open **vedanta-admin** and sign in as **`shyam_1@hotmail.co.uk`**. Access still comes from `app_user` + `membership`. After you are in as system owner, use **Staff access** to add everyone else.

Dan, Shannon, Losi and Gram can also type their `@thevedanta.org` emails on the same trial form.

To change the first owner without editing SQL, set on `vedanta-api`:

- `BOOTSTRAP_OWNER_EMAIL` — the Microsoft email that must work on first sign-in
- `BOOTSTRAP_OWNER_NAME` — display name (optional)

The migrate step upserts that user as `SYSTEM_OWNER` on every boot (safe to repeat).

## 4. Email (optional)

Set `SMTP_URL` on `vedanta-api` to send the guest-list link and confirmations. For a Microsoft 365 mailbox: create an app password for `bookings@thevedanta.org`, enable *Authenticated SMTP* for that mailbox, then

`SMTP_URL=smtp://bookings%40thevedanta.org:APP_PASSWORD@smtp.office365.com:587`

Without SMTP, every email is saved to the log with a “copy text” button.

## 5. Price list

The eight packages in Settings are **example prices** from 2025/26 bookings (`db/seed/0004_packages.sql`). Confirm the live list and edit them in **Settings** (no redeploy needed):

| Code | Name | Basis | Twin (example) | Single (example) |
| --- | --- | --- | --- | --- |
| STANDARD | Standard | per person | £249 | £339 |
| STANDARD_SPA | Standard with spa access | per person | £279 | £369 |
| PREMIUM | Premium | per person | £315 | £425 |
| PREMIUM_SPA | Premium with spa access | per person | £345 | £455 |
| NIGHTLY | Per person per night | per person per night | £75 | £110 |
| DAY_RETREAT | Day retreat | per person | £55 | — |
| VENUE_HIRE | Venue hire (no rooms) | fixed | — | — |
| GRAND_VEDANTA | The Grand Vedanta Package (weddings) | fixed | £8,000 | — |

## What is NOT in place yet (before real go-live)

- Off-server backups (Render’s own backup is the current safety net).
- Monitoring / alerting; rate limiting; audit-log retention policy.
- Guest data protection notice for attendees (UK GDPR §18 of the spec).
- Custom domain (`admin.thevedanta.org`) — add it on `vedanta-admin` in Render when DNS is ready, and update the Entra redirect URI.

---

## Alternative: one Linux server with Docker

One small Linux server (2 vCPU, 4 GB RAM) runs the whole stack: Postgres, the API, the admin app and Caddy for HTTPS, plus nightly backups.

### Server and DNS

1. Ubuntu 24.04. Install Docker: `curl -fsSL https://get.docker.com | sh`.
2. Point a DNS A record — e.g. `admin.thevedanta.org` — at the server’s IP.
3. Copy this repository to the server.

Entra redirect URI in this layout is `https://admin.thevedanta.org/api/auth/microsoft/callback` (Caddy forwards `/api` to the API).

### Configure and start

```
cd infra/deploy
cp .env.example .env      # fill in DOMAIN, a long DB_PASSWORD, and the three MS_ values
docker compose up -d --build
docker compose logs -f api   # migrate runs inside the API container, then the server starts
```

Open https://admin.thevedanta.org → *Sign in with Microsoft*.

### Day to day

- **Backups:** `backup` dumps the database nightly into the `backups` volume (30 days kept).
- **Update:** pull the new code, `docker compose up -d --build`. Already-applied files are skipped.
- **Logs:** `docker compose logs -f api`.
