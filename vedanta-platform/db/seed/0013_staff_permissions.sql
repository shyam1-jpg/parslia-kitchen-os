-- Tighten who sees hours, tips and HR per house feedback.
-- Hours: heads of department and general manager only.
INSERT INTO role_permission (role_id, permission_code)
SELECT r.id, 'clock.manage' FROM role r
WHERE r.code IN (
  'RESTAURANT_MANAGER', 'HEAD_CHEF', 'ESTATE_MANAGER', 'OPERATIONS_MANAGER',
  'RETREAT_MANAGER', 'SALES_MANAGER', 'KITCHEN_MANAGER'
)
ON CONFLICT DO NOTHING;

-- Tips: department heads can run their own pool.
INSERT INTO role_permission (role_id, permission_code)
SELECT r.id, 'tip.manage' FROM role r
WHERE r.code IN ('RESTAURANT_MANAGER', 'HEAD_CHEF', 'HK_SUPERVISOR', 'ESTATE_MANAGER')
ON CONFLICT DO NOTHING;
