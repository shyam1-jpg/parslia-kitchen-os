"""Remaining Indian state recipes (Bihar through West Bengal)."""

from __future__ import annotations


def extend_states(add, S, STEAM, TAWA, FRY, MILK, BOWL, CLAY, GRILL):
    # ----- 04 Bihar -----
    add("bihar", "Starter", "Baked Sattu Litti Balls", 25, 30, GRILL,
        "The stuffed sattu ball of Bihar, roasted instead of coal-baked. Filling has no onion.",
        ["2 cups atta", "1 cup sattu (roasted gram flour)", "1 tsp ginger-chilli paste",
         "½ tsp ajwain", "1 tsp mustard oil", "½ tsp amchur", "Salt", "Pickle masala ½ tsp"],
        ["Mix sattu with ginger-chilli, ajwain, mustard oil, amchur, pickle masala and salt. It should clump.",
         "Make atta dough. Stuff, seal into balls.",
         "Roast on a steel tray or iron tawa, turning, until charred spots appear. Dip in ghee."])
    add("bihar", "Main", "Litti with Tomato Baingan Chokha", 15, 20, GRILL,
        "Fire-roasted mash served with litti. Skip onion; keep mustard oil and chilli.",
        ["2 brinjals", "2 tomatoes", "1 boiled potato", "1 tbsp mustard oil",
         "2 green chillies", "Salt", "Coriander"],
        ["Roast brinjal and tomato on flame or iron until collapsed. Peel.",
         "Mash with potato, mustard oil, chilli and salt.",
         "Coriander. Serve with litti. Do not add chopped onion."])
    add("bihar", "Side", "Kadhi Bari", 15, 30, S,
        "Gram-flour dumplings in yogurt kadhi — Mithila favourite.",
        ["½ cup besan (for bari)", "1 cup yogurt", "2 tbsp besan (for kadhi)", "¼ tsp turmeric",
         "1 tsp cumin", "Pinch of hing", "2 green chillies", "Salt", "1 tbsp ghee"],
        ["Mix thick besan dough, shape small baris, fry or boil until cooked.",
         "Whisk yogurt, 2 tbsp besan, turmeric and water. Simmer in steel, stirring.",
         "Add baris. Tadka of ghee, cumin, hing, chilli."])
    add("bihar", "Bread", "Sattu Paratha", 20, 20, TAWA,
        "Everyday stuffed paratha of Bihar.",
        ["2 cups atta", "1 cup sattu filling as for litti", "Ghee"],
        ["Stuff atta rounds with sattu mix. Roll gently. Cook on iron tawa with ghee."])
    add("bihar", "Sweet", "Thekua", 20, 20, FRY,
        "Chhath festival wheat-jaggery cookie.",
        ["2 cups atta", "¾ cup jaggery, melted", "4 tbsp ghee", "½ tsp cardamom", "Fennel ½ tsp", "Oil or ghee to fry"],
        ["Mix atta, jaggery, ghee, cardamom and fennel to a stiff dough.",
         "Press in a mould or pat discs. Fry on low-medium until brown."])
    add("bihar", "Dessert", "Lai Kheer", 10, 35, MILK,
        "Puffed-rice kheer for festivals.",
        ["2 cups milk", "1 cup lai (puffed rice)", "⅓ cup sugar or jaggery", "Cardamom", "Raisins"],
        ["Simmer milk in steel 10 minutes. Add lai, sweetener, cardamom. Cook 8 minutes."])
    add("bihar", "Salad", "Tomato Cucumber Chokha Salad", 8, 0, BOWL,
        "Raw salad next to litti when you do not want another mash.",
        ["2 tomatoes", "1 cucumber", "Green chilli", "Lemon", "Salt", "Mustard oil ½ tsp"],
        ["Dice and toss. No onion."])

    # ----- 05 Chhattisgarh -----
    add("chhattisgarh", "Starter", "Chila", 10, 15, TAWA,
        "Rice-flour savoury pancake of Chhattisgarh.",
        ["1 cup rice flour", "¼ cup yogurt", "1 tsp ginger-chilli", "Pinch of hing", "Salt", "Water", "Oil"],
        ["Mix a pouring batter. Rest 10 minutes.",
         "Spread on a hot iron tawa. Cook both sides with a little oil."])
    add("chhattisgarh", "Main", "Bafauri", 15, 20, STEAM,
        "Steamed chana-dal dumplings — the protein main of village Chhattisgarh.",
        ["1 cup chana dal, soaked 2 hours", "1 tsp ginger-chilli", "½ tsp cumin", "Pinch of hing",
         "¼ tsp turmeric", "Salt", "Coriander"],
        ["Grind dal coarsely with spices. Shape logs or balls.",
         "Steam 12–15 minutes in a steel steamer.",
         "Temper optional: oil, cumin, hing, curry leaves. Pour over."])
    add("chhattisgarh", "Side", "Farra", 15, 20, STEAM,
        "Rice-flour stuffed steam cakes.",
        ["1 cup rice flour", "Hot water", "Salt", "Filling: ½ cup spiced chana dal paste as bafauri"],
        ["Scald rice flour with hot salted water to a dough.",
         "Flatten, fill, seal. Steam 12 minutes."])
    add("chhattisgarh", "Bread", "Angakar Roti", 15, 15, TAWA,
        "Thick rice roti cooked on iron.",
        ["2 cups rice flour", "Hot water", "Salt"],
        ["Make a soft dough with hot water. Pat thick rotis. Cook on iron tawa until brown spots."])
    add("chhattisgarh", "Sweet", "Dehrori", 20, 25, FRY,
        "Rice-flour dumplings soaked in thickened milk.",
        ["1 cup rice flour", "Milk to bind", "3 cups milk", "⅓ cup sugar", "Cardamom", "Ghee for frying"],
        ["Shape rice-flour balls. Fry golden in ghee.",
         "Simmer milk and sugar in steel until slightly thick. Soak dehrori 20 minutes."])
    add("chhattisgarh", "Dessert", "Red Rice Kheer", 10, 40, MILK,
        "Local red rice cooked down in milk.",
        ["¼ cup red or white rice", "1 litre milk", "⅓ cup jaggery", "Cardamom"],
        ["Simmer in steel until creamy. Jaggery off the boil."])
    add("chhattisgarh", "Salad", "Tomato Lemon Salad", 8, 0, BOWL,
        ["2 tomatoes", "Green chilli", "Lemon", "Salt", "Coriander"],
        ["Chop and toss. No onion."], "")

    # ----- 06 Goa -----
    add("goa", "Starter", "Coconut Cucumber Cutlets", 15, 15, FRY,
        "Goan vegetarian starter with coconut and chilli, no allium.",
        ["1 cup grated coconut", "1 cucumber, grated and squeezed", "2 tbsp besan",
         "1 tsp ginger-chilli", "Pinch of hing", "Salt", "Oil"],
        ["Mix, shape small cutlets, pan-fry on iron or steel until brown."])
    add("goa", "Main", "Khatkhate", 15, 30, S,
        "Goan Hindu mixed-vegetable coconut stew — festival main, traditionally no onion garlic.",
        ["4 cups mixed veg (pumpkin, beans, colocation, cucumber, brinjal)", "1 cup coconut, ground with 2 dry red chillies and ½ tsp turmeric",
         "1 tsp mustard seeds", "Pinch of hing", "8 curry leaves", "1 tbsp tamarind", "Salt", "1 tbsp coconut oil"],
        ["Cook vegetables with salt and tamarind until just tender.",
         "Add coconut paste. Simmer 5 minutes.",
         "Temper coconut oil with mustard, hing and curry leaves."])
    add("goa", "Side", "Alsande Tondak (no garlic)", 10, 25, S,
        "Yard-long beans in coconut. Classic tondak uses garlic — hing and kokum replace it.",
        ["3 cups alsande or French beans", "1 cup coconut paste", "3 kokum petals",
         "1 tsp coriander powder", "½ tsp chilli powder", "Pinch of hing", "Salt", "1 tbsp oil"],
        ["Cook beans with kokum and salt.",
         "Add coconut, spices and hing. Simmer until thick and coating."])
    add("goa", "Bread", "Sannas", 70, 15, STEAM,
        "Steamed rice cakes of Goa, slightly sweet-sour from toddy or yeast.",
        ["2 cups rice, soaked", "½ cup coconut", "½ tsp yeast or ¼ cup toddy", "1 tsp sugar", "Salt"],
        ["Grind rice and coconut. Ferment 1 hour with yeast and sugar.",
         "Pour into steel idli moulds. Steam 12 minutes. Never an aluminium steamer."])
    add("goa", "Sweet", "Bebinca (home slab)", 20, 50, "Steel or enamel baking dish — never aluminium",
        "Layered coconut-jaggery bake. Use a steel tin.",
        ["2 cups coconut milk", "1 cup maida", "1 cup jaggery or sugar", "6 yolks optional — skip for eggless: use 3 tbsp extra coconut cream",
         "½ tsp nutmeg", "Ghee for layering"],
        ["Mix a pouring batter. Heat a steel tin with ghee.",
         "Bake or stovetop-grill thin layers, ghee between each, until 6–8 layers.",
         "Cool and slice. Eggless version is fully vegetarian."])
    add("goa", "Dessert", "Coconut Payasam", 5, 20, S,
        "Goan Hindu payas with coconut milk.",
        ["½ cup roasted vermicelli or ¼ cup rice", "2 cups coconut milk", "⅓ cup jaggery", "Cardamom", "Cashews in ghee"],
        ["Cook vermicelli in a little water, add coconut milk and jaggery. Cardamom, cashews."])
    add("goa", "Salad", "Kokum Cucumber Salad", 8, 0, BOWL,
        "Kokum syrup, cucumber, chilli — Goan bite without onion.",
        ["1 cucumber", "4 kokum petals soaked", "Green chilli", "Salt", "Pinch of sugar", "Coriander"],
        ["Toss cucumber with kokum water, chilli, salt and sugar."])

    # ----- 07 Gujarat -----
    add("gujarat", "Starter", "Khaman Dhokla", 20, 15, STEAM,
        "Gujarati steamed gram cake — already onion-garlic free.",
        ["1½ cups besan", "2 tbsp sooji", "1 tsp ginger-chilli paste", "1 tsp sugar", "½ tsp turmeric",
         "1 tbsp lemon", "1 tsp Eno", "Mustard-sesame-curry-leaf temper", "Coconut", "Coriander"],
        ["Mix batter, add Eno, steam 12 minutes in steel.",
         "Temper and pour sweet-sour water. Coconut and coriander."])
    add("gujarat", "Main", "Undhiyu (no onion)", 25, 40, S,
        "Surti winter mixed veg. Jain/sattvic undhiyu skips onion garlic.",
        ["2 cups mixed: surti papdi, candied beans, brinjal, banana, yam, peas",
         "Muthiya: ½ cup besan + methi + ginger-chilli + ajwain, steamed or fried",
         "1 tsp ajwain", "Pinch of hing", "½ tsp turmeric", "1 tsp coriander-cumin powder",
         "½ cup grated coconut", "2 tbsp oil", "Salt", "Sugar pinch", "Lemon"],
        ["Temper ajwain and hing. Add vegetables, spices, salt and a splash of water. Cover 20 minutes.",
         "Tuck in muthiya. Coconut and lemon at the end.",
         "Do not add onion — coconut, methi and ajwain are the flavour."])
    add("gujarat", "Side", "Ringan no Olo", 10, 20, GRILL,
        "Charred brinjal mash with green chilli — Kathiawad, no onion.",
        ["2 large brinjals", "2 green chillies", "1 tbsp oil", "Salt", "Coriander", "Lemon"],
        ["Roast brinjal on flame. Peel, mash with chilli, oil, salt, lemon, coriander."])
    add("gujarat", "Bread", "Methi Thepla", 20, 20, TAWA,
        "Travel roti of Gujarat.",
        ["2 cups atta", "1 cup methi", "½ tsp turmeric", "1 tsp ginger-chilli", "2 tbsp yogurt", "Salt", "Oil"],
        ["Knead, roll thin, cook on iron tawa with oil until speckled."])
    add("gujarat", "Sweet", "Mohanthal", 15, 30, S,
        "Gram-flour ghee fudge.",
        ["2 cups besan", "1 cup ghee", "1¼ cups sugar", "⅓ cup water", "Cardamom", "Pistachios"],
        ["Roast besan in ghee until nutty. Add one-thread syrup, cardamom. Set in a steel tray."])
    add("gujarat", "Dessert", "Kesar Shrikhand", 10, 0, BOWL,
        "Hung-yogurt dessert of Gujarati feasts.",
        ["500 g hung yogurt", "⅓ cup powdered sugar", "Saffron", "Cardamom", "Pistachios"],
        ["Whisk, chill 2 hours."])
    add("gujarat", "Salad", "Kachumber without Onion", 8, 0, BOWL,
        "Cucumber, tomato, raw mango, lemon, roasted cumin.",
        ["1 cucumber", "2 tomatoes", "½ raw mango", "Lemon", "Cumin", "Salt", "Coriander"],
        ["Dice and toss. Mango replaces onion bite."])

    # ----- 08 Haryana -----
    add("haryana", "Starter", "Bajra Pakora", 10, 15, FRY,
        "Pearl-millet fritters of the Haryana winter.",
        ["1 cup bajra flour", "¼ cup atta", "1 tsp ginger-chilli", "Pinch of hing", "Salt", "Water", "Oil"],
        ["Mix a thick batter. Fry spoonfuls in a steel kadhai."])
    add("haryana", "Main", "Kadhi Pakora", 15, 35, S,
        "Haryanvi yogurt kadhi with besan pakoras — hing tadka, no onion garlic.",
        ["1½ cups yogurt", "4 tbsp besan", "¼ tsp turmeric", "Pakoras: ½ cup besan + ajwain + chilli + water, fried",
         "1 tsp cumin", "Pinch of hing", "2 dry chillies", "1 tbsp ghee", "Salt"],
        ["Whisk yogurt, besan, turmeric and water. Simmer 15 minutes in steel, stirring.",
         "Add pakoras. Tadka: ghee, cumin, hing, chilli."])
    add("haryana", "Side", "Bathua Sabzi", 10, 15, S,
        "Chenopodium greens of Haryana winters.",
        ["4 cups bathua leaves", "1 tsp cumin", "Pinch of hing", "1 tsp ginger", "¼ tsp turmeric", "Salt", "1 tbsp ghee"],
        ["Temper cumin, hing, ginger. Add bathua, turmeric, salt. Cover 8 minutes. Mash slightly."])
    add("haryana", "Bread", "Bajra Roti", 15, 15, TAWA,
        "Pearl-millet roti eaten with kadhi and ghee.",
        ["2 cups bajra flour", "Hot water", "Salt", "Ghee"],
        ["Knead with hot water. Pat with wet hands. Cook on iron tawa. Smear ghee."])
    add("haryana", "Sweet", "Atta Pinni", 15, 25, S,
        "Wheat-ghee-jaggery laddoo of North Indian winters.",
        ["2 cups atta", "¾ cup ghee", "¾ cup jaggery", "Cardamom", "Almonds"],
        ["Roast atta in ghee until brown. Mix jaggery and cardamom. Shape pinnis."])
    add("haryana", "Dessert", "Chilled Lassi", 5, 0, BOWL,
        "Sweet yogurt drink as dessert.",
        ["2 cups yogurt", "½ cup water or milk", "3 tbsp sugar", "Cardamom", "Ice"],
        ["Blend. Serve in steel glasses."])
    add("haryana", "Salad", "Cucumber Raita Salad", 8, 0, BOWL,
        "Cucumber in thin yogurt, roasted cumin, no onion.",
        ["1 cucumber, diced", "1 cup yogurt", "Cumin", "Salt", "Coriander"],
        ["Mix. Chill."])

    # ----- 09 Himachal Pradesh -----
    add("himachal-pradesh", "Starter", "Siddu (small)", 80, 20, STEAM,
        "Himachali stuffed steamed bread, served as a starter with ghee-dal.",
        ["2 cups atta", "Yeast ½ tsp + 1 tsp sugar", "Filling: ½ cup roasted walnut or poppy paste + ginger-chilli + salt"],
        ["Ferment dough 1 hour. Fill, shape ovals. Steam 15 minutes in steel. Serve with ghee."])
    add("himachal-pradesh", "Main", "Chana Madra", 15, 40, CLAY,
        "Yogurt-chickpea curry of Himachali dham — traditionally no onion garlic.",
        ["2 cups cooked chickpeas", "1½ cups yogurt, whisked", "2 tbsp ghee", "4 cloves", "1-inch cinnamon",
         "4 cardamom", "1 tsp coriander powder", "½ tsp turmeric", "½ tsp garam masala", "Pinch of hing", "Salt"],
        ["Heat ghee, whole spices, hing. Lower heat, stir in yogurt and dry spices until it does not split.",
         "Add chickpeas and a little water. Simmer 15 minutes until the gravy is creamy.",
         "This is temple food — do not add onion or garlic."])
    add("himachal-pradesh", "Side", "Sepu Vadi", 20, 30, S,
        "Urad-dal dumplings in spinach-yogurt gravy, dham side.",
        ["1 cup urad dal, soaked, ground, steamed as cakes, cubed", "2 cups spinach puree",
         "½ cup yogurt", "1 tsp cumin", "Pinch of hing", "Ginger", "Salt"],
        ["Fry vadi cubes lightly. Make a gravy of spinach, yogurt, cumin, hing, ginger.",
         "Simmer vadis 8 minutes."])
    add("himachal-pradesh", "Bread", "Siddu", 80, 20, STEAM,
        "The steamed bread of Kullu and Shimla, eaten with ghee.",
        ["2 cups atta", "½ tsp yeast", "1 tsp sugar", "Salt", "Walnut-poppy filling as above"],
        ["Same method as the starter, made larger for the meal."])
    add("himachal-pradesh", "Sweet", "Mittha", 10, 25, S,
        "Sweet rice of Himachali dham with raisins and dry fruit.",
        ["1 cup basmati", "2 tbsp ghee", "⅓ cup sugar", "Raisins", "Cashews", "Cardamom", "Saffron"],
        ["Fry nuts in ghee. Add soaked rice, water 2 cups, cook. Sugar, saffron, cardamom."])
    add("himachal-pradesh", "Dessert", "Sweet Madra Kheer", 10, 30, MILK,
        "Milk-rice dessert after dham.",
        ["¼ cup rice", "1 litre milk", "Sugar", "Cardamom", "Saffron"],
        ["Simmer in steel until thick."])
    add("himachal-pradesh", "Salad", "Cucumber Mint Salad", 8, 0, BOWL,
        ["1 cucumber", "Mint", "Lemon", "Salt", "Roasted cumin"],
        ["Toss. No onion."], "")

    # ----- 10 Jharkhand -----
    add("jharkhand", "Starter", "Dhuska", 20, 15, FRY,
        "Rice-chana dal fritters of Ranchi.",
        ["1 cup rice, soaked", "½ cup chana dal, soaked", "1 tsp ginger-chilli", "Pinch of hing", "Salt", "Oil"],
        ["Grind to a thick batter. Fry small pancakes in a steel kadhai until crisp."])
    add("jharkhand", "Main", "Rugra Mushroom Curry", 15, 20, S,
        "Wild monsoon mushroom of Jharkhand in a tomato-ginger gravy.",
        ["300 g rugra or button mushrooms", "2 tomatoes", "1 tsp ginger", "Pinch of hing",
         "½ tsp turmeric", "1 tsp coriander", "½ tsp chilli", "2 tbsp mustard oil", "Salt"],
        ["Heat mustard oil, hing, ginger, tomato and spices until thick.",
         "Add mushrooms. Cook 10 minutes. No onion."])
    add("jharkhand", "Side", "Palak and Bathua Sag", 10, 15, S,
        "Mixed greens of the plateau.",
        ["4 cups mixed greens", "1 tsp mustard seeds", "Pinch of hing", "Green chilli", "Salt", "Mustard oil"],
        ["Temper, add greens, cover until wilted. Mash slightly."])
    add("jharkhand", "Bread", "Soft Roti with Dhuska", 15, 15, TAWA,
        "Wheat roti to eat with rugra, plus leftover dhuska on the side.",
        ["2 cups atta", "Water", "Salt", "Ghee"],
        ["Knead, roll, cook on iron tawa. Ghee."])
    add("jharkhand", "Sweet", "Arsa", 30, 20, FRY,
        "Rice-jaggery fried sweet of Jharkhand and Chhattisgarh.",
        ["2 cups rice flour", "1 cup jaggery syrup", "Sesame", "Oil"],
        ["Bind flour with warm jaggery syrup. Pat discs, sprinkle sesame, fry on medium."])
    add("jharkhand", "Dessert", "Thekua Milk Soak", 10, 15, MILK,
        "Broken thekua in warm sweet milk.",
        ["6 thekua, crumbled", "3 cups milk", "Sugar", "Cardamom"],
        ["Warm milk with sugar and cardamom. Pour over thekua."])
    add("jharkhand", "Salad", "Tomato Chilli Salad", 6, 0, BOWL,
        ["2 tomatoes", "Green chilli", "Lemon", "Salt", "Coriander"],
        ["Chop, toss, no onion."], "")

    # ----- 11 Karnataka -----
    add("karnataka", "Starter", "Maddur Vada", 20, 15, FRY,
        "Rice-flour vada of Maddur. Skip onion; use curry leaf, coconut, chilli.",
        ["1 cup rice flour", "2 tbsp atta", "2 tbsp sooji", "2 tbsp grated coconut",
         "1 tsp ginger-chilli", "8 curry leaves", "Pinch of hing", "Salt", "Oil"],
        ["Mix a stiff dough with hot water. Flatten thin vadas. Fry crisp."])
    add("karnataka", "Main", "Bisi Bele Bath", 20, 40, CLAY,
        "Udupi-Mysuru hot lentil-rice. Use bisi bele bath powder without garlic.",
        ["¾ cup rice", "⅓ cup toor dal", "2 cups mixed veg (beans, carrot, peas, capsicum)",
         "2 tbsp bisi bele bath powder (garlic-free)", "2 tbsp tamarind", "½ tsp turmeric",
         "1 tbsp ghee", "Mustard, curry leaves, hing, cashews", "Salt", "Jaggery pinch"],
        ["Cook rice and dal soft. Cook veg separately.",
         "Simmer tamarind, powder, turmeric, salt, jaggery. Mix rice, dal, veg. Loose, hot, ghee tadka.",
         "Udupi temples never use onion or garlic in this dish."])
    add("karnataka", "Side", "Beans Palya", 10, 12, S,
        "Dry beans coconut stir-fry.",
        ["3 cups chopped beans", "2 tbsp coconut", "Mustard, urad dal, curry leaves, hing", "Turmeric", "Salt", "Coconut oil"],
        ["Temper, add beans, turmeric, salt, splash of water. Cover 8 minutes. Coconut."])
    add("karnataka", "Bread", "Ragi Roti", 15, 15, TAWA,
        "Finger-millet roti of South Karnataka.",
        ["2 cups ragi flour", "Hot water", "1 tsp ginger-chilli", "Coriander", "Salt", "Oil"],
        ["Knead, pat on banana leaf or wet cloth onto iron tawa. Cook both sides."])
    add("karnataka", "Sweet", "Mysore Pak", 10, 20, S,
        "Ghee-besan-sugar fudge of Mysuru.",
        ["1 cup besan", "1 cup ghee", "1½ cups sugar", "½ cup water"],
        ["Make syrup. Add roasted-with-ghee besan. Cook until it pores. Pour into a greased steel tray."])
    add("karnataka", "Dessert", "Moong Dal Payasa", 10, 30, S,
        "Karnataka dessert of fried moong in coconut milk.",
        ["½ cup moong dal, dry roasted", "2 cups coconut milk", "⅓ cup jaggery", "Cardamom", "Cashews in ghee"],
        ["Cook moong soft. Add jaggery, coconut milk, cardamom. Do not boil hard."])
    add("karnataka", "Salad", "Moong Kosambari", 30, 2, BOWL,
        "Festival salad of Karnataka — already sattvic.",
        ["¼ cup split moong, soaked", "Cucumber", "Coconut", "Lemon", "Mustard-hing-curry-leaf tadka", "Salt"],
        ["Mix, temper, toss."])

    # ----- 12 Kerala -----
    add("kerala", "Starter", "Pazham Pori", 10, 15, FRY,
        "Ripe-plantain fritters of Kerala tea time.",
        ["2 ripe nendran or plantains", "1 cup maida", "2 tbsp rice flour", "1 tsp sugar", "Pinch of turmeric", "Salt", "Oil"],
        ["Batter the slices. Fry in a steel kadhai until golden."])
    add("kerala", "Main", "Avial", 20, 25, S,
        "Sadya mixed veg in coconut-yogurt. The definition of onion-garlic-free Kerala food.",
        ["5 cups mixed veg (yam, ash gourd, carrot, beans, drumstick, raw banana)",
         "1 cup coconut ground with cumin and green chilli", "½ cup yogurt", "Curry leaves", "Coconut oil", "Salt", "Turmeric"],
        ["Cook vegetables with turmeric and salt until just done, little water.",
         "Add coconut paste. Fold yogurt off the boil. Coconut oil and curry leaves.",
         "Never add onion or garlic to avial."])
    add("kerala", "Side", "Cabbage Thoran", 10, 12, S,
        "Coconut stir-fry of the sadya.",
        ["4 cups shredded cabbage", "½ cup coconut", "Mustard, urad, curry leaves, hing, green chilli", "Turmeric", "Coconut oil", "Salt"],
        ["Temper, add cabbage, turmeric, salt. Cover 6 minutes. Mix coconut."])
    add("kerala", "Bread", "Appam", 70, 20, TAWA,
        "Lacy coconut rice pancake. Use a cast-iron appam kadai, not aluminium.",
        ["2 cups rice, soaked", "½ cup coconut", "½ tsp yeast or toddy", "1 tsp sugar", "Salt"],
        ["Grind, ferment. Pour into a hot iron appam pan, swirl. Cover 1 minute. Soft centre, crisp lace."])
    add("kerala", "Sweet", "Unniyappam", 20, 20, "Cast-iron unniyappam pan — not aluminium",
        "Jaggery-rice-banana dumplings.",
        ["1 cup rice flour", "½ cup jaggery", "1 banana, mashed", "Cardamom", "Coconut bits", "Ghee"],
        ["Mix a thick batter. Rest 15 minutes. Fry in ghee in an unniyappam pan."])
    add("kerala", "Dessert", "Palada Payasam", 15, 40, MILK,
        "Wedding payasam of cooked ada in milk.",
        ["½ cup rice ada", "1 litre milk", "½ cup sugar", "Ghee", "Cardamom"],
        ["Cook ada. Reduce milk in steel with sugar until pale pink-beige. Mix ada, ghee, cardamom."])
    add("kerala", "Salad", "Cucumber Coconut Salad", 8, 0, BOWL,
        "Sadya-style kichadi without onion.",
        ["1 cucumber", "2 tbsp coconut", "Green chilli", "Yogurt ½ cup", "Mustard tadka", "Salt"],
        ["Mix, temper, serve at once."])

    # ----- 13 Madhya Pradesh -----
    add("madhya-pradesh", "Starter", "Indori Poha", 10, 10, S,
        "Indore’s flattened-rice breakfast. Skip onion; use sev, lemon, pomegranate.",
        ["2 cups thick poha, washed", "1 tbsp oil", "1 tsp mustard", "Pinch of hing", "Curry leaves",
         "Turmeric", "Green chilli", "Salt", "Sugar pinch", "Lemon", "Sev", "Pomegranate"],
        ["Temper, add poha, turmeric, salt, sugar. Steam 2 minutes. Lemon, sev, pomegranate — no onion."])
    add("madhya-pradesh", "Main", "Dal Bafla", 25, 45, CLAY,
        "Malwa dal with baked wheat bafla. Dal is toor with hing tadka.",
        ["1 cup toor dal", "Turmeric", "Tomato 1", "Ghee tadka: cumin, hing, chilli, coriander powder",
         "Bafla: 2 cups atta + 2 tbsp ghee + ajwain + salt, boiled then baked/roasted on iron"],
        ["Cook dal, whisk, tomato, tadka.",
         "Boil bafla discs 15 minutes, then roast on iron until cracked. Dunk in ghee. Serve with dal."])
    add("madhya-pradesh", "Side", "Bhutte ka Kees", 10, 15, S,
        "Grated corn cooked in milk — Indore monsoon dish.",
        ["3 cups grated corn", "½ cup milk", "1 tbsp ghee", "Cumin", "Hing", "Green chilli", "Ginger", "Salt", "Lemon", "Coconut"],
        ["Temper ghee, cumin, hing, chilli, ginger. Add corn, milk, salt. Cook 10 minutes. Lemon, coconut."])
    add("madhya-pradesh", "Bread", "Bafla", 25, 40, TAWA,
        "The bread of dal bafla, eaten dunked in ghee.",
        ["2 cups atta", "2 tbsp ghee", "Ajwain", "Salt", "Water"],
        ["Knead, shape discs, boil, then roast on iron tawa until brown cracks."])
    add("madhya-pradesh", "Sweet", "Mawa Bati", 25, 25, FRY,
        "Stuffed fried khoya balls in sugar syrup — Malwa.",
        ["1 cup khoya", "2 tbsp maida", "Chopped nuts", "Cardamom", "Sugar syrup 1 cup sugar + ½ cup water"],
        ["Stuff khoya-maida dough with nuts. Fry on low. Soak in warm syrup."])
    add("madhya-pradesh", "Dessert", "Rabri", 10, 45, MILK,
        "Reduced sweet milk of North and Central India.",
        ["1 litre full-fat milk", "⅓ cup sugar", "Saffron", "Cardamom", "Pistachios"],
        ["Reduce milk in a heavy steel pot, scraping malai back in, until thick. Sugar, saffron."])
    add("madhya-pradesh", "Salad", "Pomegranate Cucumber Salad", 8, 0, BOWL,
        ["1 cucumber", "½ cup pomegranate", "Lemon", "Black salt", "Coriander"],
        ["Toss. No onion."], "")

    # ----- 14 Maharashtra -----
    add("maharashtra", "Starter", "Kothimbir Vadi", 20, 20, STEAM,
        "Coriander-gram steamed then fried slices.",
        ["2 cups chopped coriander", "1 cup besan", "1 tsp ginger-chilli", "½ tsp turmeric",
         "1 tsp sesame", "Pinch of hing", "Salt", "Oil"],
        ["Mix a thick dough, steam as a cake 12 minutes, cool, slice.",
         "Pan-fry slices in a steel kadhai until crisp."])
    add("maharashtra", "Main", "Pithla", 10, 15, S,
        "Besan curry of rural Maharashtra. Skip onion; use hing, ginger, green chilli.",
        ["1 cup besan", "3 cups water", "2 tbsp oil", "Mustard, cumin, hing, curry leaves, green chilli, ginger",
         "Turmeric", "Salt", "Coriander"],
        ["Temper spices. Pour a thin besan slurry, turmeric, salt. Cook stirring until it thickens and the raw smell goes.",
         "Serve with bhakri. Do not add onion."])
    add("maharashtra", "Side", "Bharli Vangi (no onion)", 15, 25, S,
        "Stuffed small brinjals with coconut-peanut masala, no onion garlic.",
        ["8 small brinjals", "½ cup coconut", "¼ cup peanuts, roasted", "1 tsp sesame",
         "1 tsp goda masala (garlic-free) or coriander-cumin-coconut", "Tamarind", "Jaggery pinch", "Salt", "Oil"],
        ["Grind stuffing. Slit brinjals, fill.",
         "Cook covered with a little water and oil until soft and the masala clings."])
    add("maharashtra", "Bread", "Jowar Bhakri", 15, 15, TAWA,
        "Sorghum roti of Maharashtra.",
        ["2 cups jowar flour", "Hot water", "Salt"],
        ["Knead with hot water. Pat, cook on iron tawa, finish on flame to puff."])
    add("maharashtra", "Sweet", "Ukadiche Modak", 30, 20, STEAM,
        "Ganesh festival steamed modak — coconut-jaggery filling, no allium.",
        ["1 cup rice flour", "1 cup water + 1 tsp ghee + salt (for dough)",
         "Filling: 1 cup coconut + ¾ cup jaggery + cardamom"],
        ["Cook filling until sticky. Make hot-water rice dough. Shape modaks. Steam 10–12 minutes in steel."])
    add("maharashtra", "Dessert", "Amrakhand", 10, 0, BOWL,
        "Mango shrikhand.",
        ["400 g hung yogurt", "½ cup mango puree", "3 tbsp sugar", "Cardamom"],
        ["Whisk, chill."])
    add("maharashtra", "Salad", "Kakdi Koshimbir", 8, 0, BOWL,
        "Cucumber-coconut-peanut salad. Traditional koshimbir often has onion — skip it.",
        ["2 cucumbers", "2 tbsp coconut", "2 tbsp crushed peanuts", "Lemon", "Green chilli", "Cumin", "Salt", "Coriander"],
        ["Mix. Peanut and lemon replace onion."])
