-- =============================================================================
-- Kiteline — ops, compliance, clock (company_id + location_id on every row)
-- =============================================================================

CREATE TABLE IF NOT EXISTS clock_events (
  id           uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id   uuid NOT NULL REFERENCES companies(id) ON DELETE CASCADE,
  location_id  uuid NOT NULL,
  user_id      uuid NOT NULL REFERENCES users(id),
  event_type   clock_event_type NOT NULL,
  method       text NOT NULL DEFAULT 'pin', -- pin | admin_override | kiosk
  at           timestamptz NOT NULL DEFAULT now(),
  meta         jsonb NOT NULL DEFAULT '{}'::jsonb,
  created_at   timestamptz NOT NULL DEFAULT now(),
  FOREIGN KEY (company_id, location_id) REFERENCES locations(company_id, id) ON DELETE CASCADE
);

CREATE INDEX IF NOT EXISTS clock_events_loc_idx ON clock_events(company_id, location_id, at DESC);
CREATE INDEX IF NOT EXISTS clock_events_user_idx ON clock_events(company_id, user_id, at DESC);

CREATE TABLE IF NOT EXISTS temperature_logs (
  id           uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id   uuid NOT NULL REFERENCES companies(id) ON DELETE CASCADE,
  location_id  uuid NOT NULL,
  asset_name   text NOT NULL,
  zone         text,
  temp_c       numeric(6,2) NOT NULL,
  min_c        numeric(6,2),
  max_c        numeric(6,2),
  result       text, -- pass | fail | warn
  recorded_by  uuid REFERENCES users(id),
  recorded_at  timestamptz NOT NULL DEFAULT now(),
  notes        text,
  legacy_id    text,
  FOREIGN KEY (company_id, location_id) REFERENCES locations(company_id, id) ON DELETE CASCADE
);

CREATE INDEX IF NOT EXISTS temperature_logs_loc_idx ON temperature_logs(company_id, location_id, recorded_at DESC);

CREATE TABLE IF NOT EXISTS cleaning_logs (
  id           uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id   uuid NOT NULL REFERENCES companies(id) ON DELETE CASCADE,
  location_id  uuid NOT NULL,
  area         text NOT NULL,
  checklist_title text,
  status       text NOT NULL DEFAULT 'done',
  recorded_by  uuid REFERENCES users(id),
  recorded_at  timestamptz NOT NULL DEFAULT now(),
  notes        text,
  legacy_id    text,
  FOREIGN KEY (company_id, location_id) REFERENCES locations(company_id, id) ON DELETE CASCADE
);

CREATE TABLE IF NOT EXISTS maintenance_logs (
  id           uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id   uuid NOT NULL REFERENCES companies(id) ON DELETE CASCADE,
  location_id  uuid NOT NULL,
  title        text NOT NULL,
  asset_name   text,
  priority     text NOT NULL DEFAULT 'normal',
  status       text NOT NULL DEFAULT 'open',
  created_by   uuid REFERENCES users(id),
  assigned_to  uuid REFERENCES users(id),
  created_at   timestamptz NOT NULL DEFAULT now(),
  updated_at   timestamptz NOT NULL DEFAULT now(),
  closed_at    timestamptz,
  notes        text,
  legacy_id    text,
  FOREIGN KEY (company_id, location_id) REFERENCES locations(company_id, id) ON DELETE CASCADE
);

CREATE TABLE IF NOT EXISTS haccp_checklists (
  id           uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id   uuid NOT NULL REFERENCES companies(id) ON DELETE CASCADE,
  location_id  uuid NOT NULL,
  title        text NOT NULL,
  category     text,
  recurrence   text,
  items        jsonb NOT NULL DEFAULT '[]'::jsonb,
  active       boolean NOT NULL DEFAULT true,
  legacy_id    text,
  created_at   timestamptz NOT NULL DEFAULT now(),
  FOREIGN KEY (company_id, location_id) REFERENCES locations(company_id, id) ON DELETE CASCADE
);

CREATE TABLE IF NOT EXISTS haccp_completions (
  id            uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id    uuid NOT NULL REFERENCES companies(id) ON DELETE CASCADE,
  location_id   uuid NOT NULL,
  checklist_id  uuid NOT NULL REFERENCES haccp_checklists(id) ON DELETE CASCADE,
  completed_by  uuid REFERENCES users(id),
  completed_at  timestamptz NOT NULL DEFAULT now(),
  answers       jsonb NOT NULL DEFAULT '{}'::jsonb,
  status        text NOT NULL DEFAULT 'completed',
  FOREIGN KEY (company_id, location_id) REFERENCES locations(company_id, id) ON DELETE CASCADE
);

