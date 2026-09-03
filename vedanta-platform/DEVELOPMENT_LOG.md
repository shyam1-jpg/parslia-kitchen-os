# Vedanta Retreat Operating System — development log

Handover record for work added on `cursor/vedanta-render-deploy-f604`. Existing pages, routes, schemas and Kiteline/Parslia behaviour are preserved unless a row below says otherwise.

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
