-- Front-of-house 09:00 round, water week, suppliers, and where-things-are notes.

INSERT INTO ops_checklist_item (tenant_id, property_id, department, title, sort_order, due_time)
SELECT p.tenant_id, p.id, 'FRONT', x.title, x.sort_order, x.due_time::time
FROM property p
CROSS JOIN (
  VALUES
    ('09:00 Clean the coffee machines', 10, '09:00'),
    ('09:00 Empty the coffee-machine filters and put them on to clean', 11, '09:00'),
    ('Collect dirty cups, take them to the wash', 12, NULL),
    ('Return clean cups to the restaurant', 13, NULL),
    ('Fresh Walkers biscuits on the sideboard', 14, NULL),
    ('Gluten-free Nairn''s biscuits labelled and full', 15, NULL),
    ('Check plant-based milks (oat and soya/almond)', 16, NULL),
    ('Check dairy milk and bananas with the kitchen', 17, NULL),
    ('Restock Suma herbal teas and organic-wholesale loose teas', 18, NULL),
    ('Make today''s infused water (see Front desk recipe)', 19, NULL)
) AS x(title, sort_order, due_time)
ON CONFLICT (property_id, department, title) DO NOTHING;

UPDATE ops_checklist_item SET due_time = '09:00'
WHERE department = 'FRONT' AND title LIKE '09:00%' AND due_time IS NULL;

INSERT INTO foh_recipe (tenant_id, property_id, weekday, title, method, ingredients)
SELECT p.tenant_id, p.id, x.weekday, x.title, x.method, x.ingredients::jsonb
FROM property p
CROSS JOIN (
  VALUES
    ('Monday', 'Lemon and mint water',
     'Slice two lemons. Bruise a handful of mint. Cover with cold water in the glass urn. Ice just before service.',
     '[{"name":"Lemons","qty":"2","from":"kitchen"},{"name":"Fresh mint","qty":"1 bunch","from":"kitchen"}]'),
    ('Tuesday', 'Cucumber and lime water',
     'Ribbon half a cucumber. Add one lime, thinly sliced. Cold water, no sugar.',
     '[{"name":"Cucumber","qty":"1","from":"kitchen"},{"name":"Limes","qty":"2","from":"kitchen"}]'),
    ('Wednesday', 'Orange and rosemary water',
     'Three oranges, one sprig of rosemary. Let it sit twenty minutes before pouring.',
     '[{"name":"Oranges","qty":"3","from":"kitchen"},{"name":"Rosemary","qty":"1 sprig","from":"kitchen"}]'),
    ('Thursday', 'Ginger and lemon water',
     'Thumb of ginger, sliced. One lemon. Especially good on cooler mornings.',
     '[{"name":"Ginger","qty":"1 thumb","from":"kitchen"},{"name":"Lemons","qty":"1","from":"kitchen"}]'),
    ('Friday', 'Berry and mint water',
     'A handful of mixed berries, lightly crushed, with mint. Strain if the urn looks cloudy.',
     '[{"name":"Mixed berries","qty":"1 punnet","from":"kitchen"},{"name":"Fresh mint","qty":"1 small bunch","from":"kitchen"}]'),
    ('Saturday', 'Apple and cinnamon water',
     'Two eating apples, cored and sliced. One cinnamon stick. No boiled spice — cold infusion only.',
     '[{"name":"Eating apples","qty":"2","from":"kitchen"},{"name":"Cinnamon stick","qty":"1","from":"kitchen"}]'),
    ('Sunday', 'Grapefruit and basil water',
     'One pink grapefruit, a few basil leaves. Refresh the urn at lunch if it has gone bitter.',
     '[{"name":"Grapefruit","qty":"1","from":"kitchen"},{"name":"Basil","qty":"1 small bunch","from":"kitchen"}]')
) AS x(weekday, title, method, ingredients)
ON CONFLICT (property_id, weekday) DO NOTHING;

