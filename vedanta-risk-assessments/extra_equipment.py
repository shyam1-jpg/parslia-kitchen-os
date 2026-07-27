"""Extra kitchen equipment risk assessments from site photos."""

from build_combined_risk_assessment import (
    add_body,
    add_bullet,
    add_do_dont_care,
    add_heading_styled,
    add_subheading,
    area_section,
    equipment_section,
    page_break,
)


def deep_fryer_section(doc):
    equipment_section(
        doc,
        "Lincat Deep Fat Fryer — Equipment Risk Assessment & Operating Procedures",
        "Lincat",
        "Deep Fat Fryer (asset approx. 25278)",
        "Commercial deep fat fryer used for frying foods in hot oil. The unit has a "
        "stainless-steel fryer section over a two-door base cabinet. A manufacturer "
        "safety label on the front warns about oil fill level, drying food before "
        "immersion, isolating power before cleaning, and returning the thermostat to "
        "zero after use.",
        [
            "Check oil level before heating — never fill beyond the recommended fill mark.",
            "Ensure baskets and pans are dry and food is thoroughly drained/dried before immersing to prevent frothing and boil-over.",
            "Heat oil gradually; do not leave the fryer unattended while heating or in use.",
            "Lower baskets slowly into hot oil; stand to the side to avoid splash.",
            "Do not overload baskets — overcrowding causes oil surge, uneven cooking and spill risk.",
            "When finished, return thermostat control to zero and allow oil to cool before covering, filtering or cleaning.",
            "Switch off / disconnect power at the mains before cleaning or draining oil.",
            "Keep the floor around the fryer dry and clear; wipe any oil spills immediately and use wet-floor signage.",
            "Store empty GN trays and baskets on the designated shelf — do not stack heavy trays unstably on or beside the fryer.",
        ],
        [
            (
                "Hot oil splash / burns",
                "Staff",
                "High",
                "Dry food before frying; lower baskets slowly; correct fill level; heat-resistant gloves/apron; never leave unattended.",
                "Low",
            ),
            (
                "Oil boil-over / fire",
                "Staff / Kitchen",
                "High",
                "Do not overfill oil; do not overload baskets; keep water away from hot oil; know fire blanket / Class F extinguisher location; isolate power if safe.",
                "Low",
            ),
            (
                "Overloading / underloading baskets",
                "Staff",
                "Medium",
                "Follow batch sizes set by chef; never force oversized loads; underloading is acceptable for quality/safety — overcrowding is not.",
                "Low",
            ),
            (
                "Slips from oil on floor",
                "Staff",
                "High",
                "Clean as you go; absorbent mats if used must be secured; non-slip footwear; spill kit available.",
                "Low",
            ),
            (
                "Electric shock during cleaning",
                "Staff",
                "Medium",
                "Isolate mains before cleaning; never hose live electrics; follow Lincat label instructions.",
                "Low",
            ),
            (
                "Manual handling of hot baskets / trays",
                "Staff",
                "Medium",
                "Use dry heat-resistant gloves; two-person lift for heavy loads; cool trays before stacking for storage.",
                "Low",
            ),
        ],
        [
            "Heat-resistant gloves / oven gloves",
            "Apron (preferably heat-resistant front)",
            "Non-slip footwear",
            "Hair net / suitable hair restraint",
        ],
        extra_notes=[
            "Follow the on-unit Lincat Deep Fat Fryer safety label at all times.",
            "Damaged or peeling safety labels must be reported so replacements can be fitted.",
            "Oil changes and filtering only by trained staff using cool oil and correct PPE.",
        ],
        steps_image="steps-deep-fryer.png",
    )


