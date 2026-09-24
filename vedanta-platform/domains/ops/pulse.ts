/** Live house pulse — counts only, no invented money. */

export type HouseBeat = { time: string; label: string };

export function houseDayBeats(checkInFrom = "15:00", checkOutBy = "11:00"): HouseBeat[] {
  return [
    { time: "06:30", label: "Kitchen breakfast production" },
    { time: "07:30", label: "Breakfast service" },
    { time: "09:00", label: "Housekeeping starts" },
    { time: checkOutBy.slice(0, 5), label: "Check-outs complete" },
    { time: "12:00", label: "Lunch preparation" },
    { time: "13:00", label: "Programme session" },
    { time: checkInFrom.slice(0, 5), label: "Guest check-in" },
    { time: "18:00", label: "Dinner service" },
    { time: "20:00", label: "Evening programme" },
  ];
}

export type RoomStatusCounts = {
  ready: number;
  dirty: number;
  cleaning: number;
  inspected: number;
  occupied: number;
  out_of_order: number;
  out_of_service: number;
};

export function roomStatusCounts(rows: { status: string; staff_only?: boolean }[]): RoomStatusCounts {
  const c: RoomStatusCounts = { ready: 0, dirty: 0, cleaning: 0, inspected: 0, occupied: 0, out_of_order: 0, out_of_service: 0 };
  for (const r of rows) {
    if (r.staff_only) continue;
    if (r.status === "VACANT_CLEAN") c.ready += 1;
    else if (r.status === "VACANT_DIRTY") c.dirty += 1;
    else if (r.status === "CLEANING") c.cleaning += 1;
    else if (r.status === "INSPECTED") { c.inspected += 1; c.ready += 1; }
    else if (r.status === "OCCUPIED") c.occupied += 1;
    else if (r.status === "OUT_OF_ORDER") c.out_of_order += 1;
    else if (r.status === "OUT_OF_SERVICE") c.out_of_service += 1;
  }
  return c;
}

export function guestHeadcount(groups: { expected_guests?: number | null }[]): number {
  return groups.reduce((n, g) => n + (Number(g.expected_guests) || 0), 0);
}

export function currentBeat(beats: HouseBeat[], nowHm: string): HouseBeat | null {
  let last: HouseBeat | null = null;
  for (const b of beats) {
    if (b.time <= nowHm) last = b;
  }
  return last;
}
