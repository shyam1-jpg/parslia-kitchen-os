-- Development users: one per role, sign in by email with no password (dev only).
DO $$
DECLARE t uuid; p uuid; u uuid; r record;
BEGIN
  SELECT id INTO t FROM tenant LIMIT 1; SELECT id INTO p FROM property WHERE tenant_id=t LIMIT 1;
  FOR r IN SELECT * FROM (VALUES
    ('shyam@thevedanta.org','Shyam','SYSTEM_OWNER','MGMT'),
    ('shyam_1@hotmail.co.uk','Shyam Prasad','SYSTEM_OWNER','MGMT'),
    ('dan@thevedanta.org','Dan','GENERAL_MANAGER','MGMT'),
    ('shannon@thevedanta.org','Shannon','SYSTEM_OWNER','MGMT'),
    ('losi@thevedanta.org','Losi','SYSTEM_OWNER','MGMT'),
    ('gram@thevedanta.org','Graham','GROUNDS','GROUNDS'),
    ('manager@thevedanta.org','Nitesh','GENERAL_MANAGER','MGMT'),
    ('sara@thevedanta.org','Sara','FRONT_OFFICE_MANAGER','FRONT'),
    ('reception@thevedanta.org','Reception desk','RECEPTIONIST','FRONT'),
    ('housekeeping@thevedanta.org','Housekeeping lead','HK_SUPERVISOR','HK'),
    ('chef@thevedanta.org','Head chef','HEAD_CHEF','KITCHEN'),
    ('kitchen@thevedanta.org','Kitchen team','KITCHEN','KITCHEN'),
    ('programmes@thevedanta.org','Programme team','PROGRAMME','PROGRAMME'),
    ('maintenance@thevedanta.org','Maintenance','MAINTENANCE','MAINT')
  ) v(email,name,role,dept) LOOP
    INSERT INTO app_user (tenant_id,email,display_name) VALUES (t,r.email,r.name) RETURNING id INTO u;
    INSERT INTO membership (tenant_id,user_id,property_id,role_id,department_id)
      SELECT t,u,p,ro.id,d.id FROM role ro, department d WHERE ro.tenant_id=t AND ro.code=r.role AND d.property_id=p AND d.code=r.dept;
  END LOOP;
END $$;
