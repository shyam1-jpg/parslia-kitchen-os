-- Development-only identities must never be real staff accounts.
-- Production staff are provisioned explicitly through BOOTSTRAP_OWNER_EMAIL /
-- BOOTSTRAP_ADMIN_EMAILS and authenticate with Microsoft 365.
--
-- These placeholder accounts are harmless in production because email-only staff
-- sign-in is hard-disabled when NODE_ENV=production. They exist only so a fresh
-- local database has role examples for UI/permission testing.
DO $$
DECLARE t uuid; p uuid; u uuid; r record;
BEGIN
  SELECT id INTO t FROM tenant LIMIT 1; SELECT id INTO p FROM property WHERE tenant_id=t LIMIT 1;
  FOR r IN SELECT * FROM (VALUES
    ('dev.owner@example.invalid','Development Owner','SYSTEM_OWNER','MGMT'),
    ('dev.gm@example.invalid','Development GM','GENERAL_MANAGER','MGMT'),
    ('dev.front@example.invalid','Development Front Office','FRONT_OFFICE_MANAGER','FRONT'),
    ('dev.reception@example.invalid','Development Reception','RECEPTIONIST','FRONT'),
    ('dev.housekeeping@example.invalid','Development Housekeeping','HK_SUPERVISOR','HK'),
    ('dev.chef@example.invalid','Development Head Chef','HEAD_CHEF','KITCHEN'),
    ('dev.kitchen@example.invalid','Development Kitchen','KITCHEN','KITCHEN'),
    ('dev.programmes@example.invalid','Development Programme Team','PROGRAMME','PROGRAMME'),
    ('dev.maintenance@example.invalid','Development Maintenance','MAINTENANCE','MAINT'),
    ('dev.grounds@example.invalid','Development Grounds','GROUNDS','GROUNDS')
  ) v(email,name,role,dept) LOOP
    INSERT INTO app_user (tenant_id,email,display_name) VALUES (t,r.email,r.name) RETURNING id INTO u;
    INSERT INTO membership (tenant_id,user_id,property_id,role_id,department_id)
      SELECT t,u,p,ro.id,d.id FROM role ro, department d WHERE ro.tenant_id=t AND ro.code=r.role AND d.property_id=p AND d.code=r.dept;
  END LOOP;
END $$;