def dough_mixer_section(doc):
    equipment_section(
        doc,
        "Floor Dough Mixer / Planetary Mixer — Equipment Risk Assessment & Operating Procedures",
        "Commercial dough mixer",
        "Floor-standing planetary / dough mixer",
        "Large floor-standing mixer used for dough and heavy mixing. Fitted with a "
        "wire safety guard, bowl-lift lever, stainless mixing bowl with side handles, "
        "and control panel. Positioned near walk-in cold-store access — keep clear of "
        "door swing and traffic routes.",
        [
            "Visually check the mixer, bowl seating, guard and power lead before use.",
            "Load ingredients within the bowl capacity — do not overload with dough that strains the motor or climbs the bowl.",
            "Fit the correct attachment; lower the bowl and close the wire safety guard before starting.",
            "Never reach into the bowl while the machine is running or while attachments are still moving.",
            "Use the bowl-lift lever only when the machine is stopped; keep hands clear of pinch points.",
            "Stop the machine before scraping down, adding late ingredients near the beater, or removing the bowl.",
            "Two-person lift for a full dough bowl where weight requires it; use correct posture.",
            "Switch off and isolate before cleaning; clean spillages around the base to prevent slips.",
            "Keep the power cord tidy and off the floor walkway.",
        ],
        [
            (
                "Entanglement / crushing in rotating bowl or attachment",
                "Staff",
                "High",
                "Safety guard closed during operation; never bypass interlocks; stop before clearing dough; loose clothing and jewellery removed.",
                "Low",
            ),
            (
                "Overloading mixer / motor strain",
                "Staff / Equipment",
                "Medium",
                "Follow max dough batch size; do not force under-mixed overloads; report unusual noise/smell.",
                "Low",
            ),
            (
                "Manual handling of heavy bowl / dough",
                "Staff",
                "High",
                "Team lift when needed; use bowl handles; clear path before moving bowl.",
                "Low",
            ),
            (
                "Pinch points on bowl-lift lever",
                "Staff",
                "Medium",
                "Hands clear of mechanism when raising/lowering; operate lever smoothly.",
                "Low",
            ),
            (
                "Slips / trips around mixer base",
                "Staff",
                "Medium",
                "Clean flour/dough spills immediately; cord management; keep area organised.",
                "Low",
            ),
            (
                "Collision with walk-in door traffic",
                "Staff",
                "Medium",
                "Do not block door swing; park mixer in designated corner; announce when moving bowl across route.",
                "Low",
            ),
        ],
        [
            "Apron",
            "Non-slip footwear",
            "Hair net",
            "Gloves only when cleaning (machine stopped/isolated)",
        ],
        extra_notes=[
            "If the safety guard is damaged or will not close, take the mixer out of service.",
            "Only trained staff may operate the dough mixer.",
        ],
        steps_image="steps-dough-mixer.png",
    )