CREATE TABLE IF NOT EXISTS deliveries (
  id           uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id   uuid NOT NULL REFERENCES companies(id) ON DELETE CASCADE,
  location_id  uuid NOT NULL,
  supplier_name text,
  accepted     boolean,
  temp_c       numeric(6,2),
  recorded_by  uuid REFERENCES users(id),
  recorded_at  timestamptz NOT NULL DEFAULT now(),
  items        jsonb NOT NULL DEFAULT '[]'::jsonb,
  notes        text,
  legacy_id    text,
  FOREIGN KEY (company_id, location_id) REFERENCES locations(company_id, id) ON DELETE CASCADE
);

CREATE TABLE IF NOT EXISTS incidents (
  id           uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id   uuid NOT NULL REFERENCES companies(id) ON DELETE CASCADE,
  location_id  uuid NOT NULL,
  title        text NOT NULL,
  incident_type text,
  severity     text,
  status       text NOT NULL DEFAULT 'open',
  reported_by  uuid REFERENCES users(id),
  reported_at  timestamptz NOT NULL DEFAULT now(),
  description  text,
  actions      jsonb NOT NULL DEFAULT '[]'::jsonb,
  legacy_id    text,
  FOREIGN KEY (company_id, location_id) REFERENCES locations(company_id, id) ON DELETE CASCADE
);

CREATE TABLE IF NOT EXISTS assets (
  id           uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id   uuid NOT NULL REFERENCES companies(id) ON DELETE CASCADE,
  location_id  uuid NOT NULL,
  name         text NOT NULL,
  asset_type   text,
  serial       text,
  status       text NOT NULL DEFAULT 'active',
  next_service date,
  legacy_id    text,
  created_at   timestamptz NOT NULL DEFAULT now(),
  FOREIGN KEY (company_id, location_id) REFERENCES locations(company_id, id) ON DELETE CASCADE
);

CREATE TABLE IF NOT EXISTS batches (
  id           uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id   uuid NOT NULL REFERENCES companies(id) ON DELETE CASCADE,
  location_id  uuid NOT NULL,
  product      text NOT NULL,
  batch_no     text,
  qty          text,
  made_at      timestamptz,
  use_by       date,
  recorded_by  uuid REFERENCES users(id),
  legacy_id    text,
  FOREIGN KEY (company_id, location_id) REFERENCES locations(company_id, id) ON DELETE CASCADE
);

CREATE TABLE IF NOT EXISTS cooling_logs (
  id           uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id   uuid NOT NULL REFERENCES companies(id) ON DELETE CASCADE,
  location_id  uuid NOT NULL,
  item         text NOT NULL,
  start_temp   numeric(6,2),
  result       text,
  recorded_by  uuid REFERENCES users(id),
  recorded_at  timestamptz NOT NULL DEFAULT now(),
  details      jsonb NOT NULL DEFAULT '{}'::jsonb,
  legacy_id    text,
  FOREIGN KEY (company_id, location_id) REFERENCES locations(company_id, id) ON DELETE CASCADE
);

CREATE TABLE IF NOT EXISTS holding_logs (
  id           uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id   uuid NOT NULL REFERENCES companies(id) ON DELETE CASCADE,
  location_id  uuid NOT NULL,
  unit_name    text NOT NULL,
  kind         text,
  temp_c       numeric(6,2),
  result       text,
  recorded_by  uuid REFERENCES users(id),
  recorded_at  timestamptz NOT NULL DEFAULT now(),
  legacy_id    text,
  FOREIGN KEY (company_id, location_id) REFERENCES locations(company_id, id) ON DELETE CASCADE
);

CREATE TABLE IF NOT EXISTS ph_logs (
  id           uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id   uuid NOT NULL REFERENCES companies(id) ON DELETE CASCADE,
  location_id  uuid NOT NULL,
  item         text NOT NULL,
  ph           numeric(5,2) NOT NULL,
  result       text,
  recorded_by  uuid REFERENCES users(id),
  recorded_at  timestamptz NOT NULL DEFAULT now(),
  legacy_id    text,
  FOREIGN KEY (company_id, location_id) REFERENCES locations(company_id, id) ON DELETE CASCADE
);

CREATE TABLE IF NOT EXISTS training_records (
  id           uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id   uuid NOT NULL REFERENCES companies(id) ON DELETE CASCADE,
  location_id  uuid,
  user_id      uuid REFERENCES users(id),
  person_name  text,
  course       text NOT NULL,
  completed_at date,
  expires_at   date,
  legacy_id    text,
  created_at   timestamptz NOT NULL DEFAULT now()
);
