# Vedanta Retreat Operating System — master architecture 2026

This document is the authoritative picture of **what the code actually is**, not what older READMEs claimed.

Last reconciled: 3 September 2026 against live Neon (`ep-crimson-lake-ax0s05ee-pooler`), current `main`, PR **#97**, PR **#98**, and other open PRs.

---

## 1. What this product is

**The Vedanta Way** house operating system (`vedanta-platform/`).

It is **not** Kiteline (https://kiteline.uk). Kiteline remains a separate product for rota, clock, PINs, and kitchen ordering (`/vedanta-ordering/`).

It is **not** a rewrite of Parslia. Parslia remains the kitchen specialist.

Baseline rule: **INSPECT → PRESERVE → CONSOLIDATE → EXTEND → CONNECT → TEST → RELEASE.**

Never start another app. Never delete, rename or overwrite a working route, table, production column, booking, guest, recipe, SOP, role, permission, room, Kiteline function, Parslia function or audit record unless a formally documented additive migration requires it.

---

## 2. Actual stack (correct the docs, do not rewrite the stack)

| Layer | Reality |
| --- | --- |
| API | Fastify, `services/platform-api`, port 4000 |
| House UI | Next.js static export, `apps/web-admin`, `/` |
| Guest book | Next.js static export, `apps/web-guest`, `/book/` |
| Pocket | Next.js static export, `apps/web-staff`, `/pocket/` |
| Public URL | Cloudflare tunnel → `tools/live-proxy.mjs` :8080 |
| Database | Neon Postgres. **Current host:** `ep-crimson-lake-ax0s05ee-pooler.c-4.us-east-2.aws.neon.tech` |
| Auth (house) | Email allow-list, no password (`shyam_1@hotmail.co.uk`). Temporary. |
| Auth (guest) | Email + 6-digit access code |
| Money | `numeric(12,2)` + ISO currency. Never float. |
| Commands | Domain services + version checks. No silent overwrite. |
| Attachments | Data URLs in JSONB. Temporary. ~700KB. |
| OpenAPI | `services/platform-api/openapi.yaml` — keep as contract |

The root `README.md` and `vedanta-platform/README.md` still mention NestJS / Next App Router in places. That is **stale documentation**. The working stack is Fastify + static Next exports. Documentation is corrected to match code. The stack is not rewritten to match old docs.

---

## 3. Repository reconciliation

### 3.1 `main` (`8779f09`)

Older App Store / Kiteline-era snapshot. **Does not contain** the house OS: no `/ops/`, `/front/`, `/night/`, `/manual/`, `/payroll/`, `/service/`, `/tasks/`.

`main` is **not** the Vedanta OS baseline.

### 3.2 PR #97 — `cursor/vedanta-render-deploy-f604` — **BASELINE**

This is the working Vedanta Retreat OS.

Exists and must be preserved:

- House log `/ops/` + Pocket House log
- Front desk `/front/`
- Night porter `/night/`
- Department boards `/service/`
- House manuals `/manual/`
- Payroll `/payroll/`
- Shared task engine `/tasks/` + Pocket Tasks
- Room board with drag (`PATCH /v1/occupancy/:id` + version)
- Guest book `/book/`
- GDPR stay isolation (`domains/guest/stay.ts`)
- Programme name privacy (`domains/guest/programmes.ts`)
- 42 imported rooms, 359 imported groups, occupancy half-days
- Migrations `0001`–`0019` plus seed `0020`

### 3.3 PR #98 — `cursor/user-name-visibility-8092` — **DO NOT MERGE**

Draft, based on `main`. Parallel older snapshot (~35k additions).

| What it has | Decision |
| --- | --- |
| `booking_group.open_for_guests` + staff “Show on guest book” | **Cherry-pick idea only** as additive `0021`. Compatible with #97 privacy. |
| Guest list filter `AND g.open_for_guests = true` | Adopt on top of existing `isPublicProgrammeName` |
| Whole branch merge | **Refuse.** Would collide (`0013_guest_open_programmes.sql` vs #97 `0013_ops_board.sql`). Would drop night porter, house log, manuals, tasks, service boards, front desk, payroll. Would remove current guest-request endpoints. |

#97 already enforces: a guest never sees another guest’s identity just because they share a retreat. #98’s extra flag is an **opt-in publish** for programme titles. Default `false` = new bookings stay off the guest book until a member of staff ticks the box.

### 3.4 Other open PRs — keep **out** of Vedanta production

| PR | Why excluded |
| --- | --- |
| #95, #92 | Outlook email-folder utilities |
| #90 | Overtime Excel / Kiteline clock experiment |
| #89 | Kiteline subscription billing — **not** guest-payment architecture |
| #88, #77, #69, #66 | Recipe / costing experiments |
| #86, #67, #65, #62 | Menu Creator experiments |
| Kiteline SOP / compliance / App Store PRs | Separate product |

Do not blindly merge open PRs. Integrate only compatible, relevant, tested work.

---

## 4. One source of truth (target)

| Master | Current table / home | Status |
| --- | --- | --- |
| Organisation / property | `config/property.yaml` + `vedanta` | Exists. `rooms_total: 45` vs 42 imported = **SOURCE CONFLICT**. |
| Room / resource | `room` | 42 rows. 41 guest + 104 staff-only. 301–307 **MISSING** from inventory. |
| Booking / group | `booking_group` | 359 imported. 125 still `review_reason` (assumed departure). |
| Occupancy | `occupancy` | 23,312 half-days. 11,097 still `group_id` null. |
| Guest | `guest` | Exists. Stay isolation implemented. Duplicate-suggest not built. |
| Staff identity | `staff` + Kiteline | House email login here. Rota/clock stay on Kiteline. Do not duplicate attendance. |
| Folio / payment | — | **Not built.** Do not reuse Kiteline billing. |
| Event / audit | `audit_event` + domain event tables | `audit_event` has 4 rows. Ops/manual/task events are append-only. |
| Product / recipe | Parslia | Kitchen remains authoritative. |
| Asset | — | Maintenance tickets exist; full CMMS not built. |
| Task | `ops_task` | Shared engine. Recurrence/SLA not yet. |

Departments may have different screens. They must not create competing masters.

---

## 5. Live data (measured 3 September 2026 — do not invent)

| Fact | Value | Status |
| --- | --- | --- |
| Rooms in `room` | 42 (41 guest + 1 staff) | VERIFIED count |
| Property config `rooms_total` | 45 | SOURCE CONFLICT with 42 |
| Room numbers | 101–122 (no 103), 201–218, G01–G03; 104 staff | VERIFIED |
| Rooms 301–307 | In 2024/25 sheets, not in 2026 inventory | MISSING — do not create |
| Groups | 359 | VERIFIED |
| Groups with assumed departure | 125 | NEEDS REVIEW — use `/review/` |
| Occupancy rows | 23,312 | VERIFIED |
| Unlinked occupancy (`group_id` null) | 11,097 | NEEDS REVIEW |
| Packages | 8, labelled example 2025/26 prices | NEEDS REVIEW — CONFIRM PRICE LIST |
| Skipped import rows | PROGRESS.md says 65; dry-run doc says 6 attention | SOURCE CONFLICT — do not pick a number |
| `audit_event` | 4 | VERIFIED (low) |

Source import evidence (`source_kind`, `source_row`, `source_text`, `import_run_id`) is **preserved**. Never delete it.

---

## 6. Current routes (do not rename)

House: `/` dashboard, `/front/`, `/night/`, `/ops/`, `/service/`, `/tasks/`, `/manual/`, `/payroll/`, `/rooms/`, `/groups/`, `/guests/`, `/calendar/`, `/review/`, `/quality/` (this increment), `/packages/`, `/kitchen/`, `/purchasing/`, `/compliance/`, `/maintenance/`, `/sops/`, `/staff/`.

Guest: `/book/`. Pocket: `/pocket/`.

---

## 7. Current permissions (additive only)

Existing: `group.read/write/update`, `room.read/update`, `package.read/write`, `kitchen.read/write`, `cover.read/write`, `purchase.read/write`, `compliance.read/write`, `maintenance.read/write`, `sop.read/write`, `staff.read/write`, `ops.read/write`, `manual.read/write`, `payroll.read/write`, `task.read/write/assign/approve`.

House email `shyam_1@hotmail.co.uk` keeps Manager.

---

## 8. Migrations (never reuse a spent number)

Applied on live Neon: `0001`–`0019`. Seed `0020_ops_task_permissions.sql` is a **seed**, not in `schema_applied`.

| File | Kind |
| --- | --- |
| `0021_guest_open_programmes.sql` | Additive column `booking_group.open_for_guests` |
| `0022_data_quality.sql` | Overlay table `data_quality_finding` — does not alter import rows |

---

## 9. Phase plan (do not attempt everything at once)

| Phase | Scope | This increment |
| --- | --- | --- |
| **A — Consolidate** | Reconcile branches. Fix docs. Baseline. | Done: this file, README correction, no wholesale merges. |
| **B — Data quality** | Screen + statuses. Do not invent rooms/prices. | Done: `/quality/`. |
| **C — PMS core** | Calendar, availability, groups, spaces, Guest 360 | Next. Preserve existing drag board. |
| **D — Folio & payment** | Separate hospitality payment domain | Feature-flagged. Not Kiteline billing. |
| **E — Guest journey** | Check-in/out, portal, communication | Later |
| **F — Operations** | Workflow, recurrence, HK intelligence, CMMS | Later |
| **G — F&B** | POS + Parslia contracts | Later |
| **H — Commercial** | Direct book, channels, revenue | Later |
| **I — Finance** | Dimensions, Sage/Xero layer | Later |
| **J — Intelligence** | One BI layer, forecast, controlled AI | Later |

A module is not done because a page exists. Done means domain, permissions, API, UI, mobile, errors, audit, tests, migration, monitoring, docs, and regression.

---

## 10. Hard rules that stay

- Additive migrations. Rollback documented.
- Money = fixed decimal + ISO currency.
- Commands produce immutable events. Do not silently rewrite history.
- Drag-and-drop must validate server-side. Concurrent edit → “This booking changed while you were working.”
- Guest never sees another unrelated guest.
- Do not store PAN/CVV. Do not queue raw cards offline.
- Do not disable email login until production auth is verified.
- Do not fabricate 301–307, package prices, or skipped-row counts.
- AI must not invent safety procedures, issue refunds, override allergens, or close incidents.
- Map every future request into an existing domain. No new mini-apps.

---

## 11. Next safe step after this increment

Phase C starts with **preserving** the existing room board (`/rooms/`, occupancy PATCH + version) and adding server-side move validation coverage + conflict copy. Do not replace the calendar.
