/** Living house manuals. Defaults live in code; the house can edit or withdraw them. */

import { OPS_DEPARTMENTS, type OpsDepartment } from "./board.ts";

export const MANUAL_KINDS = ["APP", "SOP", "SAFETY", "LOOK", "HOSPITALITY"] as const;
export type ManualKind = (typeof MANUAL_KINDS)[number];
export type ManualStatus = "live" | "withdrawn";

export type ManualStep = { title: string; look: string; act: string; note?: string };
export type ManualNode = { title: string; caption: string };

export type ManualChapter = {
  slug: string;
  department: OpsDepartment;
  kind: ManualKind;
  title: string;
  summary: string;
  body: string;
  steps: ManualStep[];
  diagram: ManualNode[];
  sort_order: number;
};

export const MANUAL_KIND_LABEL: Record<ManualKind, string> = {
  APP: "How to use the house",
  SOP: "How the work is done",
  SAFETY: "Safety",
  LOOK: "How it should look",
  HOSPITALITY: "How we meet people",
};

export function isManualKind(v: unknown): v is ManualKind {
  return typeof v === "string" && (MANUAL_KINDS as readonly string[]).includes(v);
}

export function parseManualStatus(v: unknown): ManualStatus {
  return String(v ?? "").toLowerCase() === "withdrawn" ? "withdrawn" : "live";
}

export function chapterToPocketBody(ch: Pick<ManualChapter, "summary" | "body" | "steps">): string {
  const steps = ch.steps.map((s, i) =>
    `${i + 1}. ${s.title}\n   Look: ${s.look}\n   Act: ${s.act}${s.note ? `\n   Note: ${s.note}` : ""}`).join("\n\n");
  return `What it should look like\n${ch.summary}\n\nHow to act\n${ch.body}\n\nThe steps\n${steps}`;
}