def blast_chiller_section(doc):
    add_heading_styled(
        doc,
        "Blast Chiller — Equipment Risk Assessment & Safe Chilling Methods",
        1,
    )
    add_body(
        doc,
        "Commercial blast chiller used to rapidly cool cooked foods (e.g. pie fillings, "
        "rice, salad items). Site posters on the unit cover Safe Method 18 (Blast Chilling) "
        "and Safe Method 19 (Manual Chilling). Staff must follow both posters and this assessment.",
    )
    from build_combined_risk_assessment import add_steps_guide, info_table, risk_table, add_numbered
    from datetime import date

    add_steps_guide(doc, "steps-blast-chiller.png", "Step-by-step safe blast chilling")

    add_heading_styled(doc, "1. Equipment Information", 2)
    info_table(
        doc,
        [
            ("Location", "The Vedanta Kitchen & Retreat Centre"),
            ("Assessor", "Shyam Prasad"),
            ("Equipment", "Blast chiller"),
            ("Reference posters", "Safe Method 18 (Blast) & 19 (Manual)"),
            ("Date Completed", date.today().strftime("%d/%m/%Y")),
            ("Review Date", "27/07/2027"),
        ],
    )

    add_heading_styled(doc, "2. Safe Method 18 — Blast Chilling (summary)", 2)
    add_numbered(
        doc,
        [
            "Read and follow the manufacturer’s instructions.",
            "Pre-chill the blast chiller to speed up cooling.",
            "Do not overfill containers — about 25 mm depth is recommended; shallow dishes chill faster.",
            "Do not overload the blast chiller — leave space for air to circulate between dishes.",
            "Do not cover food while blast chilling (unless manufacturer/site method requires otherwise) so heat can escape; keep the chiller clean.",
            "Discard high-risk food that takes too long to chill.",
            "Remove food as soon as it is below 8°C and transfer to the fridge or use immediately.",
        ],
    )

    add_heading_styled(doc, "3. Checking (blast chill)", 2)
    add_numbered(
        doc,
        [
            "Leave food out for about 15 minutes so fierce heat can escape; decant from the cooking vessel where possible.",
            "Record time and temperature when food goes into the chiller.",
            "Check temperature again at 30, 60 and 90 minutes; record when below 8°C.",
            "Report to supervisor if not chilled within 90 minutes — refer to Manual Chilling (Safe Method 19).",
        ],
    )

    add_heading_styled(doc, "4. Safe Method 19 — Manual Chilling (backup)", 2)
    add_body(
        doc,
        "Use when blast chilling is unavailable or if food has not reached target in time under Method 18 "
        "(as directed by supervisor). Aim to chill to below 8°C within 90 minutes.",
    )
    add_numbered(
        doc,
        [
            "Avoid cooking oversized batches solely for chilling.",
            "Transfer food to shallow containers.",
            "Move to a cool part of the kitchen (larder/cellar); avoid unscreened open windows/doors.",
            "Where suitable (e.g. rice/pasta), chill under running cold water.",
            "Stand containers in cold water or on ice beds; stir liquids while chilling.",
            "Discard high-risk food that takes too long to chill.",
        ],
    )

    add_heading_styled(doc, "5. Risk Assessment", 2)
    risk_table(
        doc,
        [
            (
                "Bacterial growth / spore regermination from slow cooling",
                "Guests / Staff",
                "High",
                "Follow Safe Method 18/19; chill to below 8°C within 90 mins; record checks; discard if out of time.",
                "Low",
            ),
            (
                "Overloading blast chiller / containers",
                "Guests / Staff",
                "High",
                "Max ~25 mm fill depth; space between trays for airflow; never jam unit full.",
                "Low",
            ),
            (
                "Underloading / inefficient use causing delays",
                "Operations",
                "Low",
                "Plan batches; still prioritise food safety over filling capacity.",
                "Low",
            ),
            (
                "Burns from hot pans into chiller",
                "Staff",
                "Medium",
                "Allow fierce heat to drop ~15 mins; use gloves; do not rush with uncovered hot pans near others.",
                "Low",
            ),
            (
                "Cross-contamination",
                "Guests",
                "Medium",
                "Clean chiller and containers; separate raw/ready-to-eat; good personal hygiene.",
                "Low",
            ),
            (
                "Manual handling of heavy GN trays",
                "Staff",
                "Medium",
                "Do not overfill trays; team lift; store trays properly after use — no unstable stacks.",
                "Low",
            ),
        ],
    )

    add_heading_styled(doc, "6. Required PPE", 2)
    for item in [
        "Heat-resistant gloves when handling hot pans",
        "Apron",
        "Non-slip footwear",
        "Hair net",
    ]:
        add_bullet(doc, item)

    add_do_dont_care(
        doc,
        [
            "Pre-chill the unit",
            "Use shallow containers (~25 mm)",
            "Leave space for air flow",
            "Record temperatures at 30/60/90 mins",
            "Transfer to fridge once below 8°C",
        ],
        [
            "Overfill containers or overload shelves",
            "Cover food so heat is trapped (during blast chill)",
            "Leave high-risk food that failed the 90-minute target in service",
            "Ignore the Safe Method posters on the unit",
        ],
        [
            "Keep posters visible and readable",
            "Clean the chiller regularly",
            "Report faults or failed chill times to supervisor",
            "Train new staff on Methods 18 and 19",
        ],
    )
    page_break(doc)


