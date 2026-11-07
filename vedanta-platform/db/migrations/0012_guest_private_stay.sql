-- Each guest-book client has their own private booking. Rooms sit on that
-- booking only — never on a shared programme group — so one guest cannot
-- see another guest's stay.
ALTER TABLE guest_enquiry
  ADD COLUMN IF NOT EXISTS booking_id uuid REFERENCES booking_group(id);
CREATE UNIQUE INDEX IF NOT EXISTS guest_enquiry_booking_uidx
  ON guest_enquiry(booking_id) WHERE booking_id IS NOT NULL;
CREATE INDEX IF NOT EXISTS guest_enquiry_guest_idx ON guest_enquiry(guest_id);
