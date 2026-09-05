-- Role → permission grants for permissions added by migrations 0003 and 0005.
-- Lives in seed/ because roles are created by seed 0001, which runs AFTER migrations on a fresh database.
-- Idempotent: safe to re-run.
INSERT INTO role_permission (role_id, permission_code)
SELECT r.id, pm.code FROM role r CROSS JOIN permission pm
WHERE pm.code IN ('group.read','group.create','group.update','group.confirm','group.cancel','occupancy.write','covers.read') AND (
  r.code IN ('SYSTEM_OWNER','GENERAL_MANAGER','FRONT_OFFICE_MANAGER')
  OR (r.code='RECEPTIONIST' AND pm.code <> 'group.cancel')
  OR (r.code IN ('HK_SUPERVISOR','HK_ATTENDANT','MAINTENANCE') AND pm.code IN ('group.read'))
  OR (r.code IN ('HEAD_CHEF','KITCHEN') AND pm.code IN ('group.read','covers.read'))
  OR (r.code='PROGRAMME' AND pm.code IN ('group.read','group.create','group.update','covers.read'))
  OR (r.code='FINANCE_HR' AND pm.code IN ('group.read'))
) ON CONFLICT DO NOTHING;

INSERT INTO role_permission (role_id, permission_code)
SELECT r.id, pm.code FROM role r CROSS JOIN permission pm WHERE
  (pm.code = 'report.read' AND r.code IN ('SYSTEM_OWNER','GENERAL_MANAGER','FRONT_OFFICE_MANAGER','FINANCE_HR'))
  OR (pm.code IN ('guest.read','guest.write','diet.read','diet.write') AND r.code IN ('SYSTEM_OWNER','GENERAL_MANAGER','FRONT_OFFICE_MANAGER','RECEPTIONIST','PROGRAMME'))
  OR (pm.code IN ('guest.read','diet.read') AND r.code IN ('HEAD_CHEF','KITCHEN','HK_SUPERVISOR'))
  OR (pm.code IN ('room.status.update','room.oos.set') AND r.code IN ('SYSTEM_OWNER','GENERAL_MANAGER','FRONT_OFFICE_MANAGER','HK_SUPERVISOR','MAINTENANCE'))
  OR (pm.code = 'room.status.update' AND r.code IN ('HK_ATTENDANT','RECEPTIONIST'))
ON CONFLICT DO NOTHING;

-- 0006: packages
INSERT INTO role_permission (role_id, permission_code)
SELECT r.id, 'package.manage' FROM role r WHERE r.code IN ('SYSTEM_OWNER','GENERAL_MANAGER','FINANCE_HR') ON CONFLICT DO NOTHING;

-- 0007: maintenance + email
INSERT INTO role_permission (role_id, permission_code)
SELECT r.id, pm.code FROM role r CROSS JOIN permission pm WHERE
  (pm.code IN ('maintenance.read','maintenance.report') AND r.code NOT IN ('FINANCE_HR'))
  OR (pm.code = 'maintenance.work' AND r.code IN ('SYSTEM_OWNER','GENERAL_MANAGER','MAINTENANCE','GROUNDS','HK_SUPERVISOR'))
  OR (pm.code = 'email.send' AND r.code IN ('SYSTEM_OWNER','GENERAL_MANAGER','FRONT_OFFICE_MANAGER','RECEPTIONIST','PROGRAMME'))
ON CONFLICT DO NOTHING;
