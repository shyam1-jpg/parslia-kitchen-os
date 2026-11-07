# Migration from the Google Sheet

The property currently records bookings in a Google Sheet. The platform must go live
without anyone retyping bookings.

## Plan
1. Shyam exports the sheet as .xlsx and shares it.
2. Build `tools/import-sheet/` which reads the sheet, maps columns to `person`,
   `reservation`, `reservation_guest`, `diet_profile`, and writes a dry-run report
   (rows imported, rows needing attention, duplicates) before touching the database.
3. Rooms and rate plans in `db/seed` are replaced with the real names and prices found
   in the sheet.
4. Until go-live, the importer can be re-run to pull in new sheet bookings — the sheet
   stays the master until the day of switch-over, then becomes read-only.

## Rules
- Every imported reservation gets `source = 'IMPORT:SHEET'` and `external_ref = <sheet row id>`
  so re-runs never create duplicates (§24).
- Rows with unreadable dates, unknown rooms or missing names are listed, not guessed.
- Allergen and dietary notes are imported into `diet_profile`, never dropped.
