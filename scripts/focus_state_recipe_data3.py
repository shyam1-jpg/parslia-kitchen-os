"""Focus-state recipes: Kerala, Manipur, Meghalaya, Uttarakhand, UP, Bihar, Mithila, Karnataka."""

from __future__ import annotations


def extend_rest(add, S, STEAM, TAWA, FRY, MILK, BOWL, CLAY, GRILL):
    # ===== KERALA (21) =====
    add("kerala", "Starter", "Pazham Pori", 10, 15, FRY,
        "Ripe plantain fritters.",
        ["Nendran banana", "Maida", "Rice flour", "Sugar", "Turmeric pinch", "Oil"],
        ["Batter, fry in steel."])
    add("kerala", "Starter", "Parippu Vada", 20, 15, FRY,
        "Chana-dal vada. Skip onion; use curry leaf, ginger, chilli.",
        ["Chana dal, soaked coarsely crushed", "Ginger", "Green chilli", "Curry leaves", "Hing", "Salt", "Oil"],
        ["Shape, fry in steel."])
    add("kerala", "Starter", "Upperi Banana Chips", 10, 15, FRY,
        "Salted raw-banana chips of Kerala.",
        ["Raw banana, sliced", "Coconut oil", "Salt", "Turmeric water"],
        ["Fry in coconut oil in a steel kadhai. Salt."])
    add("kerala", "Main", "Avial", 20, 25, S,
        "Sadya mixed veg in coconut-yogurt. Never onion or garlic.",
        ["Yam, ash gourd, carrot, beans, drumstick, raw banana", "Coconut-cumin-chilli paste", "Yogurt", "Curry leaves", "Coconut oil", "Salt"],
        ["Cook veg, add coconut, fold yogurt off the boil, coconut oil."])
    add("kerala", "Main", "Olan", 15, 20, S,
        "Ash gourd and cowpeas in thin coconut milk — sadya main.",
        ["Ash gourd", "Red cowpeas, cooked", "Thin + thick coconut milk", "Green chilli", "Curry leaves", "Coconut oil", "Salt"],
        ["Simmer gourd and peas in thin milk. Finish thick milk and curry leaves. No allium."])
    add("kerala", "Main", "Vegetable Stew", 15, 25, S,
        "Coconut-milk stew for appam. Ginger, pepper, curry leaf — no onion garlic.",
        ["Potato, carrot, beans, peas", "Coconut milk", "Ginger", "Peppercorns", "Curry leaves", "Hing", "Coconut oil", "Salt"],
        ["Simmer veg in thin milk with ginger and pepper. Thick milk at the end."])
    add("kerala", "Side", "Cabbage Thoran", 10, 12, S,
        ["Cabbage", "Coconut", "Mustard", "Urad", "Curry leaves", "Hing", "Turmeric", "Salt"],
        ["Temper, cover briefly, mix coconut."], "")
    add("kerala", "Side", "Erissery", 15, 25, S,
        "Pumpkin and cowpeas with ground coconut.",
        ["Pumpkin", "Cowpeas", "Coconut-cumin-chilli paste", "Mustard", "Curry leaves", "Coconut oil", "Salt"],
        ["Cook pumpkin and peas. Add coconut paste. Temper."])
    add("kerala", "Side", "Beetroot Thoran", 10, 12, S,
        ["Beetroot", "Coconut", "Mustard", "Curry leaves", "Green chilli", "Salt"],
        ["Stir-fry, coconut."], "")
    add("kerala", "Bread", "Appam", 70, 20, TAWA,
        "Lace rice pancake in a cast-iron appam kadai.",
        ["Rice", "Coconut", "Yeast", "Sugar", "Salt"],
        ["Ferment, swirl in iron pan, cover 1 minute."])
    add("kerala", "Bread", "Puttu", 15, 15, STEAM,
        "Steamed rice cylinders with coconut. Steel or bamboo puttu maker — not aluminium.",
        ["Rice flour, roasted", "Grated coconut", "Salt", "Water"],
        ["Layer flour and coconut. Steam 5–7 minutes."])
    add("kerala", "Bread", "Idiyappam", 20, 10, STEAM,
        "Rice-string nests.",
        ["Roasted rice flour", "Hot water", "Salt", "Coconut to serve"],
        ["Press noodles, steam in steel 5 minutes."])
    add("kerala", "Sweet", "Unniyappam", 20, 20, "Cast-iron unniyappam pan — not aluminium",
        ["Rice flour", "Jaggery", "Banana", "Cardamom", "Coconut bits", "Ghee"],
        ["Thick batter, fry in ghee wells."])
    add("kerala", "Sweet", "Ela Ada", 25, 20, STEAM,
        "Rice parcels with coconut-jaggery, steamed in banana leaf.",
        ["Rice paste", "Coconut-jaggery filling", "Banana leaf"],
        ["Spread, fill, fold, steam in steel."])
    add("kerala", "Sweet", "Sharkara Upperi", 10, 20, S,
        "Jaggery-coated banana chips.",
        ["Banana chips", "Jaggery syrup", "Dry ginger", "Cardamom"],
        ["Toss chips in thick jaggery syrup in steel."])
    add("kerala", "Dessert", "Palada Payasam", 15, 40, MILK,
        ["Rice ada", "Milk", "Sugar", "Ghee", "Cardamom"],
        ["Reduce milk in steel until beige-pink. Add ada."])
    add("kerala", "Dessert", "Ada Pradhaman", 15, 30, S,
        "Jaggery-coconut-milk payasam with ada.",
        ["Ada", "Jaggery", "Thin and thick coconut milk", "Ghee", "Cashews", "Cardamom"],
        ["Cook ada in jaggery. Coconut milk. Do not boil hard after thick milk."])
    add("kerala", "Dessert", "Parippu Payasam", 10, 25, S,
        ["Moong dal, roasted", "Jaggery", "Coconut milk", "Ghee", "Cardamom"],
        ["Cook dal, add jaggery and coconut milk."])
    add("kerala", "Salad", "Cucumber Kichadi", 10, 5, BOWL,
        ["Cucumber", "Coconut-chilli paste", "Yogurt", "Mustard tadka", "Salt"],
        ["Fold, temper."], "")
    add("kerala", "Salad", "Pineapple Pachadi", 15, 12, S,
        "Sadya pineapple-yogurt coconut relish.",
        ["Pineapple", "Coconut-chilli-mustard paste", "Yogurt", "Jaggery pinch", "Curry leaves", "Salt"],
        ["Cook pineapple, add paste and yogurt off the boil."])
    add("kerala", "Salad", "Beetroot Pachadi", 15, 12, S,
        ["Beetroot", "Coconut paste", "Yogurt", "Mustard tadka", "Salt"],
        ["Cook beet, fold coconut-yogurt, temper."], "")

    # ===== MANIPUR (21) =====
    add("manipur", "Starter", "Paknam Slices", 20, 25, STEAM,
        "Steamed gram-herb cake.",
        ["Besan", "Coriander and herbs (no spring onion)", "Ginger", "Salt", "Banana leaf"],
        ["Steam 20 minutes in steel, slice."])
    add("manipur", "Starter", "Kanghou Mixed Veg", 10, 12, S,
        "Quick dry-fried seasonal vegetables with chilli.",
        ["Cabbage, beans, carrot", "Green chilli", "Ginger", "Salt", "Oil"],
        ["High-heat stir in steel. No onion."])
    add("manipur", "Starter", "Kangsoi Cup", 10, 15, S,
        "Small bowl of vegetable soup as a starter.",
        ["Cabbage", "Potato", "Beans", "Ginger", "Chilli", "Salt"],
        ["Simmer a clear soup. Serve in steel cups."])
    add("manipur", "Main", "Chamthong Stew", 15, 25, S,
        "Clear Manipuri vegetable stew.",
        ["Mixed veg", "Ginger", "Green chilli", "Salt", "Local herb or coriander"],
        ["Simmer until tender. Light, clean broth."])
    add("manipur", "Main", "Ooti", 15, 35, CLAY,
        "Yellow pea stew of Manipur. Ginger and baking soda pinch, no allium.",
        ["1 cup yellow peas, soaked", "Ginger", "Green chilli", "Salt", "Optional rice to thicken"],
        ["Cook peas very soft. Ginger, chilli, salt. Should be creamy."])
    add("manipur", "Main", "Veg Kangsoi", 15, 25, S,
        "Vegetable kangsoi without fermented fish.",
        ["Mixed veg and greens", "Ginger", "Chilli", "Salt", "A squeeze of lemon"],
        ["Boil-simmer until the veg is soft and the broth is peppery."])
    add("manipur", "Side", "Sesame Eromba", 15, 20, BOWL,
        "Boiled veg mashed with roasted sesame and chilli.",
        ["Potato", "Beans", "Roasted sesame", "Dry chilli", "Salt"],
        ["Pound sesame-chilli. Mash with boiled veg."])
    add("manipur", "Side", "Yongchak Veg (parkia)", 10, 15, S,
        "Stink beans with chilli — skip if unavailable; use french beans.",
        ["Yongchak or french beans", "Chilli", "Ginger", "Salt"],
        ["Stir-fry until tender."])
    add("manipur", "Side", "Boiled Seasonal Beans", 10, 12, S,
        ["Beans", "Salt", "Ginger", "Chilli"],
        ["Boil, toss."], "")
    add("manipur", "Bread", "Steamed Sticky Rice", 5, 25, STEAM,
        ["Sticky rice, soaked"],
        ["Steam 20–25 minutes in steel."], "")
    add("manipur", "Bread", "Chak-Hao Rice", 5, 30, STEAM,
        "Black rice as the grain of the meal.",
        ["Chak-hao, soaked"],
        ["Steam or cook in steel until tender."])
    add("manipur", "Bread", "Soft Roti", 15, 15, TAWA,
        ["Atta", "Water", "Salt"],
        ["Cook on iron tawa."], "")
    add("manipur", "Sweet", "Til-Gud Ladoo", 10, 15, S,
        ["Sesame", "Jaggery", "Ghee"],
        ["Melt jaggery, add sesame, shape."], "")
    add("manipur", "Sweet", "Steamed Rice Cake", 20, 15, STEAM,
        ["Rice flour", "Jaggery", "Coconut"],
        ["Mix, steam in steel."], "")
    add("manipur", "Sweet", "Coconut Ladoo", 5, 10, S,
        ["Coconut", "Jaggery or condensed milk", "Cardamom"],
        ["Cook, shape."], "")
    add("manipur", "Dessert", "Chak-Hao Kheer", 10, 45, MILK,
        "Black-rice kheer.",
        ["Chak-hao", "Milk", "Sugar", "Cardamom"],
        ["Simmer in steel until lilac-grey and thick."])
    add("manipur", "Dessert", "White Rice Kheer", 10, 35, MILK,
        ["Rice", "Milk", "Sugar", "Cardamom"],
        ["Simmer in steel."], "")
    add("manipur", "Dessert", "Yogurt with Honey", 5, 0, BOWL,
        ["Yogurt", "Honey", "Sesame"],
        ["Spoon together. No cooking pan."], "")
    add("manipur", "Salad", "Veg Singju", 15, 0, BOWL,
        "Manipuri salad with roasted sesame and besan, no nga-ri.",
        ["Cabbage", "Beans or banana flower", "Roasted sesame", "Roasted besan", "Chilli", "Lemon", "Salt"],
        ["Toss, rest 5 minutes."])
    add("manipur", "Salad", "Cucumber Chilli Salad", 6, 0, BOWL,
        ["Cucumber", "Green chilli", "Lemon", "Salt"],
        ["Toss. Go easy on king chilli."], "")
    add("manipur", "Salad", "Cabbage Lemon Salad", 8, 0, BOWL,
        ["Cabbage", "Lemon", "Salt", "Sesame"],
        ["Toss."], "")

    # ===== MEGHALAYA (21) =====
    add("meghalaya", "Starter", "Pukhlein", 15, 15, FRY,
        "Khasi rice-jaggery fritter.",
        ["Rice flour", "Jaggery", "Water", "Oil"],
        ["Fry discs in steel."])
    add("meghalaya", "Starter", "Steamed Rice Puffs", 20, 15, STEAM,
        ["Rice flour", "Salt", "Water"],
        ["Shape small cakes, steam."], "")
    add("meghalaya", "Starter", "Sesame Rice Balls", 15, 15, STEAM,
        ["Rice flour", "Sesame", "Salt"],
        ["Steam balls."], "")
    add("meghalaya", "Main", "Vegetarian Rice Pot", 15, 30, CLAY,
        "Khasi-style veg rice with ginger and greens (jadoh without meat).",
        ["Rice", "Greens", "Tomato", "Ginger", "Mustard oil", "Green chilli", "Salt"],
        ["Temper ginger, chilli, tomato. Add rice, greens, water. Cook like a wet pulao."])
    add("meghalaya", "Main", "Dal with Local Greens", 10, 30, CLAY,
        ["Moong or masoor", "Greens", "Ginger", "Chilli", "Turmeric", "Salt"],
        ["Cook dal, fold greens."], "")
    add("meghalaya", "Main", "Pumpkin Stew", 10, 25, S,
        ["Pumpkin", "Ginger", "Chilli", "Salt", "Sesame optional"],
        ["Simmer until the pumpkin collapses into a stew."], "")
    add("meghalaya", "Side", "Boiled Veg with Sesame", 10, 15, S,
        ["Mixed veg", "Roasted sesame", "Chilli", "Salt"],
        ["Boil veg, toss with pounded sesame-chilli."], "")
    add("meghalaya", "Side", "Mustard Greens", 10, 12, S,
        ["Mustard greens", "Ginger", "Chilli", "Salt"],
        ["Wilt in steel."], "")
    add("meghalaya", "Side", "Bean Stew", 10, 20, S,
        ["Beans", "Tomato", "Ginger", "Salt"],
        ["Simmer until soft."], "")
    add("meghalaya", "Bread", "Steamed Rice Cakes", 20, 20, STEAM,
        ["Rice flour", "Hot water", "Salt"],
        ["Shape cakes, steam 15 minutes."], "")
    add("meghalaya", "Bread", "Sticky Rice", 5, 25, STEAM,
        ["Sticky rice"],
        ["Steam in steel."], "")
    add("meghalaya", "Bread", "Soft Roti", 15, 15, TAWA,
        ["Atta", "Water"],
        ["Iron tawa."], "")
    add("meghalaya", "Sweet", "Minil Sesame Cake", 20, 20, STEAM,
        ["Rice flour", "Sesame", "Jaggery"],
        ["Fill, steam."], "")
    add("meghalaya", "Sweet", "Pukhlein Sweet", 15, 15, FRY,
        ["Rice flour", "Extra jaggery", "Oil"],
        ["Fry sweeter, thicker discs."], "")
    add("meghalaya", "Sweet", "Jaggery Rice", 10, 20, S,
        ["Cooked rice", "Jaggery", "Sesame"],
        ["Fold warm jaggery into rice."], "")
    add("meghalaya", "Dessert", "Red Rice Kheer", 10, 40, MILK,
        ["Rice", "Milk", "Jaggery", "Cardamom"],
        ["Simmer in steel."], "")
    add("meghalaya", "Dessert", "Milk Kheer", 10, 35, MILK,
        ["Rice", "Milk", "Sugar", "Cardamom"],
        ["Simmer in steel."], "")
    add("meghalaya", "Dessert", "Banana Stew", 5, 15, S,
        ["Ripe bananas", "Jaggery", "Cardamom", "Coconut milk optional"],
        ["Stew gently in steel."], "")
    add("meghalaya", "Salad", "Cucumber Chilli Salad", 6, 0, BOWL,
        ["Cucumber", "Chilli", "Lemon", "Salt"],
        ["Toss."], "")
    add("meghalaya", "Salad", "Tomato Ginger Salad", 6, 0, BOWL,
        ["Tomato", "Ginger julienne", "Lemon", "Salt"],
        ["Toss."], "")
    add("meghalaya", "Salad", "Green Papaya Salad", 10, 0, BOWL,
        ["Green papaya", "Lemon", "Chilli", "Salt", "Sesame"],
        ["Toss."], "")

    # ===== UTTARAKHAND (21) =====
    add("uttarakhand", "Starter", "Aloo ke Gutke", 10, 20, S,
        "Kumaoni potatoes with jakhiya. Already no onion garlic.",
        ["Boiled potatoes", "Mustard oil", "Jakhiya or mustard", "Hing", "Red chilli", "Turmeric", "Coriander powder", "Lemon", "Salt"],
        ["Crisp potatoes in mustard oil with jakhiya."])
    add("uttarakhand", "Starter", "Jhangora Tikki", 15, 15, TAWA,
        "Barnyard-millet tikkis of hill fasts.",
        ["Cooked jhangora", "Potato", "Ginger-chilli", "Salt", "Oil"],
        ["Shape, pan-fry on iron."])
    add("uttarakhand", "Starter", "Garhwali Kapa Bites", 15, 15, S,
        "Thick yogurt-besan gravy cubes / dunked bread — serve as a starter dip with roti pieces.",
        ["Yogurt", "Besan", "Turmeric", "Cumin", "Hing", "Ginger", "Salt"],
        ["Cook a thick kadhi in steel. Serve with toasted roti strips."])
    add("uttarakhand", "Main", "Kafuli", 15, 25, S,
        "Spinach-methi mash thickened with rice paste.",
        ["Spinach", "Methi", "Rice paste", "Ginger", "Green chilli", "Cumin", "Hing", "Ghee", "Salt"],
        ["Cook greens, mash, thicken, tadka."])
    add("uttarakhand", "Main", "Phaanu", 20, 45, CLAY,
        "Mixed-dal stew of Garhwal, slow-cooked, hing-cumin — no onion garlic.",
        ["Gahat, bhatt or mixed dals, soaked", "Rice paste", "Cumin", "Hing", "Ginger", "Chilli", "Ghee", "Salt"],
        ["Cook dals very soft. Rice paste. Long simmer. Ghee tadka."])
    add("uttarakhand", "Main", "Chainsoo", 15, 35, S,
        "Roasted black-gram (urad) gravy of Garhwal.",
        ["Urad dal, dry roasted and ground", "Cumin", "Hing", "Dry chilli", "Ginger", "Ghee", "Salt"],
        ["Roast dal, grind, cook with water and spices until thick and smoky."])
    add("uttarakhand", "Side", "Bhatt ki Churkani", 15, 40, CLAY,
        "Black-soybean curry.",
        ["Bhatt, soaked", "Rice paste", "Cumin", "Hing", "Ginger", "Chilli", "Salt"],
        ["Cook until creamy. Tadka."])
    add("uttarakhand", "Side", "Palak ka Saag", 10, 15, S,
        ["Spinach", "Jakhiya", "Hing", "Green chilli", "Salt"],
        ["Wilt, temper."], "")
    add("uttarakhand", "Side", "Pahadi Jeera Aloo", 10, 15, S,
        ["Potatoes", "Cumin", "Hing", "Turmeric", "Amchur", "Salt"],
        ["Fry until the edges brown."], "")
    add("uttarakhand", "Bread", "Mandua Roti", 15, 15, TAWA,
        ["Mandua/ragi flour", "Hot water", "Salt"],
        ["Pat, cook on iron tawa."], "")
    add("uttarakhand", "Bread", "Wheat Roti", 15, 15, TAWA,
        ["Atta", "Water", "Ghee"],
        ["Phulka on iron."], "")
    add("uttarakhand", "Bread", "Bari Roti", 15, 15, TAWA,
        "Thicker pahadi roti to scoop kafuli.",
        ["Atta", "Water", "Salt", "Ghee"],
        ["Roll slightly thick, cook on iron."])
    add("uttarakhand", "Sweet", "Bal Mithai", 20, 25, S,
        "Almora roasted-khoya coated in sugar balls.",
        ["Khoya, roasted dark", "Sugar", "Sugar balls"],
        ["Cook in steel, cut, roll."])
    add("uttarakhand", "Sweet", "Arsa", 30, 20, FRY,
        "Rice-jaggery fried sweet of the hills.",
        ["Rice flour", "Jaggery syrup", "Sesame", "Oil"],
        ["Pat discs, fry on medium."])
    add("uttarakhand", "Sweet", "Singodi", 20, 15, S,
        "Khoa wrapped in maloo leaf — home version in steel cups.",
        ["Khoya", "Sugar", "Cardamom"],
        ["Cook, set small cones."])
    add("uttarakhand", "Dessert", "Jhangora Kheer", 10, 30, MILK,
        ["Jhangora millet", "Milk", "Sugar", "Cardamom", "Nuts"],
        ["Simmer in steel."], "")
    add("uttarakhand", "Dessert", "Rice Kheer", 10, 35, MILK,
        ["Rice", "Milk", "Sugar", "Cardamom"],
        ["Simmer in steel."], "")
    add("uttarakhand", "Dessert", "Fruit Raita Sweet", 8, 0, BOWL,
        ["Yogurt", "Pomegranate", "Banana", "Sugar pinch", "Cardamom"],
        ["Fold. No onion raita."], "")
    add("uttarakhand", "Salad", "Cucumber Lemon Salad", 6, 0, BOWL,
        ["Cucumber", "Lemon", "Green chilli", "Salt"],
        ["Toss."], "")
    add("uttarakhand", "Salad", "Mooli Salad", 8, 0, BOWL,
        ["Radish", "Lemon", "Green chilli", "Salt", "Coriander"],
        ["Toss. No onion."], "")
    add("uttarakhand", "Salad", "Tomato Ginger Salad", 6, 0, BOWL,
        ["Tomato", "Ginger", "Lemon", "Salt"],
        ["Toss."], "")

    # ===== UTTAR PRADESH (21) =====
    add("uttar-pradesh", "Starter", "Matar Kachori", 30, 20, FRY,
        "Mathura pea kachori, sattvic filling.",
        ["Maida", "Crushed peas", "Ginger", "Cumin", "Amchur", "Chilli", "Salt", "Oil"],
        ["Stuff, fry on medium in steel."])
    add("uttar-pradesh", "Starter", "Palak Pakora", 10, 15, FRY,
        ["Spinach leaves", "Besan", "Ajwain", "Chilli", "Hing", "Salt", "Oil"],
        ["Dip leaves, fry in steel."], "")
    add("uttar-pradesh", "Starter", "Aloo Tikki (no onion)", 20, 15, TAWA,
        ["Potatoes", "Peas", "Ginger-chilli", "Chaat masala", "Salt", "Oil"],
        ["Shape, pan-fry on iron."], "")
    add("uttar-pradesh", "Main", "Aloo Tamatar", 10, 25, S,
        "Braj temple potato-tomato curry.",
        ["Potatoes", "Tomato puree", "Cumin", "Hing", "Ginger", "Turmeric", "Coriander", "Chilli", "Ghee", "Salt"],
        ["Tadka, tomato, potatoes, simmer. No pyaz, no lehsun."])
    add("uttar-pradesh", "Main", "UP Kadhi", 15, 30, S,
        ["Yogurt", "Besan", "Turmeric", "Cumin", "Hing", "Fenugreek seeds", "Chilli", "Salt"],
        ["Simmer kadhi in steel, stirring. Tadka."], "")
    add("uttar-pradesh", "Main", "Moong Dal Tadka", 10, 25, CLAY,
        ["Moong dal", "Tomato", "Cumin", "Hing", "Ginger", "Ghee", "Turmeric", "Salt"],
        ["Cook dal, tadka. Temple-style."], "")
    add("uttar-pradesh", "Side", "Bhindi ki Sabzi", 10, 15, S,
        ["Bhindi", "Cumin", "Hing", "Amchur", "Turmeric", "Coriander", "Salt"],
        ["Fry uncovered until no slime."], "")
    add("uttar-pradesh", "Side", "Lauki Sabzi", 10, 20, S,
        ["Bottle gourd", "Tomato", "Cumin", "Hing", "Turmeric", "Salt"],
        ["Simmer until soft."], "")
    add("uttar-pradesh", "Side", "Jeera Aloo", 10, 15, S,
        ["Potatoes", "Cumin", "Hing", "Turmeric", "Chilli", "Amchur", "Salt"],
        ["Fry until golden."], "")
    add("uttar-pradesh", "Bread", "Bedmi Puri", 25, 20, FRY,
        "Urad-stuffed puri of UP breakfasts.",
        ["Atta", "Urad grind with fennel, ginger, hing, chilli", "Oil"],
        ["Roll thick, fry until brown and puffed."])
    add("uttar-pradesh", "Bread", "Phulka", 15, 15, TAWA,
        ["Atta", "Water", "Ghee"],
        ["Puff on iron tawa / flame."], "")
    add("uttar-pradesh", "Bread", "Poori", 15, 15, FRY,
        ["Atta", "Ghee", "Salt", "Oil"],
        ["Fry in steel."], "")
    add("uttar-pradesh", "Sweet", "Agra Petha", 20, 40, S,
        ["Ash gourd", "Lime water", "Sugar syrup", "Cardamom"],
        ["Boil cubes, candy in steel syrup."], "")
    add("uttar-pradesh", "Sweet", "Mathura Pedha", 15, 20, S,
        ["Khoya", "Sugar", "Cardamom"],
        ["Cook in steel, shape pedas."], "")
    add("uttar-pradesh", "Sweet", "Balushahi", 25, 25, FRY,
        ["Maida", "Ghee", "Yogurt", "Baking soda pinch", "Sugar syrup"],
        ["Fry on low, soak in syrup made in steel."])
    add("uttar-pradesh", "Dessert", "Rabri", 10, 45, MILK,
        ["Milk", "Sugar", "Saffron", "Pistachios"],
        ["Reduce in heavy steel, scraping malai."], "")
    add("uttar-pradesh", "Dessert", "Rice Kheer", 10, 40, MILK,
        ["Rice", "Milk", "Sugar", "Cardamom", "Raisins"],
        ["Simmer in steel."], "")
    add("uttar-pradesh", "Dessert", "Thandai Cooler", 15, 0, BOWL,
        "Festival almond-pepper milk, served as dessert drink.",
        ["Milk", "Soaked almonds", "Poppy", "Pepper", "Fennel", "Cardamom", "Sugar"],
        ["Grind masala, mix into milk. Chill. No allium."])
    add("uttar-pradesh", "Salad", "Kachumber without Onion", 8, 0, BOWL,
        ["Cucumber", "Tomato", "Lemon", "Cumin", "Salt", "Coriander"],
        ["Toss. No pyaaz."], "")
    add("uttar-pradesh", "Salad", "Boondi Raita", 8, 0, BOWL,
        ["Yogurt", "Boondi", "Cumin", "Salt", "Coriander"],
        ["Mix. No onion raita."], "")
    add("uttar-pradesh", "Salad", "Sprouted Moong Salad", 10, 0, BOWL,
        ["Moong sprouts", "Tomato", "Lemon", "Chaat masala", "Coriander"],
        ["Toss. No onion."], "")

    # ===== BIHAR (21) =====
    add("bihar", "Starter", "Baked Sattu Litti", 25, 30, GRILL,
        "Sattu-stuffed balls, no onion in the filling.",
        ["Atta", "Sattu", "Ginger-chilli", "Ajwain", "Mustard oil", "Amchur", "Salt"],
        ["Stuff, roast on steel tray until charred spots. Dip in ghee."])
    add("bihar", "Starter", "Sattu Cooler Chaat", 10, 0, BOWL,
        "Sattu drink thickened and topped like chaat, minus onion.",
        ["Sattu", "Water", "Lemon", "Roasted cumin", "Green chilli", "Black salt", "Mint"],
        ["Whisk a thick cooler. Top with chilli and cumin."])
    add("bihar", "Starter", "Aloo Chop (no onion)", 20, 15, FRY,
        ["Potatoes", "Ginger-chilli", "Bhaja masala", "Besan batter", "Oil"],
        ["Shape, fry in steel."], "")
    add("bihar", "Main", "Litti with Tomato Baingan Chokha", 15, 20, GRILL,
        "Fire mash without onion; mustard oil and chilli.",
        ["Brinjal", "Tomato", "Potato", "Mustard oil", "Green chilli", "Salt", "Coriander"],
        ["Roast, peel, mash. Serve with litti."])
    add("bihar", "Main", "Ghugni", 15, 30, S,
        "White-peas curry of Bihar. Tomato, ginger, cumin — no onion.",
        ["White peas, soaked", "Tomato", "Ginger", "Cumin", "Hing", "Turmeric", "Chilli", "Amchur", "Salt"],
        ["Cook peas soft. Tomato-ginger gravy. Simmer."])
    add("bihar", "Main", "Dal Pithaur", 20, 30, S,
        "Wheat dumplings simmered in dal.",
        ["Atta dumplings", "Toor or masoor dal", "Turmeric", "Cumin", "Hing", "Ghee", "Salt"],
        ["Simmer pithaur in dal until cooked. Tadka."])
    add("bihar", "Side", "Kadhi Bari", 15, 30, S,
        ["Besan baris", "Yogurt kadhi", "Cumin", "Hing", "Turmeric", "Salt"],
        ["Simmer baris in kadhi. Tadka."], "")
    add("bihar", "Side", "Aloo Bhujiya", 10, 15, S,
        "Thin potato fry with panch phoron.",
        ["Potatoes, thinly sliced", "Panch phoron", "Turmeric", "Chilli", "Mustard oil", "Salt"],
        ["Fry until crisp-edged."])
    add("bihar", "Side", "Nenua Sabzi", 10, 15, S,
        "Sponge gourd.",
        ["Nenua / turai", "Cumin", "Hing", "Turmeric", "Tomato", "Salt"],
        ["Simmer until soft."])
    add("bihar", "Bread", "Sattu Paratha", 20, 20, TAWA,
        ["Atta", "Sattu filling", "Ghee"],
        ["Stuff, cook on iron tawa."], "")
    add("bihar", "Bread", "Phulka", 15, 15, TAWA,
        ["Atta", "Water", "Ghee"],
        ["Iron tawa."], "")
    add("bihar", "Bread", "Litti as Bread", 25, 30, GRILL,
        "Serve whole litti as the bread of the meal.",
        ["Atta", "Sattu filling"],
        ["Roast, crush slightly, pour ghee."])
    add("bihar", "Sweet", "Thekua", 20, 20, FRY,
        ["Atta", "Jaggery", "Ghee", "Fennel", "Cardamom"],
        ["Press, fry on low-medium."], "")
    add("bihar", "Sweet", "Khaja", 25, 20, FRY,
        "Flaky layered fried sweet.",
        ["Maida", "Ghee", "Sugar syrup"],
        ["Layer, fry, dip in syrup."])
    add("bihar", "Sweet", "Anarsa", 40, 20, FRY,
        "Rice-jaggery sweet with poppy crust.",
        ["Rice paste, dried", "Jaggery", "Poppy seeds", "Ghee"],
        ["Shape, dip in poppy, fry on low."])
    add("bihar", "Dessert", "Lai Kheer", 10, 15, MILK,
        ["Puffed rice", "Milk", "Sugar", "Cardamom"],
        ["Warm milk, soak lai."], "")
    add("bihar", "Dessert", "Chura Dahi", 5, 0, BOWL,
        "Flattened rice in yogurt with jaggery — Bihar breakfast-dessert.",
        ["Chura / poha", "Yogurt", "Jaggery", "Banana optional"],
        ["Soak chura, mix yogurt and jaggery."])
    add("bihar", "Dessert", "Rasiyaw", 10, 30, MILK,
        "Bihari rice pudding with jaggery.",
        ["Rice", "Milk", "Jaggery", "Cardamom"],
        ["Simmer in steel. Jaggery off the hard boil."])
    add("bihar", "Salad", "Tomato Cucumber Salad", 8, 0, BOWL,
        ["Tomato", "Cucumber", "Lemon", "Green chilli", "Mustard oil pinch", "Salt"],
        ["Toss. No onion."], "")
    add("bihar", "Salad", "Kachumber without Onion", 8, 0, BOWL,
        ["Cucumber", "Tomato", "Lemon", "Cumin", "Salt"],
        ["Toss."], "")
    add("bihar", "Salad", "Chana Salad", 10, 0, BOWL,
        ["Boiled black chana", "Tomato", "Lemon", "Cumin", "Green chilli", "Salt", "Coriander"],
        ["Toss. No onion."], "")

    # ===== MITHILA (21) =====
    add("mithila", "Starter", "Makhana Namkeen", 5, 10, S,
        "Roasted fox nuts — Mithila’s signature snack.",
        ["4 cups makhana", "Ghee", "Hing", "Turmeric", "Chilli", "Black salt"],
        ["Roast in ghee in steel until crisp. Spice."])
    add("mithila", "Starter", "Sattu Puri Snack", 20, 15, FRY,
        "Small sattu-stuffed puris.",
        ["Atta", "Sattu filling with ajwain, chilli, mustard oil, amchur", "Oil"],
        ["Stuff, fry in steel."])
    add("mithila", "Starter", "Pua", 15, 15, FRY,
        "Maithil sweet-savoury banana-wheat fritters for festivals.",
        ["Atta", "Banana or yogurt", "Fennel", "Sugar pinch", "Ghee"],
        ["Drop batter in ghee. Fry until brown."])
    add("mithila", "Main", "Makhana Curry", 15, 25, S,
        "Fox-nut curry in tomato-yogurt. Maithil vegetarian royal dish.",
        ["Makhana, lightly fried", "Tomato", "Yogurt", "Ginger", "Cumin", "Hing", "Garam masala", "Ghee", "Salt"],
        ["Make tomato-yogurt gravy in steel. Add makhana last so they stay slightly crisp."])
    add("mithila", "Main", "Maithil Kadhi", 15, 30, S,
        "Yogurt kadhi with bari, Mithila-style.",
        ["Yogurt", "Besan", "Bari or pakora", "Turmeric", "Cumin", "Hing", "Fenugreek", "Salt"],
        ["Simmer, add bari, tadka. No onion."])
    add("mithila", "Main", "Maithil Ghugni", 15, 30, S,
        "White peas with ginger and cumin.",
        ["White peas", "Tomato", "Ginger", "Cumin", "Hing", "Amchur", "Salt"],
        ["Cook peas, make a thick gravy."])
    add("mithila", "Side", "Dahi Baigan", 10, 20, S,
        "Yogurt-eggplant of Maithil homes.",
        ["Brinjal, fried or roasted", "Yogurt", "Cumin", "Hing", "Green chilli", "Salt"],
        ["Fold roasted baigan into tempered yogurt."])
    add("mithila", "Side", "Aloo Jeera Maithil", 10, 15, S,
        ["Potatoes", "Cumin", "Hing", "Turmeric", "Mustard oil", "Salt"],
        ["Fry."], "")
    add("mithila", "Side", "Parwal Sabzi", 10, 15, S,
        ["Pointed gourd", "Cumin", "Hing", "Turmeric", "Amchur", "Salt"],
        ["Fry until the edges brown."], "")
    add("mithila", "Bread", "Phulka", 15, 15, TAWA,
        ["Atta", "Water", "Ghee"],
        ["Iron tawa."], "")
    add("mithila", "Bread", "Poori", 15, 15, FRY,
        ["Atta", "Ghee", "Oil"],
        ["Fry in steel."], "")
    add("mithila", "Bread", "Soft Roti for Makhana", 15, 15, TAWA,
        ["Atta", "Water", "Ghee"],
        ["Slightly thicker roti to scoop curry."], "")
    add("mithila", "Sweet", "Laktho", 20, 20, FRY,
        "Maithil fried jaggery-wheat sweet.",
        ["Atta", "Jaggery", "Ghee", "Fennel"],
        ["Shape, fry on low."])
    add("mithila", "Sweet", "Maithil Anarsa", 40, 20, FRY,
        ["Rice", "Jaggery", "Poppy", "Ghee"],
        ["Shape, fry on low."], "")
    add("mithila", "Sweet", "Maithil Thekua", 20, 20, FRY,
        "Chhath thekua of Mithila.",
        ["Atta", "Jaggery", "Ghee", "Fennel", "Cardamom"],
        ["Press in moulds, fry."])
    add("mithila", "Dessert", "Makhana Kheer", 10, 25, MILK,
        "The dessert Mithila is famous for.",
        ["Makhana, roasted and crushed", "Milk", "Sugar", "Cardamom", "Saffron", "Almonds"],
        ["Simmer in steel until creamy."])
    add("mithila", "Dessert", "Dahi Chura", 5, 0, BOWL,
        "Beaten rice in yogurt with jaggery — Makar Sankranti food of Mithila.",
        ["Chura", "Yogurt", "Jaggery", "Banana"],
        ["Mix and eat at once."])
    add("mithila", "Dessert", "Kheer", 10, 40, MILK,
        ["Rice", "Milk", "Sugar", "Bay", "Cardamom"],
        ["Simmer in steel."], "")
    add("mithila", "Salad", "Cucumber Dahi Salad", 8, 0, BOWL,
        ["Cucumber", "Yogurt", "Cumin", "Salt", "Mint"],
        ["Mix."], "")
    add("mithila", "Salad", "Tomato Lemon Salad", 6, 0, BOWL,
        ["Tomato", "Lemon", "Green chilli", "Salt", "Coriander"],
        ["Toss. No onion."], "")
    add("mithila", "Salad", "Makhana Chaat Salad", 8, 0, BOWL,
        ["Roasted makhana", "Tomato", "Cucumber", "Lemon", "Chaat masala", "Coriander"],
        ["Toss just before eating. No onion."], "")

    # ===== KARNATAKA (21) =====
    add("karnataka", "Starter", "Maddur Vada", 20, 15, FRY,
        "Rice-flour vada. Skip onion; use curry leaf, coconut, chilli.",
        ["Rice flour", "Atta", "Sooji", "Coconut", "Ginger-chilli", "Curry leaves", "Hing", "Salt", "Oil"],
        ["Flatten thin, fry crisp in steel."])
    add("karnataka", "Starter", "Goli Baje", 15, 15, FRY,
        "Mangaluru bajji. Yogurt-maida batter with ginger, no onion.",
        ["Maida", "Yogurt", "Ginger-chilli", "Curry leaves", "Hing", "Salt", "Oil"],
        ["Drop blobs, fry. Serve with coconut chutney (no garlic)."])
    add("karnataka", "Starter", "Mangalore Buns", 80, 15, FRY,
        "Banana-yogurt puri of coastal Karnataka.",
        ["Maida", "Banana", "Yogurt", "Sugar", "Baking soda pinch", "Oil"],
        ["Rest dough, roll thick, fry in steel until they puff."])
    add("karnataka", "Main", "Bisi Bele Bath", 20, 40, CLAY,
        "Udupi hot lentil-rice. Use garlic-free powder.",
        ["Rice", "Toor dal", "Mixed veg", "Bisi bele bath powder garlic-free", "Tamarind", "Ghee", "Mustard", "Hing", "Cashews", "Salt"],
        ["Cook loose and hot. Temple style — no onion, no garlic."])
    add("karnataka", "Main", "Saaru Anna", 15, 30, CLAY,
        "Rasam-rice: toor rasam with pepper-cumin, poured over rice.",
        ["Toor dal water", "Tomato", "Tamarind", "Rasam powder garlic-free", "Mustard", "Hing", "Curry leaves", "Ghee", "Rice"],
        ["Boil rasam, tadka, pour over hot rice."])
    add("karnataka", "Main", "Vegetable Huli", 15, 30, S,
        "Coconut-dal vegetable curry of Old Mysore.",
        ["Mixed veg", "Toor dal", "Coconut-chilli-coriander paste", "Tamarind", "Mustard", "Hing", "Salt"],
        ["Cook veg and dal. Add coconut paste. Temper."])
    add("karnataka", "Side", "Beans Palya", 10, 12, S,
        ["Beans", "Coconut", "Mustard", "Urad", "Hing", "Turmeric", "Salt"],
        ["Temper, cook, coconut."], "")
    add("karnataka", "Side", "Thondekayi Palya", 10, 15, S,
        "Ivy gourd coconut stir-fry.",
        ["Thondekayi", "Coconut", "Mustard", "Chilli", "Salt"],
        ["Fry until the gourd is tender-crisp."])
    add("karnataka", "Side", "Palak Palya", 10, 12, S,
        ["Spinach", "Mustard", "Hing", "Green chilli", "Coconut", "Salt"],
        ["Wilt, coconut."], "")
    add("karnataka", "Bread", "Ragi Roti", 15, 15, TAWA,
        ["Ragi flour", "Hot water", "Ginger-chilli", "Coriander", "Salt"],
        ["Pat onto iron tawa."], "")
    add("karnataka", "Bread", "Akki Roti", 15, 15, TAWA,
        "Rice-flour roti with dill or coriander, no onion.",
        ["Rice flour", "Coriander or dill", "Green chilli", "Cumin", "Salt", "Hot water"],
        ["Pat on banana leaf onto iron tawa."])
    add("karnataka", "Bread", "Neer Dosa", 20, 15, TAWA,
        "Lacy water dosa of Tulunadu.",
        ["Rice, soaked and ground very thin", "Salt"],
        ["Pour on hot iron tawa. Do not spread like regular dosa. Fold."])
    add("karnataka", "Sweet", "Mysore Pak", 10, 20, S,
        ["Besan", "Ghee", "Sugar syrup"],
        ["Cook in steel, pour into a steel tray."], "")
    add("karnataka", "Sweet", "Obbattu / Holige", 40, 25, TAWA,
        "Lentil-jaggery flatbread of Karnataka.",
        ["Maida dough", "Chana or toor dal + jaggery + cardamom"],
        ["Stuff, roll thin, cook on iron with ghee."])
    add("karnataka", "Sweet", "Dharwad Peda", 15, 25, S,
        ["Khoya", "Sugar", "Cardamom"],
        ["Slow-cook khoya in steel until brown, shape pedas."])
    add("karnataka", "Dessert", "Moong Dal Payasa", 10, 30, S,
        ["Moong, roasted", "Coconut milk", "Jaggery", "Cardamom", "Cashews"],
        ["Cook dal, jaggery, coconut milk. Do not boil hard."])
    add("karnataka", "Dessert", "Chiroti with Badam Milk", 25, 20, FRY,
        "Flaky chiroti served in almond milk.",
        ["Maida layered with ghee", "Sugar", "Badam milk"],
        ["Fry chiroti in steel. Serve soaking in warm almond milk."])
    add("karnataka", "Dessert", "Rice Payasa", 10, 35, MILK,
        ["Rice", "Milk or coconut milk", "Jaggery", "Cardamom"],
        ["Simmer in steel."], "")
    add("karnataka", "Salad", "Moong Kosambari", 30, 2, BOWL,
        ["Split moong, soaked", "Cucumber", "Coconut", "Lemon", "Mustard tadka", "Salt"],
        ["Mix, temper. Festival salad, already sattvic."])
    add("karnataka", "Salad", "Carrot Kosambari", 15, 2, BOWL,
        ["Moong", "Grated carrot", "Coconut", "Lemon", "Mustard tadka", "Salt"],
        ["Mix, temper."], "")
    add("karnataka", "Salad", "Tomato Gojju Relish", 10, 12, S,
        "Sweet-sour tomato gojju served like a salad-relish.",
        ["Tomato", "Tamarind", "Jaggery", "Mustard", "Hing", "Chilli", "Salt"],
        ["Cook to a relish. No onion."])
