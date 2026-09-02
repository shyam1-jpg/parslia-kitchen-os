# Progress — read this first every session

Company: The Vedanta Way Ltd · https://www.thevedanta.org/
Current booking system: a Google Sheet (to be imported, see docs/migration.md)

Property facts: 45 rooms · restaurant 150 seats / 130 max covers · 25 staff · UK/GBP.

## Done
- 2026-09-02 · Session 1 (Week 1, day 1)
  - Repo layout matching spec §31
  - `config/property.yaml` with the real property facts
  - `db/migrations/0001_foundation.sql`: tenant, property, department, users/roles/permissions,
    audit log, room types, 45 rooms, spaces (restaurant), rate plans, guests, diet/allergen
    profiles, groups, reservations, room assignment with no-overlap constraint
  - `db/seed/0001_property.sql`: property, departments, room mix, 13 roles, 17 permissions
  - Domain state machines with unit tests (6 passing): reservation, room, purchase order
  - `packages/contracts/openapi.yaml`: availability, reservations + commands, room
    assignment, housekeeping board + room commands, guests, diet, audit
  - ADR 0001 (modular core), ADR 0002 (commands only)
  - `infra/docker-compose.yml`: Postgres 16 + Redis 7

- 2026-09-02 · Session 2 (same day) — after reading the live Google Sheet
  - `docs/findings-from-sheet.md`: the business books GROUPS with per-person packages
  - `db/migrations/0002_groups_and_real_rooms.sql`: bed config + sections on rooms,
    booking_group as a full commercial record, room_occupancy (person × room × half-day),
    calendar_note for operational entries
  - Seed now has the real 42 rooms with beds, features, sections; packages as rate plans
  - `tools/import-sheet/import_calendar.py`: dry-run importer — 381 group rows, 1,093 notes,
    65 to review (`docs/import-dry-run-2026-09-02.md`)

- 2026-09-02 · Session 3 — first two screens
  - `apps/web-admin`: Next.js 15 + React 19, static export, no UI framework, `docs/design.md`
  - Group bookings screen: month-grouped list with Upcoming / Needs attention / All filters,
    detail panel with progress steps, arrival/departure by slot and time, guests/rooms/covers,
    package and agreed price, paperwork checklist (booking form, T&Cs, rooms, feedback),
    command buttons per state (confirm gated on paperwork), cancel with confirmation
  - Room board: 42 real rooms by section, AM/PM columns, week/fortnight, section filter,
    continuous stay bars per group, staff and out-of-use rooms, tonight/arrivals stats, legend
  - Both run on mock data in `lib/data.ts` shaped like the API; wiring to the API is next
  - Build: `cd apps/web-admin && npm install && npm run build` → `out/` (serve with any static server)

- 2026-09-02 · Session 4 — make the screens usable
  - Shared in-memory store (`lib/store.tsx`) so bookings and room placements stay in sync
    across screens; all rules live there (capacity, clashes, staff/out-of-use rooms)
  - New group booking form: name/organiser/contact/type/use basis, arrive/depart with AM/PM
    and time, guests, rooms wanted, live "N rooms free" for the dates, 130-cover warning,
    package + agreed price, notes; creates an ENQUIRY and selects it
  - Room board editing: click an empty cell → choose group in house + type a name → placed for
    the whole stay; click an occupied cell → see everyone in the room, add another up to bed
    count, or remove; drag a bar to another room → moves the whole party, blocked with a reason
    if the room is full, staff-only, out of use or taken by another group
  - Confirm is disabled until booking form and T&Cs are done

