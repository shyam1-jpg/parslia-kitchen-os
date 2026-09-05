-- 0001 Foundation: organisation, identity, audit, inventory, guests, reservations, room status.
-- Conventions: uuid ids, tenant_id on every table, version column on aggregates,
-- timestamps in timestamptz, state columns as text checked against an explicit list.

CREATE EXTENSION IF NOT EXISTS pgcrypto;

-- ---------- Organisation ----------
CREATE TABLE tenant (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text NOT NULL,
  country char(2) NOT NULL,
  currency char(3) NOT NULL,
  timezone text NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE property (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id uuid NOT NULL REFERENCES tenant(id),
  code text NOT NULL,
  name text NOT NULL,
  check_in_from time NOT NULL DEFAULT '15:00',
  check_out_by time NOT NULL DEFAULT '11:00',
  settings jsonb NOT NULL DEFAULT '{}',
  created_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (tenant_id, code)
);

CREATE TABLE department (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id uuid NOT NULL REFERENCES tenant(id),
  property_id uuid NOT NULL REFERENCES property(id),
  code text NOT NULL,
  name text NOT NULL,
  UNIQUE (property_id, code)
);

-- ---------- Identity & permissions ----------
-- Authentication is delegated to an OIDC provider; we store the subject, never passwords.
CREATE TABLE app_user (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id uuid NOT NULL REFERENCES tenant(id),
  oidc_subject text UNIQUE,
  email text NOT NULL,
  display_name text NOT NULL,
  status text NOT NULL DEFAULT 'ACTIVE' CHECK (status IN ('INVITED','ACTIVE','SUSPENDED','LEFT')),
  created_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (tenant_id, email)
);

CREATE TABLE role (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id uuid NOT NULL REFERENCES tenant(id),
  code text NOT NULL,
  name text NOT NULL,
  approval_limit numeric(12,2),           -- e.g. refund limit for FRONT_OFFICE_MANAGER
  UNIQUE (tenant_id, code)
);

CREATE TABLE permission (
  code text PRIMARY KEY,                  -- e.g. 'reservation.create', 'refund.create'
  description text NOT NULL
);

CREATE TABLE role_permission (
  role_id uuid NOT NULL REFERENCES role(id) ON DELETE CASCADE,
  permission_code text NOT NULL REFERENCES permission(code),
  PRIMARY KEY (role_id, permission_code)
);

-- A user holds a role at a property (property-scoped membership).
CREATE TABLE membership (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id uuid NOT NULL REFERENCES tenant(id),
  user_id uuid NOT NULL REFERENCES app_user(id),
  property_id uuid NOT NULL REFERENCES property(id),
  role_id uuid NOT NULL REFERENCES role(id),
  department_id uuid REFERENCES department(id),
  UNIQUE (user_id, property_id, role_id)
);

-- ---------- Audit ----------
-- Append-only. Every state transition and privileged action writes one row.
CREATE TABLE audit_event (
  id bigserial PRIMARY KEY,
  tenant_id uuid NOT NULL,
  property_id uuid,
  occurred_at timestamptz NOT NULL DEFAULT now(),
  actor_user_id uuid,
  actor_type text NOT NULL DEFAULT 'USER' CHECK (actor_type IN ('USER','SYSTEM','INTEGRATION','AI')),
  entity_type text NOT NULL,
  entity_id uuid NOT NULL,
  action text NOT NULL,                   -- e.g. 'reservation.confirm'
  from_state text,
  to_state text,
  reason text,
  entity_version integer,
  trace_id text,
  payload jsonb NOT NULL DEFAULT '{}'
);
CREATE INDEX audit_event_entity_idx ON audit_event(entity_type, entity_id, occurred_at);
CREATE INDEX audit_event_actor_idx ON audit_event(actor_user_id, occurred_at);

-- ---------- Inventory ----------
CREATE TABLE room_type (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id uuid NOT NULL REFERENCES tenant(id),
  property_id uuid NOT NULL REFERENCES property(id),
  code text NOT NULL,
  name text NOT NULL,
  max_occupancy smallint NOT NULL CHECK (max_occupancy > 0),
  UNIQUE (property_id, code)
);

CREATE TABLE room (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id uuid NOT NULL REFERENCES tenant(id),
  property_id uuid NOT NULL REFERENCES property(id),
  room_type_id uuid NOT NULL REFERENCES room_type(id),
  number text NOT NULL,
  floor text,
  building text,
  -- Housekeeping state machine (Appendix A)
  status text NOT NULL DEFAULT 'VACANT_DIRTY' CHECK (status IN
    ('VACANT_DIRTY','CLEANING','VACANT_CLEAN','INSPECTED','OCCUPIED','OUT_OF_SERVICE','OUT_OF_ORDER')),
  status_before_oos text,                 -- prior valid state to return to after safety check
  version integer NOT NULL DEFAULT 1,
  updated_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (property_id, number)
);

CREATE TABLE space (                      -- halls, dining room, meeting rooms, bookable experiences
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id uuid NOT NULL REFERENCES tenant(id),
  property_id uuid NOT NULL REFERENCES property(id),
  code text NOT NULL,
  name text NOT NULL,
  kind text NOT NULL CHECK (kind IN ('RESTAURANT','HALL','MEETING','OUTDOOR','OTHER')),
  seats smallint,
  max_covers smallint,                    -- operational maximum per service
  UNIQUE (property_id, code)
);

CREATE TABLE rate_plan (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id uuid NOT NULL REFERENCES tenant(id),
  property_id uuid NOT NULL REFERENCES property(id),
  code text NOT NULL,
  name text NOT NULL,
  currency char(3) NOT NULL,
  nightly_amount numeric(12,2) NOT NULL,
  board text NOT NULL DEFAULT 'FULL' CHECK (board IN ('ROOM_ONLY','BB','HB','FULL')),
  active boolean NOT NULL DEFAULT true,
  UNIQUE (property_id, code)
);

-- ---------- Guests ----------
CREATE TABLE person (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id uuid NOT NULL REFERENCES tenant(id),
  given_name text NOT NULL,
  family_name text NOT NULL,
  email text,
  phone text,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX person_email_idx ON person(tenant_id, lower(email));

CREATE TABLE guest_profile (
  person_id uuid PRIMARY KEY REFERENCES person(id),
  tenant_id uuid NOT NULL REFERENCES tenant(id),
  marketing_consent boolean NOT NULL DEFAULT false,
  consent_recorded_at timestamptz,
  notes text
);

-- Dietary/allergen data is a safety record: kept separate, changes audited.
CREATE TABLE diet_profile (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id uuid NOT NULL REFERENCES tenant(id),
  person_id uuid NOT NULL REFERENCES person(id),
  diet text[] NOT NULL DEFAULT '{}',      -- e.g. {vegetarian, vegan, gluten_free}
  allergens text[] NOT NULL DEFAULT '{}', -- UK 14 allergen codes, see seed
  severity text CHECK (severity IN ('PREFERENCE','INTOLERANCE','ALLERGY','ANAPHYLAXIS')),
  notes text,
  declared_by_user_id uuid REFERENCES app_user(id),
  declared_at timestamptz NOT NULL DEFAULT now(),
  version integer NOT NULL DEFAULT 1
);

-- ---------- Groups & reservations ----------
CREATE TABLE booking_group (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id uuid NOT NULL REFERENCES tenant(id),
  property_id uuid NOT NULL REFERENCES property(id),
  name text NOT NULL,
  organiser_person_id uuid REFERENCES person(id),
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE reservation (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id uuid NOT NULL REFERENCES tenant(id),
  property_id uuid NOT NULL REFERENCES property(id),
  confirmation_code text NOT NULL,
  status text NOT NULL CHECK (status IN
    ('ENQUIRY','OPTION','CONFIRMED','CHECKED_IN','CHECKED_OUT','CANCELLED','NO_SHOW')),
  source text NOT NULL,                   -- DIRECT, PHONE, OTA:<channel>, GROUP
  external_ref text,                      -- provider reservation id for OTA dedupe
  arrival_date date NOT NULL,
  departure_date date NOT NULL,
  room_type_id uuid NOT NULL REFERENCES room_type(id),
  rate_plan_id uuid REFERENCES rate_plan(id),
  adults smallint NOT NULL DEFAULT 1 CHECK (adults >= 0),
  children smallint NOT NULL DEFAULT 0 CHECK (children >= 0),
  primary_guest_id uuid REFERENCES person(id),
  group_id uuid REFERENCES booking_group(id),
  option_expires_at timestamptz,          -- for OPTION status; expiry publishes hold.expired
  currency char(3) NOT NULL,
  total_amount numeric(12,2) NOT NULL DEFAULT 0,
  version integer NOT NULL DEFAULT 1,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (tenant_id, confirmation_code),
  UNIQUE (property_id, source, external_ref),
  CHECK (departure_date > arrival_date)
);
CREATE INDEX reservation_property_dates_idx
  ON reservation(property_id, arrival_date, departure_date) WHERE status NOT IN ('CANCELLED','NO_SHOW');

CREATE TABLE reservation_guest (
  reservation_id uuid NOT NULL REFERENCES reservation(id) ON DELETE CASCADE,
  person_id uuid NOT NULL REFERENCES person(id),
  is_primary boolean NOT NULL DEFAULT false,
  PRIMARY KEY (reservation_id, person_id)
);

-- Physical room assignment is separate from room-type inventory (§24).
CREATE TABLE room_assignment (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id uuid NOT NULL REFERENCES tenant(id),
  reservation_id uuid NOT NULL REFERENCES reservation(id),
  room_id uuid NOT NULL REFERENCES room(id),
  from_date date NOT NULL,
  to_date date NOT NULL,
  assigned_by_user_id uuid REFERENCES app_user(id),
  assigned_at timestamptz NOT NULL DEFAULT now(),
  CHECK (to_date > from_date)
);
CREATE INDEX room_assignment_room_dates_idx ON room_assignment(room_id, from_date, to_date);

-- Prevent double assignment of a room on overlapping nights.
CREATE EXTENSION IF NOT EXISTS btree_gist;
ALTER TABLE room_assignment ADD CONSTRAINT room_assignment_no_overlap
  EXCLUDE USING gist (room_id WITH =, daterange(from_date, to_date, '[)') WITH &&);

-- ---------- Sequences ----------
CREATE SEQUENCE confirmation_code_seq START 10000;

-- ---------- updated_at trigger ----------
CREATE OR REPLACE FUNCTION touch_updated_at() RETURNS trigger AS $$
BEGIN NEW.updated_at = now(); RETURN NEW; END $$ LANGUAGE plpgsql;
CREATE TRIGGER reservation_touch BEFORE UPDATE ON reservation FOR EACH ROW EXECUTE FUNCTION touch_updated_at();
CREATE TRIGGER room_touch BEFORE UPDATE ON room FOR EACH ROW EXECUTE FUNCTION touch_updated_at();
CREATE TRIGGER person_touch BEFORE UPDATE ON person FOR EACH ROW EXECUTE FUNCTION touch_updated_at();
