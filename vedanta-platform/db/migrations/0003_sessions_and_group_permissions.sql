-- 0003 Dev sign-in sessions, group permissions, meal notes on groups.
-- Sessions are for the development sign-in only; production uses the OIDC provider (§15).

CREATE TABLE session (
  token text PRIMARY KEY,
  user_id uuid NOT NULL REFERENCES app_user(id),
  property_id uuid NOT NULL REFERENCES property(id),
  created_at timestamptz NOT NULL DEFAULT now(),
  expires_at timestamptz NOT NULL
);

ALTER TABLE booking_group
  ADD COLUMN meals_from text CHECK (meals_from IN ('BREAKFAST','LUNCH','DINNER','NONE')),
  ADD COLUMN meals_to text CHECK (meals_to IN ('BREAKFAST','LUNCH','DINNER','NONE')),
  ADD COLUMN dietary_notes text,
  ADD COLUMN colour text;

INSERT INTO permission (code, description) VALUES
  ('group.read','View group bookings'),
  ('group.create','Create group booking enquiries'),
  ('group.update','Edit group booking details and paperwork'),
  ('group.confirm','Confirm, hold, check in and check out groups'),
  ('group.cancel','Cancel a group booking'),
  ('occupancy.write','Place, move and remove people on the room board'),
  ('covers.read','View meal covers and dietary flags');

-- Role grants moved to db/seed/0003_role_permissions.sql (roles do not exist yet when migrations run on a fresh database).
INSERT INTO role_permission (role_id, permission_code)
SELECT r.id, pm.code FROM role r CROSS JOIN permission pm
WHERE pm.code IN ('group.read','group.create','group.update','group.confirm','group.cancel','occupancy.write','covers.read') AND (
  r.code IN ('SYSTEM_OWNER','GENERAL_MANAGER','FRONT_OFFICE_MANAGER')
  OR (r.code='RECEPTIONIST' AND pm.code <> 'group.cancel')
  OR (r.code IN ('HK_SUPERVISOR','HK_ATTENDANT','MAINTENANCE') AND pm.code IN ('group.read'))
  OR (r.code IN ('HEAD_CHEF','KITCHEN') AND pm.code IN ('group.read','covers.read'))
  OR (r.code='PROGRAMME' AND pm.code IN ('group.read','group.create','group.update','covers.read'))
  OR (r.code='FINANCE_HR' AND pm.code IN ('group.read'))
) ON CONFLICT DO NOTHING;
