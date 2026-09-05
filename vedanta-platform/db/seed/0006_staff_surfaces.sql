INSERT INTO role_permission (role_id, permission_code)
SELECT r.id, pm.code FROM role r CROSS JOIN permission pm WHERE
  (pm.code IN ('leave.request','clock.self','sop.read','cover.read') AND r.code NOT IN ('FINANCE_HR'))
  OR (pm.code IN ('leave.request','clock.self','sop.read','cover.read','hr.read') AND r.code = 'FINANCE_HR')
  OR (pm.code = 'leave.approve_hod' AND r.code IN ('FRONT_OFFICE_MANAGER','HK_SUPERVISOR','HEAD_CHEF','MAINTENANCE','GENERAL_MANAGER','SYSTEM_OWNER'))
  OR (pm.code = 'leave.approve_gm' AND r.code IN ('GENERAL_MANAGER','SYSTEM_OWNER'))
  OR (pm.code IN ('clock.manage','cover.write','sop.manage') AND r.code IN ('SYSTEM_OWNER','GENERAL_MANAGER','FRONT_OFFICE_MANAGER','HK_SUPERVISOR'))
  OR (pm.code IN ('tip.manage','hr.read') AND r.code IN ('SYSTEM_OWNER','GENERAL_MANAGER','FINANCE_HR'))
ON CONFLICT DO NOTHING;

INSERT INTO staff_sop (tenant_id, property_id, title, body)
SELECT t.id, p.id,
  'Opening the house',
  E'Clock in on the pocket app before you start.\nHoliday is requested there too — your head of department signs first, then the general manager.\nGuests never see this screen. Do not show anyone the house login.'
FROM tenant t JOIN property p ON p.tenant_id = t.id
WHERE NOT EXISTS (SELECT 1 FROM staff_sop s WHERE s.property_id = p.id);

INSERT INTO staff_sop_assignment (sop_id, user_id)
SELECT s.id, u.id FROM staff_sop s JOIN app_user u ON u.tenant_id = s.tenant_id
ON CONFLICT DO NOTHING;
