/** House operations board: handover, checklists, notices, guest requests.
 *  Ideas taken from hotel internal-ops tools (one log instead of WhatsApp),
 *  shaped for a single retreat — not a hotel chain and not a PMS. */

export const OPS_DEPARTMENTS = [
  { code: "HOUSE", label: "Whole house" },
  { code: "FRONT", label: "Front of house" },
  { code: "NIGHT", label: "Night porter" },
  { code: "HK", label: "Housekeeping" },
  { code: "KITCHEN", label: "Kitchen" },
  { code: "RESTAURANT", label: "Restaurant" },
  { code: "MAINT", label: "Maintenance" },
  { code: "GROUNDS", label: "Estate and grounds" },
  { code: "MGMT", label: "Management" },
] as const;

export type OpsDepartment = (typeof OPS_DEPARTMENTS)[number]["code"];
export type OpsShift = "am" | "pm" | "night";
export type GuestRequestStatus = "open" | "doing" | "done";

const DEPT_SET = new Set<string>(OPS_DEPARTMENTS.map(d => d.code));
const LABELS = Object.fromEntries(OPS_DEPARTMENTS.map(d => [d.code, d.label])) as Record<OpsDepartment, string>;

const ROUTE: { dept: OpsDepartment; words: string[] }[] = [
  { dept: "NIGHT", words: ["let me in", "let us in", "locked out", "late arrival", "after hours", "night porter", "come back late", "coming back late"] },
  { dept: "HK", words: ["towel", "linen", "duvet", "pillow", "soap", "shampoo", "clean", "housekeep", "bathroom", "vacuum", "bin"] },
  { dept: "KITCHEN", words: ["food", "meal", "breakfast", "lunch", "dinner", "diet", "vegan", "allergen", "kitchen", "tea", "coffee", "packed"] },
  { dept: "RESTAURANT", words: ["restaurant", "dining", "table", "wine", "waiter"] },
  { dept: "MAINT", words: ["leak", "light", "heat", "heating", "boiler", "broken", "repair", "lock", "window", "wifi", "radiator", "shower"] },
  { dept: "GROUNDS", words: ["garden", "path", "grounds", "lake", "parking", "car park"] },
  { dept: "MGMT", words: ["complaint", "manager", "invoice", "bill"] },
];

export function isOpsDepartment(v: unknown): v is OpsDepartment {
  return typeof v === "string" && DEPT_SET.has(v);
}

export function departmentLabel(code: string | null | undefined): string {
  if (!code) return LABELS.HOUSE;
  return LABELS[code as OpsDepartment] ?? code;
}

export function parseDepartment(v: unknown, fallback: OpsDepartment = "HOUSE"): OpsDepartment {
  const raw = String(v ?? "").trim().toUpperCase();
  return isOpsDepartment(raw) ? raw : fallback;
}

export function parseShift(v: unknown): OpsShift {
  const s = String(v ?? "").trim().toLowerCase();
  if (s === "night" || s === "nights" || s === "overnight" || s === "porter") return "night";
  if (s === "pm" || s === "evening") return "pm";
  return "am";
}

export function parseRequestStatus(v: unknown): GuestRequestStatus {
  const s = String(v ?? "").trim().toLowerCase();
  if (s === "doing" || s === "in_progress" || s === "progress") return "doing";
  if (s === "done" || s === "closed") return "done";
  return "open";
}

/** Send a free-text guest ask to the department that can actually do it. */
export function routeGuestRequest(text: string, explicit?: string | null): OpsDepartment {
  const chosen = String(explicit ?? "").trim().toUpperCase();
  if (isOpsDepartment(chosen)) return chosen;
  const hay = text.toLowerCase();
  for (const row of ROUTE) {
    if (row.words.some(w => hay.includes(w))) return row.dept;
  }
  return "FRONT";
}

export function shiftLabel(shift: string): string {
  if (shift === "night") return "Night";
  return shift === "pm" ? "Evening" : "Morning";
}

export function groupByDepartment<T extends { department: string | null }>(items: T[]): { code: OpsDepartment; label: string; items: T[] }[] {
  const buckets = new Map<OpsDepartment, T[]>();
  for (const item of items) {
    const code = parseDepartment(item.department, "HOUSE");
    const list = buckets.get(code) ?? [];
    list.push(item);
    buckets.set(code, list);
  }
  return OPS_DEPARTMENTS
    .filter(d => buckets.has(d.code))
    .map(d => ({ code: d.code, label: d.label, items: buckets.get(d.code)! }));
}

export function checklistProgress(items: { done: boolean }[]): { done: number; total: number } {
  return { done: items.filter(i => i.done).length, total: items.length };
}

export function ownGuestRequests<T extends { guestAccountId?: string | null; guestEmail?: string | null }>(
  items: T[],
  guest: { id: string; email: string },
): T[] {
  const email = guest.email.toLowerCase();
  return items.filter(i => i.guestAccountId === guest.id || (i.guestEmail && i.guestEmail.toLowerCase() === email));
}
