-- 0002 Learned from the live Google Sheet (2 Sept 2026): the property sells to groups.
-- Extend rooms with bed configuration and building sections; make group bookings first-class.

ALTER TABLE room
  ADD COLUMN section text,                       -- Ground Floor, Pink Corridor, First Floor, Green Corridor, Second Floor
  ADD COLUMN beds_single smallint NOT NULL DEFAULT 0,
  ADD COLUMN beds_double smallint NOT NULL DEFAULT 0,
  ADD COLUMN beds_king smallint NOT NULL DEFAULT 0,
  ADD COLUMN mattresses smallint NOT NULL DEFAULT 0, -- extra floor mattresses
  ADD COLUMN max_capacity smallint,
  ADD COLUMN features text[] NOT NULL DEFAULT '{}',  -- lake_view, courtyard_view, shower, hairdryer, desk, disabled_access, cool_room
  ADD COLUMN notes text,
  ADD COLUMN staff_only boolean NOT NULL DEFAULT false;

-- Group bookings carry the commercial agreement; individual reservations hang off them.
ALTER TABLE booking_group
  ADD COLUMN organisation text,                  -- e.g. Hoffman Institute, OmLife, Think Gita
  ADD COLUMN contact_email text,
  ADD COLUMN contact_phone text,
  ADD COLUMN arrival_date date,
  ADD COLUMN arrival_slot text CHECK (arrival_slot IN ('AM','PM')),
  ADD COLUMN arrival_time time,
  ADD COLUMN departure_date date,
  ADD COLUMN departure_slot text CHECK (departure_slot IN ('AM','PM')),
  ADD COLUMN departure_time time,
  ADD COLUMN retreat_type text,                  -- residential, day_retreat, wedding, venue_hire, volunteer, internal
  ADD COLUMN use_basis text CHECK (use_basis IN ('EXCLUSIVE','SHARED')),
  ADD COLUMN expected_guests smallint,
  ADD COLUMN expected_rooms smallint,
  ADD COLUMN package_name text,                  -- Standard, Premium, Grand Vedanta, ...
  ADD COLUMN price_basis text,                   -- per_person, per_person_per_night, fixed
  ADD COLUMN price_notes text,                   -- free text as agreed, e.g. "Twin £249 pp / Single £339 pp"
  ADD COLUMN spa_access boolean NOT NULL DEFAULT false,
  ADD COLUMN status text NOT NULL DEFAULT 'ENQUIRY' CHECK (status IN
    ('ENQUIRY','PROVISIONAL','CONFIRMED','IN_HOUSE','COMPLETED','CANCELLED')),
  ADD COLUMN booking_form_status text CHECK (booking_form_status IN ('NOT_SENT','SENT','COMPLETE')),
  ADD COLUMN terms_signed boolean NOT NULL DEFAULT false,
  ADD COLUMN terms_document text,
  ADD COLUMN feedback_form_status text,
  ADD COLUMN source text,                        -- 'IMPORT:SHEET' for migrated rows
  ADD COLUMN external_ref text,                  -- sheet: '<year>:<row>'
  ADD COLUMN notes text,
  ADD COLUMN version integer NOT NULL DEFAULT 1,
  ADD COLUMN updated_at timestamptz NOT NULL DEFAULT now();
CREATE UNIQUE INDEX booking_group_import_idx ON booking_group(property_id, source, external_ref) WHERE external_ref IS NOT NULL;
CREATE TRIGGER booking_group_touch BEFORE UPDATE ON booking_group FOR EACH ROW EXECUTE FUNCTION touch_updated_at();

-- Named attendees placed into rooms by half-day (mirrors the Room Sheet exactly).
CREATE TABLE room_occupancy (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id uuid NOT NULL REFERENCES tenant(id),
  room_id uuid NOT NULL REFERENCES room(id),
  group_id uuid REFERENCES booking_group(id),
  reservation_id uuid REFERENCES reservation(id),
  person_id uuid REFERENCES person(id),
  occupant_label text NOT NULL,                  -- name as written until matched to a person
  on_date date NOT NULL,
  slot text NOT NULL CHECK (slot IN ('AM','PM')),
  UNIQUE (room_id, on_date, slot, occupant_label)
);
CREATE INDEX room_occupancy_date_idx ON room_occupancy(on_date, slot, room_id);

-- Operational calendar entries that are not bookings (contractor visits, team meetings, holidays).
CREATE TABLE calendar_note (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id uuid NOT NULL REFERENCES tenant(id),
  property_id uuid NOT NULL REFERENCES property(id),
  on_date date NOT NULL,
  slot text CHECK (slot IN ('AM','PM')),
  kind text NOT NULL CHECK (kind IN ('HOLIDAY','MAINTENANCE','TEAM','VIEWING','OTHER')),
  text text NOT NULL,
  source text, external_ref text
);
