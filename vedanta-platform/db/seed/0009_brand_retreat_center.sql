-- House display name from https://www.thevedanta.org/
-- Title: The Vedanta | Retreat Center In Lincoln. Company remains The Vedanta Way Ltd.
UPDATE tenant SET name = 'The Vedanta'
WHERE id = 'dbe8f12b-5577-472e-bd6e-5d749962aade'
   OR name IN (
     'Vedanta Oway Retreat',
     'The Vedanta Way Luxury Retreat Center',
     'The Vedanta Way Retreat Center'
   );

UPDATE property SET name = 'The Vedanta'
WHERE id = '0e663f34-d4ce-4f40-899c-11f1866047fd'
   OR name IN (
     'Vedanta Oway Retreat',
     'The Vedanta Way Luxury Retreat Center',
     'The Vedanta Way Retreat Center'
   );
