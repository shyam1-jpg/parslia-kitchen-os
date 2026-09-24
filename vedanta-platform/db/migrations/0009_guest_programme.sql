-- Guest book registrations can point at a programme already in the house book.
ALTER TABLE guest_enquiry
  ADD COLUMN IF NOT EXISTS programme_id uuid REFERENCES booking_group(id);
CREATE INDEX IF NOT EXISTS guest_enquiry_programme_idx ON guest_enquiry(programme_id);
