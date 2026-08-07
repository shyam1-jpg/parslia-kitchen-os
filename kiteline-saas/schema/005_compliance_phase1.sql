-- =============================================================================
-- Kiteline Compliance Phase 1 — templates, schedules, runs, defects, CAPA, audit
-- Depends on: 001_core_tenancy.sql (companies, locations, users)
-- =============================================================================

DO $$ BEGIN
  CREATE TYPE compliance_template_status AS ENUM ('draft', 'active', 'archived');
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
  CREATE TYPE compliance_run_status AS ENUM (
    'scheduled', 'in_progress', 'completed', 'missed', 'cancelled'
  );
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
  CREATE TYPE compliance_defect_status AS ENUM (
    'open', 'in_progress', 'awaiting_verification', 'closed', 'overdue'
  );
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
  CREATE TYPE compliance_risk_level AS ENUM (
    'acceptable', 'low', 'medium', 'high', 'critical'
  );
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

-- Optional hierarchy extensions (Phase 1 minimal — nullable FKs for future)
CREATE TABLE IF NOT EXISTS divisions (
  id           uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id   uuid NOT NULL REFERENCES companies(id) ON DELETE CASCADE,
  name         text NOT NULL,
  created_at   timestamptz NOT NULL DEFAULT now(),
  UNIQUE (company_id, name)
);

CREATE TABLE IF NOT EXISTS departments (
  id           uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id   uuid NOT NULL REFERENCES companies(id) ON DELETE CASCADE,
  location_id  uuid NOT NULL,
  name         text NOT NULL,
  created_at   timestamptz NOT NULL DEFAULT now(),
  FOREIGN KEY (company_id, location_id) REFERENCES locations(company_id, id) ON DELETE CASCADE,
  UNIQUE (company_id, location_id, name)
);

CREATE TABLE IF NOT EXISTS areas (
  id             uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id     uuid NOT NULL REFERENCES companies(id) ON DELETE CASCADE,
  location_id    uuid NOT NULL,
  department_id  uuid REFERENCES departments(id) ON DELETE SET NULL,
  name           text NOT NULL,
  created_at     timestamptz NOT NULL DEFAULT now(),
  FOREIGN KEY (company_id, location_id) REFERENCES locations(company_id, id) ON DELETE CASCADE
);

CREATE TABLE IF NOT EXISTS compliance_templates (
  id              uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id      uuid NOT NULL REFERENCES companies(id) ON DELETE CASCADE,
  name            text NOT NULL,
  description     text,
  category        text,
  department      text,
  instructions    text,
  responsible_role text,
  frequency       text NOT NULL DEFAULT 'daily',
  days_of_week    int[] DEFAULT ARRAY[1,2,3,4,5,6,7],
  window_start    time,
  window_end      time,
  grace_minutes   int NOT NULL DEFAULT 30,
  require_manager_verification boolean NOT NULL DEFAULT false,
  evidence_required boolean NOT NULL DEFAULT false,
  version         int NOT NULL DEFAULT 1,
  status          compliance_template_status NOT NULL DEFAULT 'draft',
  sections        jsonb NOT NULL DEFAULT '[]'::jsonb,
  parent_template_id uuid REFERENCES compliance_templates(id) ON DELETE SET NULL,
  created_by      uuid REFERENCES users(id),
  created_at      timestamptz NOT NULL DEFAULT now(),
  updated_at      timestamptz NOT NULL DEFAULT now(),
  published_at    timestamptz,
  legacy_id       text
);

CREATE INDEX IF NOT EXISTS compliance_templates_co_idx
  ON compliance_templates(company_id, status);

CREATE TABLE IF NOT EXISTS compliance_template_assignments (
  id            uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id    uuid NOT NULL REFERENCES companies(id) ON DELETE CASCADE,
  template_id   uuid NOT NULL REFERENCES compliance_templates(id) ON DELETE CASCADE,
  scope_type    text NOT NULL, -- company | division | location | department | area | equipment | role | user
  scope_id      text,
  location_id   uuid,
  local_overrides jsonb NOT NULL DEFAULT '{}'::jsonb,
  active        boolean NOT NULL DEFAULT true,
  created_at    timestamptz NOT NULL DEFAULT now(),
  FOREIGN KEY (company_id, location_id) REFERENCES locations(company_id, id) ON DELETE CASCADE
);

