-- Night porter post, nightly round, and where the lock-up lives.

INSERT INTO role (tenant_id, code, name, approval_limit)
SELECT t.id, 'NIGHT_PORTER', 'Night porter', NULL
FROM tenant t
ON CONFLICT (tenant_id, code) DO UPDATE SET name = EXCLUDED.name;

INSERT INTO role_permission (role_id, permission_code)
SELECT r.id, pm.code
FROM role r
CROSS JOIN permission pm
WHERE r.code = 'NIGHT_PORTER'
  AND pm.code IN (
    'leave.request', 'clock.self', 'sop.read', 'cover.read',
    'group.read', 'covers.read', 'guest.read', 'guest.write',
    'reservation.read', 'reservation.checkin', 'reservation.checkout',
    'room.assign', 'diet.read'
  )
ON CONFLICT DO NOTHING;

INSERT INTO ops_checklist_item (tenant_id, property_id, department, title, sort_order, due_time)
SELECT p.tenant_id, p.id, 'NIGHT', x.title, x.sort_order, x.due_time::time
FROM property p
CROSS JOIN (
  VALUES
    ('First lock-up — every external door closed and checked', 10, '22:00'),
    ('Close and double-check windows on the public floors', 11, '22:00'),
    ('Turn off unused lights; keep fire-escape and night-lights on', 12, '22:15'),
    ('Second building round — doors, windows and fire exits again', 13, '01:00'),
    ('Know tonight''s late arrivals and who is still out', 20, NULL),
    ('Let guests in at the front door after hours', 21, NULL),
    ('Let guests out and back in at night — never leave the latch off', 22, NULL),
    ('Keep the front area organised and quiet', 30, NULL),
    ('Collect dirty cups, take them to the wash, keep the sideboard safe', 31, NULL),
    ('Wipe and reset tables in the front and lounge', 32, NULL),
    ('Inventory the tea and coffee station', 33, '05:30'),
    ('Fill teas, cups and milk so the morning desk is ready', 34, '05:30'),
    ('Tea and coffee area clean, organised and filled', 35, '05:45'),
    ('Keys, cash and lost property in the safe', 36, NULL),
    ('Write the night handover for the morning receptionist', 40, '06:30')
) AS x(title, sort_order, due_time)
ON CONFLICT (property_id, department, title) DO NOTHING;

INSERT INTO dept_board (tenant_id, property_id, department, about)
SELECT p.tenant_id, p.id, 'NIGHT',
  'Night porter desk, key board and the lock-up walk. Photograph the front-door set, the window catches on each public landing, the light-switch banks, the tea-station cupboards and the safe. Two rounds: after the house settles (~22:00) and again in the small hours. Guests after hours come to the front door — never leave the latch off. Dirty cups to the wash; fill teas and cups before morning. Last job: write the night handover for whoever opens.'
FROM property p
ON CONFLICT (property_id, department) DO NOTHING;

INSERT INTO staff_sop (tenant_id, property_id, title, body)
SELECT t.id, p.id,
  'The night porter',
  E'The night porter is the house after the day team has gone home.\n\n'
  || E'Sit the front so a guest can find you, then walk the house — it is a round, not a desk job.\n\n'
  || E'Two lock-ups: after the house settles (around 22:00) and again in the small hours. Doors, windows, fire exits. Double-check. Lights off in empty rooms; keep escape lighting.\n\n'
  || E'After hours, guests come to the front door. You let them in and out. Never leave the latch off.\n\n'
  || E'Between rounds, keep the front, lounge and tea station tidy. Dirty cups to the wash. Tables wiped. Inventory teas, cups, milk and biscuits, then fill them for the morning. Cash, keys and lost property in the safe.\n\n'
  || E'Last job before you clock out: write the night handover for whoever opens — who arrived late, what was left unlocked, what ran out, who needed help.\n\n'
  || E'Tick the Night porter round on the house log or in the pocket. Photographs of the walk live on Department boards → Night porter.'
FROM tenant t
JOIN property p ON p.tenant_id = t.id
WHERE NOT EXISTS (SELECT 1 FROM staff_sop s WHERE s.property_id = p.id AND s.title = 'The night porter');

INSERT INTO staff_sop_assignment (sop_id, user_id)
SELECT s.id, u.id
FROM staff_sop s
JOIN app_user u ON u.tenant_id = s.tenant_id
WHERE s.title = 'The night porter'
ON CONFLICT DO NOTHING;
