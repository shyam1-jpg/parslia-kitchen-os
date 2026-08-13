-- =============================================================================
-- Kiteline — stock, suppliers, recipes, menus, waste, billing
-- =============================================================================

CREATE TABLE IF NOT EXISTS suppliers (
  id           uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id   uuid NOT NULL REFERENCES companies(id) ON DELETE CASCADE,
  location_id  uuid, -- null = company-wide supplier
  name         text NOT NULL,
  category     text,
  contact      text,
  phone        text,
  email        text,
  status       text NOT NULL DEFAULT 'active',
  cert_expiry  date,
  legacy_id    text,
  created_at   timestamptz NOT NULL DEFAULT now(),
  UNIQUE (company_id, name)
);

CREATE TABLE IF NOT EXISTS stock_items (
  id           uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id   uuid NOT NULL REFERENCES companies(id) ON DELETE CASCADE,
  location_id  uuid NOT NULL,
  name         text NOT NULL,
  sku          text,
  unit         text NOT NULL DEFAULT 'each',
  qty_on_hand  numeric(12,3) NOT NULL DEFAULT 0,
  reorder_level numeric(12,3) NOT NULL DEFAULT 0,
  unit_cost    numeric(12,4),
  supplier_id  uuid REFERENCES suppliers(id) ON DELETE SET NULL,
  active       boolean NOT NULL DEFAULT true,
  created_at   timestamptz NOT NULL DEFAULT now(),
  updated_at   timestamptz NOT NULL DEFAULT now(),
  FOREIGN KEY (company_id, location_id) REFERENCES locations(company_id, id) ON DELETE CASCADE,
  UNIQUE (company_id, location_id, name)
);

CREATE TABLE IF NOT EXISTS stock_movements (
  id           uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id   uuid NOT NULL REFERENCES companies(id) ON DELETE CASCADE,
  location_id  uuid NOT NULL,
  stock_item_id uuid NOT NULL REFERENCES stock_items(id) ON DELETE CASCADE,
  movement_type text NOT NULL, -- in | out | adjust | waste | transfer
  qty          numeric(12,3) NOT NULL,
  reason       text,
  created_by   uuid REFERENCES users(id),
  created_at   timestamptz NOT NULL DEFAULT now(),
  FOREIGN KEY (company_id, location_id) REFERENCES locations(company_id, id) ON DELETE CASCADE
);

CREATE TABLE IF NOT EXISTS purchase_orders (
  id           uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id   uuid NOT NULL REFERENCES companies(id) ON DELETE CASCADE,
  location_id  uuid NOT NULL,
  supplier_id  uuid REFERENCES suppliers(id) ON DELETE SET NULL,
  status       text NOT NULL DEFAULT 'draft',
  ordered_at   timestamptz,
  expected_at  timestamptz,
  lines        jsonb NOT NULL DEFAULT '[]'::jsonb,
  created_by   uuid REFERENCES users(id),
  created_at   timestamptz NOT NULL DEFAULT now(),
  FOREIGN KEY (company_id, location_id) REFERENCES locations(company_id, id) ON DELETE CASCADE
);

CREATE TABLE IF NOT EXISTS recipes (
  id           uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id   uuid NOT NULL REFERENCES companies(id) ON DELETE CASCADE,
  location_id  uuid, -- null = shared across company
  name         text NOT NULL,
  category     text,
  servings     numeric(8,2),
  cost         numeric(12,4),
  price        numeric(12,4),
  allergens    jsonb NOT NULL DEFAULT '[]'::jsonb,
  ingredients  jsonb NOT NULL DEFAULT '[]'::jsonb,
  method       text,
  steps        jsonb NOT NULL DEFAULT '[]'::jsonb,
  active       boolean NOT NULL DEFAULT true,
  legacy_id    text,
  created_at   timestamptz NOT NULL DEFAULT now(),
  updated_at   timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS recipes_company_idx ON recipes(company_id, location_id);

CREATE TABLE IF NOT EXISTS menus (
  id           uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id   uuid NOT NULL REFERENCES companies(id) ON DELETE CASCADE,
  location_id  uuid NOT NULL,
  name         text NOT NULL,
  dishes       jsonb NOT NULL DEFAULT '[]'::jsonb,
  languages    jsonb NOT NULL DEFAULT '["en"]'::jsonb,
  published    boolean NOT NULL DEFAULT false,
  legacy_id    text,
  created_at   timestamptz NOT NULL DEFAULT now(),
  FOREIGN KEY (company_id, location_id) REFERENCES locations(company_id, id) ON DELETE CASCADE
);

CREATE TABLE IF NOT EXISTS waste_logs (
  id           uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id   uuid NOT NULL REFERENCES companies(id) ON DELETE CASCADE,
  location_id  uuid NOT NULL,
  item         text NOT NULL,
  kg           numeric(10,3),
  cost         numeric(12,4),
  reason       text,
  stage        text,
  recorded_by  uuid REFERENCES users(id),
  recorded_at  timestamptz NOT NULL DEFAULT now(),
  legacy_id    text,
  FOREIGN KEY (company_id, location_id) REFERENCES locations(company_id, id) ON DELETE CASCADE
);

CREATE TABLE IF NOT EXISTS food_cost_snapshots (
  id           uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id   uuid NOT NULL REFERENCES companies(id) ON DELETE CASCADE,
  location_id  uuid,
  period_start date NOT NULL,
  period_end   date NOT NULL,
  food_cost_pct numeric(6,2),
  revenue      numeric(14,2),
  food_spend   numeric(14,2),
  details      jsonb NOT NULL DEFAULT '{}'::jsonb,
  created_at   timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS subscriptions (
  id                     uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id             uuid NOT NULL UNIQUE REFERENCES companies(id) ON DELETE CASCADE,
  stripe_subscription_id text UNIQUE,
  plan_code              text NOT NULL,
  status                 subscription_status NOT NULL DEFAULT 'trialing',
  seats                  int NOT NULL DEFAULT 1,
  location_limit         int NOT NULL DEFAULT 1,
  current_period_end     timestamptz,
  created_at             timestamptz NOT NULL DEFAULT now(),
  updated_at             timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS invoices (
  id                uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id        uuid NOT NULL REFERENCES companies(id) ON DELETE CASCADE,
  stripe_invoice_id text UNIQUE,
  amount_pence      int NOT NULL DEFAULT 0,
  currency          text NOT NULL DEFAULT 'gbp',
  status            text NOT NULL,
  hosted_invoice_url text,
  period_start      timestamptz,
  period_end        timestamptz,
  created_at        timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS invoices_company_idx ON invoices(company_id, created_at DESC);