CREATE TABLE IF NOT EXISTS compliance_schedules (
  id            uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id    uuid NOT NULL REFERENCES companies(id) ON DELETE CASCADE,
  template_id   uuid NOT NULL REFERENCES compliance_templates(id) ON DELETE CASCADE,
  location_id   uuid NOT NULL,
  assignment_id uuid REFERENCES compliance_template_assignments(id) ON DELETE SET NULL,
  frequency     text NOT NULL DEFAULT 'daily',
  next_due_at   timestamptz,
  window_start  time,
  window_end    time,
  grace_minutes int NOT NULL DEFAULT 30,
  allow_late    boolean NOT NULL DEFAULT true,
  auto_miss     boolean NOT NULL DEFAULT true,
  paused        boolean NOT NULL DEFAULT false,
  backup_user_id uuid REFERENCES users(id),
  active        boolean NOT NULL DEFAULT true,
  created_at    timestamptz NOT NULL DEFAULT now(),
  FOREIGN KEY (company_id, location_id) REFERENCES locations(company_id, id) ON DELETE CASCADE
);

CREATE TABLE IF NOT EXISTS compliance_runs (
  id              uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id      uuid NOT NULL REFERENCES companies(id) ON DELETE CASCADE,
  location_id     uuid NOT NULL,
  template_id     uuid NOT NULL REFERENCES compliance_templates(id),
  schedule_id     uuid REFERENCES compliance_schedules(id) ON DELETE SET NULL,
  template_version int NOT NULL DEFAULT 1,
  template_snapshot jsonb NOT NULL DEFAULT '{}'::jsonb,
  status          compliance_run_status NOT NULL DEFAULT 'scheduled',
  scheduled_for   timestamptz,
  started_at      timestamptz,
  completed_at    timestamptz,
  completed_by    uuid REFERENCES users(id),
  verified_by     uuid REFERENCES users(id),
  verified_at     timestamptz,
  late_reason     text,
  answers         jsonb NOT NULL DEFAULT '{}'::jsonb,
  draft           boolean NOT NULL DEFAULT true,
  created_at      timestamptz NOT NULL DEFAULT now(),
  updated_at      timestamptz NOT NULL DEFAULT now(),
  legacy_id       text,
  FOREIGN KEY (company_id, location_id) REFERENCES locations(company_id, id) ON DELETE CASCADE
);

CREATE INDEX IF NOT EXISTS compliance_runs_loc_status_idx
  ON compliance_runs(company_id, location_id, status, scheduled_for DESC);

CREATE TABLE IF NOT EXISTS compliance_defects (
  id              uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id      uuid NOT NULL REFERENCES companies(id) ON DELETE CASCADE,
  location_id     uuid NOT NULL,
  run_id          uuid REFERENCES compliance_runs(id) ON DELETE SET NULL,
  template_id     uuid REFERENCES compliance_templates(id) ON DELETE SET NULL,
  ref             text NOT NULL,
  question_id     text,
  question_label  text,
  recorded_answer text,
  expected_answer text,
  risk_level      compliance_risk_level NOT NULL DEFAULT 'medium',
  status          compliance_defect_status NOT NULL DEFAULT 'open',
  recorded_by     uuid REFERENCES users(id),
  recorded_at     timestamptz NOT NULL DEFAULT now(),
  comment         text,
  evidence        jsonb NOT NULL DEFAULT '[]'::jsonb,
  immediate_action text,
  area_or_equipment text,
  created_at      timestamptz NOT NULL DEFAULT now(),
  FOREIGN KEY (company_id, location_id) REFERENCES locations(company_id, id) ON DELETE CASCADE
);

CREATE UNIQUE INDEX IF NOT EXISTS compliance_defects_ref_idx
  ON compliance_defects(company_id, ref);

CREATE TABLE IF NOT EXISTS compliance_corrective_actions (
  id              uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id      uuid NOT NULL REFERENCES companies(id) ON DELETE CASCADE,
  location_id     uuid NOT NULL,
  defect_id       uuid NOT NULL REFERENCES compliance_defects(id) ON DELETE CASCADE,
  run_id          uuid REFERENCES compliance_runs(id) ON DELETE SET NULL,
  ref             text NOT NULL,
  title           text NOT NULL,
  description     text,
  risk_level      compliance_risk_level NOT NULL DEFAULT 'medium',
  status          compliance_defect_status NOT NULL DEFAULT 'open',
  assigned_to     uuid REFERENCES users(id),
  due_at          timestamptz,
  escalate_at     timestamptz,
  require_independent_verification boolean NOT NULL DEFAULT false,
  recorded_by     uuid REFERENCES users(id),
  closure_comment text,
  closure_evidence jsonb NOT NULL DEFAULT '[]'::jsonb,
  closed_by       uuid REFERENCES users(id),
  closed_at       timestamptz,
  verified_by     uuid REFERENCES users(id),
  verified_at     timestamptz,
  created_at      timestamptz NOT NULL DEFAULT now(),
  updated_at      timestamptz NOT NULL DEFAULT now(),
  FOREIGN KEY (company_id, location_id) REFERENCES locations(company_id, id) ON DELETE CASCADE
);

