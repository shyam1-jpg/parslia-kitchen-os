-- Shared house task engine. New tables only — does not alter house log, guest
-- requests, checklists, manuals, or maintenance tickets. Tasks are never
-- hard-deleted so the event history cannot disappear.

CREATE TABLE IF NOT EXISTS ops_task (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id uuid NOT NULL REFERENCES tenant(id),
  property_id uuid NOT NULL REFERENCES property(id),
  title text NOT NULL,
  notes text NOT NULL DEFAULT '',
  department text NOT NULL,
  team text NOT NULL DEFAULT '',
  location_label text NOT NULL DEFAULT '',
  asset_label text NOT NULL DEFAULT '',
  room_label text NOT NULL DEFAULT '',
  guest_name text NOT NULL DEFAULT '',
  booking_id uuid,
  event_label text NOT NULL DEFAULT '',
  sop_slug text NOT NULL DEFAULT '',
  parent_id uuid REFERENCES ops_task(id) ON DELETE SET NULL,
  priority text NOT NULL DEFAULT 'normal',
  severity text NOT NULL DEFAULT 'none',
  status text NOT NULL DEFAULT 'new',
  due_at timestamptz,
  start_at timestamptz,
  started_at timestamptz,
  finished_at timestamptz,
  expected_minutes int,
  paused_at timestamptz,
  pause_accumulated_ms bigint NOT NULL DEFAULT 0,
  blocked_reason text NOT NULL DEFAULT '',
  created_by uuid REFERENCES app_user(id),
  assigned_staff_id uuid REFERENCES app_user(id),
  assigned_staff_ids uuid[] NOT NULL DEFAULT '{}',
  assigned_label text NOT NULL DEFAULT '',
  responsible_manager_id uuid REFERENCES app_user(id),
  related_guest_request_id uuid,
  verification_note text NOT NULL DEFAULT '',
  approval_note text NOT NULL DEFAULT '',
  source text NOT NULL DEFAULT 'house',
  offline_sync_status text NOT NULL DEFAULT 'synced',
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS ops_task_house_status_idx ON ops_task (property_id, status, due_at);
CREATE INDEX IF NOT EXISTS ops_task_house_dept_idx ON ops_task (property_id, department, created_at DESC);
CREATE INDEX IF NOT EXISTS ops_task_assignee_idx ON ops_task (property_id, assigned_staff_id);
CREATE INDEX IF NOT EXISTS ops_task_parent_idx ON ops_task (parent_id);

CREATE TABLE IF NOT EXISTS ops_task_event (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  task_id uuid NOT NULL REFERENCES ops_task(id) ON DELETE RESTRICT,
  tenant_id uuid NOT NULL REFERENCES tenant(id),
  property_id uuid NOT NULL REFERENCES property(id),
  kind text NOT NULL,
  actor_id uuid REFERENCES app_user(id),
  actor_name text,
  from_status text,
  to_status text,
  field_name text,
  previous_value text,
  new_value text,
  body text NOT NULL DEFAULT '',
  attachment_kind text,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS ops_task_event_task_idx ON ops_task_event (task_id, created_at);

INSERT INTO permission (code, description) VALUES
  ('task.read', 'See house tasks'),
  ('task.write', 'Create and update house tasks'),
  ('task.assign', 'Assign house tasks'),
  ('task.approve', 'Approve, verify and reopen house tasks')
ON CONFLICT DO NOTHING;
