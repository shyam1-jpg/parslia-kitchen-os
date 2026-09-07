-- 0004 Review of imported bookings: separate the importer's flag and the sheet's original text from staff notes.
ALTER TABLE booking_group
  ADD COLUMN review_reason text,          -- non-null while an imported booking still needs a human check
  ADD COLUMN sheet_text text;             -- what the calendar sheet said, verbatim, for reference

UPDATE booking_group
SET review_reason = 'Departure not found in the sheet — assumed 2 nights',
    sheet_text = nullif(btrim(regexp_replace(notes, '^DEPARTURE NOT FOUND IN SHEET — assumed 2 nights, please check\n?', '')), ''),
    notes = NULL
WHERE notes LIKE 'DEPARTURE NOT FOUND IN SHEET%';

UPDATE booking_group SET sheet_text = notes, notes = NULL
WHERE source = 'IMPORT:SHEET' AND sheet_text IS NULL AND notes IS NOT NULL;

CREATE INDEX booking_group_review_idx ON booking_group(property_id, arrival_date) WHERE review_reason IS NOT NULL;
