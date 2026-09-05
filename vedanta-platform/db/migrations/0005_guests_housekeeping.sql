-- 0005 Guest records behind board names, housekeeping status log, user admin.

-- Attendee identity on the board: occupant_label stays as written; person_id links a real record.
ALTER TABLE person ADD COLUMN notes text, ADD COLUMN organisation text;
CREATE INDEX person_name_idx ON person(tenant_id, lower(given_name), lower(family_name));

-- One current declaration per person (history is in audit_event).
ALTER TABLE diet_profile ADD CONSTRAINT diet_profile_person_unique UNIQUE (person_id);

-- Housekeeping: keep a log of status changes for the daily board and reports.
CREATE TABLE room_status_event (
  id bigserial PRIMARY KEY,
  tenant_id uuid NOT NULL REFERENCES tenant(id),
  room_id uuid NOT NULL REFERENCES room(id),
  from_status text, to_status text NOT NULL,
  by_user_id uuid REFERENCES app_user(id),
  reason text,
  at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX room_status_event_room_idx ON room_status_event(room_id, at desc);

-- Permissions for the new screens
INSERT INTO permission (code, description) VALUES
  ('report.read', 'View occupancy, covers and revenue reports') ON CONFLICT DO NOTHING;
-- Role grants moved to db/seed/0003_role_permissions.sql (roles do not exist yet when migrations run on a fresh database).
INSERT INTO role_permission (role_id, permission_code)
SELECT r.id, pm.code FROM role r CROSS JOIN permission pm WHERE
  (pm.code = 'report.read' AND r.code IN ('SYSTEM_OWNER','GENERAL_MANAGER','FRONT_OFFICE_MANAGER','FINANCE_HR'))
  OR (pm.code IN ('guest.read','guest.write','diet.read','diet.write') AND r.code IN ('SYSTEM_OWNER','GENERAL_MANAGER','FRONT_OFFICE_MANAGER','RECEPTIONIST','PROGRAMME'))
  OR (pm.code IN ('guest.read','diet.read') AND r.code IN ('HEAD_CHEF','KITCHEN','HK_SUPERVISOR'))
  OR (pm.code IN ('room.status.update','room.oos.set') AND r.code IN ('SYSTEM_OWNER','GENERAL_MANAGER','FRONT_OFFICE_MANAGER','HK_SUPERVISOR','MAINTENANCE'))
  OR (pm.code = 'room.status.update' AND r.code IN ('HK_ATTENDANT','RECEPTIONIST'))
ON CONFLICT DO NOTHING;
