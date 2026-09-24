/** Shape a guest's private stay. Rooms from other bookings must never appear. */

export type StayRoom = { number: string; section: string | null };

export function roomsForStay(bookingId: string | null | undefined, rows: { booking_id: string; number: string; section: string | null }[]): StayRoom[] {
  if (!bookingId) return [];
  const seen = new Set<string>();
  const out: StayRoom[] = [];
  for (const r of rows) {
    if (r.booking_id !== bookingId) continue;
    if (seen.has(r.number)) continue;
    seen.add(r.number);
    out.push({ number: r.number, section: r.section });
  }
  return out;
}

export function publicStay<T extends { name?: string; email?: string; notes?: string | null }>(
  stay: T,
  viewerEmail: string,
): T {
  if (stay.email && stay.email.toLowerCase() !== viewerEmail.toLowerCase()) {
    throw new Error("guest isolation: cannot expose another client's stay");
  }
  return stay;
}
