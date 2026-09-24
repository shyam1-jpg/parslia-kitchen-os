-- Department boards (notes + photos), FOH recipes / kitchen orders, payroll rate.

ALTER TABLE ops_checklist_item ADD COLUMN IF NOT EXISTS due_time time;

ALTER TABLE staff_hr ADD COLUMN IF NOT EXISTS hourly_rate numeric(8,2);

CREATE TABLE IF NOT EXISTS dept_board (
  property_id uuid NOT NULL REFERENCES property(id) ON DELETE CASCADE,
  tenant_id uuid NOT NULL REFERENCES tenant(id),
  department text NOT NULL,
  about text NOT NULL DEFAULT '',
  updated_by uuid REFERENCES app_user(id),
  updated_at timestamptz NOT NULL DEFAULT now(),
  PRIMARY KEY (property_id, department)
);

CREATE TABLE IF NOT EXISTS dept_photo (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id uuid NOT NULL REFERENCES tenant(id),
  property_id uuid NOT NULL REFERENCES property(id) ON DELETE CASCADE,
  department text NOT NULL,
  caption text NOT NULL DEFAULT '',
  image_data text NOT NULL,
  sort_order int NOT NULL DEFAULT 0,
  created_by uuid REFERENCES app_user(id),
  created_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS dept_photo_dept_idx ON dept_photo (property_id, department, sort_order);

CREATE TABLE IF NOT EXISTS foh_recipe (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id uuid NOT NULL REFERENCES tenant(id),
  property_id uuid NOT NULL REFERENCES property(id) ON DELETE CASCADE,
  weekday text NOT NULL,
  title text NOT NULL,
  method text NOT NULL,
  ingredients jsonb NOT NULL DEFAULT '[]',
  UNIQUE (property_id, weekday)
);

CREATE TABLE IF NOT EXISTS foh_supplier (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id uuid NOT NULL REFERENCES tenant(id),
  property_id uuid NOT NULL REFERENCES property(id) ON DELETE CASCADE,
  code text NOT NULL,
  name text NOT NULL,
  supplies text NOT NULL,
  note text,
  UNIQUE (property_id, code)
);

CREATE TABLE IF NOT EXISTS foh_stock (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id uuid NOT NULL REFERENCES tenant(id),
  property_id uuid NOT NULL REFERENCES property(id) ON DELETE CASCADE,
  name text NOT NULL,
  category text NOT NULL,
  supplier_code text NOT NULL,
  par_note text,
  UNIQUE (property_id, name)
);

CREATE TABLE IF NOT EXISTS foh_order (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id uuid NOT NULL REFERENCES tenant(id),
  property_id uuid NOT NULL REFERENCES property(id) ON DELETE CASCADE,
  for_date date NOT NULL,
  needed_for text,
  items jsonb NOT NULL,
  notes text,
  status text NOT NULL DEFAULT 'open' CHECK (status IN ('open', 'seen', 'done')),
  raised_by uuid REFERENCES app_user(id),
  raised_by_name text,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS foh_order_house_idx ON foh_order (property_id, status, for_date);
