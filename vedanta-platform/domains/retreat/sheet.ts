/**
 * Vedanta Programme Operating Sheet — one live read of a stay.
 * Built from existing booking, rooms, meals and notes. Does not invent prices,
 * staff hours, or kitchen recipes.
 */

export type ProgrammeSheet = {
  programme: string;
  organisation: string | null;
  dates: { arrival: string; departure: string; nights: number };
  guests: number | null;
  rooms_wanted: number | null;
  rooms_placed: string[];
  rooms_short: number;
  meals: { breakfast: number; lunch: number; dinner: number } | null;
  dietary: string | null;
  spa: boolean;
  status: string;
  departments: { code: string; work: string }[];
};

export function nightsBetween(arrival: string, departure: string): number {
  const a = Date.parse(arrival);
  const d = Date.parse(departure);
  if (!Number.isFinite(a) || !Number.isFinite(d) || d < a) return 0;
  return Math.round((d - a) / 86_400_000);
}

export function roomsShort(wanted: number | null | undefined, placed: number): number {
  const w = Number(wanted) || 0;
  return Math.max(0, w - placed);
}

export function departmentWork(input: {
  guests: number | null;
  rooms: number;
  dietary: string | null;
  spa: boolean;
  exclusive?: boolean;
}): { code: string; work: string }[] {
  const n = Number(input.guests) || 0;
  const rooms = input.rooms;
  return [
    { code: "RECEPTION", work: n ? `${n} arrivals to receive` : "Confirm guest numbers" },
    { code: "HOUSEKEEPING", work: rooms ? `${rooms} rooms to turn` : "Rooms not yet placed" },
    { code: "KITCHEN", work: n ? `${n} covers to forecast${input.dietary ? " · dietary notes on the sheet" : ""}` : "No cover count yet" },
    { code: "EVENTS", work: input.exclusive ? "Exclusive use — halls held for this programme" : "Shared house — check hall diary" },
    { code: "MAINTENANCE", work: rooms ? `Room checks on ${rooms} bedrooms` : "Wait for room list" },
    { code: "GROUNDS", work: "Outdoor areas as the programme uses them" },
    { code: "FINANCE", work: "Expected revenue stays on the booking — folio not live" },
    { code: "MANAGEMENT", work: n ? `Staffing from ${n} guests` : "Staffing once numbers firm" },
  ];
}

export function buildProgrammeSheet(input: {
  name: string;
  organisation?: string | null;
  arrival: string;
  departure: string;
  expected_guests?: number | null;
  expected_rooms?: number | null;
  rooms_placed: string[];
  meals?: { breakfast: number; lunch: number; dinner: number } | null;
  dietary?: string | null;
  spa?: boolean;
  status: string;
  exclusive?: boolean;
}): ProgrammeSheet {
  const rooms = input.rooms_placed;
  return {
    programme: input.name,
    organisation: input.organisation ?? null,
    dates: { arrival: input.arrival, departure: input.departure, nights: nightsBetween(input.arrival, input.departure) },
    guests: input.expected_guests ?? null,
    rooms_wanted: input.expected_rooms ?? null,
    rooms_placed: rooms,
    rooms_short: roomsShort(input.expected_rooms, rooms.length),
    meals: input.meals ?? null,
    dietary: input.dietary ?? null,
    spa: !!input.spa,
    status: input.status,
    departments: departmentWork({
      guests: input.expected_guests ?? null,
      rooms: rooms.length || Number(input.expected_rooms) || 0,
      dietary: input.dietary ?? null,
      spa: !!input.spa,
      exclusive: input.exclusive,
    }),
  };
}
