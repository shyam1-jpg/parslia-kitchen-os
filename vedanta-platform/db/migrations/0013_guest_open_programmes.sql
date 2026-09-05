-- House bookings stay private until staff explicitly publish them to the guest book.
-- Without this flag, every residential/day_retreat name was leaking onto /book/.
ALTER TABLE booking_group
  ADD COLUMN IF NOT EXISTS open_for_guests boolean NOT NULL DEFAULT false;

COMMENT ON COLUMN booking_group.open_for_guests IS
  'When true, this programme may appear on the signed-in guest book for registration. Default false — private client bookings must not be listed.';
