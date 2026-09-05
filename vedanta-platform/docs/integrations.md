# Integrations — kitchen feed (Parslia Kitchen OS)

The platform exposes a read-only feed the kitchen system can poll. Nothing about Parslia's own
API is assumed; this is the contract we offer, to be agreed with them.

## Auth
Create a key (system owner): `POST /v1/integrations/keys {"name":"Parslia","scopes":["kitchen.read"]}`
→ returns `vk_…` once. Parslia sends it as `X-Api-Key`. Keys are stored hashed; revoke with
`DELETE /v1/integrations/keys/{id}`.

## Feed
`GET /integrations/kitchen/feed?from=YYYY-MM-DD&to=YYYY-MM-DD` (defaults: today → +6 days)

```json
{
  "schema": "vedanta.kitchen-feed/1",
  "generated_at": "2026-09-02T18:00:00Z",
  "property": "VOR", "from": "2026-03-12", "to": "2026-03-15", "max_covers": 130,
  "days": [
    { "date": "2026-03-12", "breakfast": 0, "lunch": 0, "dinner": 38,
      "groups": [ { "id": "…", "name": "OmLife", "guests": 38, "meals": ["dinner"], "note": "arrive PM 16:00", "dietary": "3 vegan", "status": "CONFIRMED" } ] }
  ],
  "dietary": {
    "placed": [ { "date": "2026-03-12", "person_id": "…", "name": "Priya Sharma", "room": "G01", "diet": ["vegetarian"], "allergens": ["peanuts","nuts"], "severity": "ANAPHYLAXIS", "notes": "carries EpiPen", "group_name": "OmLife" } ],
    "not_yet_placed": [ { "arrival": "…", "departure": "…", "group_name": "…", "name": "…", "diet": [], "allergens": ["sesame"], "severity": "ALLERGY", "notes": null } ]
  }
}
```

Rules
- `days[].groups[].meals` follows the same logic as the kitchen screen (arrive PM → dinner on;
  depart PM → up to lunch; per-booking overrides).
- `dietary.placed` = people with a room for that date; `not_yet_placed` = names from the organiser
  form who are not yet on the room board. Both matter for prep.
- Severity is one of PREFERENCE, INTOLERANCE, ALLERGY, ANAPHYLAXIS. Allergen codes are the UK 14.
- Poll at most every 5 minutes. Every call is logged (last_used_at).

## Not built yet
Push (webhook on change) and inbound data from Parslia (menus, stock) — add once Parslia's side is known.
