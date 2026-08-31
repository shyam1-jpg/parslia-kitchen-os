/* Kiteline — professional commercial kitchen SOP + short video data (offline) */
window.KITELINE_SOP_DATA = {
  company: "Kiteline",
  appName: "Kitchen SOP",
  tagline: "Professional commercial kitchen standards — brigade, HACCP, allergens, and close-down.",
  version: "1.0",
  audience: "Hotels, restaurants, catering, schools, and multi-site production kitchens",
  hardRules: [
    "This pack is for professional commercial kitchens only — not home cooking.",
    "Work in uniform: clean chef whites or branded kit, hair restrained, closed shoes, no jewellery on the line.",
    "Wash hands at the dedicated sink before food work, after raw protein, waste, chemicals, or leaving the kitchen.",
    "Keep raw and ready-to-eat (RTE) food, boards, knives, and cloths separate at all times.",
    "Never guess a temperature — probe, wipe, and record. Core cook 75 °C / 82 °C for poultry where local policy requires.",
    "Hot hold at 63 °C or above. Cold hold at 8 °C or below (5 °C target). Freezer −18 °C.",
    "Label every container: name, allergens, prep date, use-by. Natasha’s Law applies to prepacked-for-direct-sale food.",
    "Declare the 14 UK/EU allergens. If you are not sure, do not send the dish.",
    "FIFO — first in, first out. Quarantine damaged, unlabelled, or out-of-range deliveries.",
    "Stop the line and tell the chef or duty manager if a CCP fails, an allergen is wrong, or a guest is at risk."
  ],
  categories: [
    { id: "hygiene", label: "Hygiene" },
    { id: "stores", label: "Stores" },
    { id: "line", label: "Line" },
    { id: "service", label: "Service" },
    { id: "safety", label: "Safety" },
    { id: "close", label: "Close-down" }
  ],
  sops: [
    {
      id: "ck-00",
      code: "CK-00",
      title: "Brigade & kitchen standards",
      category: "hygiene",
      blurb: "How a professional kitchen works: roles, kit, and the line.",
      video: {
        title: "Brigade standards — 55 seconds",
        durationSec: 55,
        scenes: [
          { t: 0, title: "Commercial kitchen", line: "This is a professional brigade — not a home cook-along." },
          { t: 9, title: "Roles", line: "Head chef sets the pass. Sous runs the line. CDP owns a section. Commis support prep." },
          { t: 20, title: "Kit", line: "Clean whites, hat or hairnet, apron, closed shoes. No rings, watches, or nail varnish on food work." },
          { t: 32, title: "Stations", line: "Know your section: garnish, sauce, grill, pastry, pot-wash, pass." },
          { t: 42, title: "Voice", line: "Call orders back. Say ‘behind’, ‘hot’, ‘sharp’. The pass is the only send authority." }
        ]
      },
      sections: [
        {
          h: "Purpose",
          body: "Set the professional standard for every person who enters a commercial kitchen operated with Kiteline — hotels, restaurants, catering, schools, and production sites."
        },
        {
          h: "Scope",
          body: "Applies to chefs, kitchen porters, stewards, agency staff, and managers on shift. Front of house only enter the kitchen on the agreed walkway and never touch the pass without permission."
        },
        {
          h: "Brigade roles",
          bullets: [
            "Head chef / executive chef — menu, HACCP ownership, sign-off, discipline of the pass",
            "Sous chef — service control, section cover, temperature and allergen checks",
            "Chef de partie — owns one station (sauce, grill, veg, pastry, larder)",
            "Commis — mise en place, labelling, following the recipe card exactly",
            "Kitchen porter / steward — pot-wash, floors, bins, chemical store — not food prep unless trained"
          ]
        },
        {
          h: "Professional appearance",
          bullets: [
            "Clean uniform at the start of every shift; change if soiled",
            "Hair fully restrained; beard net where policy requires",
            "Hands: short nails, no varnish, waterproof plaster + blue glove if a cut",
            "No personal phones on the pass during service"
          ]
        },
        {
          h: "Kitchen language",
          bullets: [
            "Acknowledge every order: ‘Yes chef’",
            "Warn: ‘Behind’, ‘Hot pan’, ‘Sharp’, ‘Corner’",
            "Never send a plate that the pass has not checked"
          ]
        }
      ]
    },
    {
      id: "ck-01",
      code: "CK-01",
      title: "Opening checks",
      category: "hygiene",
      blurb: "Power, temps, pests, sinks, and the first walk of the kitchen.",
      video: {
        title: "Opening the kitchen — 60 seconds",
        durationSec: 60,
        scenes: [
          { t: 0, title: "Lights & kit", line: "Power on. Extract on. Check fire exits are clear before anyone starts prep." },
          { t: 10, title: "Walk the room", line: "Look for pests, leaks, overnight waste, and unlabelled food left out." },
          { t: 22, title: "Probe fridges", line: "Record every fridge and freezer. 5 °C target / 8 °C legal cold. Freezer −18 °C." },
          { t: 36, title: "Hand wash", line: "Soap, hot water, paper towel, pedal bin. No cloths at the hand sink." },
          { t: 48, title: "Sign the sheet", line: "Opening checklist in Kiteline or paper — signed by the duty chef before mise en place." }
        ]
      },
      sections: [
        {
          h: "Purpose",
          body: "Prove the kitchen is safe to produce food before the first knife comes out."
        },
        {
          h: "Do this first",
          bullets: [
            "Unlock, lights, extract, fly-killers, insect screens closed",
            "Fire exits, gas isolation, first-aid kit, burn gel visible",
            "Walk-in, reach-in, and freezer temperatures recorded",
            "Hot water at wash-up and hand basins",
            "Pest signs: droppings, gnawing, insects — stop and report if found",
            "Remove any food left at ambient overnight — do not taste, discard and log"
          ]
        },
        {
          h: "Do not start prep until",
          bullets: [
            "Opening checklist is complete",
            "Any failed fridge is emptied to a working unit or condemned",
            "Hand-wash stations are stocked"
          ]
        }
      ]
    },
    {
      id: "ck-02",
      code: "CK-02",
      title: "Goods-in & deliveries",
      category: "stores",
      blurb: "Check, probe, reject, and put away — commercial receiving.",
      video: {
        title: "Goods-in in 60 seconds",
        durationSec: 60,
        scenes: [
          { t: 0, title: "Bay ready", line: "Clear the receiving bench. Sanitise. Have probe, wipes, and the order sheet ready." },
          { t: 10, title: "Check the van", line: "Clean vehicle, sealed packaging, no crushed boxes sitting in melt water." },
          { t: 22, title: "Probe it", line: "Chilled ≤ 8 °C, frozen hard at −18 °C, hot deliveries ≥ 63 °C. Write the reading." },
          { t: 36, title: "Reject", line: "Refuse damaged, leaking, bloated, unlabelled, or out-of-range stock. Note on the invoice." },
          { t: 48, title: "Put away now", line: "High-risk chilled first, then frozen, then dry. Never leave a pallet in the corridor." }
        ]
      },
      sections: [
        {
          h: "Purpose",
          body: "Stop unsafe food at the door. Commercial kitchens live or die on goods-in discipline."
        },
        {
          h: "Accept only if",
          bullets: [
            "Supplier is on the approved list",
            "Use-by / best-before dates allow a safe production window",
            "Chilled product is 8 °C or below (reject if warm)",
            "Frozen product is rock-hard with no thaw drip",
            "Packaging intact; allergen labelling present where required"
          ]
        },
        {
          h: "Reject and log",
          bullets: [
            "Temperature fail, damaged seal, pest evidence, missing use-by",
            "Photograph if the supplier disputes",
            "Do not put rejected stock into the walk-in ‘to deal with later’"
          ]
        }
      ]
    },
    {
      id: "ck-03",
      code: "CK-03",
      title: "Storage, FIFO & labelling",
      category: "stores",
      blurb: "Walk-in, dry store, and Natasha’s Law labels.",
      video: {
        title: "Stores & labels — 58 seconds",
        durationSec: 58,
        scenes: [
          { t: 0, title: "Zones", line: "Raw bottom. RTE top. Allergens in sealed, named containers — never open bags on a high shelf." },
          { t: 12, title: "FIFO", line: "New stock behind old. Date-check every time you take a tray." },
          { t: 24, title: "Label", line: "Name, date prepped, use-by, allergens, chef initials. No mystery cambros." },
          { t: 38, title: "Natasha’s Law", line: "PPDS food needs the 14 allergens highlighted on the label before it leaves the kitchen." },
          { t: 50, title: "Floor rule", line: "Nothing stored on the floor. 15 cm off the ground on racks." }
        ]
      },
      sections: [
        {
          h: "Walk-in layout",
          bullets: [
            "Ready-to-eat and cooked above raw",
            "Raw poultry on the lowest shelf in a lidded tray",
            "Allergen-critical items (nuts, sesame, celery) in dedicated sealed boxes",
            "No cardboard on wet floors"
          ]
        },
        {
          h: "Label every container",
          bullets: [
            "Dish or ingredient name as the guest will see it",
            "Prep date and use-by (follow site shelf-life table)",
            "Allergens in bold / highlighted",
            "Initials of the person who prepped"
          ]
        },
        {
          h: "Dry store",
          body: "Cool, dry, pest-proof. Open sacks decanted into lidded bins. Scoop stored clean and dry, not buried in flour."
        }
      ]
    },
    {
      id: "ck-04",
      code: "CK-04",
      title: "Mise en place",
      category: "line",
      blurb: "Section set-up so service can run at commercial pace.",
      video: {
        title: "Mise en place — 55 seconds",
        durationSec: 55,
        scenes: [
          { t: 0, title: "Read the board", line: "Covers, 86’d dishes, allergens, and the function sheet before you touch a board." },
          { t: 10, title: "Set the station", line: "Boards coded, knives sharp, sanitiser, probe, tasting spoons, labelled mise." },
          { t: 22, title: "Batch smart", line: "Prep to the forecast. Over-prepping is waste. Under-prepping kills the pass." },
          { t: 34, title: "Taste & temp", line: "Season, taste with a clean spoon, and check sauces are at hold temperature." },
          { t: 46, title: "Ready for the pass", line: "When the brief starts, your section is lit, labelled, and you can fire on the first ticket." }
        ]
      },
      sections: [
        {
          h: "Purpose",
          body: "A commercial line cannot cook from cold stores during service. Mise en place is the production system."
        },
        {
          h: "Before service brief",
          bullets: [
            "Recipe cards and allergen matrix on the section",
            "Colour-coded boards: red raw meat, blue fish, yellow raw poultry, green salad/fruit, white bakery/dairy, brown vegetables",
            "Hot hold units preheated; bain-marie water clean and at temperature",
            "Bins empty, cloths in the right bucket (sanitiser vs detergent)"
          ]
        },
        {
          h: "During prep",
          bullets: [
            "Work one task at a time on a clean board",
            "Return high-risk food to the fridge within 30 minutes",
            "Do not use service cloths for floors or raw trays"
          ]
        }
      ]
    },
    {
      id: "ck-05",
      code: "CK-05",
      title: "Cooking temperatures & HACCP",
      category: "line",
      blurb: "Critical control points: cook, cool, reheat, hot hold.",
      video: {
        title: "HACCP on the line — 65 seconds",
        durationSec: 65,
        scenes: [
          { t: 0, title: "CCP", line: "A Critical Control Point is a step that stops people getting ill. You measure it. You write it." },
          { t: 12, title: "Cook", line: "Probe the thickest part. 75 °C for 30 seconds is the house cook standard unless the HACCP card says otherwise." },
          { t: 26, title: "Cool", line: "From 63 °C to 8 °C as fast as possible — blast chiller preferred. Two-stage cooling: 2 hours to 21 °C, 4 hours to 8 °C max." },
          { t: 42, title: "Reheat", line: "Reheat once, to 75 °C. Never mix a new batch into an old bain." },
          { t: 54, title: "Hold", line: "Hot hold 63 °C+. If it drops, reheat or discard. Do not ‘just leave it’." }
        ]
      },
      sections: [
        {
          h: "Probe rules",
          bullets: [
            "Wipe and sanitise the probe between foods",
            "Calibrate weekly in ice water (0 °C) and boiling water (~100 °C)",
            "Record time, food, reading, and initials on the cook / cool / hold sheet"
          ]
        },
        {
          h: "House targets (UK commercial)",
          bullets: [
            "Cook / reheat: 75 °C core (poultry often 82 °C on site cards)",
            "Hot hold: 63 °C or above",
            "Cold hold: 8 °C or below, 5 °C target",
            "Freezer: −18 °C",
            "Delivery chilled: 8 °C or below"
          ]
        },
        {
          h: "If a CCP fails",
          body: "Stop service of that item. Correct (reheat, blast, discard). Record the corrective action. Tell the duty manager. Do not hide a fail."
        }
      ]
    },
    {
      id: "ck-06",
      code: "CK-06",
      title: "Allergen control",
      category: "line",
      blurb: "The 14 allergens — from recipe card to the pass.",
      video: {
        title: "Allergens — 60 seconds",
        durationSec: 60,
        scenes: [
          { t: 0, title: "14 allergens", line: "Celery, gluten, crustaceans, egg, fish, lupin, milk, molluscs, mustard, peanut, sesame, soya, sulphites, tree nuts." },
          { t: 14, title: "Recipe is law", line: "Cook the card. A ‘secret’ garnish can hospitalise a guest." },
          { t: 26, title: "Separate kit", line: "Dedicated boards, fryers, and tongs for allergen-free tickets. Change gloves." },
          { t: 40, title: "The pass", line: "Allergen tickets get a verbal check: chef reads the allergen, CDP confirms the plate." },
          { t: 52, title: "If unsure", line: "Do not send. Remake or 86 the dish. Never guess." }
        ]
      },
      sections: [
        {
          h: "Purpose",
          body: "Prevent allergen harm in a commercial service. Natasha’s Law and Natasha’s legacy: accurate information, every time."
        },
        {
          h: "The 14 (UK / EU)",
          bullets: [
            "Celery", "Cereals containing gluten", "Crustaceans", "Eggs", "Fish", "Lupin",
            "Milk", "Molluscs", "Mustard", "Peanuts", "Sesame", "Soybeans",
            "Sulphur dioxide & sulphites", "Tree nuts"
          ]
        },
        {
          h: "On the line",
          bullets: [
            "Allergen matrix printed and current — same version as the menu",
            "No unmarked squeeze bottles",
            "Fryer oil is an allergen if it cooked breaded or nut items",
            "FOH must not invent answers; they check the matrix or the chef"
          ]
        }
      ]
    },
    {
      id: "ck-07",
      code: "CK-07",
      title: "Pass & service",
      category: "service",
      blurb: "Tickets, timing, plate check, and the pass.",
      video: {
        title: "Running the pass — 58 seconds",
        durationSec: 58,
        scenes: [
          { t: 0, title: "The pass", line: "One voice. The pass chef calls, checks, and sends. Sections do not self-send." },
          { t: 12, title: "Ticket", line: "Read table, covers, allergens, and fire time. Call the fire in brigade order." },
          { t: 24, title: "Plate check", line: "Heat, garnish, sauce, protein, allergen garnish, wipe the rim. Then it leaves." },
          { t: 38, title: "Hold the line", line: "If a section is late, hold the table — do not send a split main." },
          { t: 48, title: "Recovery", line: "Remake beats an argument. Log the incident after service, not on the pass." }
        ]
      },
      sections: [
        {
          h: "Purpose",
          body: "Commercial service is timed production. The pass protects the guest and the brigade."
        },
        {
          h: "Pass checks before send",
          bullets: [
            "Correct dish and dietary notes",
            "Temperature — hot food hot, cold food cold",
            "Allergen confirmation spoken and heard",
            "Clean plate, correct garnish, no cloth fibres"
          ]
        },
        {
          h: "Never",
          bullets: [
            "Never send a plate you have not seen",
            "Never shout at FOH across a full pass — step aside after the fire",
            "Never reuse a returned plate without a full remake"
          ]
        }
      ]
    },
    {
      id: "ck-08",
      code: "CK-08",
      title: "Cleaning & COSHH",
      category: "hygiene",
      blurb: "Clean as you go, chemical store, and contact time.",
      video: {
        title: "Clean-as-you-go — 55 seconds",
        durationSec: 55,
        scenes: [
          { t: 0, title: "Two-stage clean", line: "Detergent to remove grease. Rinse. Sanitiser — and wait the contact time on the bottle." },
          { t: 12, title: "Cloths", line: "Colour-coded. Never the floor cloth on a board. Change when dirty, not ‘at the end’." },
          { t: 24, title: "COSHH", line: "Chemicals stay in the locked store. Dilute as the wall chart says. PPE for oven cleaner and descaler." },
          { t: 38, title: "Machines", line: "Empty, clean, and dry fryers, slicers, and mixers before they go back on the line." },
          { t: 48, title: "Floors last", line: "Food surfaces first. Floors and drains last so you do not splash clean benches." }
        ]
      },
      sections: [
        {
          h: "Clean as you go",
          body: "A commercial kitchen that waits until close-down is already failing hygiene. Wipe, sanitise, and reset between tasks."
        },
        {
          h: "COSHH",
          bullets: [
            "Safety data sheets in the chemical folder",
            "Never mix bleach and acid",
            "Spray away from food; cover or remove product first",
            "Report spills; do not leave a wet chemical floor"
          ]
        }
      ]
    },
    {
      id: "ck-09",
      code: "CK-09",
      title: "Closing checks",
      category: "close",
      blurb: "Food away, kit off, pests out, tomorrow set.",
      video: {
        title: "Close-down — 60 seconds",
        durationSec: 60,
        scenes: [
          { t: 0, title: "Food first", line: "Label and fridge all high-risk food. Discard anything that sat in the danger zone." },
          { t: 12, title: "Line down", line: "Gas off or isolated per site. Fryers filtered. Ovens empty. Extract run to clear steam." },
          { t: 24, title: "Wash-up", line: "No pans in the sink overnight. Machines emptied, arms clean, doors ajar to dry." },
          { t: 36, title: "Pests & bins", line: "Bins out, lids on, floors dry, doors shut. No food scraps under the pass." },
          { t: 48, title: "Sign out", line: "Closing checklist signed. Alarms set. Only the duty manager locks the last door." }
        ]
      },
      sections: [
        {
          h: "Close-down order",
          bullets: [
            "Service equipment cleaned and stored",
            "Walk-in organised, door shut, temp recorded",
            "Dry store tidy, lights off",
            "Floors mopped, mats hung",
            "Pest proofing: gaps closed, bait stations not disturbed",
            "Checklist signed; keys to the agreed person"
          ]
        }
      ]
    },
    {
      id: "ck-10",
      code: "CK-10",
      title: "Manual handling",
      category: "safety",
      blurb: "Flour sacks, stock pots, and the walk-in — lift like a pro.",
      video: {
        title: "How to lift — 50 seconds",
        durationSec: 50,
        scenes: [
          { t: 0, title: "Assess", line: "Weight, path, floor, and whether you need a sack truck or a second person." },
          { t: 10, title: "Set up", line: "Feet apart, load close, back straight, bend the knees — not the spine." },
          { t: 22, title: "Move", line: "Turn with the feet. Never twist with a 20 kg pot of stock." },
          { t: 34, title: "Team lift", line: "One person calls. Same height. Same pace. No hero lifts on the stairs." },
          { t: 44, title: "Stop", line: "If it feels wrong, put it down. Get the truck." }
        ]
      },
      sections: [
        {
          h: "House limits",
          bullets: [
            "Use a sack truck for 15 kg+ bags where the route allows",
            "Team-lift stock pots, full gastronorms, and oven trays",
            "Never catch a falling pot — step back"
          ]
        },
        {
          h: "Walk-in safety",
          body: "Keep aisles clear. Do not climb shelves. Use the step stool. Prop the door only with the approved catch — never a box."
        }
      ]
    },
    {
      id: "ck-11",
      code: "CK-11",
      title: "Knives & equipment",
      category: "safety",
      blurb: "Sharp tools, slicers, and fryers in a commercial kitchen.",
      video: {
        title: "Kit safety — 55 seconds",
        durationSec: 55,
        scenes: [
          { t: 0, title: "Sharp is safer", line: "A dull knife slips. Steel before service. Cut away from the body. Claw grip." },
          { t: 12, title: "Carry", line: "Blade down, by your side, announce ‘sharp’. Never in a busy corridor pointing forward." },
          { t: 24, title: "Machines", line: "Guards on. No loose cloths near a mixer. Isolate before you clean a slicer." },
          { t: 36, title: "Fryer", line: "Dry food only. Lower baskets slowly. Never throw ice or water into hot oil." },
          { t: 46, title: "Burns", line: "Cool running water 20 minutes. Burn gel. Tell the chef. Do not work a septic burn." }
        ]
      },
      sections: [
        {
          h: "Knives",
          bullets: [
            "Store in a block, magnet, or roll — never loose in a drawer with spoons",
            "Wash separately; never leave in a sink of soapy water",
            "Damaged or loose-rivet knives go out of service"
          ]
        },
        {
          h: "Equipment isolation",
          body: "Switch off, unplug or lock-out, and wait for moving parts to stop before cleaning. Only trained staff use the slicer, mincer, or buffalo chopper."
        }
      ]
    },
    {
      id: "ck-12",
      code: "CK-12",
      title: "Raw & ready-to-eat separation",
      category: "safety",
      blurb: "Stop cross-contamination on a busy commercial line.",
      video: {
        title: "Raw vs RTE — 58 seconds",
        durationSec: 58,
        scenes: [
          { t: 0, title: "Two worlds", line: "Raw protein can carry bacteria. Ready-to-eat food is eaten as it is. They never share a board." },
          { t: 12, title: "Colour code", line: "Yellow poultry, red meat, blue fish, green salad. If the board is scored and stained, replace it." },
          { t: 26, title: "Hands", line: "Wash after raw. Change gloves. Do not touch the ticket, the pass, or a garnish with raw hands." },
          { t: 40, title: "Cloths & oil", line: "A cloth that wiped a raw tray is contaminated. Fryer oil that cooked raw-breaded items is not for chips only — manage it." },
          { t: 50, title: "If it mixes", line: "Discard the RTE food. Clean. Log. Do not ‘quick rinse and send’." }
        ]
      },
      sections: [
        {
          h: "Purpose",
          body: "Cross-contamination is a top cause of commercial kitchen outbreaks. Separation is a CCP in most HACCP plans."
        },
        {
          h: "Non-negotiable",
          bullets: [
            "Separate fridge space or sealed boxes for raw vs RTE",
            "Separate knives, tongs, and probe wipes after raw",
            "Wash hands every time you switch",
            "Never store raw trays above garnish or dessert"
          ]
        }
      ]
    }
  ]
};
