-- Staff admins requested for the trial. Safe to re-run (upsert).
INSERT INTO app_user (tenant_id, email, display_name, status)
SELECT t.id, v.email, v.name, 'ACTIVE'
FROM tenant t,
(VALUES
  ('dan@thevedanta.org','Dan'),
  ('shannon@thevedanta.org','Shannon'),
  ('losi@thevedanta.org','Losi'),
  ('gram@thevedanta.org','Gram')
) v(email, name)
ON CONFLICT (tenant_id, email) DO UPDATE SET display_name = EXCLUDED.display_name, status = 'ACTIVE';

INSERT INTO membership (tenant_id, user_id, property_id, role_id, department_id)
SELECT t.id, u.id, p.id, r.id, d.id
FROM tenant t
JOIN property p ON p.tenant_id = t.id
JOIN role r ON r.tenant_id = t.id AND r.code = 'SYSTEM_OWNER'
LEFT JOIN department d ON d.property_id = p.id AND d.code = 'MGMT'
JOIN app_user u ON u.tenant_id = t.id AND u.email IN (
  'dan@thevedanta.org','shannon@thevedanta.org','losi@thevedanta.org','gram@thevedanta.org'
)
WHERE NOT EXISTS (
  SELECT 1 FROM membership m WHERE m.user_id = u.id AND m.property_id = p.id AND m.role_id = r.id
);
