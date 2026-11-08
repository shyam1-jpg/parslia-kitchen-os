-- Public name: Retreat Center / The Vedanta Way. Company stays The Vedanta Way Ltd.
UPDATE tenant SET name = 'The Vedanta Way'
WHERE name IN (
  'The Vedanta',
  'Vedanta Oway Retreat',
  'The Vedanta Way Luxury Retreat Center',
  'The Vedanta Way Retreat Center'
) OR id = 'dbe8f12b-5577-472e-bd6e-5d749962aade';

UPDATE property SET name = 'The Vedanta Way'
WHERE name IN (
  'The Vedanta',
  'Vedanta Oway Retreat',
  'The Vedanta Way Luxury Retreat Center',
  'The Vedanta Way Retreat Center'
) OR id = '0e663f34-d4ce-4f40-899c-11f1866047fd';
