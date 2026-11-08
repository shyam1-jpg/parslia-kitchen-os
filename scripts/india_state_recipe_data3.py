"""Northeast, remaining east/north states, and union territories."""

from __future__ import annotations


def extend_more(add, S, STEAM, TAWA, FRY, MILK, BOWL, CLAY, GRILL, STONE):
    # ----- 15 Manipur -----
    add("manipur", "Starter", "Paknam Slices", 20, 25, STEAM,
        "Manipuri savoury gram-and-herb steamed cake, sliced as a starter.",
        ["1 cup besan", "1 cup chopped herbs (spring-onion skipped: use coriander + lakadong chilli)",
         "1 tsp ginger", "Salt", "Banana leaf for wrapping"],
        ["Mix a thick batter. Spread on banana leaf, steam 20 minutes in steel.",
         "Cool, slice, pan-sear if you like."])
    add("manipur", "Main", "Chamthong Vegetable Stew", 15, 25, S,
        "Clear Manipuri vegetable stew — ginger, herbs, no allium.",
        ["4 cups mixed veg (cabbage, beans, peas, mushroom, potato)", "1 tsp ginger",
         "2 green chillies", "Salt", "Coriander or local herb", "1 tsp oil"],
        ["Simmer vegetables with ginger, chilli and salt in water until tender.",
         "Finish with herb. Light, clean, no onion stock."])
    add("manipur", "Side", "Veg Eromba (sesame)", 15, 20, STONE,
        "Eromba is often fish; this version is boiled veg mashed with roasted sesame and chilli.",
        ["2 potatoes", "1 cup beans or broad beans, boiled", "3 tbsp sesame, roasted",
         "2 dry red chillies, toasted", "Salt"],
        ["Boil veg. Pound sesame and chilli. Mash with veg and salt.",
         "Should be smoky and hot — not garlicky."])
    add("manipur", "Bread", "Steamed Sticky Rice", 5, 25, STEAM,
        "The Manipuri staple.",
        ["2 cups sticky rice, soaked", "Pinch of salt"],
        ["Steam 20–25 minutes in a steel steamer."])
    add("manipur", "Sweet", "Til-Gud Ladoo", 10, 15, S,
        "Sesame-jaggery balls common at Manipuri festivals.",
        ["1 cup sesame, roasted", "¾ cup jaggery", "Ghee 1 tsp"],
        ["Melt jaggery, add sesame, shape ladoos."])
    add("manipur", "Dessert", "Chak-Hao Kheer", 10, 45, MILK,
        "Black-rice kheer of Manipur.",
        ["⅓ cup chak-hao (black rice), soaked", "3 cups milk", "⅓ cup sugar", "Cardamom"],
        ["Simmer black rice in milk in steel until the milk is lilac-grey and thick. Sugar, cardamom."])
    add("manipur", "Salad", "Veg Singju", 15, 0, BOWL,
        "Manipuri salad. Skip fermented fish; use roasted sesame and chickpea flour.",
        ["2 cups shredded cabbage and banana flower or beans", "2 tbsp roasted sesame, crushed",
         "1 tbsp roasted besan", "Chilli flakes", "Salt", "Lemon"],
        ["Toss. Rest 5 minutes. No onion, no nga-ri."])

    # ----- 16 Meghalaya -----
    add("meghalaya", "Starter", "Pukhlein", 15, 15, FRY,
        "Khasi rice-jaggery fritter, eaten as snack or sweet.",
        ["1 cup rice flour", "⅓ cup jaggery", "Water", "Oil"],
        ["Mix a thick batter. Fry small discs in a steel kadhai."])
    add("meghalaya", "Main", "Vegetarian Rice Pot", 15, 30, CLAY,
        "Jadoh is meat-rice; this is a Khasi-style veg rice cooked with ginger and local greens.",
        ["1½ cups rice", "3 cups water", "1 tsp ginger", "2 cups chopped greens", "1 tomato",
         "Salt", "1 tbsp mustard oil", "Green chilli"],
        ["Temper oil, ginger, chilli, tomato. Add rice, greens, water, salt. Cook like a wet pulao.",
         "No pork fat, no onion, no garlic."])
    add("meghalaya", "Side", "Boiled Seasonal Veg with Sesame", 10, 15, S,
        "Meghalaya’s simple boiled vegetables with sesame smash.",
        ["4 cups mixed veg", "3 tbsp sesame, roasted", "Chilli", "Salt"],
        ["Boil veg. Pound sesame and chilli. Toss."])
    add("meghalaya", "Bread", "Steamed Rice Cakes", 20, 20, STEAM,
        "Plain rice cakes to scoop the pot.",
        ["2 cups rice flour", "Hot water", "Salt"],
        ["Make a dough, shape cakes, steam 15 minutes."])
    add("meghalaya", "Sweet", "Minil Sesame Rice Cake", 20, 20, STEAM,
        "Sesame-stuffed rice cake.",
        ["2 cups rice flour", "½ cup sesame", "⅓ cup jaggery"],
        ["Fill dough with sesame-jaggery. Steam."])
    add("meghalaya", "Dessert", "Red Rice Kheer", 10, 40, MILK,
        ["¼ cup rice", "1 litre milk", "Jaggery", "Cardamom"],
        ["Simmer in steel."], "Hill-style milk pudding after chilli food.")
    add("meghalaya", "Salad", "Cucumber Chilli Salad", 6, 0, BOWL,
        "Cool salad next to the rice pot.",
        ["2 cucumbers", "Green chilli", "Lemon", "Salt"],
        ["Slice and toss. No onion."])

    # ----- 17 Mizoram -----
    add("mizoram", "Starter", "Boiled Veg Fritters", 15, 15, FRY,
        "Leftover boiled veg bound with besan.",
        ["2 cups mashed boiled veg", "½ cup besan", "Ginger-chilli", "Salt", "Oil"],
        ["Mix, fry small pakoras in steel."])
    add("mizoram", "Main", "Vegetarian Bai", 15, 30, S,
        "Mizo bai is a boiled stew. Vegetarian version: squash, beans, leaves, ginger — no pork, no allium.",
        ["2 cups pumpkin", "1 cup beans", "2 cups leafy greens", "1 cup boiled rice (optional thickener)",
         "1 tsp ginger", "2 green chillies", "Salt"],
        ["Put everything in a steel pot with water to cover. Simmer 20 minutes until the veg collapse into a stew.",
         "Taste for salt and ginger. Do not add garlic or onion."])
    add("mizoram", "Side", "Boiled Bamboo Shoot", 10, 20, S,
        "Sliced bamboo shoot boiled and tossed with chilli.",
        ["2 cups bamboo shoot, sliced and rinsed", "Green chilli", "Salt", "1 tsp oil"],
        ["Boil until tender. Drain. Toss with chilli, salt, oil."])
    add("mizoram", "Bread", "Steamed Rice", 5, 20, STEAM,
        "Plain rice, the Mizo staple.",
        ["2 cups rice", "Water", "Salt pinch"],
        ["Steam or boil in steel."])
    add("mizoram", "Sweet", "Coconut Ladoo", 5, 10, S,
        "Island-and-hill festival sweet.",
        ["2 cups coconut", "¾ cup condensed milk or jaggery", "Cardamom"],
        ["Cook in steel until thick. Shape."])
    add("mizoram", "Dessert", "Rice Kheer", 10, 35, MILK,
        ["¼ cup rice", "1 litre milk", "Sugar", "Cardamom"],
        ["Simmer in steel."], "")
    add("mizoram", "Salad", "Bamboo Shoot Salad", 10, 0, BOWL,
        "Rinsed tender bamboo with lemon and chilli.",
        ["1 cup tender bamboo shoot, blanched", "Lemon", "Chilli", "Salt", "Coriander"],
        ["Toss. No onion."])

    # ----- 18 Nagaland -----
    add("nagaland", "Starter", "Vegetable Momos", 30, 15, STEAM,
        "Naga-style cabbage momos with ginger, no onion garlic.",
        ["2 cups maida", "Cabbage-carrot-ginger filling as Arunachal", "Salt"],
        ["Fill, pleat, steam 12 minutes in steel. Tomato-chilli dip without garlic."])
    add("nagaland", "Main", "Galho", 10, 30, CLAY,
        "Naga rice porridge with vegetables — the everyday vegetarian bowl.",
        ["1 cup rice", "4 cups water", "2 cups mixed veg and greens", "1 tsp ginger",
         "2 green chillies", "Salt"],
        ["Cook rice extra-soft with veg, ginger and chilli until porridge-like.",
         "Salt. No smoked meat, no garlic."])
    add("nagaland", "Side", "Axone Beans", 10, 20, S,
        "Fermented soybean (axone/akhuni) with beans. Use ginger, not garlic.",
        ["2 cups beans", "1 tsp axone (fermented soybean)", "1 tsp ginger", "Chilli", "Salt", "1 tbsp oil"],
        ["Fry ginger, chilli, axone briefly. Add beans and a splash of water. Cover until tender.",
         "Axone is soybean, not allium — but it is strong; start with 1 tsp."])
    add("nagaland", "Bread", "Steamed Rice", 5, 20, STEAM,
        ["2 cups rice"],
        ["Steam in steel."], "Naga meals are rice-based.")
    add("nagaland", "Sweet", "Sticky Rice with Jaggery", 5, 25, STEAM,
        "Festival sticky rice sweetened with jaggery.",
        ["2 cups sticky rice, soaked", "½ cup jaggery", "Sesame"],
        ["Steam rice. Fold warm jaggery and sesame."])
    add("nagaland", "Dessert", "Ginger Cardamom Kheer", 10, 35, MILK,
        "Milk kheer with a thin slice of ginger — Naga-adjacent comfort.",
        ["¼ cup rice", "1 litre milk", "Sugar", "2 slices ginger, removed at the end", "Cardamom"],
        ["Simmer in steel. Fish out ginger."])
    add("nagaland", "Salad", "Cabbage Chilli Salad", 8, 0, BOWL,
        ["2 cups cabbage", "Chilli", "Lemon", "Salt"],
        ["Toss. No onion."], "")

    # ----- 19 Odisha -----
    add("odisha", "Starter", "Chakuli Pitha", 20, 15, TAWA,
        "Odia rice-urad pancake, cousin of dosa.",
        ["1 cup rice, soaked", "¼ cup urad dal, soaked", "Salt", "Oil"],
        ["Grind, ferment if you have time. Spread on iron tawa. Cook both sides."])
    add("odisha", "Main", "Dalma", 15, 35, CLAY,
        "The Jagannath-kitchen dal with vegetables. Onion and garlic are forbidden in the temple.",
        ["¾ cup toor dal", "2 cups mixed veg (raw banana, papaya, brinjal, pumpkin, beans)",
         "½ tsp turmeric", "1 tsp cumin, roasted and crushed", "1 tsp ginger", "Ghee", "Dry chilli", "Salt", "Grated coconut optional"],
        ["Cook dal and veg together with turmeric until soft.",
         "Add roasted cumin, ginger, salt, ghee tadka with dry chilli.",
         "This is Puri temple food — never onion, never garlic, never aluminium."])
    add("odisha", "Side", "Santula", 10, 20, S,
        "Light Odia mixed vegetable, boiled then tossed.",
        ["4 cups mixed veg", "½ tsp turmeric", "1 tsp cumin", "Pinch of hing", "Green chilli", "Salt", "1 tbsp oil"],
        ["Boil veg with turmeric and salt. Drain extra water.",
         "Temper cumin, hing, chilli. Toss."])
    add("odisha", "Bread", "Luchi", 20, 15, FRY,
        "Odia-Bengali fried bread for dalma.",
        ["2 cups maida", "2 tbsp ghee", "Salt", "Oil"],
        ["Knead, roll small, fry in steel until they puff."])
    add("odisha", "Sweet", "Chhena Poda", 20, 50, "Steel or earthen baking dish — never aluminium",
        "Caramelised chenna cake of Odisha.",
        ["400 g fresh chenna (drained paneer)", "½ cup sugar", "2 tbsp sooji", "Cardamom", "Ghee to grease"],
        ["Knead chenna, sugar, sooji, cardamom. Press into a greased steel tin.",
         "Bake 180°C 40–50 minutes until the top is burnt-caramel. Cool, slice."])
    add("odisha", "Dessert", "Rasabali", 20, 25, MILK,
        "Flattened chenna patties in thickened sweet milk.",
        ["300 g chenna", "1 tbsp sooji", "3 cups milk", "⅓ cup sugar", "Cardamom"],
        ["Shape patties, pan-sear. Reduce milk with sugar in steel. Soak patties."])
    add("odisha", "Salad", "Khatta (raw mango)", 10, 10, S,
        "Tangy raw-mango relish-salad of Odia thalis.",
        ["2 raw mangoes, chopped", "½ tsp mustard seeds", "Pinch of hing", "Turmeric", "Chilli", "Salt", "Sugar pinch", "Oil"],
        ["Temper, add mango and spices. Cook 5 minutes until glossy but still tart."])

    # ----- 20 Punjab -----
    add("punjab", "Starter", "Hara Bhara Kebab", 20, 15, FRY,
        "Spinach-pea-potato kebab. Skip onion; use ginger, chilli, chaat masala.",
        ["2 cups spinach, blanched", "½ cup peas", "2 potatoes, boiled", "1 tsp ginger-chilli",
         "½ tsp garam masala", "2 tbsp besan", "Salt", "Oil"],
        ["Mash, shape, pan-fry on iron or steel until crusted."])
    add("punjab", "Main", "Sarson da Saag", 20, 45, CLAY,
        "Mustard-greens mash of Punjab. Langar-style: ginger, green chilli, makki atta — no onion garlic.",
        ["500 g sarson (mustard greens)", "100 g spinach", "2 green chillies", "1-inch ginger",
         "2 tbsp makki atta", "Salt", "2 tbsp ghee", "Pinch of hing", "1 tsp cumin"],
        ["Cook greens, chilli and ginger with a little water until very soft. Mash.",
         "Stir in makki atta. Simmer 10 minutes.",
         "Tadka: ghee, cumin, hing. Serve with makki roti and white butter."])
    add("punjab", "Side", "Langar Dal", 10, 50, CLAY,
        "Gurdwara-style whole-urad-chana dal. No onion, no garlic — ever.",
        ["½ cup whole urad", "¼ cup chana dal", "Turmeric", "1 tsp ginger", "2 tomatoes",
         "Ghee tadka: cumin, hing, chilli powder", "Salt"],
        ["Pressure-cook dals until creamy. Add tomato, ginger, salt. Simmer.",
         "Heavy ghee tadka with cumin and hing. This is langar — do not add onion or garlic."])
    add("punjab", "Bread", "Makki di Roti", 15, 20, TAWA,
        "Maize roti eaten with saag.",
        ["2 cups makki atta", "Hot water", "Salt", "Ghee"],
        ["Knead with hot water. Pat with wet hands. Cook on iron tawa. Ghee."])
    add("punjab", "Sweet", "Atta Gur Pinni", 15, 25, S,
        "Punjabi winter ladoo.",
        ["2 cups atta", "¾ cup ghee", "¾ cup jaggery", "Gond optional", "Almonds", "Cardamom"],
        ["Roast atta (and gond) in ghee. Mix jaggery. Shape."])
    add("punjab", "Dessert", "Phirni", 20, 25, S,
        "Ground-rice milk dessert set in katoris.",
        ["¼ cup basmati, soaked and ground", "3 cups milk", "⅓ cup sugar", "Saffron", "Cardamom", "Almonds"],
        ["Cook rice paste in milk in steel until thick. Sugar, saffron. Pour into steel bowls. Chill."])
    add("punjab", "Salad", "Mooli Salad (no onion)", 8, 0, BOWL,
        "Radish-cucumber-lemon. Skip onion.",
        ["1 radish, julienned", "1 cucumber", "Lemon", "Green chilli", "Salt", "Coriander"],
        ["Toss just before serving."])

    # ----- 21 Rajasthan -----
    add("rajasthan", "Starter", "Dal Kachori", 30, 20, FRY,
        "Moong-dal kachori without the pyaz of street pyaz-kachori.",
        ["2 cups maida", "Filling: ½ cup cooked mooor crushed moong + fennel + coriander + chilli + amchur + hing",
         "Oil"],
        ["Stuff, seal, fry on medium in a steel kadhai until flaky."])
    add("rajasthan", "Main", "Gatte ki Sabzi", 20, 30, S,
        "Gram-flour dumplings in yogurt gravy — Marwari, often onion-garlic free.",
        ["Gatte: 1 cup besan + 2 tbsp yogurt + ajwain + chilli + oil, boiled as logs, sliced",
         "Gravy: 1 cup yogurt + 1 tsp coriander + turmeric + chilli + cumin + hing tadka", "Salt"],
        ["Boil gatte logs, slice.",
         "Make yogurt gravy in steel, stirring so it does not split. Add gatte. Simmer 8 minutes."])
    add("rajasthan", "Side", "Ker Sangri", 15, 25, S,
        "Desert berries and beans of Rajasthan.",
        ["½ cup dried ker, soaked", "1 cup dried sangri, soaked", "2 tbsp oil", "Cumin", "Hing",
         "Red chilli", "Amchur", "Coriander powder", "Salt"],
        ["Boil ker and sangri until tender. Drain.",
         "Temper spices, toss. Tart, spicy, no onion."])
    add("rajasthan", "Bread", "Bajra Roti with Ghee", 15, 15, TAWA,
        "Pearl-millet roti of the desert.",
        ["2 cups bajra flour", "Hot water", "Salt", "Ghee"],
        ["Pat and cook on iron tawa. Ghee."])
    add("rajasthan", "Sweet", "Ghevar", 30, 25, FRY,
        "Honeycomb Rajasthani disc soaked in syrup, topped with rabri.",
        ["1 cup maida", "¼ cup ghee", "Ice water", "Pinch of baking soda", "Sugar syrup", "Rabri to top"],
        ["Make a thin batter. Pour in a thin stream into hot ghee in a steel kadhai to lace a disc. Fry, drain, soak in syrup."])
    add("rajasthan", "Dessert", "Moong Dal Halwa", 15, 40, S,
        "Rich moong-ghee-milk halwa of Rajasthani weddings.",
        ["1 cup moong dal, soaked and ground", "¾ cup ghee", "¾ cup sugar", "1 cup milk", "Cardamom", "Nuts"],
        ["Cook dal paste in ghee in steel on low until it leaves ghee. Add milk, then sugar. Cardamom, nuts."])
    add("rajasthan", "Salad", "Kachumber without Onion", 8, 0, BOWL,
        "Cucumber, tomato, lemon, roasted cumin — no pyaz.",
        ["Cucumber", "Tomato", "Lemon", "Cumin", "Salt", "Coriander"],
        ["Toss."])

    # ----- 22 Sikkim -----
    add("sikkim", "Starter", "Sikkimese Veg Momos", 30, 15, STEAM,
        "Cabbage-ginger momos of Gangtok.",
        ["Maida dough", "Cabbage, ginger, chilli filling", "Salt"],
        ["Steam 12 minutes. Achar of tomato-chilli-sesame, no garlic."])
    add("sikkim", "Main", "Veg Thukpa", 15, 25, S,
        "Sikkimese noodle soup.",
        ["Noodles", "Cabbage, carrot, beans", "Tomato", "Ginger", "Hing pinch", "Salt", "Pepper"],
        ["Simmer a ginger-tomato broth with veg. Add noodles. No garlic paste."])
    add("sikkim", "Side", "Gundruk", 10, 15, S,
        "Fermented leafy-green soup of the eastern Himalaya.",
        ["1 cup gundruk (fermented greens), rinsed", "1 tomato", "Ginger", "Chilli", "Salt"],
        ["Simmer 10 minutes until sour and soft."])
    add("sikkim", "Bread", "Sel Roti", 30, 20, FRY,
        "Fermented rice ring-bread of Sikkim and Nepal.",
        ["2 cups rice, soaked and ground", "2 tbsp sugar", "2 tbsp ghee", "Cardamom", "Oil"],
        ["Ferment batter 2 hours. Pipe rings into hot oil in a steel kadhai. Fry until deep brown."])
    add("sikkim", "Sweet", "Sel Roti with Sugar", 30, 20, FRY,
        "The same sel roti dusted with sugar as a sweet.",
        ["Sel roti batter as above", "Sugar to dust"],
        ["Fry rings. Dust with sugar while warm."])
    add("sikkim", "Dessert", "Cardamom Kheer", 10, 35, MILK,
        ["Rice", "Milk", "Sugar", "Cardamom"],
        ["Simmer in steel."], "")
    add("sikkim", "Salad", "Cucumber Tomato Salad", 6, 0, BOWL,
        ["Cucumber", "Tomato", "Lemon", "Salt", "Coriander"],
        ["Toss. No onion."], "")

    # ----- 23 Tamil Nadu -----
    add("tamil-nadu", "Starter", "Medu Vada", 20, 15, FRY,
        "Urad-dal doughnut. Tamil Brahmin version: pepper, curry leaf, ginger — no onion.",
        ["1 cup urad dal, soaked 2 hours", "1 tsp ginger", "1 tsp pepper", "Curry leaves", "Pinch of hing", "Salt", "Oil"],
        ["Grind fluffy, mix spices, shape rings, fry in steel until golden."])
    add("tamil-nadu", "Main", "Sambar", 15, 35, CLAY,
        "Toor-dal tamarind vegetable stew. Brahmin sambar has no onion or garlic.",
        ["¾ cup toor dal", "2 tbsp tamarind", "2 cups veg (drumstick, pumpkin, brinjal, beans)",
         "2 tbsp sambar powder (garlic-free)", "Turmeric", "Mustard, curry leaves, hing, dry chilli", "Salt", "Jaggery pinch"],
        ["Cook dal. Cook veg with tamarind, powder, turmeric, salt.",
         "Mix dal. Tadka. This is Tamil Brahmin food — no allium."])
    add("tamil-nadu", "Side", "Beans Poriyal", 10, 12, S,
        "Dry beans coconut.",
        ["Beans", "Coconut", "Mustard, urad, curry leaves, hing", "Turmeric", "Salt", "Oil"],
        ["Temper, cook beans, finish coconut."])
    add("tamil-nadu", "Bread", "Idli", 20, 15, STEAM,
        "Steamed rice-urad cakes. Steel idli stand, never aluminium.",
        ["Idli batter (rice + urad, fermented)", "Salt"],
        ["Pour into steel moulds. Steam 10–12 minutes."])
    add("tamil-nadu", "Sweet", "Adhirasam", 40, 20, FRY,
        "Rice-jaggery disc of Tamil Nadu festivals.",
        ["2 cups rice flour from soaked ground rice", "1 cup jaggery syrup", "Cardamom", "Sesame", "Ghee"],
        ["Bind dough with warm jaggery syrup. Rest. Pat discs, fry in ghee on medium."])
    add("tamil-nadu", "Dessert", "Sakkarai Pongal", 10, 25, S,
        "Sweet jaggery rice-moong of Pongal.",
        ["½ cup rice", "¼ cup moong", "¾ cup jaggery", "Ghee", "Cashews", "Raisins", "Cardamom"],
        ["Cook rice and moong soft. Melt jaggery, mix, add lots of ghee and nuts."])
    add("tamil-nadu", "Salad", "Carrot Kosambari", 15, 2, BOWL,
        "Moong and grated carrot with coconut.",
        ["Soaked split moong", "Carrot", "Coconut", "Lemon", "Mustard tadka", "Salt"],
        ["Mix, temper."])

    # ----- 24 Telangana -----
    add("telangana", "Starter", "Sarva Pindi", 20, 15, TAWA,
        "Sesame-chilli rice pancake of Telangana, pressed on the tawa.",
        ["1 cup rice flour", "2 tbsp sesame", "1 tsp ginger-chilli", "Curry leaves", "Pinch of hing", "Salt", "Oil"],
        ["Make a stiff dough. Press onto a hot iron tawa with a hole in the centre. Cook both sides."])
    add("telangana", "Main", "Tomato Cashew Kurma", 15, 25, S,
        "Hyderabadi-style veg kurma without onion garlic.",
        ["3 tomatoes + 12 cashews, blended", "2 cups mixed veg and paneer", "Ginger", "Hing",
         "Coriander powder", "Chilli", "Garam masala", "Cream 2 tbsp", "Ghee", "Salt"],
        ["Cook paste in ghee with spices until fat separates. Add veg, water, cream."])
    add("telangana", "Side", "Beans Coconut Fry", 10, 12, S,
        ["Beans", "Coconut", "Mustard", "Chilli", "Salt"],
        ["Temper and fry."], "Dry side for sarva pindi.")
    add("telangana", "Bread", "Jonna Roti", 15, 15, TAWA,
        "Sorghum roti of Telangana.",
        ["2 cups jowar flour", "Hot water", "Salt"],
        ["Pat and cook on iron tawa."])
    add("telangana", "Sweet", "Qubani ka Meetha", 15, 25, S,
        "Hyderabadi stewed apricots. Already no allium.",
        ["200 g dried apricots, soaked", "⅓ cup sugar", "1 cup soak-water", "Saffron", "Almonds", "Cream to serve"],
        ["Stew apricots with sugar until jammy. Saffron, almonds, a ribbon of cream."])
    add("telangana", "Dessert", "Double ka Meetha", 15, 25, S,
        "Fried bread in saffron milk — Hyderabadi dessert.",
        ["6 slices bread, fried in ghee", "2 cups milk", "⅓ cup sugar", "Saffron", "Nuts"],
        ["Reduce milk with sugar and saffron in steel. Soak fried bread. Nuts."])
    add("telangana", "Salad", "Tomato Cucumber Salad", 6, 0, BOWL,
        ["Tomato", "Cucumber", "Lemon", "Salt", "Coriander"],
        ["Toss. No onion."], "")

    # ----- 25 Tripura -----
    add("tripura", "Starter", "Bamboo Shoot Fritters", 15, 15, FRY,
        "Blanched bamboo shoot in besan.",
        ["2 cups bamboo shoot, blanched", "½ cup besan", "Turmeric", "Chilli", "Salt", "Oil"],
        ["Coat, fry in steel."])
    add("tripura", "Main", "Vegetarian Chakhwi", 15, 25, S,
        "Tripuri bamboo-shoot stew without berma (fermented fish).",
        ["2 cups bamboo shoot", "2 cups mixed veg", "1 tsp ginger", "Chilli", "Salt", "1 tbsp oil"],
        ["Simmer bamboo and veg with ginger and chilli until the stew is thick and sour-savoury."])
    add("tripura", "Side", "Boiled Seasonal Greens", 10, 12, S,
        ["4 cups greens", "Ginger", "Chilli", "Salt"],
        ["Boil, drain, toss."], "")
    add("tripura", "Bread", "Steamed Rice", 5, 20, STEAM,
        ["2 cups rice"],
        ["Steam in steel."], "Bangui or plain rice.")
    add("tripura", "Sweet", "Sticky Rice Jaggery", 5, 25, STEAM,
        ["Sticky rice", "Jaggery", "Coconut"],
        ["Steam rice, fold jaggery and coconut."], "")
    add("tripura", "Dessert", "Payesh", 10, 40, MILK,
        "Bengali-Tripuri rice pudding.",
        ["Rice", "Milk", "Sugar or jaggery", "Cardamom", "Bay leaf"],
        ["Simmer in steel."])
    add("tripura", "Salad", "Pineapple Chilli Salad", 8, 0, BOWL,
        "Pineapple with chilli and salt — Tripura’s tropical bite instead of onion.",
        ["2 cups pineapple", "Green chilli", "Salt", "Lemon", "Coriander"],
        ["Toss."])

    # ----- 26 Uttar Pradesh -----
    add("uttar-pradesh", "Starter", "Matar Kachori", 30, 20, FRY,
        "Lucknow-Mathura pea kachori. Sattvic filling: peas, ginger, cumin, amchur — no onion.",
        ["2 cups maida", "Filling: 1 cup crushed peas + ginger + cumin + amchur + chilli + salt", "Oil"],
        ["Stuff, fry on medium until flaky. Serve with aloo tamatar."])
    add("uttar-pradesh", "Main", "Aloo Tamatar", 10, 25, S,
        "Mathura-Vrindavan temple potato-tomato curry. No onion, no garlic.",
        ["4 potatoes, cubed", "3 tomatoes, blended", "1 tsp cumin", "Pinch of hing", "1 tsp ginger",
         "½ tsp turmeric", "1 tsp coriander", "½ tsp chilli", "Salt", "Ghee", "Garam masala pinch"],
        ["Tadka cumin, hing, ginger. Tomato and spices until thick. Potatoes, water, simmer until soft.",
         "This is Braj sattvic food."])
    add("uttar-pradesh", "Side", "Bhindi ki Sabzi", 10, 15, S,
        "Dry okra with amchur.",
        ["400 g bhindi", "Oil", "Cumin", "Hing", "Turmeric", "Coriander", "Chilli", "Amchur", "Salt"],
        ["Fry uncovered until no slime. Spices at the end."])
    add("uttar-pradesh", "Bread", "Bedmi Puri", 25, 20, FRY,
        "Urad-dal stuffed puri of UP breakfasts.",
        ["2 cups atta", "½ cup urad dal, soaked and coarsely ground with ginger, chilli, fennel, hing", "Oil"],
        ["Knead dal into atta or stuff. Roll thick. Fry until puffed and brown."])
    add("uttar-pradesh", "Sweet", "Agra Petha", 20, 40, S,
        "Ash-gourd candy of Agra. Already no allium.",
        ["500 g ash gourd, peeled cubed", "Lime water to soak", "2 cups sugar", "1 cup water", "Cardamom"],
        ["Soak cubes in lime water 15 minutes, rinse well. Boil until translucent.",
         "Cook in sugar syrup in steel until the syrup coats and candies."])
    add("uttar-pradesh", "Dessert", "Rabri", 10, 45, MILK,
        "Malai-rich reduced milk of Awadh.",
        ["1 litre milk", "Sugar", "Saffron", "Pistachios"],
        ["Reduce in a heavy steel pot, scraping cream back in."])
    add("uttar-pradesh", "Salad", "Kachumber without Onion", 8, 0, BOWL,
        "Cucumber, tomato, lemon, roasted cumin. Temple thali salad.",
        ["Cucumber", "Tomato", "Lemon", "Cumin", "Salt", "Coriander"],
        ["Toss. No pyaaz."])

    # ----- 27 Uttarakhand -----
    add("uttarakhand", "Starter", "Aloo ke Gutke", 10, 20, S,
        "Kumaoni spiced potatoes with jakhiya seeds. Already no onion garlic.",
        ["4 boiled potatoes, cubed", "2 tbsp mustard oil", "1 tsp jakhiya or mustard seeds",
         "Pinch of hing", "Red chilli", "Turmeric", "Coriander powder", "Salt", "Lemon"],
        ["Heat mustard oil, jakhiya, hing, chilli. Add potatoes and spices. Crisp the edges. Lemon."])
    add("uttarakhand", "Main", "Kafuli", 15, 25, S,
        "Spinach-fenugreek mash thickened with rice paste — Garhwal.",
        ["4 cups spinach", "1 cup methi", "2 tbsp rice paste or besan", "1 tsp ginger",
         "Green chilli", "Cumin", "Hing", "Salt", "Ghee"],
        ["Cook greens with ginger and chilli. Mash. Add rice paste. Simmer thick. Cumin-hing ghee tadka."])
    add("uttarakhand", "Side", "Bhatt ki Churkani", 15, 40, CLAY,
        "Black-soybean curry of Kumaon.",
        ["1 cup bhatt (black soy), soaked", "Rice paste 2 tbsp", "Cumin", "Hing", "Ginger", "Chilli", "Salt", "Ghee"],
        ["Cook bhatt until very soft. Add rice paste and spices. Tadka."])
    add("uttarakhand", "Bread", "Mandua Roti", 15, 15, TAWA,
        "Finger-millet roti of the hills.",
        ["2 cups mandua/ragi flour", "Hot water", "Salt"],
        ["Pat and cook on iron tawa."])
    add("uttarakhand", "Sweet", "Bal Mithai", 20, 25, S,
        "Roasted-khoya sweet coated in sugar balls — Almora.",
        ["400 g khoya, roasted dark", "½ cup sugar", "Sugar balls (khurchan) to roll"],
        ["Cook khoya and sugar in steel until it holds shape. Cut squares, roll in sugar balls."])
    add("uttarakhand", "Dessert", "Jhangora Kheer", 10, 30, MILK,
        "Barnyard-millet kheer of Uttarakhand fasts.",
        ["⅓ cup jhangora (barnyard millet), soaked", "3 cups milk", "Sugar", "Cardamom", "Nuts"],
        ["Simmer in steel until creamy."])
    add("uttarakhand", "Salad", "Cucumber Lemon Salad", 6, 0, BOWL,
        ["Cucumber", "Lemon", "Green chilli", "Salt", "Coriander"],
        ["Toss. No onion."], "")

    # ----- 28 West Bengal -----
    add("west-bengal", "Starter", "Beguni", 10, 15, FRY,
        "Brinjal slices in rice-flour batter — niramish if the batter has no onion.",
        ["1 large brinjal, sliced", "½ cup besan + 2 tbsp rice flour", "Turmeric", "Kalonji", "Salt", "Oil"],
        ["Dip, fry in a steel kadhai until crisp."])
    add("west-bengal", "Main", "Cholar Dal", 10, 30, S,
        "Bengali chana dal with coconut and raisins. Niramish: no onion garlic.",
        ["1 cup chana dal", "2 tbsp coconut pieces", "10 raisins", "2 bay leaves", "4 cardamom", "1-inch cinnamon",
         "1 tsp ginger", "Turmeric", "Ghee", "Sugar pinch", "Salt"],
        ["Cook dal. Temper ghee with whole spices, ginger, coconut, raisins. Mix. Slightly sweet."])
    add("west-bengal", "Side", "Aloo Posto", 10, 20, S,
        "Potato in poppy-seed paste — the niramish emblem of Bengal.",
        ["4 potatoes, cubed", "4 tbsp posto (poppy), soaked and ground", "2 green chillies",
         "½ tsp kalonji", "Turmeric", "Mustard oil", "Salt", "Sugar pinch"],
        ["Heat mustard oil, kalonji, chilli. Potatoes, turmeric, salt. Cover until almost done.",
         "Add posto paste and a splash of water. Cook until the oil shines. No onion, no garlic."])
    add("west-bengal", "Bread", "Luchi", 20, 15, FRY,
        "Maida puri of Bengal.",
        ["2 cups maida", "2 tbsp ghee", "Salt", "Oil"],
        ["Roll small, fry until they balloon."])
    add("west-bengal", "Sweet", "Sandesh", 15, 15, S,
        "Fresh chenna sweet of Bengal.",
        ["400 g chenna", "⅓ cup sugar or date-palm jaggery", "Cardamom"],
        ["Knead, cook in steel on low until it leaves the sides. Mould."])
    add("west-bengal", "Dessert", "Patishapta Payesh Plate", 20, 30, TAWA,
        "Rice crepes with coconut-jaggery, plus a bowl of payesh.",
        ["Rice-flour crepes", "Coconut-jaggery filling", "Payesh: milk, rice, sugar, bay, cardamom"],
        ["Spread thin crepes on iron tawa, fill, roll. Serve with a ladle of steel-pot payesh."])
    add("west-bengal", "Salad", "Cucumber Tomato with Kasundi", 8, 0, BOWL,
        "Mustard-oil salad. Kasundi instead of onion bite.",
        ["Cucumber", "Tomato", "½ tsp kasundi or mustard oil", "Lemon", "Salt", "Green chilli"],
        ["Toss. No peyaj."])

    # ----- 29 Andaman and Nicobar -----
    add("andaman-nicobar", "Starter", "Coconut Vada", 15, 15, FRY,
        "Island coconut-dal fritters.",
        ["½ cup urad dal, soaked", "½ cup coconut", "Ginger-chilli", "Hing", "Salt", "Oil"],
        ["Grind, fry in steel."])
    add("andaman-nicobar", "Main", "Coconut Vegetable Curry", 15, 25, S,
        "Island veg in coconut milk, curry leaves, kokum — no fish, no allium.",
        ["4 cups mixed tropical veg", "1½ cups coconut milk", "Curry leaves", "Mustard", "Hing",
         "Turmeric", "Kokum or lemon", "Salt", "Coconut oil"],
        ["Temper, add veg, turmeric, salt. Coconut milk, simmer. Kokum."])
    add("andaman-nicobar", "Side", "Beans Thoran-Style", 10, 12, S,
        ["Beans", "Coconut", "Mustard", "Curry leaves", "Salt"],
        ["Temper and stir-fry."], "")
    add("andaman-nicobar", "Bread", "Steamed Rice", 5, 20, STEAM,
        ["2 cups rice"],
        ["Steam in steel."], "Island staple.")
    add("andaman-nicobar", "Sweet", "Coconut Ladoo", 5, 10, S,
        ["Coconut", "Condensed milk or jaggery", "Cardamom"],
        ["Cook, shape."], "")
    add("andaman-nicobar", "Dessert", "Coconut Payasam", 5, 20, S,
        ["Vermicelli", "Coconut milk", "Jaggery", "Cardamom"],
        ["Cook in steel."], "")
    add("andaman-nicobar", "Salad", "Green Papaya Salad", 10, 0, BOWL,
        "Shredded papaya, lemon, chilli, coconut — no onion.",
        ["2 cups green papaya, shredded", "Lemon", "Chilli", "Coconut", "Salt"],
        ["Toss."])

    # ----- 30 Chandigarh -----
    add("chandigarh", "Starter", "Aloo Tikki", 20, 15, TAWA,
        "City tikki without onion in the mash.",
        ["4 potatoes", "½ cup peas", "Ginger-chilli", "Chaat masala", "Salt", "Oil"],
        ["Shape, pan-fry on iron. Chutneys without onion garlic."])
    add("chandigarh", "Main", "Amritsari Chole (sattvic)", 15, 35, S,
        "Chickpea curry, tomato-ginger-anardana, no onion garlic.",
        ["2 cups chickpeas, cooked", "2 tomatoes + ginger, blended", "Chole masala (garlic-free)",
         "Amchur", "Tea bag for colour", "Cumin", "Hing", "Salt"],
        ["Cook tomato-ginger with masala. Add chickpeas. Simmer 15 minutes. Ginger juliennes."])
    add("chandigarh", "Side", "Jeera Aloo", 10, 15, S,
        ["Potatoes", "Cumin", "Hing", "Turmeric", "Chilli", "Amchur", "Salt"],
        ["Fry spices, toss potatoes."], "")
    add("chandigarh", "Bread", "Kulcha (no onion)", 40, 20, TAWA,
        "Potato kulcha without chopped onion in the filling.",
        ["Maida-yogurt dough", "Potato, ginger-chilli, amchur, coriander filling", "Butter"],
        ["Stuff, cook on iron tawa with butter."])
    add("chandigarh", "Sweet", "Pinni", 15, 25, S,
        ["Atta", "Ghee", "Jaggery", "Nuts"],
        ["Roast, shape."], "")
    add("chandigarh", "Dessert", "Sweet Lassi", 5, 0, BOWL,
        ["Yogurt", "Sugar", "Cardamom"],
        ["Blend."], "")
    add("chandigarh", "Salad", "Sprouted Moong Chaat", 10, 0, BOWL,
        ["Sprouts", "Tomato", "Lemon", "Chaat masala", "Coriander"],
        ["Toss. No onion."], "")

    # ----- 31 Dadra Daman -----
    add("dadra-daman", "Starter", "Khaman", 20, 15, STEAM,
        "Gujarati khaman of the UT.",
        ["Besan batter", "Eno", "Mustard-sesame temper"],
        ["Steam in steel, temper."])
    add("dadra-daman", "Main", "Coconut Caldin (veg)", 15, 25, S,
        "Indo-Portuguese coconut curry, vegetarian, no garlic. Kokum and pepper.",
        ["4 cups veg (pumpkin, beans, cauliflower)", "1½ cups coconut milk", "Turmeric", "Pepper",
         "Cumin", "Kokum", "Curry leaves", "Hing", "Salt", "Coconut oil"],
        ["Temper, add veg and spices, coconut milk, kokum. Simmer until the veg is coated."])
    add("dadra-daman", "Side", "Undhiyu-Style Mixed Veg", 20, 30, S,
        ["Papdi, brinjal, potato, banana", "Coconut-coriander stuffing", "Ajwain", "Hing"],
        ["Cook covered until soft."], "Gujarati winter veg of the UT.")
    add("dadra-daman", "Bread", "Thepla", 20, 20, TAWA,
        ["Atta", "Methi", "Turmeric", "Yogurt", "Ginger-chilli"],
        ["Roll thin, cook on iron."], "")
    add("dadra-daman", "Sweet", "Bebinca Slices", 20, 50, "Steel baking dish",
        ["Coconut milk", "Maida", "Jaggery", "Ghee"],
        ["Layer-bake in steel."], "")
    add("dadra-daman", "Dessert", "Shrikhand", 10, 0, BOWL,
        ["Hung yogurt", "Sugar", "Saffron"],
        ["Whisk, chill."], "")
    add("dadra-daman", "Salad", "Kachumber without Onion", 6, 0, BOWL,
        ["Cucumber", "Tomato", "Lemon", "Cumin"],
        ["Toss."], "")

    # ----- 32 Delhi -----
    add("delhi", "Starter", "Aloo Tikki Chaat (no onion)", 20, 15, TAWA,
        "Delhi chaat minus raw onion. Yogurt, chutneys, sev.",
        ["Aloo tikki", "Yogurt", "Tamarind chutney (no garlic)", "Mint chutney (no onion garlic)",
         "Sev", "Pomegranate", "Chaat masala"],
        ["Fry tikki on iron. Top with yogurt, chutneys, sev, pomegranate. No pyaz."])
    add("delhi", "Main", "Chole Bhature Gravy (sattvic)", 15, 35, S,
        "Delhi chole without onion-garlic paste. Tomato, tea, anardana, ginger.",
        ["Chickpeas", "Tomato-ginger paste", "Chole masala garlic-free", "Tea bag", "Amchur", "Cumin", "Hing"],
        ["Cook a thick dark gravy. Serve with bhature."])
    add("delhi", "Side", "Punjabi Dal Tadka", 10, 30, S,
        ["Toor or moong dal", "Tomato", "Cumin", "Hing", "Ghee", "Chilli"],
        ["Simmer, tadka."], "")
    add("delhi", "Bread", "Bhature", 70, 15, FRY,
        "Fermented fried bread of Delhi chole.",
        ["2 cups maida", "½ cup yogurt", "½ tsp baking powder", "Salt", "Oil"],
        ["Rest 1 hour. Roll, fry in a steel kadhai until they balloon."])
    add("delhi", "Sweet", "Old Delhi Jalebi", 20, 20, FRY,
        "Fermented batter spirals in saffron syrup.",
        ["1 cup maida", "Yogurt 2 tbsp", "Pinch of baking soda", "Sugar syrup with saffron and cardamom", "Ghee or oil"],
        ["Ferment batter. Pipe spirals into hot fat. Soak in warm syrup. Steel syrup pan."])
    add("delhi", "Dessert", "Rabri Falooda", 15, 20, MILK,
        "Rabri with falooda sev and rose.",
        ["Rabri", "Falooda sev", "Rose syrup (check: no weird allium)", "Nuts"],
        ["Layer in a glass. No onion. Obviously."])
    add("delhi", "Salad", "Chaat Salad without Onion", 10, 0, BOWL,
        "Cucumber, tomato, pomegranate, boiled potato, chutney, sev.",
        ["Cucumber", "Tomato", "Potato", "Pomegranate", "Mint-tamarind chutney", "Sev", "Lemon"],
        ["Toss. The crunch is sev, not onion."])

    # ----- 33 Jammu and Kashmir -----
    add("jammu-kashmir", "Starter", "Nadru Chips", 15, 15, FRY,
        "Lotus-stem chips of Kashmir.",
        ["2 lotus stems, sliced thin", "Salt", "Chilli powder", "Oil"],
        ["Soak slices in water. Drain, dry, fry in steel. Salt and chilli."])
    add("jammu-kashmir", "Main", "Kashmiri Dum Aloo", 20, 40, S,
        "Kashmiri Pandit dum aloo: yogurt, fennel, ginger, Kashmiri chilli — no onion, no garlic.",
        ["12 baby potatoes, peeled, fried", "1 cup yogurt", "1 tsp saunf (fennel) powder", "1 tsp dry ginger",
         "1 tsp Kashmiri chilli", "½ tsp turmeric", "4 cloves", "1-inch cinnamon", "Ghee", "Salt"],
        ["Fry whole spices in ghee. Lower heat, add yogurt and powders, stir until oil shows.",
         "Add potatoes and a little water. Cover, dum 15 minutes.",
         "Pandit kitchens do not use onion or garlic. Do not add them."])
    add("jammu-kashmir", "Side", "Monje Haak", 10, 20, S,
        "Kashmiri kohlrabi greens in light ginger-asafoetida broth.",
        ["1 kohlrabi with greens, sliced", "1 tsp dry ginger", "Pinch of hing", "2 dry red chillies",
         "Mustard oil 1 tbsp", "Salt"],
        ["Heat oil, chilli, hing. Add haak, ginger, salt, water. Simmer until the stem is tender."])
    add("jammu-kashmir", "Bread", "Plain Roti / Rice", 15, 15, TAWA,
        "Roti for Jammu; rice for Kashmiri pandit thali.",
        ["Atta roti on iron tawa, or steamed rice"],
        ["Cook roti on iron, or steam rice in steel."])
    add("jammu-kashmir", "Sweet", "Roth", 20, 25, TAWA,
        "Kashmiri sweet bread for festivals.",
        ["2 cups atta", "½ cup sugar", "4 tbsp ghee", "Fennel", "Cardamom", "Milk to bind"],
        ["Knead, roll thick ovals, cook on iron tawa on low until cooked through. Optional ghee finish."])
    add("jammu-kashmir", "Dessert", "Phirni", 20, 25, S,
        "Kashmiri ground-rice pudding with saffron.",
        ["Ground rice", "Milk", "Sugar", "Saffron", "Cardamom", "Almonds"],
        ["Cook in steel. Set in bowls. Chill."])
    add("jammu-kashmir", "Salad", "Muj Chetin", 10, 0, BOWL,
        "Kashmiri radish chutney-salad with yogurt. No onion.",
        ["1 radish, grated", "½ cup yogurt", "Dry mint", "Salt", "Chilli pinch"],
        ["Mix. Rest 10 minutes."])

    # ----- 34 Ladakh -----
    add("ladakh", "Starter", "Ladakhi Veg Momos", 30, 15, STEAM,
        "Cabbage-ginger momos of Leh.",
        ["Maida", "Cabbage, carrot, ginger filling"],
        ["Steam in steel. Chilli-tomato dip without garlic."])
    add("ladakh", "Main", "Veg Skyu", 20, 35, S,
        "Thumb-pressed wheat pasta stew. Vegetable skyu: root veg, ginger — no meat, no allium.",
        ["1½ cups atta dough, pinched into skyu shapes", "2 potatoes", "1 turnip or carrot",
         "1 tsp ginger", "Green chilli", "Salt", "1 tbsp oil"],
        ["Simmer veg and ginger in water. Add skyu pieces. Cook until the pasta is soft and the stew is thick."])
    add("ladakh", "Side", "Gur-Gur Butter Tea Vegetables", 10, 15, S,
        "Plain boiled root veg with salt and a knob of butter — high-altitude side.",
        ["Mixed root veg", "Salt", "Butter"],
        ["Boil until soft. Butter and salt. No onion."])
    add("ladakh", "Bread", "Tingmo", 80, 15, STEAM,
        "Tibetan-Ladakhi steamed folded bread.",
        ["2 cups atta", "Yeast ½ tsp", "Sugar 1 tsp", "Salt", "Water"],
        ["Ferment 1 hour. Roll, brush oil, fold, cut, steam 12 minutes in steel."])
    add("ladakh", "Sweet", "Dried Apricot Compote", 10, 20, S,
        "Ladakh grows apricots. Stew them with a little sugar.",
        ["200 g dried apricots", "Water", "2 tbsp sugar", "Cardamom"],
        ["Stew in steel until syrupy."])
    add("ladakh", "Dessert", "Barley Milk Kheer", 10, 30, MILK,
        "Tsampa or cracked barley in milk.",
        ["⅓ cup cracked barley or tsampa", "3 cups milk", "Sugar", "Cardamom"],
        ["Simmer in steel."])
    add("ladakh", "Salad", "Cucumber Chilli Salad", 6, 0, BOWL,
        ["Cucumber", "Chilli", "Lemon", "Salt"],
        ["Toss. No onion."], "")

    # ----- 35 Lakshadweep -----
    add("lakshadweep", "Starter", "Coconut Fritters", 10, 15, FRY,
        "Fresh coconut and rice-flour fritters.",
        ["1 cup coconut", "½ cup rice flour", "Green chilli", "Salt", "Oil"],
        ["Mix, fry in steel."])
    add("lakshadweep", "Main", "Coconut Milk Vegetable Curry", 15, 25, S,
        "Atoll curry: coconut milk, curry leaves, kokum. Skip fish; skip alliums.",
        ["Tropical veg", "Coconut milk", "Turmeric", "Curry leaves", "Mustard", "Hing", "Kokum", "Coconut oil", "Salt"],
        ["Temper, simmer veg in coconut milk. Kokum for sour."])
    add("lakshadweep", "Side", "Drumstick Thoran", 10, 15, S,
        ["Drumsticks or beans", "Coconut", "Mustard", "Curry leaves", "Salt"],
        ["Stir-fry."], "")
    add("lakshadweep", "Bread", "Pathiri", 20, 15, TAWA,
        "Soft rice-flour flatbread of the islands and Malabar.",
        ["2 cups rice flour", "Hot water", "Salt"],
        ["Scald flour, knead, roll thin, cook on iron tawa without browning too hard."])
    add("lakshadweep", "Sweet", "Coconut Barfi", 10, 20, S,
        ["Coconut", "Sugar", "Cardamom", "Ghee"],
        ["Cook, set in steel tray, cut."], "")
    add("lakshadweep", "Dessert", "Coconut Payasam", 5, 20, S,
        ["Rice or ada", "Coconut milk", "Jaggery", "Cardamom"],
        ["Cook in steel."], "")
    add("lakshadweep", "Salad", "Cucumber Coconut Salad", 6, 0, BOWL,
        ["Cucumber", "Coconut", "Lemon", "Salt", "Green chilli"],
        ["Toss."], "")

    # ----- 36 Puducherry -----
    add("puducherry", "Starter", "Medu Vada", 20, 15, FRY,
        "Tamil vada of Pondicherry breakfasts, no onion.",
        ["Urad dal", "Pepper", "Ginger", "Curry leaves", "Hing", "Oil"],
        ["Grind, fry rings in steel."])
    add("puducherry", "Main", "Coconut Vegetable Stew", 15, 25, S,
        "Franco-Tamil stew: coconut milk, pepper, ginger, curry leaves — no onion, no garlic.",
        ["4 cups veg (potato, carrot, beans, cauliflower)", "1½ cups thin coconut milk + ½ cup thick",
         "1 tsp ginger", "8 peppercorns", "Curry leaves", "Pinch of hing", "Coconut oil", "Salt"],
        ["Simmer veg in thin coconut milk with ginger, pepper, salt.",
         "Add thick coconut milk and curry-leaf hing tadka. Do not boil hard.",
         "French-Tamil home stew without mirepoix alliums."])
    add("puducherry", "Side", "Beans Coconut Poriyal", 10, 12, S,
        ["Beans", "Coconut", "Mustard", "Urad", "Curry leaves"],
        ["Temper, cook, coconut."], "")
    add("puducherry", "Bread", "Appam or Idli", 70, 15, TAWA,
        "Lace appam or idli to eat with stew.",
        ["Rice-coconut appam batter or idli batter"],
        ["Cook appam in iron pan, or steam idli in steel."])
    add("puducherry", "Sweet", "Coconut Macaroon (eggless)", 15, 20, "Steel or ceramic tray",
        "Pondicherry bakery coconut kisses, eggless: coconut, condensed milk, cardamom.",
        ["2 cups coconut", "½ cup condensed milk", "Cardamom"],
        ["Mix, mound on a steel tray, bake 160°C until the edges brown."])
    add("puducherry", "Dessert", "Payasam", 10, 25, S,
        ["Moong or vermicelli", "Milk or coconut milk", "Jaggery", "Cardamom", "Cashews"],
        ["Cook in steel."], "")
    add("puducherry", "Salad", "Tomato Cucumber Salad", 6, 0, BOWL,
        ["Tomato", "Cucumber", "Lemon", "Salt", "Coriander"],
        ["Toss. No onion."], "")