def bratt_pan_section(doc):
    equipment_section(
        doc,
        "Bratt Pan (Tilting Skillet) — Equipment Risk Assessment & Operating Procedures",
        "Commercial bratt pan",
        "Tilting skillet / bratt pan (asset approx. 25277)",
        "Large stainless-steel bratt pan with temperature dial (up to ~300°C), indicator "
        "lights and a tilting handwheel. The flat lid is sometimes used as a temporary "
        "holding surface for GN trays of cooked product. Incorrect stacking of heavy "
        "metal trays on the lid creates fall, burn and slip hazards.",
        [
            "Confirm the pan is clear, clean and dry before heating; set temperature for the task only.",
            "Do not leave the bratt pan unattended while heating or cooking.",
            "Keep clear of steam and hot surfaces; open the lid away from the face.",
            "When tilting to empty, clear the pour path, warn colleagues, and use the handwheel steadily.",
            "Never stand in the pour path of hot liquids or food.",
            "Do not use the closed lid as long-term storage for heavy GN trays.",
            "If trays must rest briefly on the lid: one layer only, trays fully supported on the rim, not resting on food below, and never stacked crosswise or unevenly.",
            "Move trays to designated racking as soon as practicable; cool before deep stacking for storage.",
            "Isolate power and allow the pan to cool before cleaning; follow manufacturer guidance.",
        ],
        [
            (
                "Burns from hot pan, lid or contents",
                "Staff",
                "High",
                "Heat-resistant PPE; controlled temperature; never leave unattended; cool before deep clean.",
                "Low",
            ),
            (
                "Spill / scald when tilting",
                "Staff",
                "High",
                "Clear pour area; slow handwheel use; warn others; correct fill level — do not overfill.",
                "Low",
            ),
            (
                "Unstable heavy metal trays stacked on lid",
                "Staff",
                "High",
                "No irregular/crosswise stacks; no tray resting on food surface; move to proper racking; team lift heavy trays.",
                "Low",
            ),
            (
                "Slip from spilled product if trays fall",
                "Staff",
                "High",
                "Stable placement only; clean spills immediately; non-slip footwear; keep walkways clear.",
                "Low",
            ),
            (
                "Overloading pan with product",
                "Staff",
                "Medium",
                "Follow chef batch sizes; leave headspace; do not force oversized loads.",
                "Low",
            ),
            (
                "Manual handling of full GN trays",
                "Staff",
                "High",
                "Do not overfill trays; two-person lifts; keep trays at waist height on racks, not high unstable piles.",
                "Low",
            ),
        ],
        [
            "Heat-resistant gloves",
            "Apron",
            "Non-slip footwear",
            "Hair net",
        ],
        extra_notes=[
            "Site observation: trays stacked unevenly on the bratt pan lid are not acceptable — correct immediately.",
            "Report asset/service needs using the unit identification label.",
        ],
        steps_image="steps-bratt-pan-trays.png",
    )


def wrapmaster_section(doc):
    equipment_section(
        doc,
        "Wrapmaster Cling Film & Parchment Cutters — Equipment Risk Assessment",
        "Wrapmaster",
        "Cling film / parchment dispenser with concealed blade",
        "White/grey Wrapmaster table-top dispensers for cling film and parchment. "
        "Each unit has a hinged lid and a concealed cutting blade. Front warning: "
        "CAUTION: CONCEALED BLADE. Units sit on stainless prep tables and must stay "
        "stable and organised.",
        [
            "Place the dispenser on a clear, dry, stable stainless worktop — do not leave it where it can be knocked.",
            "Open the lid carefully; load the correct roll so film/paper feeds square to the cutter.",
            "Pull film/paper evenly; cut using the designed cutting action — never force fingers toward the blade track.",
            "Keep hands clear of the concealed blade at all times; never remove or defeat blade guards.",
            "Close the lid when not in use.",
            "Replace empty cores promptly; do not leave loose rolls free on the bench.",
            "Wipe the housing regularly; do not immerse the unit or blade assembly in water.",
            "Report damaged lids, latches or blades and take the unit out of service if unsafe.",
        ],
        [
            (
                "Cuts / lacerations from concealed blade",
                "Staff",
                "High",
                "Heed CAUTION: CONCEALED BLADE; keep fingers away from cutter; close lid after use; train new staff.",
                "Low",
            ),
            (
                "Dispenser sliding on worktop",
                "Staff",
                "Medium",
                "Stable placement; clear bench; do not pull film with excessive force that drags the unit.",
                "Low",
            ),
            (
                "Trip / slip from film/paper on floor",
                "Staff",
                "Medium",
                "Pick up discarded film immediately; keep walkways clear; organise spare rolls on shelves.",
                "Low",
            ),
            (
                "Hygiene / contamination of film contact surfaces",
                "Guests",
                "Medium",
                "Clean housing; wash hands; keep food debris out of roll compartment.",
                "Low",
            ),
        ],
        [
            "Apron",
            "Non-slip footwear",
            "Hair net",
        ],
        extra_notes=[
            "Applies to both cling film and parchment Wrapmaster cutters on site.",
            "Do not attempt blade repairs unless competent and authorised.",
        ],
        steps_image="steps-wrapmaster.png",
    )


