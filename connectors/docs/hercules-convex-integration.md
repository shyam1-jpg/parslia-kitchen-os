# Hercules / Convex integration design — 24 October 2026

Status: implementation plan, not a deployed integration. PR #120 head inspected:
`cfded296f965b078734d060f1d829e3aae9fe71a`. GitHub reports open, draft, mergeable.
The live target named in that PR is https://parslia-kitchen-os-667132.onhercules.app,
Convex deployment `resilient-kangaroo-6.convex.cloud`. No authenticated inspection,
deployment or production-data access was performed. Confirm deployment ownership
and staging configuration before installing anything.

## Evidence and important new finding

The repository contains a standalone synchronous connector runtime, not the current
Hercules application. Its ConnectionStore methods are synchronous; Convex database
and action calls are asynchronous. A Convex adapter cannot simply be substituted
for MemoryStore without changing the runtime contract. An action-local memory
snapshot saved back later also loses concurrent changes and must not be used.

Available Vedanta source at commit `39a301218acb2f2c43b95391314527eb486c1192`
provides a stronger contract than the PR's original live invalid-key probes:

- `docs/integrations.md` documents a `kitchen.read` key in raw `X-Api-Key`.
- `services/platform-api/src/integrations.ts` implements
  `GET /integrations/kitchen/feed?from=YYYY-MM-DD&to=YYYY-MM-DD`.
- `services/platform-api/src/server.ts` registers that route without `/v1` prefix.
- The schema is `vedanta.kitchen-feed/1`, with `days`, `dietary.placed` and
  `dietary.not_yet_placed`. Poll no faster than every five minutes.
- `/v1/covers` is a separate staff-facing route. The existing preset's assumed
  bearer credential and `items[].expected_guests` mapping do not match this feed.

This verifies the available source contract, not the production Render deployment.
No real key was requested, printed, used or committed. Keep the old preset marked
unverified until its replacement adapter passes staging contract tests. Do not
silently change defaults for existing connections.

## Ownership and delivery boundary

| GitHub package work | Hercules source / deployment work |
| --- | --- |
| Transport hardening and mock regression tests | Confirm actual authentication provider and company membership schema |
| Async runtime v2 interfaces and feed parser | Install package into real app build; configure Node actions / private worker |
| Versioned feed fixtures and contract tests | Convex tables, indexes, queries, internal mutations and scheduler |
| Credential encryption interface and contract tests | Provision encryption key service, egress controls and staging secrets |
| This API/schema/migration design | Settings UI, cover and dietary screens, production rollout |

The security patch accompanying this design disables implicit MemoryStore use,
requires explicit demo/test opt-in, rejects non-public literal IP targets,
rejects redirects, caps streamed responses by bytes, omits upstream response bodies
from errors, and removes credentials when base URL or auth destination changes.
It does not implement persistent storage, DNS pinning, distributed idempotency,
or the real Vedanta feed adapter. Those remain release blockers.

## Authenticated application interface

Use native Convex authenticated queries/actions, not a browser-supplied Actor.
The names below are proposed interfaces, not existing deployed functions.

| Public function | Input | Required permission / output |
| --- | --- | --- |
| `integrations.list` query | selected company handle | integrations.view; sanitized connections |
| `integrations.configure` action | company handle, locationId, connectorId, settings, secret | integrations.manage; sanitized connection |
| `integrations.reconnect` action | connectionId, new secret | integrations.manage; status |
| `integrations.sync` mutation | connectionId, from, to, idempotencyKey | kitchen_ops.manage; queued runId |
| `integrations.disconnect` mutation | connectionId | integrations.manage; revoke locally, schedule deletion |
| `integrations.covers` query | connectionId, from, to | kitchen_ops.view; paginated aggregates |
| `integrations.dietary` query | connectionId, date, cursor | dedicated dietary.view; minimum needed records |
| `integrations.audit` query | company handle, cursor | integrations.audit; redacted events |

Confirm permission names with Hercules; deny unknown permissions. Resolve identity
with `ctx.auth.getUserIdentity()`. Query trusted membership using identity subject
and selected company; derive companyId, role, permissions and allowed locationIds
server-side. A selected company is a lookup selector, never authority. Validate
connection.companyId and location ownership on every function. Return uniform
not-found for another company's IDs. Recheck current membership before queued
user-requested work; scheduler uses an internal service principal scoped to that
connection. Internal functions must not be callable through public HTTP wrappers.
Keep browsers, iOS and marketing code away from decrypted credentials.

## Persistent model and indexes

Create these Convex tables in the actual Hercules schema. Every record contains
companyId; every read combines that companyId with resource ownership checks.
Convex indexes alone do not enforce authorization or uniqueness: mutations must.

