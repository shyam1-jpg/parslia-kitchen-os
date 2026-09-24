-- Migration 0024: property settings — correct room count + all public-facing text fields
-- Room count: spec said 45, 2026 Room Sheet lists 42 rooms of which 1 is staff (room 104).
-- Guest-bookable rooms = 41. Fix rooms_total from 45→42 and add all text fields so they
-- can be edited from the DB without a code deploy.
UPDATE property
SET settings = settings
  || jsonb_build_object(
    'rooms_total',      42,
    'guest_rooms',      41,
    'kicker',           coalesce(settings->>'kicker',  'Retreat Center'),
    'tagline',          coalesce(settings->>'tagline', 'Luxury retreat centre'),
    'about',            coalesce(settings->>'about',
      'A beautiful grade II-listed luxury retreat centre. Nestled amongst 75 acres of woodlands, meadows and lakes in Lincolnshire — a Grade II listed Elizabethan estate.'),
    'welcome',          coalesce(settings->>'welcome',
      'Host your retreats and events with us for an unforgettably meaningful experience. When you arrive, the house is ready. We take care of the rest.'),
    'address',          coalesce(settings->>'address', 'Lincoln Rd, Branston, Lincolnshire, LN4 1PD'),
    'legal_entity',     coalesce(settings->>'legal_entity', 'The Vedanta Way Ltd'),
    'website',          coalesce(settings->>'website', 'https://www.thevedanta.org/')
  )
WHERE code = 'VOR';
