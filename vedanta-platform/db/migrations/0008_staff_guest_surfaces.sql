-- 0008 Three surfaces: house (admin), pocket (staff phone), book (guest).
-- Sessions are audience-locked so a guest token cannot call the house, and a
-- pocket token cannot open reports, salaries or staff access.

ALTER TABLE session
  ADD COLUMN IF NOT EXISTS audience text NOT NULL DEFAULT 'ADMIN'
    CHECK (audience IN ('ADMIN','STAFF'));

CREATE TABLE guest_account (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id uuid NOT NULL REFERENCES tenant(id),
  property_id uuid NOT NULL REFERENCES property(id),
  email text NOT NULL,
  display_name text NOT NULL,
  status text NOT NULL DEFAULT 'ACTIVE' CHECK (status IN ('ACTIVE','SUSPENDED')),
  created_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (property_id, email)
);

CREATE TABLE guest_session (
  token text PRIMARY KEY,
  guest_id uuid NOT NULL REFERENCES guest_account(id),
  created_at timestamptz NOT NULL DEFAULT now(),
  expires_at timestamptz NOT NULL
);

CREATE TABLE guest_enquiry (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id uuid NOT NULL REFERENCES tenant(id),
  property_id uuid NOT NULL REFERENCES property(id),
  guest_id uuid REFERENCES guest_account(id),
  name text NOT NULL,
  email text NOT NULL,
  people smallint NOT NULL CHECK (people > 0 AND people < 500),
  arrival_date date NOT NULL,
  departure_date date NOT NULL,
  notes text,
  status text NOT NULL DEFAULT 'ENQUIRY' CHECK (status IN ('ENQUIRY','ACKNOWLEDGED','CONVERTED','DECLINED')),
  created_at timestamptz NOT NULL DEFAULT now(),
  CHECK (departure_date >= arrival_date)
);
CREATE INDEX guest_enquiry_email_idx ON guest_enquiry(property_id, email, created_at DESC);

CREATE TABLE staff_leave (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id uuid NOT NULL REFERENCES tenant(id),
  property_id uuid NOT NULL REFERENCES property(id),
  user_id uuid NOT NULL REFERENCES app_user(id),
  kind text NOT NULL CHECK (kind IN ('HOLIDAY','DAY_OFF','SICK','UNPAID')),
  starts_on date NOT NULL,
  ends_on date NOT NULL,
  hours numeric(6,2) NOT NULL CHECK (hours > 0),
  note text,
  status text NOT NULL DEFAULT 'SUBMITTED' CHECK (status IN ('SUBMITTED','HOD_APPROVED','APPROVED','REJECTED','CANCELLED')),
  hod_approver_id uuid REFERENCES app_user(id),
  gm_approver_id uuid REFERENCES app_user(id),
  decided_reason text,
  version integer NOT NULL DEFAULT 1,
  created_at timestamptz NOT NULL DEFAULT now(),
  CHECK (ends_on >= starts_on)
);
CREATE INDEX staff_leave_user_idx ON staff_leave(user_id, starts_on);
CREATE INDEX staff_leave_status_idx ON staff_leave(property_id, status);

CREATE TABLE staff_clock (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id uuid NOT NULL REFERENCES tenant(id),
  property_id uuid NOT NULL REFERENCES property(id),
  user_id uuid NOT NULL REFERENCES app_user(id),
  kind text NOT NULL CHECK (kind IN ('IN','OUT')),
  at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX staff_clock_user_idx ON staff_clock(user_id, at DESC);

CREATE TABLE staff_duty (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id uuid NOT NULL REFERENCES tenant(id),
  property_id uuid NOT NULL REFERENCES property(id),
  user_id uuid NOT NULL REFERENCES app_user(id),
  on_date date NOT NULL,
  slot text NOT NULL CHECK (slot IN ('AM','PM')),
  kind text NOT NULL DEFAULT 'DUTY' CHECK (kind IN ('DUTY','COVER')),
  room_id uuid REFERENCES room(id),
  note text,
  UNIQUE (user_id, on_date, slot)
);
CREATE INDEX staff_duty_date_idx ON staff_duty(property_id, on_date);

CREATE TABLE staff_sop (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id uuid NOT NULL REFERENCES tenant(id),
  property_id uuid NOT NULL REFERENCES property(id),
  title text NOT NULL,
  body text NOT NULL,
  created_by uuid REFERENCES app_user(id),
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE staff_sop_assignment (
  sop_id uuid NOT NULL REFERENCES staff_sop(id) ON DELETE CASCADE,
  user_id uuid NOT NULL REFERENCES app_user(id),
  sent_at timestamptz NOT NULL DEFAULT now(),
  read_at timestamptz,
  PRIMARY KEY (sop_id, user_id)
);

CREATE TABLE staff_contract (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id uuid NOT NULL REFERENCES tenant(id),
  property_id uuid NOT NULL REFERENCES property(id),
  user_id uuid NOT NULL REFERENCES app_user(id),
  title text NOT NULL,
  body text NOT NULL,
  starts_on date,
  status text NOT NULL DEFAULT 'DRAFT' CHECK (status IN ('DRAFT','SENT','SIGNED')),
  sent_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now()
);

-- Pay is house-only. Never selected by guest or pocket routes.
CREATE TABLE staff_hr (
  user_id uuid PRIMARY KEY REFERENCES app_user(id),
  tenant_id uuid NOT NULL REFERENCES tenant(id),
  property_id uuid NOT NULL REFERENCES property(id),
  designation text,
  contracted_hours numeric(6,2),
  pay_note text,
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE tip_pool (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id uuid NOT NULL REFERENCES tenant(id),
  property_id uuid NOT NULL REFERENCES property(id),
  week_start date NOT NULL,
  total numeric(12,2) NOT NULL CHECK (total >= 0),
  rate_per_hour numeric(8,4) NOT NULL DEFAULT 0,
  method text NOT NULL CHECK (method IN ('EVEN','HOURS','RATE')),
  created_by uuid REFERENCES app_user(id),
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE tip_share (
  pool_id uuid NOT NULL REFERENCES tip_pool(id) ON DELETE CASCADE,
  user_id uuid NOT NULL REFERENCES app_user(id),
  hours numeric(8,2) NOT NULL,
  guaranteed numeric(12,2) NOT NULL,
  pool numeric(12,2) NOT NULL,
  manual numeric(12,2) NOT NULL DEFAULT 0,
  share numeric(12,2) NOT NULL,
  PRIMARY KEY (pool_id, user_id)
);

INSERT INTO permission (code, description) VALUES
  ('leave.request','Request holiday or time off'),
  ('leave.approve_hod','Approve department holiday requests'),
  ('leave.approve_gm','Approve head-of-department holiday, and complete the second signature'),
  ('clock.self','Clock in and out'),
  ('clock.manage','See everyone''s clock and hours'),
  ('cover.read','See who is on duty'),
  ('cover.write','Place staff on the duty board'),
  ('sop.read','Read SOPs sent to you'),
  ('sop.manage','Write SOPs and send them to staff'),
  ('tip.manage','Run the tip pool (house only)'),
  ('hr.read','See staff pay, contracts and designations (house only)')
ON CONFLICT DO NOTHING;
