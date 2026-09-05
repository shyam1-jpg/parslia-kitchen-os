-- Packages seen in the sheet. Prices are examples from actual 2025/26 bookings; confirm the current price list.
INSERT INTO package (tenant_id, property_id, code, name, price_basis, price_twin, price_single, includes_spa, includes_meals, sort)
SELECT t.id, p.id, v.code, v.name, v.basis, v.twin, v.single, v.spa, v.meals, v.sort FROM tenant t, property p, (VALUES
  ('STANDARD',      'Standard',                   'PER_PERSON', 249.00, 339.00, false, true, 10),
  ('STANDARD_SPA',  'Standard with spa access',   'PER_PERSON', 279.00, 369.00, true,  true, 20),
  ('PREMIUM',       'Premium',                    'PER_PERSON', 315.00, 425.00, false, true, 30),
  ('PREMIUM_SPA',   'Premium with spa access',    'PER_PERSON', 345.00, 455.00, true,  true, 40),
  ('NIGHTLY',       'Per person per night',       'PER_PERSON_PER_NIGHT', 75.00, 110.00, false, true, 50),
  ('DAY_RETREAT',   'Day retreat',                'PER_PERSON', 55.00, NULL, false, true, 60),
  ('VENUE_HIRE',    'Venue hire (no rooms)',      'FIXED', NULL, NULL, false, false, 70),
  ('GRAND_VEDANTA', 'The Grand Vedanta Package (weddings)', 'FIXED', 8000.00, NULL, true, true, 80)
) v(code, name, basis, twin, single, spa, meals, sort) WHERE p.tenant_id = t.id
ON CONFLICT (property_id, code) DO NOTHING;
