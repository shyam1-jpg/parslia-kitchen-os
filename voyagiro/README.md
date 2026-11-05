# Voyagiro

Static travel-search site. The browser builds partner links. It does not sell tickets, store inquiries, or rank live fares.

Production (unchanged by this branch): https://voyagiro.com and https://voyagiro.web.app

Hosting is Firebase Hosting site `voyagiro` inside Firebase project `the-vedanta`. Firestore, Realtime Database, Storage, and Cloud Functions are not used by these pages. The web config at `/__/firebase/init.json` is the project’s public web config, not a private key.

## Local preview

```bash
python3 -m http.server 8765 --bind 127.0.0.1
```

Run that inside `voyagiro/site`, then open http://127.0.0.1:8765/

```bash
node --test voyagiro/tests/search-core.test.js
```

## Configuration

Names live in `voyagiro/.env.example`. Values stay off the site.

`site/js/config.js` may contain the public Travelpayouts marker and project id, because those parameters have to be in the outbound link. It must not contain a Travelpayouts API token, Formspree secret, or service-account JSON.

`INQUIRY_ENDPOINT` and `OPS_ENDPOINT` stay empty until a real HTTPS endpoint exists. Affiliate ids in `ids` stay as `YOUR_*` until that programme shows the account as approved.

## Deploy and rollback

Do not deploy this branch over https://voyagiro.com until the owner has reviewed it. Production HTML and JavaScript are cached for one hour (`Cache-Control: max-age=3600` as measured on 5 Nov 2026).

From `voyagiro/`, after `firebase login` to the owner’s account:

```bash
firebase hosting:channel:deploy audit --expires 7d
firebase deploy --only hosting
firebase hosting:rollback
```

Rollback needs a previous release still stored by Firebase. Keep this git branch. The owner’s Google account must keep the Firebase project, the domain, the Travelpayouts account, the mailbox, and any future AI key.

## Alerts

Ops events stay in `sessionStorage` under `vg_ops` unless `OPS_ENDPOINT` is an https URL. They record event name, provider, and status only.

The site owner should read failed searches, widget errors, and inquiry delivery failures. A click is not a booking. Commission states (pending, approved, paid) come from the affiliate network, not from this site.
