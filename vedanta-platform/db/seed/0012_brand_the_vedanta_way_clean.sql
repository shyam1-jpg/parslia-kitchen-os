-- One public brand only. Drop the stacked "Center / The Vedanta Way / Luxury Center" variants.
UPDATE tenant SET name = 'The Vedanta Way'
WHERE name IN (
  'Vedanta Oway Retreat',
  'The Vedanta',
  'Oway Retreat',
  'The Vedanta Way Luxury Retreat Center',
  'The Vedanta Way Retreat Center'
);

UPDATE property SET name = 'The Vedanta Way'
WHERE name IN (
  'Vedanta Oway Retreat',
  'The Vedanta',
  'Oway Retreat',
  'The Vedanta Way Luxury Retreat Center',
  'The Vedanta Way Retreat Center'
);
