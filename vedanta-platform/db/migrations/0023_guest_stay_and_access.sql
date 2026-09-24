-- Guest access lockout / expiry and stay details for the public booking funnel.
-- Additive only. Does not rewrite guest accounts, enquiries, rooms or occupancy.

ALTER TABLE guest_account
  ADD COLUMN IF NOT EXISTS access_code_expires_at timestamptz,
  ADD COLUMN IF NOT EXISTS access_code_failed_attempts integer NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS access_code_locked_until timestamptz,
  ADD COLUMN IF NOT EXISTS access_code_issued_at timestamptz;

ALTER TABLE guest_enquiry
  ADD COLUMN IF NOT EXISTS dietary_notes text,
  ADD COLUMN IF NOT EXISTS accessibility_notes text,
  ADD COLUMN IF NOT EXISTS room_preference text,
  ADD COLUMN IF NOT EXISTS arrival_time_note text,
  ADD COLUMN IF NOT EXISTS travel_notes text;
