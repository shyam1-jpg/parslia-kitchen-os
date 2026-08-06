-- Tenant isolation verification (run as postgres/superuser after schema apply)
-- Creates two companies and proves cross-tenant reads are blocked under RLS.

BEGIN;

TRUNCATE audit_logs, invoices, subscriptions, food_cost_snapshots, waste_logs, menus, recipes,
  purchase_orders, stock_movements, stock_items, suppliers, training_records, ph_logs, holding_logs,
  cooling_logs, batches, assets, incidents, deliveries, haccp_completions, haccp_checklists,
  maintenance_logs, cleaning_logs, temperature_logs, clock_events, staff_pins, sessions,
  location_memberships, memberships, locations, platform_admins, companies, users
CASCADE;

INSERT INTO users (id, email, name) VALUES
  ('11111111-1111-1111-1111-111111111111', 'owner-a@example.com', 'Owner A'),
  ('22222222-2222-2222-2222-222222222222', 'owner-b@example.com', 'Owner B'),
  ('33333333-3333-3333-3333-333333333333', 'staff-a@example.com', 'Staff A');

INSERT INTO companies (id, name, owner_user_id, legacy_tenant_id) VALUES
  ('aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa', 'Company A', '11111111-1111-1111-1111-111111111111', 'tenant_a'),
  ('bbbbbbbb-bbbb-bbbb-bbbb-bbbbbbbbbbbb', 'Company B', '22222222-2222-2222-2222-222222222222', 'tenant_b');

INSERT INTO locations (id, company_id, name, legacy_site_id) VALUES
  ('a1111111-a111-a111-a111-a11111111111', 'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa', 'Kitchen A1', 'site_a1'),
  ('b1111111-b111-b111-b111-b11111111111', 'bbbbbbbb-bbbb-bbbb-bbbb-bbbbbbbbbbbb', 'Kitchen B1', 'site_b1');

INSERT INTO memberships (company_id, user_id, role) VALUES
  ('aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa', '11111111-1111-1111-1111-111111111111', 'company_owner'),
  ('bbbbbbbb-bbbb-bbbb-bbbb-bbbbbbbbbbbb', '22222222-2222-2222-2222-222222222222', 'company_owner'),
  ('aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa', '33333333-3333-3333-3333-333333333333', 'staff');

INSERT INTO location_memberships (company_id, location_id, user_id, role) VALUES
  ('aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa', 'a1111111-a111-a111-a111-a11111111111', '33333333-3333-3333-3333-333333333333', 'staff');

INSERT INTO temperature_logs (company_id, location_id, asset_name, temp_c) VALUES
  ('aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa', 'a1111111-a111-a111-a111-a11111111111', 'Fridge A', 3.2),
  ('bbbbbbbb-bbbb-bbbb-bbbb-bbbbbbbbbbbb', 'b1111111-b111-b111-b111-b11111111111', 'Fridge B', 4.1);

-- Act as Company A owner
SELECT set_config('kiteline.user_id', '11111111-1111-1111-1111-111111111111', true);
SELECT set_config('kiteline.company_id', 'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa', true);
SELECT set_config('kiteline.is_super_admin', 'false', true);

SET LOCAL ROLE kiteline_app;

DO $$
DECLARE
  n int;
BEGIN
  SELECT count(*) INTO n FROM temperature_logs;
  IF n <> 1 THEN
    RAISE EXCEPTION 'Owner A should see 1 temp log, saw %', n;
  END IF;
  SELECT count(*) INTO n FROM companies;
  IF n <> 1 THEN
    RAISE EXCEPTION 'Owner A should see 1 company, saw %', n;
  END IF;
END $$;

RESET ROLE;

-- Act as Staff A (location scoped)
SELECT set_config('kiteline.user_id', '33333333-3333-3333-3333-333333333333', true);
SELECT set_config('kiteline.company_id', 'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa', true);
SELECT set_config('kiteline.is_super_admin', 'false', true);
SET LOCAL ROLE kiteline_app;

DO $$
DECLARE
  n int;
BEGIN
  SELECT count(*) INTO n FROM temperature_logs;
  IF n <> 1 THEN
    RAISE EXCEPTION 'Staff A should see 1 temp log, saw %', n;
  END IF;
  SELECT count(*) INTO n FROM locations;
  IF n <> 1 THEN
    RAISE EXCEPTION 'Staff A should see 1 location, saw %', n;
  END IF;
  -- cross-tenant insert must fail
  BEGIN
    INSERT INTO temperature_logs (company_id, location_id, asset_name, temp_c)
    VALUES ('bbbbbbbb-bbbb-bbbb-bbbb-bbbbbbbbbbbb', 'b1111111-b111-b111-b111-b11111111111', 'Hack', 9);
    RAISE EXCEPTION 'cross-tenant insert should have failed';
  EXCEPTION WHEN insufficient_privilege OR check_violation OR others THEN
    IF SQLERRM = 'cross-tenant insert should have failed' THEN
      RAISE;
    END IF;
    -- expected failure path
    NULL;
  END;
END $$;

RESET ROLE;

-- Act as Company B owner — must not see A
SELECT set_config('kiteline.user_id', '22222222-2222-2222-2222-222222222222', true);
SELECT set_config('kiteline.company_id', 'bbbbbbbb-bbbb-bbbb-bbbb-bbbbbbbbbbbb', true);
SELECT set_config('kiteline.is_super_admin', 'false', true);
SET LOCAL ROLE kiteline_app;

DO $$
DECLARE
  n int;
  asset text;
BEGIN
  SELECT count(*) INTO n FROM temperature_logs;
  IF n <> 1 THEN
    RAISE EXCEPTION 'Owner B should see 1 temp log, saw %', n;
  END IF;
  SELECT asset_name INTO asset FROM temperature_logs LIMIT 1;
  IF asset <> 'Fridge B' THEN
    RAISE EXCEPTION 'Owner B saw wrong row: %', asset;
  END IF;
  SELECT count(*) INTO n FROM companies c WHERE c.name = 'Company A';
  IF n <> 0 THEN
    RAISE EXCEPTION 'Owner B must not see Company A';
  END IF;
END $$;

RESET ROLE;
ROLLBACK;

SELECT 'isolation_test_ok' AS result;