| Table | Fields beyond companyId | Compound index / invariant |
| --- | --- | --- |
| integrationConnections | connectorId, schemaVersion, locationId, settings, status, generation, enabled, lastSuccessAt, sanitizedError, createdBy, timestamps | companyId; companyId + enabled |
| integrationSecrets | connectionId, ciphertext, nonce, tag, keyVersion, credentialVersion | companyId + connectionId; one current credential |
| integrationRuns | connectionId, generation, from, to, status, attempt, leaseOwner, leaseExpiresAt, cursor, counts, safeError, requestHash | companyId + connectionId + requestKey; lease claimed transactionally |
| importedCovers | connectionId, sourcePropertyId, date, service, externalId, covers, sourceVersion, lastSeenRunId, sourceTimestamp | companyId + connectionId + date + service + externalId |
| importedDietary | connectionId, stableSourceId, date or arrival/departure, placement, groupRef, roomRef, diets, allergens, severity, notes, provenance, lastSeenRunId | companyId + connectionId + stableSourceId + date/placement |
| integrationAudit | actorId/servicePrincipal, connectionId, runId, action, result, counts, reasonCode, timestamp | companyId + timestamp; append-only application interface |

Keep named dietary information separate from broadly readable covers; never put
it into audit or idempotency result blobs. Persist only a runId and counts for
idempotent responses. Configure retention and deletion with the business owner;
dietary retention requires a policy before enabling production imports. Retain
minimal redacted audit events for the approved period, without the current
MemoryStore's arbitrary 200-event eviction. Audit configure/reconnect/disconnect,
credential access/rotation, sync enqueue/start/success/failure, permission denial,
and imports/deletions. Audit failure must fail the state mutation atomically.

## Secure credential lifecycle

Use authenticated encryption (AES-256-GCM or managed envelope encryption), with
unique cryptographic nonce per write. Bind companyId, connectionId and version
as authenticated additional data. Ciphertext in a secret-only table; key-encryption
keys in a server-only managed key service or deployment secret, never Convex
document fields, browser variables or Git. Hashing is insufficient: outbound
authentication needs recoverable key material. Enforce internal-only decrypt
functions, no public secret query, no credential echoes or request-body logs.

Key rotation writes a new version, tests it, then retires the prior version.
Changing destination/auth invalidates prior secret; never send old credentials
to a new URL. A run holds connection generation and credentialVersion; commit
must reject results from a disconnected/reconfigured/rotated generation. Locally
disconnect immediately, cancel pending work and remove ciphertext; upstream
Vedanta revocation is a separate authenticated administrative operation and must
not be claimed as completed by a local disconnect.

## Runtime v2 and action / mutation separation

Implement a major version with Promise-returning store methods and await every
call, including context.saveSecret. Define atomic operations rather than wrapping
each current synchronous call independently:

```ts
interface DurableIntegrationStore {
  loadForRun(companyId: string, connectionId: string): Promise<ServerConnection>;
  claimRun(input: RunClaim): Promise<ClaimedRun | ExistingRun>;
  commitImport(input: ValidatedImport): Promise<ImportCounts>;
  finishFailure(input: SanitizedFailure): Promise<void>;
  rotateCredential(input: CredentialRotation): Promise<void>;
  disconnect(input: ScopedDisconnect): Promise<void>;
}
```

Define those input types in v2 with generation, companyId, runId, lease token and
credentialVersion where applicable. `claimRun` transactionally checks ownership,
current generation, enabled state and request hash; claims a durable lease and
adds audit. A public enqueue mutation schedules a Node action. The action loads
internal context, decrypts, makes network calls and validates. It calls an internal
mutation to stage bounded chunks. A final mutation checks run lease/generation,
publishes the new snapshot, updates status and audit atomically. Queries read
only published snapshot versions. Do not make HTTP calls inside mutations.
For large feeds, staging plus an atomic published-version pointer avoids exceeding
Convex transaction limits and avoids partially visible replacements. Verify
current Convex limits against the actual project SDK before implementation.

## Transport security

Literal-IP validation is only defense in depth. Do not deploy arbitrary customer
URLs through ordinary fetch. Use an approved-provider allowlist plus a controlled
egress service, or a Node transport that resolves all A/AAAA answers, rejects
non-global addresses (including mapped IPv6, CGNAT, metadata, reserved and special
ranges) and pins the selected validated IP to the socket, preserving TLS SNI and
certificate validation for the hostname. Revalidate/pin on each new connection
and retry; never validate DNS and then let fetch resolve the hostname again.
Block redirects for both booking and token requests. Block userinfo, unsafe
ports/protocols, host override headers and unapproved token origins. Disable
environment proxy bypasses. Egress policy must block private destination IPs
even when DNS changes. If the Convex action runtime cannot provide that transport,
use the private worker option and authenticate it with short-lived run-scoped
tokens; never expose a general public URL-fetch endpoint.

Bound response bytes while streaming, timeouts, total run duration, date range,
rows, queue length and per-company concurrency. Handle 429 using bounded
Retry-After and jitter; do not retry auth/validation failures. No automatic machine
write retries. Store sanitized reason codes, not upstream bodies, URLs with query
strings, dietary text, tokens or exception payloads.