- 2026-09-02 · Session 5 — real database, API, full import, sign-in, kitchen
  - PostgreSQL 16 running; all migrations + seeds verified (0001–0003)
  - `services/platform-api` (Fastify + pg): dev sign-in, permissions per role, groups CRUD +
    commands with version checks and paperwork gate, availability, occupancy place/remove/move
    with capacity/clash/staff/out-of-use rules, kitchen covers, audit log. Tested route by route.
  - Importer stage 2 (`load_groups.py`): header-driven column mapping for all six sheet layouts,
    departure inferred from check-out text, continuation rows merged. **359 bookings loaded**
    (281 past, 70 upcoming); 126 have an assumed 2-night departure flagged in notes.
    Result file: `db/import/groups_from_sheet.sql`.
  - Admin app now runs on the API: sign-in screen (pick a user), nav and buttons by permission,
    group bookings + room board persisted, new Kitchen covers screen (breakfast/lunch/dinner per
    day vs 130, arrive/depart meal logic, dietary notes). `docs/running.md`.

- 2026-09-02 · Session 5b — reconciliation
  - Two parallel builds of session 5 collided; the more complete one was kept. The API now has
    one set of routes (`groups.ts`, `occupancy.ts`), one auth (`auth.ts`: dev sessions via
    POST /auth/login, Bearer tokens, `X-User` header allowed outside production), CORS for the
    admin app, and `/v1` prefix on all resource routes. Journey re-tested end to end over HTTP
    and in the browser against the 359 imported bookings.
  - Test bookings removed; `db/import/imported_from_sheet_2026-09-02.sql` is a data dump of
    booking_group + calendar_note so a fresh database can be loaded without re-running the importer.
  - Group bookings screen defaults to the next upcoming booking.

