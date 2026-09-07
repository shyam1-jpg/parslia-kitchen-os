/** Closed clock pairs → hours. Open IN with no OUT counts up to `now`. */
export type Punch = { at: Date; kind: "IN" | "OUT" };

export function hoursFromPunches(punches: Punch[], now = new Date()): number {
  const ordered = [...punches].sort((a, b) => +a.at - +b.at);
  let hours = 0;
  let open: Date | null = null;
  for (const p of ordered) {
    if (p.kind === "IN") { if (!open) open = p.at; continue; }
    if (p.kind === "OUT" && open) { hours += (+p.at - +open) / 3_600_000; open = null; }
  }
  if (open) hours += Math.max(0, +now - +open) / 3_600_000;
  return Math.round(hours * 100) / 100;
}

export function canPunch(last: "IN" | "OUT" | null, kind: "IN" | "OUT"): boolean {
  if (kind === "IN") return last !== "IN";
  return last === "IN";
}
