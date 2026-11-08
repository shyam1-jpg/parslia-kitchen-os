-- Professional SOPs for kitchen and hotel operations (idempotent).
INSERT INTO staff_sop (tenant_id, property_id, title, body)
SELECT t.id, p.id, v.title, v.body
FROM tenant t
JOIN property p ON p.tenant_id = t.id
CROSS JOIN (VALUES
  ('Kitchen opening checks', E'Before service:\n• Check fridge temps (0–5°C) and freezer (-18°C or below). Log in Kiteline.\n• Hand wash, clean aprons, hair tied back.\n• Allergen board updated for today''s menu.\n• Dry store stock check — use Vedanta Ordering before placing supplier orders.\n• Hot hold above 63°C. Probe calibrated.'),
  ('Kitchen closing checks', E'After service:\n• Cool hot food within 90 minutes. Label with date and use-by.\n• Clean and sanitise all surfaces, boards, and equipment.\n• Waste logged. Bins emptied and lids on.\n• Fridge doors closed. Lights and non-essential equipment off.\n• Lock dry store and walk-in.'),
  ('Housekeeping room standard', E'Every guest room:\n• Bed made to house standard. Fresh towels if stay-over; full linen change on departure.\n• Bathroom cleaned and restocked.\n• Floors vacuumed / mopped. Surfaces dusted.\n• Windows checked. Bin emptied.\n• Report any fault on the maintenance board before marking the room inspected.\n• Departure rooms: supervisor inspects before marking ready for arrival.'),
  ('Reception — guest arrival', E'When a guest arrives:\n• Welcome by name. No room numbers spoken aloud in public areas.\n• Confirm dietary requirements are on the system.\n• Explain meal times and house phone.\n• Guest data is private — never discuss one guest''s booking with another.'),
  ('Maintenance — report a fault', E'Every fault needs:\n• What is wrong (clear title).\n• Where — room number OR building area.\n• Which department is reporting.\n• Priority: Safety if anyone could be hurt; Urgent if a room or service is blocked.\n• Tick "room can''t be used" only when the room must be taken out of order.')
) AS v(title, body)
WHERE NOT EXISTS (
  SELECT 1 FROM staff_sop s WHERE s.property_id = p.id AND s.title = v.title
);
