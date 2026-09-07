# Vedanta Retreat Operating System — development log

## Increment — P0 pulse, public booking, programme sheet (2026-09-03)

**What.** Staff `/house/` redirects to Staff Sign In instead of a signed-out loading shell. Guests browse retreats, dates, room types and prices before creating My Stay. House Today is a live occupancy/HK/task pulse. One booking exposes a programme operating sheet to every department.

| | |
| --- | --- |
| Files | `domains/guest/access.ts`, `availability.ts`, `domains/ops/pulse.ts`, `domains/housekeeping/board.ts`, `domains/retreat/sheet.ts`, `0023_guest_stay_and_access.sql`, `guestPortal.ts`, `estate.ts`, `housekeeping.ts`, `groups.ts` (`/sheet`), admin Shell/Guard/HouseToday/Housekeeping/RoomBoard/GroupsScreen, `apps/web-guest` |
| Database | **Additive.** Guest code expiry/lockout columns. Enquiry diet/access/travel/room preference. No rooms, bookings or occupancy rewritten. |
| New public APIs | `GET /guest/programmes` (no session), `/guest/rooms`, `/guest/availability`, `/guest/calendar`, `POST /guest/recover`, `PATCH /guest/me` |
| Staff APIs | `GET /v1/estate` pulse fields extended. `GET /v1/groups/:id/sheet`. HK visit minutes from existing `room_status_event`. |
| Not built | Folio, card payments, IoT, digital twin, seva, shop, AI briefing, waiting lists. Those map to the five OS in `MASTER_ARCHITECTURE_2026.md`. |
| Payments | Still “the house confirms the deposit.” No PAN/CVV. Not Kiteline billing. |

---


Handover record for work added on `cursor/vedanta-render-deploy-f604`. Existing pages, routes, schemas and Kiteline/Parslia behaviour are preserved unless a row below says otherwise.

## Increment — Phase A consolidate + Phase B data quality (2026-09-03)

**What.** Repository reconciliation against the master OS command. Documentation corrected to the working stack. Data Quality screen. Compatible guest-book publish flag from PR #98’s idea only.

| | |
| --- | --- |
| Files changed | `docs/MASTER_ARCHITECTURE_2026.md`, `README.md`, `PROGRESS.md`, `domains/quality/*`, `db/migrations/0021_guest_open_programmes.sql`, `db/migrations/0022_data_quality.sql`, `services/platform-api/src/quality.ts`, `server.ts` (register only), `groups.ts` (`open_for_guests` column + PATCH), `guestPortal.ts` (SQL filter), `apps/web-admin` quality page + Edit booking checkbox + nav, `packages/contracts/openapi.yaml` (additive `/quality`) |
| Database | **Additive.** `booking_group.open_for_guests boolean NOT NULL DEFAULT false`. New overlay table `data_quality_finding`. No import row, room, package or occupancy rewritten. |
| New routes | House `/quality/`. Existing URLs unchanged. |
| New APIs | `GET /v1/quality` (`group.read`), `PATCH /v1/quality/:code` (`group.update`) |
| Permissions | Existing `group.read` / `group.update` only. No new permission rows. |
| Migration required | `0021_guest_open_programmes.sql` then `0022_data_quality.sql`. Never reuse 0013/0019/0020. |
| Testing completed | Domain quality tests; migrate on live Neon; API live counts; house rebuild; existing `/ops/`, `/review/`, `/rooms/`, `/tasks/` still respond. |
| Known limitations | Publishing a booking now requires the staff tick **and** the existing public-name heuristic. All current programmes are hidden from `/book/` until staff publish them. Folio, payments, calendar rewrite, POS, AI, CMMS and purchasing were **not** started. PR #98 and unrelated PRs were **not** merged. |

**Why not merge #98.** Draft on `main`. Collision: its `0013_guest_open_programmes.sql` vs this branch’s `0013_ops_board.sql`. Would drop night porter, house log, manuals, tasks, service boards, front desk, payroll.

