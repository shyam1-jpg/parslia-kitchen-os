// Types shared by the screens. Data comes from the API (lib/store.tsx).
export type Slot = "AM" | "PM";
export type Room = { id: string; number: string; section: string; type: string; beds: string; max: number; features: string[]; staffOnly: boolean; outOfUse: boolean; status: string };
export type GroupStatus = "ENQUIRY" | "PROVISIONAL" | "CONFIRMED" | "IN_HOUSE" | "COMPLETED" | "CANCELLED";
export type Group = {
  id: string; name: string; organisation: string; contact: string;
  arrival: string; arrivalSlot: Slot; arrivalTime: string; departure: string; departureSlot: Slot; departureTime: string;
  retreatType: string; useBasis: "EXCLUSIVE" | "SHARED"; guests: number; roomsWanted: number; roomsAllocated: number;
  packageName: string; priceNotes: string; spa: boolean; status: GroupStatus;
  packageId: string | null; packageCode: string | null; packageInfo: { code: string; name: string; price_basis: string; price_twin: string | null; price_single: string | null } | null;
  agreedTwin: string | null; agreedSingle: string | null; singles: number | null; agreedTotal: string | null; formToken: string | null; formSubmittedAt: string | null; attendees: number;
  bookingForm: "NOT_SENT" | "SENT" | "COMPLETE"; termsSigned: boolean; feedback: "NOT_SENT" | "SENT" | "RECEIVED";
  notes?: string; dietaryNotes?: string; mealsFrom?: string; mealsTo?: string; colour: string; version: number; source?: string;
  openOnGuestBook?: boolean;
};
export type Occupancy = { room: string; date: string; slot: Slot; label: string; groupId: string; colour: string };
export const sections = ["Ground Floor", "Pink Corridor", "First Floor", "Green Corridor", "Second Floor"];
export const RETREAT_TYPES: Record<string, string> = { residential: "Residential retreat", day_retreat: "Day retreat", wedding: "Wedding", venue_hire: "Venue hire", volunteer: "Volunteer trip", internal: "Internal" };
