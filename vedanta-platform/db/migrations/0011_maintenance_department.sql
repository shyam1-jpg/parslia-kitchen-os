-- Maintenance tickets: which department reported / owns the fault.
ALTER TABLE maintenance_ticket
  ADD COLUMN IF NOT EXISTS department text;
