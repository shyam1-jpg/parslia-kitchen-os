-- Recurring daily rounds for each department. Ticks reset every calendar day.

INSERT INTO ops_checklist_item (tenant_id, property_id, department, title, sort_order)
SELECT p.tenant_id, p.id, x.department, x.title, x.sort_order
FROM property p
CROSS JOIN (
  VALUES
    ('HK', 'Walk corridors and landings', 1),
    ('HK', 'Check bathrooms on occupied floors', 2),
    ('HK', 'Restock linen cupboard', 3),
    ('HK', 'Empty public bins', 4),
    ('FRONT', 'Welcome desk tidy and stocked', 1),
    ('FRONT', 'Today arrivals known', 2),
    ('FRONT', 'Keys and access codes ready', 3),
    ('KITCHEN', 'Breakfast mise en place', 1),
    ('KITCHEN', 'Lunch / dinner counts confirmed', 2),
    ('KITCHEN', 'Allergens checked against today guests', 3),
    ('RESTAURANT', 'Dining room set', 1),
    ('RESTAURANT', 'Service briefing done', 2),
    ('MAINT', 'Boiler and plant walk-round', 1),
    ('MAINT', 'Lights and fire doors', 2),
    ('MAINT', 'Grounds / entrance safe', 3),
    ('GROUNDS', 'Car park and entrance clear', 1),
    ('GROUNDS', 'Lakeside path walk', 2)
) AS x(department, title, sort_order)
ON CONFLICT (property_id, department, title) DO NOTHING;
