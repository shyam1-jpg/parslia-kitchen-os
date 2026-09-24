-- Grants for the task engine. Filename must not collide with a migration
-- (schema_applied is stored by basename only).

INSERT INTO role_permission (role_id, permission_code)
SELECT DISTINCT rp.role_id, 'task.read'
FROM role_permission rp
WHERE rp.permission_code IN ('group.read', 'cover.read')
ON CONFLICT DO NOTHING;

INSERT INTO role_permission (role_id, permission_code)
SELECT DISTINCT rp.role_id, 'task.write'
FROM role_permission rp
WHERE rp.permission_code IN ('group.read', 'cover.read')
ON CONFLICT DO NOTHING;

INSERT INTO role_permission (role_id, permission_code)
SELECT DISTINCT rp.role_id, 'task.assign'
FROM role_permission rp
WHERE rp.permission_code IN ('group.update', 'cover.write', 'user.manage', 'sop.manage')
ON CONFLICT DO NOTHING;

INSERT INTO role_permission (role_id, permission_code)
SELECT DISTINCT rp.role_id, 'task.approve'
FROM role_permission rp
WHERE rp.permission_code IN ('sop.manage', 'user.manage', 'package.manage')
ON CONFLICT DO NOTHING;