def induction_hob_section(doc):
    equipment_section(
        doc,
        "Buffalo Induction Hob — Equipment Risk Assessment & Operating Procedures",
        "Buffalo",
        "Portable single-zone induction hob",
        "Countertop Buffalo induction hob with ceramic glass cooking zone, MIN–MAX "
        "rotary control, POWER indicator and hot-surface warning symbol. Used on "
        "stainless prep tables; power cord must be managed to avoid trips and contact "
        "with water.",
        [
            "Place the hob on a stable, level, dry stainless surface with ventilation around the unit.",
            "Use only induction-compatible cookware, correctly centred on the marked zone.",
            "Keep the glass clean and dry; do not place empty pans on high power for long periods.",
            "Set power with the dial between MIN and MAX as needed; return to OFF when finished.",
            "Never touch the ceramic zone during or shortly after use — observe the hot-surface warning.",
            "Keep liquids, cloths and plastic containers clear of the cooking zone.",
            "Route the power cord behind the unit — not across walkways or sinks.",
            "Do not overload a single socket circuit with multiple high-draw appliances.",
            "Switch off, unplug and allow to cool before cleaning; wipe with a damp cloth — do not immerse.",
        ],
        [
            (
                "Burns from hot glass / cookware",
                "Staff",
                "High",
                "Hot-surface awareness; use pan handles; allow cool-down; keep zone clear when idle.",
                "Low",
            ),
            (
                "Electric shock / damaged flex",
                "Staff",
                "Medium",
                "Visual check of cord/plug; keep dry; PAT as scheduled; remove if damaged.",
                "Low",
            ),
            (
                "Trip hazard from power cord",
                "Staff",
                "Medium",
                "Cord tidy behind unit; do not stretch across aisles.",
                "Low",
            ),
            (
                "Fire / overheating from unsuitable use",
                "Staff / Kitchen",
                "Medium",
                "Correct cookware; do not leave unattended on high; clear combustibles (boxes, parchment) from beside the hob.",
                "Low",
            ),
            (
                "Overloading electrical circuit",
                "Staff / Building",
                "Medium",
                "Do not share overloaded multi-way adapters; use designated outlet.",
                "Low",
            ),
        ],
        [
            "Apron",
            "Non-slip footwear",
            "Heat-resistant gloves when moving hot pans",
        ],
        extra_notes=[
            "Scratched control panels still need cleaning — report if markings become unreadable.",
            "Keep parchment/cling dispensers and cardboard clear of the hot zone.",
        ],
        steps_image="steps-induction-hob.png",
    )


