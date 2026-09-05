export type Slot = "AM" | "PM";
export type Span = { arrival_date: string; arrival_slot: Slot; departure_date: string; departure_slot: Slot };
/** Every (date, slot) a group occupies. Arrival PM skips that morning; departure AM skips that evening. */
export function halfDays(s: Span): { date: string; slot: Slot }[] {
  const out: { date: string; slot: Slot }[] = [];
  const d = new Date(s.arrival_date + "T00:00:00Z"); const end = new Date(s.departure_date + "T00:00:00Z");
  let first = true;
  for (; d <= end; d.setUTCDate(d.getUTCDate() + 1)) {
    const iso = d.toISOString().slice(0, 10); const last = iso === s.departure_date;
    for (const slot of ["AM", "PM"] as Slot[]) {
      if (first && s.arrival_slot === "PM" && slot === "AM") continue;
      if (last && s.departure_slot === "AM" && slot === "PM") continue;
      out.push({ date: iso, slot });
    }
    first = false;
  }
  return out;
}
/** Nights slept = evenings occupied. */
export const nightsOf = (s: Span) => halfDays(s).filter(h => h.slot === "PM").length;
