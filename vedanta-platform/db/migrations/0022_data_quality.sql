-- House overlay for data-quality findings. Does not alter import rows,
-- room inventory, packages, occupancy, or source_text.
-- Staff may mark a finding VERIFIED after they confirm it; the live counts
-- still come from the real tables.
-- Rollback: DROP TABLE IF EXISTS data_quality_finding;

CREATE TABLE IF NOT EXISTS data_quality_finding (
  property_id uuid NOT NULL REFERENCES property(id),
  code text NOT NULL,
  status text NOT NULL CHECK (status IN ('VERIFIED', 'NEEDS_REVIEW', 'SOURCE_CONFLICT', 'MISSING')),
  note text NOT NULL DEFAULT '',
  decided_by uuid REFERENCES app_user(id),
  decided_at timestamptz NOT NULL DEFAULT now(),
  PRIMARY KEY (property_id, code)
);
