-- Living house manuals: Look / Act chapters the house can edit or withdraw.

CREATE TABLE IF NOT EXISTS house_manual (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id uuid NOT NULL REFERENCES tenant(id),
  property_id uuid NOT NULL REFERENCES property(id) ON DELETE CASCADE,
  slug text NOT NULL,
  department text NOT NULL,
  kind text NOT NULL CHECK (kind IN ('APP', 'SOP', 'SAFETY', 'LOOK', 'HOSPITALITY')),
  title text NOT NULL,
  summary text NOT NULL DEFAULT '',
  body text NOT NULL,
  steps jsonb NOT NULL DEFAULT '[]',
  diagram jsonb NOT NULL DEFAULT '[]',
  status text NOT NULL DEFAULT 'live' CHECK (status IN ('live', 'withdrawn')),
  sort_order int NOT NULL DEFAULT 0,
  updated_by uuid REFERENCES app_user(id),
  updated_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (property_id, slug)
);
CREATE INDEX IF NOT EXISTS house_manual_house_idx ON house_manual (property_id, department, sort_order);

ALTER TABLE staff_sop ADD COLUMN IF NOT EXISTS department text;
ALTER TABLE staff_sop ADD COLUMN IF NOT EXISTS status text NOT NULL DEFAULT 'live';
ALTER TABLE staff_sop ADD COLUMN IF NOT EXISTS slug text;
