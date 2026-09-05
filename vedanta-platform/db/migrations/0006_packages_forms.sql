-- 0006 Package prices as data; organiser booking-form links; integration keys.

CREATE TABLE package (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id uuid NOT NULL REFERENCES tenant(id),
  property_id uuid NOT NULL REFERENCES property(id),
  code text NOT NULL,
  name text NOT NULL,
  price_basis text NOT NULL CHECK (price_basis IN ('PER_PERSON','PER_PERSON_PER_NIGHT','FIXED')),
  price_twin numeric(12,2),         -- per person sharing (or the fixed price when basis = FIXED)
  price_single numeric(12,2),       -- per person in a single room
  includes_spa boolean NOT NULL DEFAULT false,
  includes_meals boolean NOT NULL DEFAULT true,
  active boolean NOT NULL DEFAULT true,
  sort smallint NOT NULL DEFAULT 100,
  UNIQUE (property_id, code)
);

ALTER TABLE booking_group
  ADD COLUMN package_id uuid REFERENCES package(id),
  ADD COLUMN agreed_price_twin numeric(12,2),     -- overrides the package price for this booking
  ADD COLUMN agreed_price_single numeric(12,2),
  ADD COLUMN singles_count smallint,              -- how many guests are in single rooms
  ADD COLUMN agreed_total numeric(12,2),          -- if set, this is the booking value, full stop
  ADD COLUMN form_token text UNIQUE,              -- organiser booking-form link
  ADD COLUMN form_sent_at timestamptz,
  ADD COLUMN form_submitted_at timestamptz;

-- Guests submitted through the organiser form, before/independent of room placement.
CREATE TABLE group_attendee (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id uuid NOT NULL REFERENCES tenant(id),
  group_id uuid NOT NULL REFERENCES booking_group(id) ON DELETE CASCADE,
  person_id uuid NOT NULL REFERENCES person(id),
  room_preference text,            -- single, twin, share_with:<name>
  arrives_early boolean NOT NULL DEFAULT false,
  submitted_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (group_id, person_id)
);

-- Integration keys (Parslia etc.). The key itself is stored hashed.
CREATE TABLE integration_key (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id uuid NOT NULL REFERENCES tenant(id),
  property_id uuid NOT NULL REFERENCES property(id),
  name text NOT NULL,
  key_hash text NOT NULL UNIQUE,
  scopes text[] NOT NULL DEFAULT '{}',
  created_at timestamptz NOT NULL DEFAULT now(),
  last_used_at timestamptz,
  revoked_at timestamptz
);

INSERT INTO permission (code, description) VALUES ('package.manage', 'Edit packages and prices') ON CONFLICT DO NOTHING;
