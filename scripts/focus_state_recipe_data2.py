"""Focus-state recipes: Goa, Maharashtra, Odisha, West Bengal, Andhra Pradesh."""

from __future__ import annotations


def extend_west_east_south(add, S, STEAM, TAWA, FRY, MILK, BOWL, CLAY, GRILL):
    # ===== GOA (21) =====
    add("goa", "Starter", "Coconut Cucumber Cutlets", 15, 15, FRY,
        "Goan vegetarian starter. Coconut and chilli, no allium.",
        ["1 cup coconut", "1 cucumber, squeezed", "2 tbsp besan", "Ginger-chilli", "Hing", "Salt", "Oil"],
        ["Mix, shape, pan-fry in a steel kadhai until brown."])
    add("goa", "Starter", "Moong Ghavan", 20, 15, TAWA,
        "Yellow-moong pancake eaten at Goan Hindu breakfasts.",
        ["1 cup yellow moong, soaked", "Ginger-chilli", "Cumin", "Salt", "Oil"],
        ["Grind a thick batter. Spread on an iron tawa. Cook both sides."])
    add("goa", "Starter", "Jeev Kadgi Fritters", 15, 15, FRY,
        "Breadfruit slices in rice-flour batter — monsoon Goa.",
        ["12 breadfruit or raw banana slices", "½ cup rice flour", "Turmeric", "Chilli", "Salt", "Oil"],
        ["Dip and fry in steel until crisp. Serve with kokum dip."])
    add("goa", "Main", "Khatkhate", 15, 30, S,
        "Festival mixed-veg coconut stew. Traditionally no onion garlic.",
        ["4 cups mixed veg (pumpkin, beans, brinjal, raw banana)", "1 cup coconut ground with red chilli and turmeric",
         "Tamarind", "Mustard", "Hing", "Curry leaves", "Coconut oil", "Salt"],
        ["Cook veg with tamarind. Add coconut paste. Temper mustard, hing, curry leaves."])
    add("goa", "Main", "Vegetable Caldin", 15, 25, S,
        "Pale turmeric-coconut curry. Skip garlic; use pepper, cumin, kokum.",
        ["Cauliflower, beans, carrot", "1½ cups coconut milk", "Turmeric", "Cumin", "Pepper", "Kokum", "Hing", "Curry leaves", "Salt"],
        ["Temper spices. Simmer veg in coconut milk with kokum until coated."])
    add("goa", "Main", "Moong Coconut Usal", 10, 20, S,
        "Sprouted moong in coconut — Goan-Maharashtrian border breakfast.",
        ["2 cups sprouted moong", "½ cup coconut paste", "Mustard", "Hing", "Curry leaves", "Green chilli", "Salt", "Lemon"],
        ["Temper, add sprouts, coconut, splash of water. Cover 8 minutes. Lemon."])
    add("goa", "Side", "Alsande Tondak (no garlic)", 10, 25, S,
        "Yard beans in coconut. Hing and kokum instead of garlic.",
        ["3 cups alsande or French beans", "Coconut paste", "Kokum", "Coriander powder", "Chilli", "Hing", "Salt"],
        ["Cook beans with kokum. Add coconut and spices until thick."])
    add("goa", "Side", "Cabbage Foogath", 10, 12, S,
        "Goan cabbage with coconut and mustard.",
        ["4 cups cabbage", "Coconut", "Mustard", "Curry leaves", "Hing", "Green chilli", "Salt"],
        ["Temper, stir-fry cabbage, finish coconut."])
    add("goa", "Side", "Pumpkin Bhaji", 10, 15, S,
        "Sweet pumpkin with coconut and curry leaves.",
        ["4 cups pumpkin", "Coconut", "Mustard", "Hing", "Chilli", "Salt", "Jaggery pinch"],
        ["Temper, cover until soft, coconut and jaggery."])
    add("goa", "Bread", "Sannas", 70, 15, STEAM,
        "Steamed rice cakes, slightly sour. Steel moulds only.",
        ["2 cups rice, soaked", "½ cup coconut", "Yeast or toddy", "Sugar", "Salt"],
        ["Grind, ferment, steam 12 minutes in a steel idli stand."])
    add("goa", "Bread", "Pole", 20, 15, TAWA,
        "Goan rice crepe, cousin of neer dosa.",
        ["1 cup rice, soaked", "2 tbsp coconut", "Salt"],
        ["Grind thin. Pour on iron tawa. Do not flip hard — it should stay soft."])
    add("goa", "Bread", "Soft Wheat Roti", 15, 15, TAWA,
        ["2 cups atta", "Water", "Salt", "Ghee"],
        ["Roll and cook on iron tawa."], "Everyday bread with caldin.")
    add("goa", "Sweet", "Bebinca Slab", 20, 50, "Steel or enamel baking dish — never aluminium",
        "Layered coconut-jaggery bake in a steel tin.",
        ["Coconut milk", "Maida", "Jaggery", "Nutmeg", "Ghee"],
        ["Bake thin ghee-brushed layers in steel until 6–8 layers set."])
    add("goa", "Sweet", "Doce de Grao", 15, 25, S,
        "Chana-dal coconut fudge of Goan feasts.",
        ["1 cup chana dal, cooked mashed", "1 cup coconut", "¾ cup sugar", "Cardamom", "Ghee"],
        ["Cook in steel until it leaves the sides. Press, cut diamonds."])
    add("goa", "Sweet", "Coconut Toffee", 10, 20, S,
        ["2 cups coconut", "1 cup sugar", "Cardamom", "Ghee"],
        ["Cook to toffee stage in steel. Set, cut."], "")
    add("goa", "Dessert", "Coconut Payasam", 5, 20, S,
        ["Vermicelli", "Coconut milk", "Jaggery", "Cardamom", "Cashews"],
        ["Cook in steel. Do not boil coconut milk hard."], "")
    add("goa", "Dessert", "Moong Mangane", 10, 25, S,
        "Sweet moong and coconut-milk pudding of Goan Hindu homes.",
        ["½ cup moong, roasted", "Coconut milk", "Jaggery", "Cardamom", "Cashews in ghee"],
        ["Cook moong soft. Add jaggery and coconut milk. Cardamom."])
    add("goa", "Dessert", "Rice Kheer", 10, 35, MILK,
        ["Rice", "Milk", "Sugar", "Cardamom"],
        ["Simmer in a steel pot."], "")
    add("goa", "Salad", "Kokum Cucumber Salad", 8, 0, BOWL,
        ["Cucumber", "Kokum water", "Green chilli", "Salt", "Coriander"],
        ["Toss. Kokum replaces onion bite."], "")
    add("goa", "Salad", "Kachumber without Onion", 8, 0, BOWL,
        ["Cucumber", "Tomato", "Lemon", "Cumin", "Salt"],
        ["Toss."], "")
    add("goa", "Salad", "Raw Mango Coconut Salad", 10, 0, BOWL,
        ["Raw mango, julienned", "Coconut", "Green chilli", "Salt", "Jaggery pinch"],
        ["Toss. Rest 5 minutes."], "")

    # ===== MAHARASHTRA (21) =====
    add("maharashtra", "Starter", "Kothimbir Vadi", 20, 20, STEAM,
        "Coriander-besan steamed cake, sliced and fried.",
        ["2 cups coriander", "1 cup besan", "Ginger-chilli", "Turmeric", "Sesame", "Hing", "Salt"],
        ["Steam 12 minutes, slice, pan-fry in steel until crisp."])
    add("maharashtra", "Starter", "Sabudana Vada", 20, 15, FRY,
        "Fasting vada — already no onion garlic if you skip peanut-onion mixes.",
        ["1 cup soaked sabudana", "2 boiled potatoes", "Roasted peanuts crushed", "Ginger-chilli", "Cumin", "Salt", "Oil"],
        ["Shape, fry in a steel kadhai. Serve with coconut chutney (no garlic)."])
    add("maharashtra", "Starter", "Thalipeeth Bites", 15, 15, TAWA,
        "Multi-grain savoury pancake. Skip onion; use sesame, chilli, coriander.",
        ["1 cup jowar-bajra-atta mix (bhajani)", "Sesame", "Ginger-chilli", "Coriander", "Salt", "Oil"],
        ["Pat small rounds on iron tawa. Cook both sides."])
    add("maharashtra", "Main", "Pithla", 10, 15, S,
        "Besan curry of rural Maharashtra. Hing, ginger, chilli — no onion.",
        ["1 cup besan", "3 cups water", "Mustard, cumin, hing, curry leaves, green chilli, ginger", "Turmeric", "Salt"],
        ["Temper, pour besan slurry, cook until the raw smell goes. Serve with bhakri."])
    add("maharashtra", "Main", "Kokum Amti", 10, 20, S,
        "Sour-sweet toor dal with kokum. Temple-style, no onion garlic.",
        ["¾ cup toor dal", "4 kokum petals", "Jaggery", "God masala garlic-free or coriander-cumin", "Mustard", "Hing", "Curry leaves", "Salt"],
        ["Cook dal, add kokum and jaggery. Temper. Should taste sour-sweet, not garlicky."])
    add("maharashtra", "Main", "Varan Bhaat", 10, 25, CLAY,
        "Plain toor varan with ghee and rice — the Maharashtrian comfort main.",
        ["¾ cup toor dal", "Turmeric", "Ghee", "Cumin", "Hing", "Salt", "Steamed rice"],
        ["Cook dal very soft. Tadka ghee, cumin, hing. Pour over hot rice with more ghee."])
    add("maharashtra", "Side", "Bharli Vangi (no onion)", 15, 25, S,
        "Stuffed brinjal with coconut-peanut, no onion garlic.",
        ["8 small brinjals", "Coconut", "Peanuts", "Sesame", "Tamarind", "Jaggery", "Goda masala garlic-free", "Salt"],
        ["Fill slits. Cook covered until soft and the masala clings."])
    add("maharashtra", "Side", "Farasbi Chi Bhaji", 10, 12, S,
        "French beans with coconut.",
        ["Beans", "Coconut", "Mustard", "Cumin", "Hing", "Green chilli", "Salt"],
        ["Temper, stir-fry, coconut."])
    add("maharashtra", "Side", "Palak Bhaji", 10, 12, S,
        ["Spinach", "Cumin", "Hing", "Green chilli", "Ginger", "Salt"],
        ["Wilt in a steel pan. No onion."], "")
    add("maharashtra", "Bread", "Jowar Bhakri", 15, 15, TAWA,
        ["2 cups jowar flour", "Hot water", "Salt"],
        ["Pat, cook on iron, puff on flame."], "")
    add("maharashtra", "Bread", "Wheat Poli", 15, 15, TAWA,
        ["Atta", "Water", "Ghee"],
        ["Phulka-style on iron tawa."], "")
    add("maharashtra", "Bread", "Puri", 15, 15, FRY,
        ["Atta", "Ghee", "Salt", "Oil"],
        ["Roll small, fry in steel until they puff."], "")
    add("maharashtra", "Sweet", "Ukadiche Modak", 30, 20, STEAM,
        "Ganesh steamed modak — coconut-jaggery, no allium.",
        ["Rice-flour dough", "Coconut-jaggery-cardamom filling"],
        ["Shape, steam 10 minutes in steel."])
    add("maharashtra", "Sweet", "Puran Poli", 40, 25, TAWA,
        "Chana-dal jaggery stuffed flatbread.",
        ["Atta dough", "Chana dal + jaggery + cardamom + nutmeg puran"],
        ["Stuff, roll thin, cook on iron with ghee."])
    add("maharashtra", "Sweet", "Chirote", 25, 20, FRY,
        "Flaky fried pastry with sugar.",
        ["Maida", "Ghee", "Sugar", "Cardamom", "Oil"],
        ["Layer with ghee, roll, cut, fry in steel, dust sugar."])
    add("maharashtra", "Dessert", "Amrakhand", 10, 0, BOWL,
        ["Hung yogurt", "Mango puree", "Sugar", "Cardamom"],
        ["Whisk, chill."], "")
    add("maharashtra", "Dessert", "Kesar Shrikhand", 10, 0, BOWL,
        ["Hung yogurt", "Sugar", "Saffron", "Cardamom", "Pistachios"],
        ["Whisk, chill."], "")
    add("maharashtra", "Dessert", "Basundi", 10, 45, MILK,
        "Reduced sweet milk of Maharashtra.",
        ["1 litre milk", "Sugar", "Cardamom", "Saffron", "Nuts"],
        ["Reduce in a heavy steel pot, scraping cream back in."])
    add("maharashtra", "Salad", "Kakdi Koshimbir", 8, 0, BOWL,
        "Cucumber-coconut-peanut. Skip onion.",
        ["Cucumber", "Coconut", "Peanuts", "Lemon", "Green chilli", "Cumin", "Salt"],
        ["Mix. Peanut and lemon replace onion."])
    add("maharashtra", "Salad", "Tomato Coconut Koshimbir", 8, 0, BOWL,
        ["Tomato", "Coconut", "Lemon", "Cumin", "Coriander", "Salt"],
        ["Toss."], "")
    add("maharashtra", "Salad", "Dahi Koshimbir", 8, 0, BOWL,
        ["Cucumber", "Yogurt", "Cumin", "Salt", "Coriander"],
        ["Mix. Chill."], "")

    # ===== ODISHA (21) =====
    add("odisha", "Starter", "Chakuli Pitha", 20, 15, TAWA,
        "Rice-urad pancake of Odisha.",
        ["Rice", "Urad dal", "Salt", "Oil"],
        ["Grind, spread on iron tawa, cook both sides."])
    add("odisha", "Starter", "Enduri Pitha", 30, 20, STEAM,
        "Turmeric-leaf steamed rice cakes with coconut-jaggery filling.",
        ["Rice batter", "Coconut-jaggery", "Turmeric leaves or banana leaf"],
        ["Spread batter on leaf, fill, fold, steam in steel 15 minutes."])
    add("odisha", "Starter", "Bara (no onion)", 20, 15, FRY,
        "Urad vada. Pepper, ginger, fennel — no onion.",
        ["1 cup urad dal, soaked", "Ginger", "Fennel", "Pepper", "Hing", "Salt", "Oil"],
        ["Grind fluffy, fry rings in steel."])
    add("odisha", "Main", "Dalma", 15, 35, CLAY,
        "Jagannath-kitchen dal with vegetables. Onion and garlic are forbidden.",
        ["Toor dal", "Raw banana, papaya, brinjal, pumpkin, beans", "Roasted cumin", "Ginger", "Ghee", "Dry chilli", "Turmeric", "Salt"],
        ["Cook dal and veg together. Cumin-ginger-ghee tadka. Never aluminium, never allium."])
    add("odisha", "Main", "Temple Khichdi", 10, 30, CLAY,
        "Moong-rice khichdi as offered in Puri — only ghee, ginger, cumin, salt.",
        ["½ cup rice", "½ cup moong", "Ghee", "Cumin", "Hing", "Ginger", "Salt"],
        ["Cook together very soft. Ghee tadka. This is mahaprasad style."])
    add("odisha", "Main", "Kanika", 15, 30, S,
        "Mildly sweet ghee rice of Odia feasts.",
        ["1 cup basmati", "Ghee", "Bay, cardamom, cinnamon, clove", "Raisins", "Cashews", "Sugar pinch", "Salt"],
        ["Fry spices and nuts in ghee. Cook rice. Slightly sweet, no onion."])
    add("odisha", "Side", "Santula", 10, 20, S,
        "Light boiled mixed veg tossed with cumin.",
        ["Mixed veg", "Turmeric", "Cumin", "Hing", "Green chilli", "Salt"],
        ["Boil, drain, temper, toss."])
    add("odisha", "Side", "Besara Mixed Veg", 15, 20, S,
        "Mustard-paste vegetable of Odisha.",
        ["Mixed veg", "Mustard seeds ground with chilli", "Panch phoron", "Turmeric", "Salt", "Mustard oil"],
        ["Temper panch phoron. Add veg and mustard paste. Cook until the oil shines."])
    add("odisha", "Side", "Saga Bhaja", 10, 12, S,
        "Amaranth or spinach fry.",
        ["Greens", "Garlic skipped: use dry chilli and panch phoron", "Mustard oil", "Salt"],
        ["Temper, wilt greens. No onion, no garlic."])
    add("odisha", "Bread", "Luchi", 20, 15, FRY,
        ["Maida", "Ghee", "Salt", "Oil"],
        ["Fry small puffed breads in steel."], "")
    add("odisha", "Bread", "Pakhala Rice", 10, 0, BOWL,
        "Fermented or instant soaked rice — Odisha’s summer staple instead of roti.",
        ["Cooked rice", "Water", "Curd optional", "Roasted cumin", "Green chilli", "Salt"],
        ["Soak rice in water (or whey). Season. Serve with saga and badi."])
    add("odisha", "Bread", "Poda Pitha", 20, 40, "Steel or earthen pot — never aluminium",
        "Slow-baked rice-jaggery cake used as a dense bread-sweet.",
        ["Rice paste", "Jaggery", "Coconut", "Ginger powder", "Black pepper", "Ghee"],
        ["Mix, bake in a greased steel pot on low until the crust is charred-caramel."])
    add("odisha", "Sweet", "Chhena Poda", 20, 50, "Steel baking dish — never aluminium",
        ["Chenna", "Sugar", "Sooji", "Cardamom", "Ghee"],
        ["Bake until the top is burnt caramel."], "")
    add("odisha", "Sweet", "Chhena Jhili", 20, 25, FRY,
        "Chenna dumplings in syrup.",
        ["Chenna", "Sooji", "Sugar syrup", "Cardamom"],
        ["Fry balls in ghee, soak in warm syrup made in steel."])
    add("odisha", "Sweet", "Gaja", 20, 20, FRY,
        "Fried diamond sweet of Odisha.",
        ["Maida", "Ghee", "Sugar syrup"],
        ["Cut diamonds, fry, soak briefly in syrup."])
    add("odisha", "Dessert", "Rasabali", 20, 25, MILK,
        ["Chenna patties", "Reduced milk", "Sugar", "Cardamom"],
        ["Sear patties, soak in thickened steel-pot milk."], "")
    add("odisha", "Dessert", "Kheeri", 10, 40, MILK,
        "Odia rice kheer with bay leaf.",
        ["Rice", "Milk", "Sugar", "Bay", "Cardamom", "Raisins"],
        ["Simmer in steel until creamy."])
    add("odisha", "Dessert", "Manda Pitha", 30, 20, STEAM,
        "Steamed rice dumplings with coconut-jaggery.",
        ["Rice dough", "Coconut-jaggery filling"],
        ["Fill, steam 12 minutes in steel."])
    add("odisha", "Salad", "Amba Khatta", 10, 10, S,
        "Raw-mango sweet-sour relish.",
        ["Raw mango", "Mustard", "Hing", "Turmeric", "Chilli", "Jaggery", "Salt"],
        ["Temper, cook 5 minutes until glossy."])
    add("odisha", "Salad", "Tomato Khatta", 10, 10, S,
        ["Tomato", "Panch phoron", "Jaggery", "Chilli", "Salt"],
        ["Cook to a relish."], "")
    add("odisha", "Salad", "Cucumber Lemon Salad", 6, 0, BOWL,
        ["Cucumber", "Lemon", "Green chilli", "Salt", "Coriander"],
        ["Toss. No onion."], "")

    # ===== WEST BENGAL (21) =====
    add("west-bengal", "Starter", "Beguni", 10, 15, FRY,
        "Niramish brinjal fritters.",
        ["Brinjal slices", "Besan", "Rice flour", "Kalonji", "Turmeric", "Salt", "Oil"],
        ["Dip, fry in steel until crisp."])
    add("west-bengal", "Starter", "Mochar Chop (niramish)", 25, 20, FRY,
        "Banana-flower croquettes. Skip onion; use coconut, ginger, peanuts.",
        ["2 cups cooked banana flower", "1 potato", "Ginger", "Coconut", "Peanuts", "Garam masala", "Besan batter", "Oil"],
        ["Mash filling, shape, crumb in batter, fry in steel."])
    add("west-bengal", "Starter", "Vegetable Chop", 25, 20, FRY,
        "Beet-carrot-potato chop without onion.",
        ["Beet", "Carrot", "Potato", "Ginger", "Bhaja moshla", "Besan", "Oil"],
        ["Mash, shape, fry. Serve with kasundi."])
    add("west-bengal", "Main", "Cholar Dal", 10, 30, S,
        "Chana dal with coconut and raisins. Niramish.",
        ["Chana dal", "Coconut pieces", "Raisins", "Bay, cardamom, cinnamon", "Ginger", "Ghee", "Sugar pinch", "Salt"],
        ["Cook dal. Temper whole spices, coconut, raisins. Slightly sweet."])
    add("west-bengal", "Main", "Shukto", 20, 30, S,
        "Bitter-sweet mixed veg in milk-poppy gravy — the niramish opener-main.",
        ["Bitter gourd, potato, raw banana, drumstick, beans, eggplant", "Poppy-mustard paste", "Milk", "Panch phoron", "Ghee", "Ginger", "Salt", "Sugar"],
        ["Fry bitter gourd first. Cook all veg with paste and milk until creamy. No onion, no garlic."])
    add("west-bengal", "Main", "Dhokar Dalna", 25, 30, S,
        "Chana-dal cakes in ginger-tomato gravy. Classic niramish.",
        ["Chana dal cakes, steamed and fried", "Tomato", "Ginger", "Cumin", "Bay", "Ghee", "Garam masala", "Salt", "Sugar pinch"],
        ["Make a tomato-ginger gravy in steel. Slide in dhoka pieces. Simmer 8 minutes."])
    add("west-bengal", "Side", "Aloo Posto", 10, 20, S,
        "Potato in poppy paste — niramish emblem.",
        ["Potatoes", "Posto paste", "Green chilli", "Kalonji", "Mustard oil", "Turmeric", "Salt", "Sugar pinch"],
        ["Cook potatoes, add posto. Oil should shine. No peyaj, no rasun."])
    add("west-bengal", "Side", "Labra", 15, 25, S,
        "Festival mixed vegetable of Durga Puja bhog — onion-garlic free.",
        ["Pumpkin, beans, eggplant, cabbage, potato, radish", "Panch phoron", "Ginger", "Turmeric", "Salt", "Sugar", "Ghee"],
        ["Temper, add veg, cook until they melt together. Bhog style."])
    add("west-bengal", "Side", "Lau Ghonto", 10, 20, S,
        "Bottle gourd with coconut.",
        ["Lauki", "Coconut", "Kalonji", "Bay", "Ghee", "Ginger", "Salt", "Sugar pinch"],
        ["Cook until almost dry and sweet-savoury."])
    add("west-bengal", "Bread", "Luchi", 20, 15, FRY,
        ["Maida", "Ghee", "Salt", "Oil"],
        ["Fry until they balloon."], "")
    add("west-bengal", "Bread", "Radhaballavi", 30, 20, FRY,
        "Urad-dal stuffed luchi, niramish spices (fennel, ginger, asafoetida).",
        ["Maida dough", "Urad filling with fennel, ginger, hing, chilli"],
        ["Stuff, roll, fry in steel."])
    add("west-bengal", "Bread", "Niramish Paratha", 20, 15, TAWA,
        ["Atta", "Ghee", "Ajwain", "Salt"],
        ["Layered paratha on iron tawa."], "")
    add("west-bengal", "Sweet", "Sandesh", 15, 15, S,
        ["Chenna", "Sugar or khejur gur", "Cardamom"],
        ["Knead, cook lightly in steel, mould."], "")
    add("west-bengal", "Sweet", "Rasgulla", 20, 25, S,
        ["Chenna balls", "Sugar syrup", "Cardamom"],
        ["Boil balls in syrup in a wide steel pot until they sponge."])
    add("west-bengal", "Sweet", "Chomchom", 20, 25, S,
        "Oval chenna sweet in syrup, rolled in coconut or mawa.",
        ["Chenna", "Sugar syrup", "Coconut or khoya to roll"],
        ["Cook like rasgulla, shape ovals, roll."])
    add("west-bengal", "Dessert", "Payesh", 10, 40, MILK,
        ["Rice", "Milk", "Bay", "Cardamom", "Sugar or gur"],
        ["Simmer in steel until creamy."], "")
    add("west-bengal", "Dessert", "Mishti Doi", 15, 0, "Clay or glass bowl — never aluminium",
        "Caramel-yogurt set in clay.",
        ["Milk reduced", "Jaggery or caramel sugar", "Yogurt culture"],
        ["Mix, set in clay or glass. Do not set in aluminium."])
    add("west-bengal", "Dessert", "Chhanar Payesh", 15, 25, MILK,
        ["Chenna crumbs", "Milk", "Sugar", "Cardamom"],
        ["Simmer chenna in sweet milk in steel."], "")
    add("west-bengal", "Salad", "Kasundi Cucumber Salad", 8, 0, BOWL,
        ["Cucumber", "Tomato", "Kasundi", "Lemon", "Salt"],
        ["Toss. Mustard bite instead of onion."], "")
    add("west-bengal", "Salad", "Tomato Khejur Relish", 10, 12, S,
        "Tomato-date chutney of Bengali thalis.",
        ["Tomato", "Dates", "Panch phoron", "Panch phoron", "Chilli", "Sugar", "Salt"],
        ["Cook to a jammy relish."])
    add("west-bengal", "Salad", "Cucumber Lemon Salad", 6, 0, BOWL,
        ["Cucumber", "Lemon", "Green chilli", "Salt", "Coriander"],
        ["Toss. No peyaj."], "")

    # ===== ANDHRA PRADESH (21) =====
    add("andhra-pradesh", "Starter", "Punugulu", 15, 15, FRY,
        "Leftover-batter fritters.",
        ["Idli batter", "Sooji", "Ginger-chilli", "Hing", "Curry leaves", "Oil"],
        ["Fry small blobs in steel."])
    add("andhra-pradesh", "Starter", "Garelu (Minapa Vada)", 20, 15, FRY,
        "Andhra urad vada with pepper and ginger, no onion.",
        ["Urad dal", "Ginger", "Pepper", "Curry leaves", "Hing", "Salt", "Oil"],
        ["Grind, shape rings, fry."])
    add("andhra-pradesh", "Starter", "Perugu Vada", 20, 10, BOWL,
        "Dahi vada — soaked garelu in tempered yogurt.",
        ["Fried garelu", "Yogurt", "Mustard", "Hing", "Curry leaves", "Salt"],
        ["Soak vadas, pour tempered yogurt."])
    add("andhra-pradesh", "Main", "Gongura Pappu", 10, 30, CLAY,
        "Sorrel dal — Andhra’s sour signature.",
        ["Toor dal", "Gongura leaves", "Mustard", "Cumin", "Hing", "Dry chilli", "Curry leaves", "Salt"],
        ["Cook dal. Wilt gongura in tadka. Mix. No onion."])
    add("andhra-pradesh", "Main", "Tomato Pappu", 10, 25, CLAY,
        "Everyday tomato dal.",
        ["Toor dal", "Tomatoes", "Turmeric", "Mustard", "Hing", "Green chilli", "Curry leaves", "Salt"],
        ["Cook dal with tomato. Temper."])
    add("andhra-pradesh", "Main", "Pulihora", 15, 20, S,
        "Tamarind rice of Andhra temples.",
        ["Cooked rice", "Tamarind pulp", "Mustard", "Chana dal", "Urad dal", "Peanuts", "Hing", "Curry leaves", "Turmeric", "Dry chilli", "Salt"],
        ["Cook tamarind with spices until thick. Mix into rice. Temple food — no allium."])
    add("andhra-pradesh", "Side", "Bendakaya Vepudu", 10, 15, S,
        ["Okra", "Sesame", "Chilli", "Coriander powder", "Mustard", "Hing", "Salt"],
        ["Fry uncovered until the slime goes."], "")
    add("andhra-pradesh", "Side", "Cabbage Vepudu", 10, 12, S,
        ["Cabbage", "Chana dal", "Mustard", "Hing", "Green chilli", "Turmeric", "Salt"],
        ["Temper, stir-fry."], "")
    add("andhra-pradesh", "Side", "Dondakaya Fry", 10, 15, S,
        "Ivy gourd fry.",
        ["Dondakaya / tendli", "Chilli powder", "Coriander", "Mustard", "Hing", "Salt"],
        ["Fry until the edges catch."])
    add("andhra-pradesh", "Bread", "Pesarattu", 20, 20, TAWA,
        ["Whole green moong, soaked", "Ginger", "Green chilli", "Cumin", "Salt"],
        ["Grind, spread on iron tawa like a dosa."], "")
    add("andhra-pradesh", "Bread", "Atukulu Upma (breakfast bread)", 10, 12, S,
        "Poha tempered Andhra-style, eaten like a breakfast staple.",
        ["Thick poha", "Mustard", "Hing", "Green chilli", "Peanuts", "Curry leaves", "Turmeric", "Lemon", "Salt"],
        ["Temper, toss poha. Lemon. No onion."])
    add("andhra-pradesh", "Bread", "Jonna Rotte", 15, 15, TAWA,
        "Sorghum roti of Rayalaseema.",
        ["Jowar flour", "Hot water", "Salt"],
        ["Pat and cook on iron tawa."])
    add("andhra-pradesh", "Sweet", "Ariselu", 40, 25, FRY,
        ["Rice flour", "Jaggery syrup", "Sesame", "Ghee"],
        ["Pat discs, fry in ghee."], "")
    add("andhra-pradesh", "Sweet", "Bobbatlu", 40, 25, TAWA,
        "Puran poli of Andhra (chana dal-jaggery).",
        ["Maida or atta dough", "Chana-jaggery-cardamom filling"],
        ["Stuff, roll, cook on iron with ghee."])
    add("andhra-pradesh", "Sweet", "Rava Laddu", 15, 15, S,
        ["Rava roasted in ghee", "Sugar", "Milk", "Cardamom", "Cashews"],
        ["Mix, shape ladoos."], "")
    add("andhra-pradesh", "Dessert", "Paramannam", 10, 35, MILK,
        ["Rice", "Milk", "Jaggery", "Cardamom", "Cashews"],
        ["Temple rice pudding in steel."], "")
    add("andhra-pradesh", "Dessert", "Rava Kesari", 10, 15, S,
        ["Rava", "Ghee", "Sugar", "Saffron or kesari colour", "Cardamom", "Cashews"],
        ["Roast rava in ghee, add water, sugar, saffron."])
    add("andhra-pradesh", "Dessert", "Semiya Payasam", 5, 20, MILK,
        ["Vermicelli", "Milk", "Sugar", "Cardamom", "Cashews"],
        ["Cook in steel."], "")
    add("andhra-pradesh", "Salad", "Tomato Pachadi", 10, 5, BOWL,
        ["Tomato", "Green chilli", "Mustard temper", "Hing", "Curry leaves", "Salt"],
        ["Crush, temper."], "")
    add("andhra-pradesh", "Salad", "Menthi Pachadi", 15, 10, S,
        "Fenugreek-seed chutney, bitter-tangy.",
        ["Fenugreek seeds, roasted", "Tamarind", "Red chilli", "Jaggery pinch", "Salt"],
        ["Grind, mix. A little goes a long way."])
    add("andhra-pradesh", "Salad", "Cabbage Pachadi", 10, 8, S,
        ["Cabbage", "Green chilli", "Mustard", "Hing", "Curd optional", "Salt"],
        ["Quick stir, temper, optional yogurt."], "")
