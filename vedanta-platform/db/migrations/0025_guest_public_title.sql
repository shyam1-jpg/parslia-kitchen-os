-- Optional guest-facing title. House booking names stay as they are.
-- Rollback: ALTER TABLE booking_group DROP COLUMN IF EXISTS public_title;
ALTER TABLE booking_group
  ADD COLUMN IF NOT EXISTS public_title text;