- 2026-09-02 · Session 6 — review screen + Room Sheet import
  - Sandbox lost the database; rebuilt from migrations + `db/import/*.sql` in one go (the seed
    now uses fixed tenant/property ids so dumps are portable). This is the documented path.
  - `db/migrations/0004_import_review.sql`: `review_reason` and `sheet_text` on booking_group;
    the importer's flag moved out of notes. 126 flagged, 12 of them upcoming.
  - API: `GET /v1/groups/review`; PATCH now accepts arrival/departure date+slot (validates order,
    trims room placements that fall outside the new dates, reports how many) and `review_reason`.
  - Screen "Imported bookings to check": upcoming first, the sheet's own text with check-out lines
    in bold, date + AM/PM editor, "Save departure" or "2 nights is right"; past ones collapsed.
  - `tools/import-sheet/import_roomsheet.py`: person × room × half-day from the 2025 and 2026 Room
    Sheets (auto-detects header layout; a name runs across the coloured cells until the next name;
    capped at the matched group's departure). ~4,170 stays / 17,200 half-days loaded. Placements on
    dates where several groups share the house are stored without a group and shown grey on the board.
  - Board: grey "no booking linked" placements shown; "go to date" control.
  - Known limits: two names in adjacent cells of one twin room import as sequential, not sharing;
    rooms 301–307 in the 2025 sheet are skipped (not in inventory — question open).

- 2026-09-02 · Session 7 — sharing rooms on import; link grey placements
  - Room Sheet importer: a coloured run is one stay; every name written inside it shares the room
    (twin/triple) for the rest of the run. Falls back to sequential guests only when a run holds
    more names than the room sleeps. Capacity column found by value, not position (moves per year).
    Result: 23,312 half-days, ~4,200 stays; e.g. Tina + Kanchan in G01 for the OmLife week.
  - `POST /v1/occupancy/link {room,label,date,group_id}` links the contiguous run of a name to a
    booking, only for the half-days inside that booking's dates; completed bookings allowed
    (history). `/v1/occupancy` now returns unlinked placements (left join); remove works for them.
  - Board: grey placements listed "· from the sheet" in the cell editor with a "Link these names
    to [booking]" box; toast confirms; board reloads.

- 2026-09-02 · Session 8 — edit booking, bulk-link, deployment package
  - Edit booking (group screen → Edit): name, organiser, type, use basis, arrive/depart date+slot+time
    with live availability (excluding the booking's own rooms), guests, rooms, package, price,
    first/last meal overrides, dietary notes, notes. Only changed fields are sent; version-checked;
    warns when a date change will drop placements outside the new dates.
  - Bulk-link: board → "Link sheet names…" → tick rooms (or "all grey rooms in view") → choose the
    booking → link. `POST /v1/occupancy/link-bulk` links only unlinked half-days inside the booking's
    dates. Julia Hutchinson's Feb weekend linked this way (167 half-days).
  - Microsoft 365 sign-in: `services/platform-api/src/microsoft.ts` — Entra ID OIDC auth-code flow
    with PKCE, id_token verified against tenant JWKS (jose), email matched to app_user, session token
    handed to the app in a URL fragment. `/auth/providers` tells the sign-in page what to offer.
    Dev "pick a user" sign-in is refused when NODE_ENV=production.
  - Deployment: `infra/deploy/` — docker-compose (Postgres, one-shot migrate that applies
    migrations/seeds/imports once and records them, API, static web via nginx, Caddy with automatic
    HTTPS, nightly backup container), Caddyfile, `.env.example`; Dockerfiles for api and web;
    `docs/deploy.md` with the Entra app-registration steps and user setup.
  - Not verified here: the Docker build itself (no Docker in the sandbox) and the Microsoft round
    trip (needs a real tenant). Redirect construction and PKCE were checked; first real deploy will
    need a careful eye on those two.

- 2026-09-02 · Session 9 — staff access, guests + dietary, housekeeping, reports
  - Found and fixed a fresh-database bug: role grants in migrations 0003/0005 ran before the roles
    existed. Grants now live in `db/seed/0003_role_permissions.sql` (idempotent).
  - `0005_guests_housekeeping.sql`: person notes/organisation, one diet_profile per person,
    room_status_event log, report.read + guest/diet/room permissions per role.
  - Staff access (`/users`, user.manage): list with last sign-in, add by Microsoft email + role +
    department, change role (signs them out so new permissions apply), remove/restore access;
    cannot deactivate yourself or drop your own system-owner role.
  - Guests (`/guests`): search, add, and a dietary record per person — diet chips, the UK 14
    allergens, severity (preference → anaphylaxis, required when an allergen is set), kitchen notes;
    every declaration audited with before/after. `POST /v1/guests/attach` ties a board name to a
    person. Kitchen covers now lists people in house with allergens/diets per day, colour by severity.
  - Housekeeping (`/housekeeping`): per-day task list derived from the board (departure clean,
    stay-over, arrival — must be ready, vacant, out of use), status chips, one-tap commands driving
    the room state machine (start/finish cleaning, inspected, needs redoing, out of order with reason,
    back in service after confirmed safety check), version-checked; phone layout.
  - Reports (`/reports`, report.read): monthly bookings, cancelled, guests, guest-nights, room-nights
    and occupancy from the board, day events, weddings, exclusive use; top organisations; CSV download.
    No revenue yet — prices are free text from the sheet.

- 2026-09-02 · Session 10 — packages & revenue, organiser form, board→guest, kitchen feed
  - `0006_packages_forms.sql` + `seed/0004_packages.sql`: package table (per person / per person
    per night / fixed; twin & single prices; spa/meals flags) with the 8 packages seen in the sheet
    and example prices — CONFIRM PRICE LIST. Booking fields: package_id, agreed twin/single prices,
    singles_count, agreed_total (override), form_token, form_sent/submitted_at. group_attendee.
    integration_key (hashed).
  - Booking value = agreed total, else package/agreed prices × guests (× nights). Shown on the
    booking with its working; reports gain Revenue and "priced N of M"; CSV includes it. API and UI
    share the same rule (`packages.ts` / `lib/pricing.ts`).
  - Organiser booking form: staff click "Create/Copy form link" → `/form/?t=…` public page (no
    sign-in): booking summary, per-guest name/email/room preference/diet/allergens/severity/notes,
    arrives-early flag, organiser notes. Submitting creates guest records + dietary declarations,
    lists attendees on the booking, marks the booking form COMPLETE; re-submission updates by name.
  - Board cell editor: "who is this?" → search guests or create one from the name → attaches the
    person to every half-day of that name in that room (dietary flags then reach the kitchen).
  - Kitchen feed for Parslia: `GET /integrations/kitchen/feed` with X-Api-Key, `docs/integrations.md`.
    Keys managed via API only for now (system owner).
  - `GET /v1/groups/:id` added (was missing). `coversFor()` extracted from the covers route.

- 2026-09-02 · Session 11 — settings, auto-place, email, maintenance
  - Settings screen (package.manage): edit packages inline (name, basis, twin/single prices, spa,
    meals, active), add new; integration keys (config.manage): create (shown once), revoke.
  - Auto-place (`POST /v1/groups/:id/auto-place`, "Place on the board" on the booking): attendees
    from the organiser form → singles alone in the smallest rooms, "share with X" pairs together,
    everyone else paired into twins; only free rooms, only unplaced people; dry-run supported.
  - Email (`0007`): outbound_email log; templated "guest-list link" and "booking confirmation"
    drafted from the booking, editable before sending, sent via SMTP_URL (nodemailer) or saved as
    LOGGED with a copy button when SMTP is not configured. Permission email.send. Confirmation
    refuses unless the booking is confirmed.
  - Maintenance: tickets M-n with room or location, priority (low/normal/urgent/safety), status
    flow open → in progress / waiting parts → done/cancelled, assignee, "room can't be used until
    fixed" (sets OUT_OF_ORDER; done + confirmed safety check restores). "Report fault" on every
    housekeeping card. Permissions maintenance.read/report/work.

## Not yet done from the import
- ~11,000 grey half-days remain unlinked (dates where several groups share the house); staff link
  them from the board as they go, or we add name-matching against booking forms later.
- 126 bookings have an assumed departure; 65 sheet rows were skipped (see docs/import-dry-run).

- 2026-09-02 · Session 12 — Render trial path
  - `render.yaml` Blueprint: vedanta-db (Postgres 16), vedanta-api (Node 22), vedanta-admin
    (static Next export). `render.monorepo.yaml` if this folder is not the repo root.
  - API `migrate.ts` applies migrations, seed and the sheet dump on boot (`schema_applied`),
    including pg_dump `COPY ... FROM stdin` without needing `psql`. Logs `[migrate] applying … ok`.
    Empty COPY tables and missing FKs are handled; room ids are pinned so all 23,312 board
    placements load on a fresh database.
  - Render Postgres TLS in `db.ts`. `BOOTSTRAP_OWNER_EMAIL` upserts a system owner every boot.
  - Seed includes `shyam_1@hotmail.co.uk` as SYSTEM_OWNER alongside `shyam@thevedanta.org`.
  - Staff admins: Dan, Shannon, Losi, Gram (`dan@` / `shannon@` / `losi@` / `gram@thevedanta.org`).
  - `docs/deploy.md` leads with the Render + Entra steps; example price list included.

## Next (in order)
1. Shyam: create the private GitHub repo, Apply the Render Blueprint, paste the API migrate log; add Entra secrets.
2. Confirm the live price list (Settings, or reply with the eight package prices).
3. Purchasing & stock (spec §9) or programmes/itineraries (§8) — next domains after the trial feedback.
4. Edit an existing booking (dates, guests, price) with availability re-check.

## Open questions for Shyam
- Rooms 301–307 appear in 2024/25 sheets but not 2026: still in use? (42 vs 45 stated)
- Is room 104 (staff room) ever sold?
- Current price list for the 8 packages in seed/0004_packages.sql (example prices used)?
- Hosting: own VPS/Azure, or managed? Domain for the admin app (admin.thevedanta.org?)
- Which payment provider (Stripe, Adyen)?
- Does the restaurant seat non-resident diners, or only guests and retreat attendees?