INSERT INTO foh_supplier (tenant_id, property_id, code, name, supplies, note)
SELECT p.tenant_id, p.id, x.code, x.name, x.supplies, x.note
FROM property p
CROSS JOIN (
  VALUES
    ('kitchen', 'The kitchen', 'Fruit, bananas, dairy and plant milks, coffee', 'Order a day ahead so mise en place can include FOH.'),
    ('walkers', 'Walkers', 'Shortbread and house biscuits', 'Keep a full tin on the welcome sideboard.'),
    ('nairns', 'Nairn''s', 'Gluten-free oat biscuits', 'Always a labelled gluten-free tin beside the Walkers.'),
    ('suma', 'Suma', 'Herbal teabags', 'Camomile, peppermint, fennel and the house herbal mix.'),
    ('organic_wholesale', 'Organic wholesale', 'Loose teas and herbal', 'Caddies on the tea tray — black, green, and loose herbal.')
) AS x(code, name, supplies, note)
ON CONFLICT (property_id, code) DO NOTHING;

INSERT INTO foh_stock (tenant_id, property_id, name, category, supplier_code, par_note)
SELECT p.tenant_id, p.id, x.name, x.category, x.supplier_code, x.par_note
FROM property p
CROSS JOIN (
  VALUES
    ('Walkers shortbread', 'biscuits', 'walkers', 'One full tin on the sideboard, one spare in the FOH cupboard'),
    ('Nairn''s gluten-free oat biscuits', 'biscuits', 'nairns', 'Labelled tin — never mix with wheat biscuits'),
    ('Oat milk', 'milk', 'kitchen', 'Two cartons in the FOH fridge'),
    ('Soya or almond milk', 'milk', 'kitchen', 'One carton for plant tea and coffee'),
    ('Dairy milk', 'milk', 'kitchen', 'Fresh from the kitchen each morning'),
    ('Bananas', 'fruit', 'kitchen', 'A bowl by the tea tray — reorder when fewer than six'),
    ('Seasonal fruit for water', 'fruit', 'kitchen', 'Order tomorrow''s water fruit today'),
    ('Suma herbal teabags', 'tea', 'suma', 'Camomile, peppermint, fennel'),
    ('Loose black and green tea', 'tea', 'organic_wholesale', 'Caddies full, lids on'),
    ('Loose herbal tea', 'tea', 'organic_wholesale', 'From the organic wholesale company'),
    ('Coffee machine cleaning tablets', 'coffee', 'kitchen', 'For the 09:00 clean')
) AS x(name, category, supplier_code, par_note)
ON CONFLICT (property_id, name) DO NOTHING;

INSERT INTO dept_board (tenant_id, property_id, department, about)
SELECT p.tenant_id, p.id, x.department, x.about
FROM property p
CROSS JOIN (
  VALUES
    ('FRONT', 'Welcome desk and tea station. Coffee machines live on the welcome sideboard — filters come out at 09:00 and go on to clean. Dirty cups go to the wash; clean cups return to the restaurant racks. Walkers and Nairn''s (gluten-free) tins sit together, labelled. Plant milks in the FOH fridge. Teas: Suma bags in the tin, loose teas from organic wholesale in the caddies. Infused water urn is filled from today''s Front desk recipe. Add photographs here so a new receptionist can see where each thing lives.'),
    ('HK', 'Linen cupboard, chemical store and the floor trolley parking. Photograph the cupboard shelves and the landing cupboards so a new attendant knows which stack is for stay-overs and which is departure linen.'),
    ('KITCHEN', 'Walk-in, dry store and the FOH order crate. Plant milks, bananas and water fruit for reception come from here. When Front desk sends an order, it appears on this kitchen board.'),
    ('RESTAURANT', 'Cup racks, water jugs and the pass. Clean cups from the wash land here so Front of house can restock the tea station. Photograph the rack labels.'),
    ('MAINT', 'Plant room, boiler and the key board for outbuildings. Photograph the valve tags and the fire-door map.'),
    ('GROUNDS', 'Tool store, lakeside path start and the car-park salt bin. Photograph the hose points used for the daily water round if the gardens team shares that work.')
) AS x(department, about)
ON CONFLICT (property_id, department) DO NOTHING;
