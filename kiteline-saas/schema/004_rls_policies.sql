-- =============================================================================
-- Kiteline — Row Level Security
-- API must set request settings after auth:
--   SELECT set_config('kiteline.user_id', '<uuid>', true);
--   SELECT set_config('kiteline.company_id', '<uuid>', true);
--   SELECT set_config('kiteline.is_super_admin', 'false', true);
-- App role should be a non-superuser DB role (kiteline_app).
-- =============================================================================

DO $$ BEGIN
  CREATE ROLE kiteline_app NOINHERIT LOGIN;
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

GRANT USAGE ON SCHEMA public TO kiteline_app;
GRANT SELECT, INSERT, UPDATE, DELETE ON ALL TABLES IN SCHEMA public TO kiteline_app;
GRANT USAGE, SELECT ON ALL SEQUENCES IN SCHEMA public TO kiteline_app;
ALTER DEFAULT PRIVILEGES IN SCHEMA public GRANT SELECT, INSERT, UPDATE, DELETE ON TABLES TO kiteline_app;
ALTER DEFAULT PRIVILEGES IN SCHEMA public GRANT USAGE, SELECT ON SEQUENCES TO kiteline_app;

-- Helper: enable RLS + force for a table
CREATE OR REPLACE FUNCTION kiteline_enable_rls(tbl regclass) RETURNS void
LANGUAGE plpgsql AS $$
BEGIN
  EXECUTE format('ALTER TABLE %s ENABLE ROW LEVEL SECURITY', tbl);
  EXECUTE format('ALTER TABLE %s FORCE ROW LEVEL SECURITY', tbl);
END;
$$;

-- Users: can see self; super admin sees all
SELECT kiteline_enable_rls('users');
DROP POLICY IF EXISTS users_self_or_admin ON users;
CREATE POLICY users_self_or_admin ON users
  FOR SELECT USING (
    kiteline_is_super_admin()
    OR id = kiteline_current_user_id()
    OR (
      kiteline_current_company_id() IS NOT NULL
      AND kiteline_user_has_company(kiteline_current_company_id())
    )
  );

DROP POLICY IF EXISTS users_self_update ON users;
CREATE POLICY users_self_update ON users
  FOR UPDATE USING (id = kiteline_current_user_id() OR kiteline_is_super_admin());

-- Companies
SELECT kiteline_enable_rls('companies');
DROP POLICY IF EXISTS companies_member_select ON companies;
CREATE POLICY companies_member_select ON companies
  FOR SELECT USING (kiteline_user_has_company(id));
DROP POLICY IF EXISTS companies_owner_update ON companies;
CREATE POLICY companies_owner_update ON companies
  FOR UPDATE USING (
    kiteline_is_super_admin()
    OR (
      id = kiteline_current_company_id()
      AND kiteline_user_has_company(id)
    )
  );

-- Generic location-scoped policy factory via SQL on each ops table
DO $$
DECLARE
  t text;
BEGIN
  FOREACH t IN ARRAY ARRAY[
    'memberships',
    'location_memberships',
    'staff_pins',
    'sessions',
    'audit_logs',
    'clock_events',
    'temperature_logs',
    'cleaning_logs',
    'maintenance_logs',
    'haccp_checklists',
    'haccp_completions',
    'deliveries',
    'incidents',
    'assets',
    'batches',
    'cooling_logs',
    'holding_logs',
    'ph_logs',
    'training_records',
    'suppliers',
    'stock_items',
    'stock_movements',
    'purchase_orders',
    'recipes',
    'menus',
    'waste_logs',
    'food_cost_snapshots',
    'subscriptions',
    'invoices'
  ]
  LOOP
    EXECUTE format('ALTER TABLE %I ENABLE ROW LEVEL SECURITY', t);
    EXECUTE format('ALTER TABLE %I FORCE ROW LEVEL SECURITY', t);
    EXECUTE format('DROP POLICY IF EXISTS %I_company_isolation ON %I', t, t);
    -- tables with location_id use location check when present
    IF EXISTS (
      SELECT 1 FROM information_schema.columns
      WHERE table_schema = 'public' AND table_name = t AND column_name = 'location_id'
    ) AND EXISTS (
      SELECT 1 FROM information_schema.columns
      WHERE table_schema = 'public' AND table_name = t AND column_name = 'company_id'
    ) THEN
      EXECUTE format($p$
        CREATE POLICY %I_company_isolation ON %I
        FOR ALL
        USING (
          kiteline_is_super_admin()
          OR (
            company_id = kiteline_current_company_id()
            AND kiteline_user_has_company(company_id)
            AND (
              location_id IS NULL
              OR kiteline_user_has_location(company_id, location_id)
            )
          )
        )
        WITH CHECK (
          kiteline_is_super_admin()
          OR (
            company_id = kiteline_current_company_id()
            AND kiteline_user_has_company(company_id)
            AND (
              location_id IS NULL
              OR kiteline_user_has_location(company_id, location_id)
            )
          )
        )
      $p$, t, t);
    ELSIF EXISTS (
      SELECT 1 FROM information_schema.columns
      WHERE table_schema = 'public' AND table_name = t AND column_name = 'company_id'
    ) THEN
      EXECUTE format($p$
        CREATE POLICY %I_company_isolation ON %I
        FOR ALL
        USING (
          kiteline_is_super_admin()
          OR (
            company_id = kiteline_current_company_id()
            AND kiteline_user_has_company(company_id)
          )
        )
        WITH CHECK (
          kiteline_is_super_admin()
          OR (
            company_id = kiteline_current_company_id()
            AND kiteline_user_has_company(company_id)
          )
        )
      $p$, t, t);
    END IF;
  END LOOP;
END $$;

-- Locations: owners/admins see all company locations; others only assigned
-- Use SECURITY DEFINER helpers only (no direct memberships scans under RLS).
SELECT kiteline_enable_rls('locations');
DROP POLICY IF EXISTS locations_isolation ON locations;
CREATE POLICY locations_isolation ON locations
  FOR ALL
  USING (
    kiteline_is_super_admin()
    OR (
      company_id = kiteline_current_company_id()
      AND kiteline_user_has_location(company_id, id)
    )
  )
  WITH CHECK (
    kiteline_is_super_admin()
    OR (
      company_id = kiteline_current_company_id()
      AND kiteline_user_has_company(company_id)
    )
  );

-- platform_admins: super admin only
SELECT kiteline_enable_rls('platform_admins');
DROP POLICY IF EXISTS platform_admins_sa ON platform_admins;
CREATE POLICY platform_admins_sa ON platform_admins
  FOR ALL USING (kiteline_is_super_admin())
  WITH CHECK (kiteline_is_super_admin());
