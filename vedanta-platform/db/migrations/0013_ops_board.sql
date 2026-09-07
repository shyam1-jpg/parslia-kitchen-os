-- Daily house log: shift handover, notices, department checklists, guest requests.
-- One property only — this is not a hotel-chain corporate layer.

CREATE TABLE ops_handover (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id uuid NOT NULL REFERENCES tenant(id),
  property_id uuid NOT NULL REFERENCES property(id),
  department text NOT NULL,
  shift text NOT NULL CHECK (shift IN ('am', 'pm')),
  for_date date NOT NULL DEFAULT (timezone('Europe/London', now()))::date,
  body text NOT NULL,
  author_user_id uuid REFERENCES app_user(id),
  author_name text,
  created_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX ops_handover_house_date_idx ON ops_handover (property_id, for_date DESC, created_at DESC);

CREATE TABLE ops_notice (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id uuid NOT NULL REFERENCES tenant(id),
  property_id uuid NOT NULL REFERENCES property(id),
  department text,
  title text NOT NULL,
  body text NOT NULL,
  author_user_id uuid REFERENCES app_user(id),
  author_name text,
  pinned boolean NOT NULL DEFAULT false,
  created_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX ops_notice_house_idx ON ops_notice (property_id, pinned DESC, created_at DESC);

CREATE TABLE ops_checklist_item (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id uuid NOT NULL REFERENCES tenant(id),
  property_id uuid NOT NULL REFERENCES property(id),
  department text NOT NULL,
  title text NOT NULL,
  sort_order int NOT NULL DEFAULT 0,
  active boolean NOT NULL DEFAULT true,
  UNIQUE (property_id, department, title)
);

CREATE TABLE ops_checklist_tick (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id uuid NOT NULL REFERENCES tenant(id),
  property_id uuid NOT NULL REFERENCES property(id),
  item_id uuid NOT NULL REFERENCES ops_checklist_item(id) ON DELETE CASCADE,
  for_date date NOT NULL DEFAULT (timezone('Europe/London', now()))::date,
  done boolean NOT NULL DEFAULT true,
  done_by_user_id uuid REFERENCES app_user(id),
  done_by_name text,
  done_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (item_id, for_date)
);

CREATE TABLE ops_guest_request (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id uuid NOT NULL REFERENCES tenant(id),
  property_id uuid NOT NULL REFERENCES property(id),
  guest_account_id uuid REFERENCES guest_account(id) ON DELETE SET NULL,
  guest_enquiry_id uuid REFERENCES guest_enquiry(id) ON DELETE SET NULL,
  guest_name text,
  guest_email text,
  room_label text,
  department text NOT NULL,
  request_text text NOT NULL,
  status text NOT NULL DEFAULT 'open' CHECK (status IN ('open', 'doing', 'done')),
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX ops_guest_request_house_idx ON ops_guest_request (property_id, status, created_at DESC);
CREATE INDEX ops_guest_request_guest_idx ON ops_guest_request (guest_account_id, created_at DESC);
