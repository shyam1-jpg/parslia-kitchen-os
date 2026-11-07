# Limitations

## This repo and the live app

The GitHub repo was last pushed on 22 September 2026 (`0c164aa`, privacy-policy merge). It contains the marketing site, the iOS shell, and Libraix. It does not contain the Kitchen OS application.

The live app at `https://parslia-kitchen-os-667132.onhercules.app` is a later Hercules build (Convex backend `resilient-kangaroo-6.convex.cloud`). Its bundle, inspected on 21 October 2026, includes recipes, stock, rota, settings, and Smart Devices. Those sources are not in this repository, so this branch cannot be switched on in the live app without a separate Hercules change. This branch does not deploy.

What the live bundle actually does today:

- **Smart Devices** (`/devices`) registers fridge, freezer, ambient, and probe devices. Connection types are Bluetooth (partial: Chrome or Edge on desktop and Android), Wi-Fi / cloud (manual only: "Needs the manufacturer's own account and connection. Readings are entered manually until that is set up."), and manual entry. There is no vendor API client and no shared connector runtime.
- **Settings** has kitchen profile, locations, staff permissions, owner security, and data requests. It has no Connected systems section.
- **Imports** are file imports (recipe import, stock CSV), not live connections.
- **Planday** does not appear in the bundle. Rota is an in-app page.
- **Libraix connectors** in this repo are a different product (chat tools). They were not reused.

## Vedanta OS

Vedanta's admin at `https://vedanta-admin.onrender.com/settings/` has Connected systems. Creating a key calls `POST /v1/integrations/keys` on `https://vedanta-api.onrender.com` with scope `kitchen.read`. The key is shown once.

`GET /v1/covers` is a real route and returns 401 without a session. The JSON shape was not published. An invalid bearer token and an invalid `X-Api-Key` produced the same "Sign in to continue" error, so the header the integration key expects was not verified. The Vedanta preset defaults to Bearer and `/v1/covers`, with a field mapping that is a starting point (`expected_guests`, `dietary_notes`). Both are settings. No live key was available, so the connector was tested against a local mock only.

## What this package does not do

- It does not authenticate Parslia users. The host must pass the signed-in actor and that company's real permissions.
- Secrets sit in process memory (`MemoryStore`). There is no database, encryption at rest, or secret manager.
- Disconnect deletes that connection's imported covers and the credential. There is no link to the live activity log. The in-memory audit keeps 200 events per company and must not be used as a compliance record.
- OAuth refresh is a single attempt. If the token server rotates a refresh token and the response is lost, the company must reconnect.
- Responses over 1 MB are rejected. A sync imports at most 500 rows.
- URL checks block non-HTTPS origins, credentials in the URL, and a few metadata hosts. They do not resolve DNS, so they are not a complete SSRF defence.
- Bluetooth probes and Wi-Fi sensor clouds are not implemented. A reading command is manual, matching the live app's manual path. It still needs a real device to prove a probe reading.
- There is no scheduler. Connected units are stored records. They are not polled until something calls sync.

## Scale

Ten thousand connected units are not the same thing as ten thousand concurrent requests. Listing one company's connections does not scan the other companies. Syncing every unit at once would stampede the upstream API and this process. There is no queue, rate limit, or second instance. The load test in `test/load.test.ts` measures one Node process against a local mock and writes `connector-load.json`. It is not a capacity claim for Vedanta, Render, Hercules, or Convex.

Measured on this workspace (one Node process, local mock, 21 October 2026):

- 10,000 connections across 500 companies used 11.6 MB more heap.
- Listing one company returned its 20 connections in 5.92 ms and did not include any other company's key.
- 40 concurrent syncs all overlapped (`maxInFlight` 40). p50 was 57.51 ms and p95 was 59.9 ms, against a mock that waits 20 ms. That is local loopback, not Vedanta or Hercules.
- The same run is not evidence that 10,000 kitchens can sync at once. Forty overlapped reads is the concurrency that was tested.