def heavy_tray_storage_section(doc):
    area_section(
        doc,
        "Heavy Metal Trays, Fryer Shelf & Kitchen Storage — Organisation Risk Assessment",
        "Covers stainless GN pans, baking trays and metal bowls stored on fryer-area "
        "shelving, Craven-style racking, bratt-pan tops and general kitchen shelves. "
        "Focus: prevent overload, under-support, unstable stacks, manual handling injury, "
        "and slip/trip from fallen items or spilled food. Storage must be properly organised.",
        [
            (
                "Unstable / overloaded stacks of heavy metal trays",
                "Staff",
                "High",
                "Stack like with like; keep stacks vertical and within shelf capacity; no crosswise or teetering piles; limit height so top tray can be taken safely.",
                "Low",
            ),
            (
                "Manual handling injury from full GN pans",
                "Staff",
                "High",
                "Do not overfill pans; team lift heavy loads; store heavy items between knuckle and shoulder height where practicable; avoid retrieving from bottom of tall stacks.",
                "Low",
            ),
            (
                "Trays falling from high shelves",
                "Staff",
                "High",
                "Do not stack beyond safe reach; use step stool if authorised; never climb racking; keep top-shelf stacks modest.",
                "Low",
            ),
            (
                "Slip / trip from spilled food or fallen trays",
                "Staff",
                "High",
                "Immediate clean-up; wet-floor signs; clear floor of bins/utensils protruding into walkways; non-slip footwear.",
                "Low",
            ),
            (
                "Protruding utensils on rack sides (snag hazard)",
                "Staff",
                "Medium",
                "Hang tools inward or in designated hooks that do not obstruct aisles.",
                "Low",
            ),
            (
                "Cluttered shelves blocking cleaning / hygiene",
                "Staff / Guests",
                "Medium",
                "Properly organise by type/size; leave access for cleaning; remove broken or unused items.",
                "Low",
            ),
            (
                "Using equipment lids (fryer/bratt) as permanent tray storage",
                "Staff",
                "High",
                "Use designated shelves/racks only; temporary rests must be single-layer and supervised, then cleared.",
                "Low",
            ),
        ],
        [
            "Store empty trays nested neatly on designated Craven / fryer-area shelves — not on hot equipment.",
            "Do not overload shelves or individual stacks; if a stack feels unstable, rebuild it immediately.",
            "Do not under-support trays (e.g. resting a full pan on food in the pan below).",
            "Keep walkways clear of bins, hanging tools and stray film/paper.",
            "Clean as you go; report damaged racking.",
            "Supervisors to check organisation at open/close.",
        ],
        [
            "Non-slip footwear",
            "Apron",
            "Gloves when handling dirty/hot trays as appropriate",
        ],
        notes=[
            "Visual reference: steps-heavy-tray-storage.png in the steps guide folder.",
            "Applies together with fryer, bratt pan and blast-chiller assessments when trays are in use.",
        ],
    )
    # Attach steps image after area section header content — re-add brief visual page note
    from build_combined_risk_assessment import add_steps_guide

    add_heading_styled(doc, "Heavy tray organisation — visual guide", 1)
    add_steps_guide(doc, "steps-heavy-tray-storage.png", "Step-by-step tray storage & organisation")
    add_do_dont_care(
        doc,
        [
            "Stack trays of the same size, neatly nested",
            "Keep heavy items at safe height",
            "Clear spills and fallen film immediately",
            "Use designated racking only",
        ],
        [
            "Overload shelves or build towering unstable stacks",
            "Rest full pans crosswise or on food below",
            "Store trays permanently on fryer/bratt lids",
            "Leave utensils sticking into walkways",
        ],
        [
            "Check shelves at start and end of service",
            "Team-lift heavy full pans",
            "Keep floors dry and organised",
            "Train agency/new staff on storage rules",
        ],
    )
    page_break(doc)


def add_all_extra_equipment(doc):
    """Insert all photo-based equipment sections before sign-off."""
    deep_fryer_section(doc)
    dough_mixer_section(doc)
    blast_chiller_section(doc)
    bratt_pan_section(doc)
    wrapmaster_section(doc)
    induction_hob_section(doc)
    heavy_tray_storage_section(doc)


EXTRA_SECTION_TITLES = [
    "Lincat Deep Fat Fryer",
    "Floor Dough Mixer / Planetary Mixer",
    "Blast Chiller (Safe Methods 18 & 19)",
    "Bratt Pan (Tilting Skillet) & Tray Handling",
    "Wrapmaster Cling Film & Parchment Cutters",
    "Buffalo Induction Hob",
    "Heavy Metal Trays, Fryer Shelf & Storage Organisation",
]