## Vedanta adapter and data semantics

Implement a new versioned `vedanta-kitchen-feed` connector; retain the generic
booking connector for genuinely flat APIs. Request the exact range using `from`
and `to`, raw `X-Api-Key`, endpoint `/integrations/kitchen/feed`. Require schema
`vedanta.kitchen-feed/1` and validate the full response before publishing.

- Map `days[].breakfast/lunch/dinner` to authoritative service totals with stable
  IDs derived from source property/date/service. Do not sum totals and group
  counts together. Group metadata can remain a separate drill-down projection.
- Preserve `dietary.placed` separately from `dietary.not_yet_placed`. Preserve
  severity, allergen codes, dates, placement and source provenance; free-text
  DietaryNeed labels alone lose clinically important distinctions.
- The unplaced source rows currently omit person_id and group_id. Request stable
  IDs before idempotent per-person storage; names or array position are unsuitable
  identifiers. The returned property value is hard-coded `VOR` in this source;
  confirm the key's real property identity before multi-property use.
- Never infer that an omitted dietary record means no allergy from a partial
  response. Preserve last good data with a visible stale/error indicator.
- Complete authoritative snapshots may retire missing source records, including
  cancellations and amended diets, only after validation and successful publish.
  Upsert-only v1 leaves removed bookings/diets stale. A malformed or truncated
  feed must not cause deletions. Keep manual kitchen notes separate so a sync
  cannot overwrite them.

Poll at most every five minutes per connection, coalesce manual triggers with
active work and apply per-provider rate limits. Recover expired read leases with
bounded retries. Cursor/checkpoint and run state live in Convex, not a process
Map. Atomically reject mismatched request hashes for reused idempotency keys.
Start with a limited rolling range approved by the kitchen; display last successful
sync time and timezone (Europe/London) on covers and dietary screens.

## Required Vedanta confirmation before live acceptance

1. Confirm the deployed Render commit, endpoint, API hostname, raw header and
   kitchen.read scope match the available source; supply a redacted production
   schema/example and a dedicated staging key through secure secret entry.
2. Confirm status probe endpoint, HTTP error semantics, limits, Retry-After,
   maximum date range, timezone and whether snapshots are complete/paginated.
3. Add stable IDs for unplaced people/groups, real property identifiers, change
   versions/timestamps and cancellation/deletion semantics. Confirm group-level
   diet notes versus individual records, duplicate people and room moves.
4. Confirm source checks property/tenant boundaries and excludes cancelled
   placements appropriately. Agree privacy/retention and who can see named diets.

## Required Hercules changes and inputs

Provide a source export/repository of the current app, its package/lockfiles,
Convex schema/functions/auth config and build/deployment instructions. Confirm
the account owns the named deployment and identify a separate staging deployment.
Do not provide deploy keys or API secrets in chat. Implement the v2 durable
store, tables/indexes/internal functions, controlled egress, key management,
five-minute scheduling and settings/read UI described above in that source.
Add feature flags per company and a kill switch that cancels future syncs.
Install the reviewed package version explicitly in the actual app build; merging
the marketing repository does not deploy it to Hercules.

## Acceptance and regression matrix

Implemented package tests use mock keys only: memory opt-in, private/mapped IP
rejection, redirect credential protection, no upstream-body leakage, bounded
stream buffering and credential removal on destination change. Existing tests
cover cross-company reads, permission denial, retry/timeouts and process-local
idempotency. These do not prove durable or live integration.

Before release add executable v2/Convex staging tests for:

- forged company/role/location inputs and every cross-company public/internal
  path; no secret in list/status/errors/audit; revoked users cannot enqueue work;
- ciphertext round-trip, wrong-company AAD failure, key rotation and denied
  browser access; restart retains connections and imported data;
- two worker instances claim the same run, lease expiry/crash recovery, lost
  completion response, idempotency conflicts and stale-generation commit denial;
- feed fixture with all three services, zero covers, placed/unplaced dietary
  records, severe allergy, amendments/cancellations and stable IDs;
- invalid schema, truncated/missing sections and failed paginated requests leave
  the last good snapshot intact; no duplication across reruns;
- DNS answers resolving private/mixed A/AAAA, DNS rebinding, token URL SSRF,
  redirect chains, oversized/chunked payloads, 429 and slow responses;
- audit and import commit together; disconnect/reconnect races cannot restore
  removed data; tenant deletion removes secret and dietary data as policy requires.

Rollout: run all mocks and typecheck, migrate staging, test with an authorized
staging Vedanta key, compare a known date's totals and allergy declarations with
Vedanta, then enable one company. Verify persistence after worker restart, alert
on stale syncs, and only then expand. Rollback disables scheduling and UI writes,
retains the last good snapshot marked stale and revokes credentials if needed.
