/** Night porter — how the house is kept after the day team goes home.
 *  Shaped like a small-hotel night shift, for one retreat, not a chain. */

export type NightDuty = {
  title: string;
  due_time: string | null;
  sort_order: number;
  phase: "lockup" | "guests" | "station" | "handover";
};

export const NIGHT_PHASES: { code: NightDuty["phase"]; title: string; about: string }[] = [
  { code: "lockup", title: "Lock-up and the round", about: "Walk the house twice. Doors, windows, lights. Double-check." },
  { code: "guests", title: "Guests after hours", about: "You are the front door. Let people in and out. Never leave the latch off." },
  { code: "station", title: "Front, tea and the safe", about: "Dirty cups away. Station filled. Tables clean. Valuables in the safe." },
  { code: "handover", title: "Before you go home", about: "Write the night note for whoever opens in the morning." },
];

export const NIGHT_DUTIES: NightDuty[] = [
  { phase: "lockup", sort_order: 10, due_time: "22:00", title: "First lock-up — every external door closed and checked" },
  { phase: "lockup", sort_order: 11, due_time: "22:00", title: "Close and double-check windows on the public floors" },
  { phase: "lockup", sort_order: 12, due_time: "22:15", title: "Turn off unused lights; keep fire-escape and night-lights on" },
  { phase: "lockup", sort_order: 13, due_time: "01:00", title: "Second building round — doors, windows and fire exits again" },
  { phase: "guests", sort_order: 20, due_time: null, title: "Know tonight's late arrivals and who is still out" },
  { phase: "guests", sort_order: 21, due_time: null, title: "Let guests in at the front door after hours" },
  { phase: "guests", sort_order: 22, due_time: null, title: "Let guests out and back in at night — never leave the latch off" },
  { phase: "station", sort_order: 30, due_time: null, title: "Keep the front area organised and quiet" },
  { phase: "station", sort_order: 31, due_time: null, title: "Collect dirty cups, take them to the wash, keep the sideboard safe" },
  { phase: "station", sort_order: 32, due_time: null, title: "Wipe and reset tables in the front and lounge" },
  { phase: "station", sort_order: 33, due_time: "05:30", title: "Inventory the tea and coffee station" },
  { phase: "station", sort_order: 34, due_time: "05:30", title: "Fill teas, cups and milk so the morning desk is ready" },
  { phase: "station", sort_order: 35, due_time: "05:45", title: "Tea and coffee area clean, organised and filled" },
  { phase: "station", sort_order: 36, due_time: null, title: "Keys, cash and lost property in the safe" },
  { phase: "handover", sort_order: 40, due_time: "06:30", title: "Write the night handover for the morning receptionist" },
];

export const NIGHT_HOW = [
  "The night porter is the house after the day team has gone home. Sit the front so a guest can find you, then walk the house — it is a round, not a desk job.",
  "Two lock-ups: after the house settles (around 22:00) and again in the small hours. Doors, windows, fire exits. Double-check. Lights off in empty rooms; keep escape lighting.",
  "After hours, guests come to the front door. You let them in and out. Never leave the latch off.",
  "Between rounds, keep the front, lounge and tea station tidy. Dirty cups to the wash. Tables wiped. Take a short inventory of teas, cups, milk and biscuits, then fill them for the morning.",
  "Cash, keys and lost property go in the safe.",
  "Last job before you clock out: write the night handover for whoever opens — who arrived late, what was left unlocked, what ran out, who needed help.",
];

export function dutiesByPhase(): { phase: (typeof NIGHT_PHASES)[number]; items: NightDuty[] }[] {
  return NIGHT_PHASES.map(phase => ({
    phase,
    items: NIGHT_DUTIES.filter(d => d.phase === phase.code),
  }));
}

export function parseDutySlot(v: unknown): "AM" | "PM" | "NIGHT" {
  const s = String(v ?? "").trim().toUpperCase();
  if (s === "NIGHT" || s === "NIGHTS" || s === "OVERNIGHT") return "NIGHT";
  if (s === "PM" || s === "EVENING") return "PM";
  return "AM";
}