export const HOUSE_MANUALS: ManualChapter[] = [
  {
    slug: "app-how-to-use",
    department: "HOUSE",
    kind: "APP",
    title: "How to use this house",
    sort_order: 10,
    summary: "Three doors, one house. The desk computer opens the House. A phone opens the Pocket. Guests open the Guest book. Nobody shares a login. There is no password — you are let in by your house email.",
    body: "This is the map of the app. Learn the doors first, then the page that belongs to your department. If a page is grey, your role does not open it — ask your head of department, do not borrow someone else's screen.\n\nHouse (desk): Today, House log, Front desk, Night porter, Department boards, Kitchen, Housekeeping, Maintenance, Payroll, Manual, Staff corner.\nPocket (phone): Clock, Holiday, Duty, House log, Front desk, Night, Manual, SOP.\nGuest book: the guest's own stay only. Never open House or Pocket in front of a guest.\n\nKiteline (kiteline.uk) is a different product. The published rota and PIN clock live there. Vedanta clock and the house duty board live here. Do not mix Kiteline PINs into this login.",
    diagram: [
      { title: "House", caption: "Desk · the full board" },
      { title: "Pocket", caption: "Phone · your shift" },
      { title: "Guest book", caption: "Guests · their stay only" },
    ],
    steps: [
      { title: "Sign in", look: "The forest-and-paper sign-in. Your name appears. No password box.", act: "Type your house email. Open House on a desk, Pocket on a phone.", note: "If the house has not added you yet, the door stays shut." },
      { title: "Clock", look: "Payroll (House) or Clock (Pocket) shows in or out.", act: "Clock in when you start. Clock out when you leave. Hours count from that." },
      { title: "Today", look: "Arrivals, rooms tonight, dinner covers.", act: "Read it before service. Front desk and Night porter both use who is arriving late." },
      { title: "House log", look: "Guest asks, daily ticks, handover notes, notices.", act: "Tick your round. Take a guest ask. Leave a note for the next shift instead of WhatsApp." },
      { title: "Front desk", look: "Today's water, tomorrow's fruit, teas, biscuits, Suma and organic wholesale.", act: "Order fruit and stock through the kitchen a day ahead." },
      { title: "Night porter", look: "Lock-up, late doors, tea station, morning handover.", act: "Walk the house twice. Let people in at the front door. Write the night note before you go." },
      { title: "Department boards", look: "Notes plus photographs of cupboards, machines, racks.", act: "Add a small picture so a new starter can find the thing. Keep photos under 500 KB." },
      { title: "Kitchen", look: "FOH orders land on the kitchen board.", act: "See the crate, mark seen, then done when mise includes it." },
      { title: "Manual", look: "This book — chapters by department, Look and Act side by side.", act: "Read your chapter. Mark it received on the Pocket. Heads of department may edit or withdraw a chapter." },
      { title: "Payroll and Staff", look: "Hours and duty in the house. Pay rates stay house-only.", act: "Never show a guest or the Pocket a pay rate." },
    ],
  },
  {
    slug: "app-receive-and-act",
    department: "HOUSE",
    kind: "APP",
    title: "How you receive an SOP, and how you act",
    sort_order: 20,
    summary: "A live chapter sits in Manual for anyone on the house. A sent SOP arrives on your Pocket under SOP with your name on it. Withdrawn chapters leave the Pocket. The paper look is the same: What it should look like, then How to act.",
    body: "Receive: when a head of department sends a chapter, it appears on your Pocket → SOP. You also always have Pocket → Manual for live chapters.\n\nRead: open it. Mark as read means I have received this and I know what it asks of me. That is the receipt.\n\nAct: do the Act column until the Look column is true. If you cannot finish, tick what you did on the House log and write a handover — do not leave a silent gap.\n\nChange: only sop.manage (general manager, operations, front office, housekeeping supervisor, and the roles given that key) can edit wording or withdraw a chapter. Withdrawn means it no longer teaches the house. Old receipts stay on the Pocket so we know who was taught the old version.\n\nNever invent a guest's allergen, room number in a public voice, or another guest's stay. If the manual and a guest disagree, stop and ask the head of department.",
    diagram: [
      { title: "Write", caption: "HoD edits the chapter" },
      { title: "Send", caption: "Lands on your Pocket" },
      { title: "Read", caption: "Mark received" },
      { title: "Act", caption: "Make the Look true" },
      { title: "Withdraw", caption: "Old teaching leaves the floor" },
    ],
    steps: [
      { title: "Find it", look: "House → Manual, or Pocket → Manual / SOP.", act: "Open your department first. Whole-house chapters sit under Whole house." },
      { title: "Receive", look: "An unread SOP on the Pocket has no read time.", act: "Read it on shift, not later at home if it is safety." },
      { title: "Mark received", look: "The button becomes gone; read time is stored.", act: "Press Mark as read only after you understand the Look and the Act." },
      { title: "Do the work", look: "The room, pass or desk matches the Look column.", act: "Follow Act. Tick the House log. Photograph the cupboard on the department board if a new person will need it." },
      { title: "Cannot finish", look: "A handover note exists for the next person.", act: "Write what stopped you. Do not hide a safety miss." },
    ],
  },
  {
    slug: "house-how-we-meet",
    department: "HOUSE",
    kind: "HOSPITALITY",
    title: "How we meet a guest",
    sort_order: 30,
    summary: "The house looks quiet, warm and unsurprised. A guest is greeted with the eyes first, then a smile, then their name if we know it. We never look busy at a person. We never discuss another guest.",
    body: "Hotels from Kyoto to Paris agree on this, and a retreat needs it more: the guest should feel they have arrived somewhere that already knew they were coming.\n\nOmotenashi (Japan): notice before they ask. A glass, a coat, a quiet path to the room.\nRitz-Carlton habit: use the name, own the problem, do not point — walk with them.\nIndian house habit: a slight greeting, no rush, no loud talk in the hall.\nEuropean hall: stand when a guest approaches the desk if you were sitting.\n\nSmile is not a performance. It is the face you have when you are glad they are here. If you are upset, step off the floor before the guest sees it.\n\nPrivacy is hospitality. Room numbers are never spoken in the lounge. Another guest's booking does not exist in your mouth.",
    diagram: [
      { title: "See", caption: "Eyes up, phone down" },
      { title: "Smile", caption: "Glad they are here" },
      { title: "Name", caption: "If we know it" },
      { title: "Help", caption: "Walk, do not point" },
      { title: "Leave", caption: "Quiet behind them" },
    ],
    steps: [
      { title: "Approach", look: "You are the first face. Phone is not in your hand.", act: "Stand or turn fully. 'Good morning' then the name. Wait for them to speak." },
      { title: "Listen", look: "You are not already reaching for a key.", act: "Hear the whole ask. Repeat the need once so they know you have it." },
      { title: "Fix", look: "The thing happens, or a real person is on it.", act: "If it is not your department, take it to the House log. Do not say 'that's not my job'." },
      { title: "Allergens and diet", look: "You never guess.", act: "Check the book. If unsure, kitchen or retreat manager — not a shrug." },
      { title: "Recovery", look: "The guest is not left holding the problem.", act: "Apologise once, fix it, tell the head of department. Do not argue the story." },
    ],
  },
  {
    slug: "front-desk-day",
    department: "FRONT",
    kind: "SOP",
    title: "Front of house — the day",
    sort_order: 40,
    summary: "The welcome desk is clear. Walkers and Nairn's (gluten-free) tins sit together, labelled. Plant milks in the fridge. Suma bags in the tin, loose teas from organic wholesale in the caddies. Today's water is in the urn. Cups on the restaurant rack are clean. The person at the desk looks up.",
    body: "Tea and coffee is run from reception. At 09:00 the coffee machines are cleaned, filters emptied and put on to clean. Dirty cups go to the wash as soon as you see them; clean cups come back to the restaurant.\n\nAlways ready: Walkers, gluten-free Nairn's, oat and soya or almond, dairy from the kitchen, bananas, herbal and loose teas. Order fruit and stock through the kitchen a day ahead — Front desk page, then Kitchen sees the order.\n\nThe seven waters live on Front desk. Look today and tomorrow. Make today's. Order tomorrow's fruit now.",
    diagram: [
      { title: "09:00", caption: "Machines and filters" },
      { title: "Cups", caption: "Dirty away, clean back" },
      { title: "Water", caption: "Today's recipe" },
      { title: "Stock", caption: "Teas, milk, biscuits" },
      { title: "Order", caption: "Kitchen, a day ahead" },
    ],
    steps: [
      { title: "Open the desk", look: "Sideboard dressed, names of arrivals known, keys ready.", act: "Read Today and Front desk. Tick Welcome desk on the House log." },
      { title: "Nine o'clock clean", look: "Machines empty, filters on to clean, no overnight grounds.", act: "Clean, empty filters, start the clean cycle. Tick the 09:00 lines." },
      { title: "Cups", look: "No dirty cup on a table. Restaurant racks full of clean.", act: "Carry dirty to the wash. Bring clean back. Do not stack wet on the sideboard." },
      { title: "Water", look: "Urn labelled with today's fruit. Ice only at service.", act: "Follow today's recipe. Order tomorrow's fruit from Front desk." },
      { title: "Stock", look: "Both biscuit tins full and labelled. Plant milks dated.", act: "Check Suma and loose caddies. Send a kitchen order if short." },
      { title: "Guests", look: "Greeted by name. Diet confirmed. House phone explained.", act: "Never say a room number in the lounge. Guest book is theirs alone." },
    ],
  },
  {
    slug: "night-porter",
    department: "NIGHT",
    kind: "SOP",
    title: "Night porter — the night",
    sort_order: 50,
    summary: "The house is locked and quiet. One person is findable at the front. Public lights are off; escape lights stay on. The tea station is reset for morning. A written night handover is waiting for whoever opens.",
    body: "The night porter is the house after the day team has gone home. Sit the front so a guest can find you, then walk the house — it is a round, not a desk job.\n\nHotels from London to hill stations run the same bones: two lock-ups, a late door, a tidy lounge, a note for morning. Here that means doors and windows, lights, letting people in and out without leaving the latch off, dirty cups to the wash, inventory of teas and cups, fill for morning, keys and lost property in the safe, then the handover.",
    diagram: [
      { title: "22:00", caption: "First lock-up" },
      { title: "Door", caption: "Let in, latch on" },
      { title: "01:00", caption: "Second round" },
      { title: "05:30", caption: "Tea station filled" },
      { title: "06:30", caption: "Note for morning" },
    ],
    steps: [
      { title: "First lock-up", look: "Every external door closed. Public windows caught.", act: "Walk the route on the Night porter board photographs. Double-check. Tick the 22:00 lines." },
      { title: "Lights", look: "Empty rooms dark. Stairs and fire exits lit.", act: "Turn off unused lights. Never kill escape lighting." },
      { title: "Guests after hours", look: "You are at the front door, not a latch left off.", act: "Know late arrivals from Today. Let them in and out. Log asks on the House log." },
      { title: "Second round", look: "The same doors still closed in the small hours.", act: "Walk again around 01:00. Fire exits clear." },
      { title: "Station", look: "Front organised. Tables wiped. Cups gone. Teas and milk ready.", act: "Inventory, fill, cups to the wash, valuables in the safe." },
      { title: "Handover", look: "A Night note on the House log for the morning receptionist.", act: "Who arrived late, what was unlocked, what ran out, who needed help. Then clock out." },
    ],
  },
  {
    slug: "hk-room",
    department: "HK",
    kind: "SOP",
    title: "Housekeeping — the room",
    sort_order: 60,
    summary: "A ready room looks unused and kind: bed to house standard, towels facing the same way, bathroom dry and stocked, bin empty, window checked, no cleaner in sight. Stay-over is lighter; departure is a full change and a supervisor look.",
    body: "Work like a European floor team with a Japanese finish: clean as you go, leave no trolley in a guest's eye-line, never enter if the guest is in the room without a clear invitation.\n\nStay-over: refresh, do not strip a bed that is still made unless they asked. Departure: full linen, supervisor inspects before Ready.\n\nChemicals stay labelled (COSHH). Never mix bleach and acid. Lost property goes to the house log and the safe — not a pocket.\n\nFaults: write them on Maintenance with the room or the building area before you mark the room inspected.",
    diagram: [
      { title: "Knock", caption: "Housekeeping — wait" },
      { title: "Bed", caption: "House standard" },
      { title: "Bath", caption: "Dry, stocked" },
      { title: "Fault", caption: "Maintenance board" },
      { title: "Ready", caption: "Supervisor on departures" },
    ],
    steps: [
      { title: "Enter", look: "Door open with your cart as a door-stop. Guest not surprised.", act: "Knock, say Housekeeping, wait. If they are in, ask when to return." },
      { title: "Bed and linen", look: "Even, tight, pillows facing the same way.", act: "Stay-over: tidy. Departure: full change. Landing cupboard: stay-over vs departure stacks — see the photographs." },
      { title: "Bathroom", look: "No hair, no smear on the glass, amenities filled.", act: "Clean, restock, report a drip on Maintenance." },
      { title: "Floor and air", look: "Vacuum lines or a dry mop, bin empty, window catch checked.", act: "Empty bins on the round. Walk corridors and landings." },
      { title: "Leave", look: "Room looks as if nobody just cleaned it.", act: "Trolley off the landing. Tick the House log. Never discuss who stayed in the room." },
    ],
  },
  {
    slug: "kitchen-brigade",
    department: "KITCHEN",
    kind: "SOP",
    title: "Kitchen — how the brigade works",
    sort_order: 70,
    summary: "The pass is clear. Each board has a colour and a job. The allergen board matches today's guests. The FOH crate is a real list, not a WhatsApp. Voices are short. Nobody crosses a raw board onto a ready plate.",
    body: "We take the French brigade for who owns what, Japanese mise for how a station looks before service, UK hygiene for temperatures, and the quiet of an Indian retreat kitchen for timing vegetarian and allergen plates without drama.\n\nHead chef / kitchen manager owns the pass and the allergen board.\nSous keeps the clock and the sections.\nChef de partie owns a section — they do not wander.\nCommis and assistants fetch, prep, and never send a plate.\nKitchen porter (plongeur) owns wash-up and the floor — the pass depends on them.\n\nFOH orders (waters, bananas, plant milk, biscuits) arrive on Kitchen. Treat them as mise for reception, not a favour.\n\nKiteline Ordering is how supplier food is bought. This House kitchen board is how the house talks to itself.",
    diagram: [
      { title: "Mise", caption: "Station set, Japan" },
      { title: "Section", caption: "Brigade, France" },
      { title: "Allergen", caption: "Board, UK 14" },
      { title: "Pass", caption: "One voice" },
      { title: "FOH crate", caption: "Reception mise" },
    ],
    steps: [
      { title: "Before service", look: "Fridges 0–5°C, freezer −18°C or below, probe wiped, boards dry.", act: "Log temps. Hands, apron, hair. Allergen board vs today's guests. Open the FOH crate." },
      { title: "During service", look: "Pass clear. Tickets or covers in one place. No unused knives in the sink.", act: "Call allergies out loud at the pass. Clean as you go. Hot hold above 63°C." },
      { title: "FOH orders", look: "Crate seen, then done, fruit for tomorrow pulled.", act: "Mark the order seen, then done. Do not leave reception guessing." },
      { title: "After service", look: "Food labelled, cool within 90 minutes, walk-in locked.", act: "Follow Kitchen closing. Waste logged. Lights and non-essential kit off." },
    ],
  },
  {
    slug: "kitchen-safety",
    department: "KITCHEN",
    kind: "SAFETY",
    title: "Kitchen — safety and allergens",
    sort_order: 80,
    summary: "A safe kitchen looks dull: dry floors, handles in, lids on, fire cloth in reach, raw and ready apart, allergen board honest. Nobody runs. Nobody tastes from a guest plate and sends it.",
    body: "This is the hotel and UK food-hygiene core. It is not optional and it is not 'for environmental health day'.\n\nTemperature: fridge 0–5°C, freezer −18°C or below, cook to a safe core, hot hold above 63°C, cool from hot to cold in 90 minutes, then fridge.\n\nFourteen allergens (UK): celery, cereals with gluten, crustaceans, egg, fish, lupin, milk, molluscs, mustard, peanut, sesame, soya, sulphur dioxide, tree nuts. If you do not know, the plate does not leave.\n\nColour boards stay in their colour. Wash hands after raw, after allergen work, after bins, after face or phone.\n\nFire: never throw water on oil. Lid, cloth, extinguisher you are trained for. Knives: down, not in a sink of water. Slips: mop and sign, then dry.\n\nBurns and cuts: cold water, tell the head chef, write it. Do not hide an injury to 'finish service'.",
    diagram: [
      { title: "Hands", caption: "Wash, then work" },
      { title: "Boards", caption: "Colour stays colour" },
      { title: "Heat", caption: "63° · 90 minutes" },
      { title: "Allergen", caption: "If unsure, stop" },
      { title: "Fire / oil", caption: "Lid, never water" },
    ],
    steps: [
      { title: "Hands and kit", look: "Clean apron, tied hair, no jewellery that traps food.", act: "Wash, dry, glove only when the job needs it — gloves are not a substitute for washing." },
      { title: "Separation", look: "Raw below ready in the fridge. Allergen mise on its own tray.", act: "Never use a tasting spoon twice. Never 'just pick out' the nuts." },
      { title: "Heat and cold", look: "Temps written. Probe clean.", act: "Log opening temps. Probe the thickest part. Cool in shallow pans." },
      { title: "Oil and fire", look: "Pan handles in. Cloth on the rail. Exit clear.", act: "Lid on a flare. Shout. Do not carry a burning pan through the pass." },
      { title: "Floor and knives", look: "Dry floor, knives visible in the block or on the magnet.", act: "Mop, sign, dry. Never leave a knife in the wash-up water." },
      { title: "If someone is hurt", look: "The line has stopped for that person.", act: "First aid, head chef, record. Service waits." },
    ],
  },
  {
    slug: "kitchen-open-close",
    department: "KITCHEN",
    kind: "SOP",
    title: "Kitchen — opening and closing",
    sort_order: 90,
    summary: "Opening looks ready twenty minutes before the first plate. Closing looks as if the next chef could cook without asking where yesterday went.",
    body: "Opening: temps, hands, allergen board, dry store, FOH crate, hot-hold, probe.\nClosing: cool and label, sanitise, waste, bins, fridge doors, lights, lock dry store and walk-in.\n\nThese two checks already sit as short SOPs on the Pocket. This chapter is the fuller Look and Act. Heads of kitchen may edit the wording when the menu or the kit changes.",
    diagram: [
      { title: "Open", caption: "Temps · allergens · crate" },
      { title: "Service", caption: "Pass · 63°" },
      { title: "Close", caption: "Cool · lock" },
    ],
    steps: [
      { title: "Open", look: "Logged temps, board matches the book, FOH fruit pulled.", act: "Tick Kitchen opening on the House log. Raise a FOH shortage as an order, not a shout." },
      { title: "Close", look: "Nothing unnamed in a fridge. Floor dry. Door locked.", act: "Tick Kitchen closing. Handover if something failed a temp — do not hide it." },
    ],
  },
  {
    slug: "restaurant-service",
    department: "RESTAURANT",
    kind: "SOP",
    title: "Restaurant — the room",
    sort_order: 100,
    summary: "Tables even, glasses at the same height, napkins the house way, water poured without asking twice, allergen spoken at the table not across the room. The pass is thanked, not shouted at.",
    body: "Classic European service sequence, quiet enough for a retreat: greet, water, diet check, serve ladies or the host as the table prefers, clear from the right if that is the house way and stay consistent, never scrape plates at the table.\n\nTea station after breakfast is shared with Front of house — clean cups live on the restaurant racks. If FOH is short, you restock from wash-up, not from dirty tables.\n\nWine and water: hold the label, never reach across a face. Spill: own it, replace, tell the manager. Do not make the guest feel clumsy.",
    diagram: [
      { title: "Set", caption: "Even, quiet, ready" },
      { title: "Greet", caption: "Name if we know it" },
      { title: "Diet", caption: "At the table, low voice" },
      { title: "Serve", caption: "One house way" },
      { title: "Clear", caption: "No scrape" },
    ],
    steps: [
      { title: "Briefing", look: "Whole team knows covers, allergens, and who is celebrating nothing loudly.", act: "Tick Service briefing. Read the kitchen allergen board." },
      { title: "Meet the table", look: "You arrived before they had to wave.", act: "Smile, name, water, diet. Never announce an allergy to the next table." },
      { title: "Pass", look: "Hot food travels covered if the walk is long.", act: "Allergy plates in your hand, not on a stacked tray with other food." },
      { title: "After", look: "Room reset, cups on the racks, no dirty glass in the lounge.", act: "Help FOH if the tea station is short. Write a handover if a guest was unhappy." },
    ],
  },
  {
    slug: "maint-faults",
    department: "MAINT",
    kind: "SOP",
    title: "Maintenance — faults and plant",
    sort_order: 110,
    summary: "A fault on the board has a clear title, a place (room or building area), a reporting department, and a priority. Safety is red. A locked-out room is honest. Plant looks labelled, not mysterious.",
    body: "Hotel engineering habit: if it is not written, it did not happen. Walk the boiler and plant, lights and fire doors, entrance safe — those ticks are on the House log every day.\n\nSafety if anyone could be hurt. Urgent if a room or service is blocked. Tick 'room can't be used' only when it must come off the board.\n\nPhotographs of valve tags and the fire-door map live on the Night porter and Maintenance department boards so a night porter can find a stopcock without waking the estate at 2 a.m. unless they must.",
    diagram: [
      { title: "See", caption: "What is wrong" },
      { title: "Write", caption: "Where · who · priority" },
      { title: "Make safe", caption: "Then repair" },
      { title: "Close", caption: "Tell the reporter" },
    ],
    steps: [
      { title: "Report", look: "The card can be read by someone who was not there.", act: "Title, room or area, department, priority. No private guest names on a shared card." },
      { title: "Daily walk", look: "Plant quiet, fire doors not wedged, entrance safe.", act: "Tick the Maintenance round. Photograph a new tag on the department board." },
      { title: "Night call", look: "Night porter can find the first stopcock from a picture.", act: "Keep the board photos honest. If it is safety, they wake you." },
    ],
  },
  {
    slug: "grounds-estate",
    department: "GROUNDS",
    kind: "SOP",
    title: "Estate and grounds — the walk",
    sort_order: 120,
    summary: "The drive is clear, the lakeside path is honest about mud, tools are away, guests are greeted if they pass you but never delayed by a machine in their only path.",
    body: "Car park and entrance, lakeside path, hose points, salt bin — the House log already names the daily walk. Work around the house, not through a silent retreat.\n\nMachines yield to a guest. Fuel and chemicals stay labelled and locked. If a path is unsafe, cone it and tell Front of house so they can warn arrivals.\n\nFOH water fruit is kitchen mise, not a grounds pick unless the garden has been asked.",
    diagram: [
      { title: "Entrance", caption: "Clear, kind" },
      { title: "Path", caption: "Walk it" },
      { title: "Tools", caption: "Away, locked" },
      { title: "Tell FOH", caption: "If a path is shut" },
    ],
    steps: [
      { title: "Morning", look: "Cars can land. No hose across the door.", act: "Tick Car park and entrance. Greet, then step aside." },
      { title: "Path", look: "You have walked it, not assumed it.", act: "Tick Lakeside path. Report a fault or a fallen branch." },
      { title: "Guests", look: "A tractor is not the welcome.", act: "Stop, smile, let them pass. No radio chatter about who is staying." },
    ],
  },
  {
    slug: "mgmt-the-board",
    department: "MGMT",
    kind: "SOP",
    title: "Management — the board and the book",
    sort_order: 130,
    summary: "The house has one log, one manual, one duty board. WhatsApp is not a record. Pay stays in the house. Guests never see staff hours.",
    body: "You edit manuals, withdraw teaching that is wrong, place people on AM / PM / Night, and sign holiday (heads of department first, then general manager).\n\nComplaints, invoices and manager asks route to Management on the House log. Do not leave a complaint only in a private message.\n\nKiteline remains the published rota. This house holds the duty board and the Vedanta clock so night and day can hand over on the same page.",
    diagram: [
      { title: "Manual", caption: "Edit or withdraw" },
      { title: "Duty", caption: "AM · PM · Night" },
      { title: "Log", caption: "One place" },
      { title: "Pay", caption: "House only" },
    ],
    steps: [
      { title: "Teach", look: "The live chapter matches how the house actually works.", act: "Edit Manual. Send to the Pocket when people must receipt it. Withdraw the old one." },
      { title: "Cover", look: "Night is a real slot, not a missing person.", act: "Place Night on Staff corner. Check Payroll against the clock." },
      { title: "Guest trouble", look: "A Management card exists, not a rumour.", act: "Take the ask on the House log. Recover with the guest, then the team." },
    ],
  },
];

export function manualsForDepartment(code: string, chapters: ManualChapter[] = HOUSE_MANUALS): ManualChapter[] {
  return chapters.filter(c => c.department === code).sort((a, b) => a.sort_order - b.sort_order);
}

export function defaultManual(slug: string): ManualChapter | undefined {
  return HOUSE_MANUALS.find(c => c.slug === slug);
}

export function manualDepartments(): { code: string; label: string }[] {
  const used = new Set(HOUSE_MANUALS.map(c => c.department));
  return OPS_DEPARTMENTS.filter(d => used.has(d.code)).map(d => ({ code: d.code, label: d.label }));
}
