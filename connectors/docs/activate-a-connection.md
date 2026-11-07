# Activate a supported connection

A manager does this per company. Nothing in the steps is shared with another subscriber, and no API key is written into the app.

## Vedanta OS (covers and dietary needs)

1. In Vedanta OS, open **Settings → Connected systems**.
2. Name the key for this kitchen, for example `Parslia Kitchen OS`. The scope is `kitchen.read`.
3. Copy the key when it is shown. Vedanta does not show it again. Revoke it there if it leaks.
4. In Parslia, open **Settings → Connected systems**. This package exposes that section through `settingsSection`. The live Hercules app does not have the section yet.
5. Choose **Vedanta OS**.
6. Confirm the base URL `https://vedanta-api.onrender.com`. Leave the path as `/v1/covers` unless a test read shows a different route.
7. Paste the key into the API key field, not into any other setting. Choose **Raw header value** and header `X-Api-Key` only if Bearer is rejected.
8. Save. Status **Connected** means a read succeeded. **Auth expired** means the key was rejected: paste a new key and reconnect. API keys are not refreshed.
9. Sync a service date. The kitchen gets covers and dietary needs for that date. Syncing again updates those rows in place.

## Any other booking system that returns JSON

Choose **Other booking / PMS** instead of Vedanta. Enter that system's base URL, endpoint path, date parameter, and field mapping (`items`, `externalId`, `date`, `covers`, `dietary`). Paste that system's key. No code change is required when the response is a JSON list.

Use **Booking system (OAuth refresh)** when the system issues an access token and a refresh token. A sync refreshes the access token when it is expired or rejected. Checking status does not rotate the token unless the user can manage connections.

## Manual temperature

Choose **Manual temperature** to record one Celsius reading with an idempotency key. The same key does not log a second reading. This does not pair Bluetooth and does not call a sensor cloud. Those stay on the existing Smart Devices page.
