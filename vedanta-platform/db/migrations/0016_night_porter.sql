-- Night porter: a third shift on handover, and a night slot on the duty board.

ALTER TABLE ops_handover DROP CONSTRAINT IF EXISTS ops_handover_shift_check;
ALTER TABLE ops_handover ADD CONSTRAINT ops_handover_shift_check CHECK (shift IN ('am', 'pm', 'night'));

ALTER TABLE staff_duty DROP CONSTRAINT IF EXISTS staff_duty_slot_check;
ALTER TABLE staff_duty ADD CONSTRAINT staff_duty_slot_check CHECK (slot IN ('AM', 'PM', 'NIGHT'));
