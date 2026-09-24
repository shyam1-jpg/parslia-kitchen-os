-- Opt-in guest-book publish flag (idea from PR #98; applied here as a new
-- additive column so it does not collide with 0013_ops_board.sql).
-- Default false: new and existing bookings stay off the guest book until
-- a member of staff ticks "Show on guest book".
-- Rollback: ALTER TABLE booking_group DROP COLUMN IF EXISTS open_for_guests;

ALTER TABLE booking_group
  ADD COLUMN IF NOT EXISTS open_for_guests boolean NOT NULL DEFAULT false;
