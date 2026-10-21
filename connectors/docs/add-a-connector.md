# Add a connector

Add a connector when the protocol is different. A new customer of a system that is already supported only needs their own connection settings.

1. Add a module under `connectors/src/connectors/`. Keep that system's URL shape, auth, and response mapping inside the module. The shared runtime should not mention the vendor.
2. Implement `parseSettings` and `parseSecret`. Reject credentials that were placed in settings. Do not put a customer key, tenant id, or site list in source.
3. Declare each action with a permission and a safety:
   - `read` for idempotent fetches. The HTTP client may retry 408, 429, 502, 503, 504, and timeouts, at most 4 attempts.
   - `machine` for anything that changes a device or writes a record. The runtime forces a single attempt even if the module asks for retries, and it requires an idempotency key. A repeated key with the same payload returns the first result. A repeated key with a different payload is a conflict.
4. Register the module in `builtinConnectors()` in `src/catalog.ts`. Add a preset in `systemPresets` only for public defaults (base URL, path, field names). The preset must not contain a secret.
5. Pass HTTP calls through `ctx.request`. Do not call `fetch` directly. That is what lets the runtime apply the machine-command rule.
6. Add a mock test that activates the connector as one company, checks a user without permission is rejected, and checks a second company cannot read the first company's rows or secret.

OAuth refresh belongs in the connector. Call it only when `ctx.allowCredentialRefresh` is true, and do not loop: one refresh, then one more read.
