-- House display name. Idempotent: already-applied 0001 keeps its ids.
UPDATE tenant SET name = 'The Vedanta Way Retreat Center'
WHERE id = 'dbe8f12b-5577-472e-bd6e-5d749962aade'
   OR name IN ('Vedanta Oway Retreat', 'The Vedanta Way Luxury Retreat Center');

UPDATE property SET name = 'The Vedanta Way Retreat Center'
WHERE id = '0e663f34-d4ce-4f40-899c-11f1866047fd'
   OR name IN ('Vedanta Oway Retreat', 'The Vedanta Way Luxury Retreat Center');
