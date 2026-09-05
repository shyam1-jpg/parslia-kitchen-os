# Running the platform locally

Needs: Docker (for Postgres) or a local PostgreSQL 16, Node 22+, Python 3 with openpyxl (for the importer).

```
# 1. Database
docker compose -f infra/docker-compose.yml up -d
npm run db:migrate                # migrations, property seed, dev users

# 2. Import the bookings sheet (optional, re-runnable)
python3 tools/import-sheet/import_calendar.py "The Vedanta Calendar.xlsx" out
python3 tools/import-sheet/load_groups.py out/groups.json out/groups.sql
docker exec -i vedanta-db psql -U vedanta -d vedanta < out/groups.sql
python3 tools/import-sheet/import_roomsheet.py "The Vedanta Calendar.xlsx" out/rooms.sql 2025 2026
docker exec -i vedanta-db psql -U vedanta -d vedanta < out/rooms.sql
#    Shortcut: db/import/imported_from_sheet_2026-09-02.sql holds both results of the 2 Sept 2026
#    export (bookings, notes, room placements) — load it instead of running the importers.

# 3. API  (port 4000)
cd services/platform-api && npm install && npm run dev

# 4. Admin app  (port 3000)
cd apps/web-admin && npm install && npm run dev
```

Open http://localhost:3000, pick a user on the sign-in screen.

Development sign-in is by email with no password. Before any real use this is replaced by
the identity provider (Microsoft Entra / Google / Auth0 / Keycloak) — the API already checks
permissions per role, so only the login step changes.
