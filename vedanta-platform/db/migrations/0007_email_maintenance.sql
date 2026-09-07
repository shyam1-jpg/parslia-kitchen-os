-- 0007 Outbound email log; maintenance tickets.

CREATE TABLE outbound_email (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id uuid NOT NULL REFERENCES tenant(id),
  property_id uuid NOT NULL REFERENCES property(id),
  to_email text NOT NULL,
  subject text NOT NULL,
  body text NOT NULL,
  kind text NOT NULL,                       -- form_link, confirmation, custom
  related_type text, related_id uuid,       -- e.g. booking_group
  sent_by_user_id uuid REFERENCES app_user(id),
  status text NOT NULL DEFAULT 'QUEUED' CHECK (status IN ('QUEUED','SENT','FAILED','LOGGED')),  -- LOGGED = no SMTP configured
  error text,
  created_at timestamptz NOT NULL DEFAULT now(),
  sent_at timestamptz
);
CREATE INDEX outbound_email_related_idx ON outbound_email(related_type, related_id, created_at desc);

CREATE TABLE maintenance_ticket (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id uuid NOT NULL REFERENCES tenant(id),
  property_id uuid NOT NULL REFERENCES property(id),
  number serial,                            -- human reference, e.g. M-42
  room_id uuid REFERENCES room(id),
  location text,                            -- when not a room: "Kitchen", "Lakeside path"
  title text NOT NULL,
  description text,
  priority text NOT NULL DEFAULT 'NORMAL' CHECK (priority IN ('LOW','NORMAL','URGENT','SAFETY')),
  status text NOT NULL DEFAULT 'OPEN' CHECK (status IN ('OPEN','IN_PROGRESS','WAITING_PARTS','DONE','CANCELLED')),
  reported_by_user_id uuid REFERENCES app_user(id),
  assigned_to_user_id uuid REFERENCES app_user(id),
  takes_room_out boolean NOT NULL DEFAULT false,   -- if true, the room is set OUT_OF_ORDER while open
  resolution text,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  resolved_at timestamptz,
  version integer NOT NULL DEFAULT 1
);
CREATE INDEX maintenance_open_idx ON maintenance_ticket(property_id, status) WHERE status NOT IN ('DONE','CANCELLED');
CREATE TRIGGER maintenance_touch BEFORE UPDATE ON maintenance_ticket FOR EACH ROW EXECUTE FUNCTION touch_updated_at();

INSERT INTO permission (code, description) VALUES
  ('maintenance.read', 'View maintenance tickets'),
  ('maintenance.report', 'Report a fault'),
  ('maintenance.work', 'Take, update and close tickets'),
  ('email.send', 'Send emails from the platform') ON CONFLICT DO NOTHING;