**Data we did not invent.** Rooms 301–307 stay missing. Package prices stay “confirm the list”. Skipped-row count stays a source conflict (65 vs 6).

## Increment — Data quality page readable + all house links (2026-09-03)

The first `/quality/` screen dumped raw JSON and showed a house note as if it were the live status (45 vs 42 looked like “Needs review” while live data is a source conflict). Guest book at `/book/` is empty of programmes until staff publish — that is the privacy rule, not a broken list.

| | |
| --- | --- |
| Change | Findings show house-readable lines. Badge is the **live** status. House note is labelled separately. A “Every working link” panel lists all house, guest-book and Pocket URLs. |
| Not changed | Routes, tables, import rows, rooms, prices. |

## Increment — shared task engine (2026-09-03)

**Feature.** One house task list every department can use. Guest requests, daily checklists, house log, manuals and maintenance tickets are unchanged. This list sits beside them.

| | |
| --- | --- |
| Files changed | `domains/ops/tasks.ts`, `domains/ops/tasks.test.ts`, `db/migrations/0019_ops_task_engine.sql`, `db/seed/0020_ops_task_permissions.sql`, `services/platform-api/src/tasks.ts`, `services/platform-api/src/server.ts` (register only), `apps/web-admin/app/tasks/page.tsx`, `apps/web-admin/components/TaskBoard.tsx`, `apps/web-admin/components/Nav.tsx` (one In-service item), `apps/web-staff/app/page.tsx` (Tasks tab) |
| Database | **Additive.** New tables `ops_task`, `ops_task_event`. No existing table altered. No existing column renamed or dropped. Tasks are never hard-deleted (`ON DELETE RESTRICT` on events). |
| New routes | House `/tasks/`. Pocket tab **Tasks**. Existing URLs unchanged. |
| New APIs | `GET/POST /v1/ops/tasks`, `GET /v1/ops/tasks/people`, `GET/PATCH /v1/ops/tasks/:id`, `POST .../status`, `.../comment`, `.../attachment`, `.../approve`, `.../verify`, `.../reopen` |
| New permissions | `task.read`, `task.write`, `task.assign`, `task.approve` (insert only). House log readers can still open the list via existing `group.read` / `cover.read`. |
| Migration required | Yes — `0019_ops_task_engine.sql` then seed `0020_ops_task_permissions.sql`. Different basenames (schema_applied is by filename only). |
| Testing completed | Domain tests; API create → assign → start → pause → complete → verify → reopen; existing `/v1/ops/board` and manuals still respond; house + pocket rebuild. |
| Known limitations | Recurring rules, automatic generation from checkout / HACCP / stock, and a workflow rule engine are **not** in this increment. Optional links (room, guest, SOP slug, parent) are labels only — they do not rewrite housekeeping, bookings or guest-request flows. Attachments are data URLs, same 700KB cap as department-board photos. Overdue is derived from `due_at`, never stored, so a status change cannot wipe that history. |

Statuses supported: New, Assigned, Acknowledged, Accepted, Scheduled, In Progress, Paused, Waiting, Blocked, Awaiting Approval, Completed, Verified, Reopened, Cancelled. Overdue is a display flag.

## Earlier increments on this branch (still live)

| Feature | Notes |
| --- | --- |
| House log | `/ops/`, `ops_*` tables, guest requests isolated by guest account |
| Front desk / department boards / payroll | `/front/`, `/service/`, `/payroll/` — photos as data URLs |
| Night porter | `/night/`, duty slot `NIGHT`, seed `0018_night_porter_round.sql` |
| House manual | `/manual/`, `house_manual` — house edits are never overwritten by defaults |
| Sidebar width | `.shell` 340px, `.nav-group` column — no branding change |
| GDPR guest book | Guests see only their stay; public names stripped |

## Intentionally not touched

Existing authentication (email, no password), Kiteline rota/PIN clock, Parslia kitchen, SOP table contents, Firebase rules, production guest data, room statuses, booking states, and all previously published URLs.