CREATE UNIQUE INDEX IF NOT EXISTS compliance_ca_ref_idx
  ON compliance_corrective_actions(company_id, ref);

CREATE TABLE IF NOT EXISTS compliance_audit_events (
  id              uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id      uuid NOT NULL REFERENCES companies(id) ON DELETE CASCADE,
  location_id     uuid,
  actor_user_id   uuid REFERENCES users(id),
  actor_role      text,
  action          text NOT NULL,
  entity_type     text NOT NULL,
  entity_id       text,
  original_value  jsonb,
  new_value       jsonb,
  reason          text,
  device          text,
  at              timestamptz NOT NULL DEFAULT now(),
  meta            jsonb NOT NULL DEFAULT '{}'::jsonb
);

CREATE INDEX IF NOT EXISTS compliance_audit_co_idx
  ON compliance_audit_events(company_id, at DESC);

CREATE TABLE IF NOT EXISTS compliance_notifications (
  id              uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id      uuid NOT NULL REFERENCES companies(id) ON DELETE CASCADE,
  location_id     uuid,
  user_id         uuid REFERENCES users(id),
  channel         text NOT NULL DEFAULT 'in_app', -- in_app | email (sms Phase 3)
  event_type      text NOT NULL,
  title           text NOT NULL,
  body            text,
  entity_type     text,
  entity_id       text,
  read_at         timestamptz,
  created_at      timestamptz NOT NULL DEFAULT now()
);

-- RLS
ALTER TABLE divisions ENABLE ROW LEVEL SECURITY;
ALTER TABLE departments ENABLE ROW LEVEL SECURITY;
ALTER TABLE areas ENABLE ROW LEVEL SECURITY;
ALTER TABLE compliance_templates ENABLE ROW LEVEL SECURITY;
ALTER TABLE compliance_template_assignments ENABLE ROW LEVEL SECURITY;
ALTER TABLE compliance_schedules ENABLE ROW LEVEL SECURITY;
ALTER TABLE compliance_runs ENABLE ROW LEVEL SECURITY;
ALTER TABLE compliance_defects ENABLE ROW LEVEL SECURITY;
ALTER TABLE compliance_corrective_actions ENABLE ROW LEVEL SECURITY;
ALTER TABLE compliance_audit_events ENABLE ROW LEVEL SECURITY;
ALTER TABLE compliance_notifications ENABLE ROW LEVEL SECURITY;

DO $$ BEGIN
  CREATE POLICY compliance_templates_tenant ON compliance_templates
    USING (kiteline_is_super_admin() OR company_id = kiteline_current_company_id());
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
  CREATE POLICY compliance_runs_tenant ON compliance_runs
    USING (kiteline_is_super_admin() OR company_id = kiteline_current_company_id());
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
  CREATE POLICY compliance_defects_tenant ON compliance_defects
    USING (kiteline_is_super_admin() OR company_id = kiteline_current_company_id());
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
  CREATE POLICY compliance_ca_tenant ON compliance_corrective_actions
    USING (kiteline_is_super_admin() OR company_id = kiteline_current_company_id());
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
  CREATE POLICY compliance_audit_tenant ON compliance_audit_events
    USING (kiteline_is_super_admin() OR company_id = kiteline_current_company_id());
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
  CREATE POLICY compliance_notif_tenant ON compliance_notifications
    USING (kiteline_is_super_admin() OR company_id = kiteline_current_company_id());
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
  CREATE POLICY compliance_schedules_tenant ON compliance_schedules
    USING (kiteline_is_super_admin() OR company_id = kiteline_current_company_id());
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
  CREATE POLICY compliance_assign_tenant ON compliance_template_assignments
    USING (kiteline_is_super_admin() OR company_id = kiteline_current_company_id());
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

GRANT SELECT, INSERT, UPDATE, DELETE ON
  divisions, departments, areas,
  compliance_templates, compliance_template_assignments, compliance_schedules,
  compliance_runs, compliance_defects, compliance_corrective_actions,
  compliance_audit_events, compliance_notifications
TO kiteline_app;
