/** Public room catalogue. Never includes guest names or other stays. */

export const FEATURE_LABEL: Record<string, string> = {
  lake_view: "Lake view",
  courtyard_view: "Courtyard view",
  shower: "Shower",
  hairdryer: "Hairdryer",
  desk: "Desk",
  disabled_access: "Accessible",
  cool_room: "Cool room",
  pool_roof_view: "Pool-roof view",
  kitchen_roof_view: "Kitchen-roof view",
};

export type PublicRoom = {
  number: string;
  section: string | null;
  type: string;
  type_name: string;
  sleeps: number;
  beds: string;
  features: string[];
  feature_labels: string[];
  accessible: boolean;
  available: boolean;
};

export type PublicRoomType = {
  code: string;
  name: string;
  sleeps: number;
  accessible: boolean;
  beds: string;
  features: string[];
  total: number;
  available: number;
};

export function featureLabel(code: string): string {
  return FEATURE_LABEL[code] ?? code.replace(/_/g, " ");
}

export function typeName(code: string, typeLabel?: string | null): string {
  if (typeLabel && typeLabel.trim()) return typeLabel.trim();
  const n = String(code ?? "").toUpperCase();
  if (n === "SINGLE") return "Single room";
  if (n === "TWIN") return "Twin room";
  if (n === "TRIPLE") return "Triple room";
  if (n === "DOUBLE") return "Double room";
  if (n === "KING") return "King room";
  return n ? n.charAt(0) + n.slice(1).toLowerCase() + " room" : "Room";
}

export function bedsLine(r: { beds_single?: number; beds_double?: number; beds_king?: number; mattresses?: number }): string {
  return [
    r.beds_single && `${r.beds_single} single`,
    r.beds_double && `${r.beds_double} double`,
    r.beds_king && `${r.beds_king} king`,
    r.mattresses && `${r.mattresses} extra mattress`,
  ].filter(Boolean).join(" · ");
}

export function shapePublicRoom(r: {
  number: string;
  section?: string | null;
  type: string;
  type_name?: string | null;
  max_capacity: number;
  beds_single?: number;
  beds_double?: number;
  beds_king?: number;
  mattresses?: number;
  features?: string[] | null;
  available: boolean;
}): PublicRoom {
  const features = (r.features ?? []).filter(Boolean);
  return {
    number: r.number,
    section: r.section ?? null,
    type: r.type,
    type_name: typeName(r.type, r.type_name),
    sleeps: Number(r.max_capacity) || 1,
    beds: bedsLine(r),
    features,
    feature_labels: features.map(featureLabel),
    accessible: features.includes("disabled_access"),
    available: !!r.available,
  };
}

export function groupPublicTypes(rooms: PublicRoom[]): PublicRoomType[] {
  const map = new Map<string, PublicRoomType>();
  for (const r of rooms) {
    const key = `${r.type}|${r.sleeps}|${r.accessible ? "a" : "s"}`;
    const cur = map.get(key) ?? {
      code: r.type,
      name: r.accessible ? `Accessible ${r.type_name.toLowerCase()}` : r.type_name,
      sleeps: r.sleeps,
      accessible: r.accessible,
      beds: r.beds,
      features: [...r.feature_labels],
      total: 0,
      available: 0,
    };
    cur.total += 1;
    if (r.available) cur.available += 1;
    for (const f of r.feature_labels) if (!cur.features.includes(f)) cur.features.push(f);
    map.set(key, cur);
  }
  return [...map.values()].sort((a, b) => a.sleeps - b.sleeps || a.name.localeCompare(b.name));
}

export function nightsBetween(arrival: string, departure: string): number {
  const a = Date.parse(arrival);
  const d = Date.parse(departure);
  if (!Number.isFinite(a) || !Number.isFinite(d) || d < a) return 0;
  return Math.round((d - a) / 86_400_000);
}
