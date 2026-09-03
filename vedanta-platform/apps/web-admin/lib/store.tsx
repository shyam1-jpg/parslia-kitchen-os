"use client";
import { createContext, useCallback, useContext, useEffect, useMemo, useState, type ReactNode } from "react";
import { api, token, ApiError } from "@/lib/api";
import type { Group, Occupancy, Room, Slot } from "@/lib/data";

export type User = { name: string; email: string; role: string; role_name?: string; department?: string | null; permissions: string[] };
type ApiGroup = Record<string, unknown>;
type ApiRoom = { id: string; number: string; section: string; type: string; beds_single: number; beds_double: number; beds_king: number; mattresses: number; max_capacity: number; features: string[]; staff_only: boolean; status: string };

const fromApiGroup = (g: ApiGroup): Group => ({
  id: g.id as string, name: g.name as string, organisation: (g.organisation as string) ?? "", contact: (g.contact_email as string) ?? "",
  arrival: g.arrival as string, arrivalSlot: g.arrival_slot as Slot, arrivalTime: fmtTime(g.arrival_time as string | null),
  departure: g.departure as string, departureSlot: g.departure_slot as Slot, departureTime: fmtTime(g.departure_time as string | null),
  retreatType: (g.retreat_type as string) ?? "residential", useBasis: ((g.use_basis as string) ?? "SHARED") as Group["useBasis"],
  guests: Number(g.expected_guests ?? 0), roomsWanted: Number(g.expected_rooms ?? 0), roomsAllocated: Number(g.rooms_allocated ?? 0),
  packageName: (g.package_name as string) ?? "", priceNotes: (g.price_notes as string) ?? "", packageId: (g.package_id as string) ?? null, packageCode: ((g.package as any)?.code as string) ?? null, packageInfo: (g.package as Group["packageInfo"]) ?? null, agreedTwin: g.agreed_price_twin as string | null, agreedSingle: g.agreed_price_single as string | null, singles: (g.singles_count as number) ?? null, agreedTotal: g.agreed_total as string | null, formToken: (g.form_token as string) ?? null, formSubmittedAt: (g.form_submitted_at as string) ?? null, attendees: (g.attendees as number) ?? 0, spa: !!g.spa_access, status: g.status as Group["status"],
  bookingForm: ((g.booking_form_status as string) ?? "NOT_SENT") as Group["bookingForm"], termsSigned: !!g.terms_signed,
  feedback: ((g.feedback_form_status as string) ?? "NOT_SENT") as Group["feedback"], notes: (g.notes as string) ?? undefined, dietaryNotes: (g.dietary_notes as string) ?? undefined, mealsFrom: (g.meals_from as string) ?? undefined, mealsTo: (g.meals_to as string) ?? undefined,
  colour: (g.colour as string) ?? "#1F3A32", version: Number(g.version), source: g.source as string,
});
const fmtTime = (t: string | null) => { if (!t) return ""; const [h, m] = t.split(":").map(Number); return `${h % 12 || 12}${m ? ":" + String(m).padStart(2, "0") : ""}${h >= 12 ? "pm" : "am"}`; };
const fromApiRoom = (r: ApiRoom): Room => ({
  id: r.id, number: r.number, section: r.section, type: r.type, max: r.max_capacity,
  beds: [r.beds_single && `${r.beds_single} single`, r.beds_double && `${r.beds_double} double`, r.beds_king && `${r.beds_king} king`, r.mattresses && `${r.mattresses} mattress`].filter(Boolean).join(" · "),
  features: r.features ?? [], staffOnly: r.staff_only, outOfUse: ["OUT_OF_SERVICE", "OUT_OF_ORDER"].includes(r.status), status: r.status,
});

type Store = {
  user: User | null; ready: boolean; signIn: (email: string) => Promise<void>; signInWithToken: (t: string) => Promise<void>; signOut: () => void; can: (p: string) => boolean;
  rooms: Room[]; groups: Group[]; occupancy: Occupancy[]; loading: boolean; error: string | null;
  reload: () => Promise<void>; loadOccupancy: (from: string, to: string) => Promise<void>;
  addGroup: (g: Record<string, unknown>) => Promise<Group>;
  updateGroup: (id: string, patch: Record<string, unknown>) => Promise<void>;
  command: (id: string, cmd: string, reason?: string) => Promise<void>;
  placeOccupant: (room: string, groupId: string, label: string) => Promise<string | null>;
  removeOccupant: (room: string, groupId: string, label: string) => Promise<void>;
  linkOccupant: (room: string, label: string, date: string, groupId: string) => Promise<{ linked: number; group: string }>;
  linkBulk: (rooms: string[], groupId: string, from: string, to: string) => Promise<{ linked: number; group: string }>;
  moveParty: (fromRoom: string, toRoom: string, groupId: string, labels: string[]) => Promise<string | null>;
  freeRooms: (g: { arrival: string; arrivalSlot: Slot; departure: string; departureSlot: Slot }) => Promise<number>;
};
const Ctx = createContext<Store | null>(null);

export function StoreProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [ready, setReady] = useState(false);
  const [rooms, setRooms] = useState<Room[]>([]);
  const [groups, setGroups] = useState<Group[]>([]);
  const [occupancy, setOcc] = useState<Occupancy[]>([]);
  const [range, setRange] = useState<{ from: string; to: string } | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const reload = useCallback(async () => {
    if (!token.get()) return;
    setLoading(true); setError(null);
    try {
      const [r, g] = await Promise.all([api<{ items: ApiRoom[] }>("/v1/rooms"), api<{ items: ApiGroup[] }>("/v1/groups")]);
      setRooms(r.items.map(fromApiRoom)); setGroups(g.items.map(fromApiGroup));
      if (range) { const o = await api<{ items: Occupancy[] }>(`/v1/occupancy?from=${range.from}&to=${range.to}`); setOcc(o.items.map(x => ({ ...x, groupId: (x as unknown as { group_id: string }).group_id }))); }
    } catch (e) { setError(e instanceof ApiError ? e.problem.detail : "Cannot reach the API. Is platform-api running on port 4000?"); }
    finally { setLoading(false); }
  }, [range]);

  useEffect(() => { (async () => {
    if (token.get()) { try { setUser(await api<User>("/me")); } catch { token.set(null); } }
    setReady(true);
  })(); }, []);
  useEffect(() => { if (user) reload(); }, [user, reload]);

  const loadOccupancy = useCallback(async (from: string, to: string) => {
    setRange({ from, to });
    const o = await api<{ items: (Occupancy & { group_id: string })[] }>(`/v1/occupancy?from=${from}&to=${to}`);
    setOcc(o.items.map(x => ({ ...x, groupId: x.group_id })));
  }, []);

  const store = useMemo<Store>(() => ({
    user, ready, rooms, groups, occupancy, loading, error, reload, loadOccupancy,
    can: (p) => !!user?.permissions.includes(p),
    signIn: async (email) => { const r = await api<{ token: string; user: User }>("/auth/login", { method: "POST", body: JSON.stringify({ email }) }); token.set(r.token); setUser(r.user); },
    signInWithToken: async (t) => { token.set(t); const u = await api<User>("/me"); setUser(u); },
    signOut: () => { token.set(null); setUser(null); setGroups([]); setOcc([]); },
    addGroup: async (g) => { const r = await api<ApiGroup>("/v1/groups", { method: "POST", body: JSON.stringify(g) }); await reload(); return fromApiGroup(r); },
    updateGroup: async (id, patch) => { const cur = groups.find(x => x.id === id)!; await api(`/v1/groups/${id}`, { method: "PATCH", body: JSON.stringify(patch), version: cur.version }); await reload(); },
    command: async (id, cmd, reason) => { const cur = groups.find(x => x.id === id)!; await api(`/v1/groups/${id}/commands/${cmd}`, { method: "POST", body: JSON.stringify({ reason }), version: cur.version }); await reload(); },
    placeOccupant: async (room, groupId, label) => { try { await api("/v1/occupancy/place", { method: "POST", body: JSON.stringify({ room, group_id: groupId, label }) }); await reload(); return null; } catch (e) { return e instanceof ApiError ? e.problem.detail : String(e); } },
    removeOccupant: async (room, groupId, label) => { await api("/v1/occupancy/remove", { method: "POST", body: JSON.stringify({ room, group_id: groupId || null, label }) }); await reload(); },
    linkBulk: async (rooms, groupId, from, to) => { const r = await api<{ linked: number; group: string }>("/v1/occupancy/link-bulk", { method: "POST", body: JSON.stringify({ rooms, group_id: groupId, from, to }) }); await reload(); return r; },
    linkOccupant: async (room, label, date, groupId) => { const r = await api<{ linked: number; group: string }>("/v1/occupancy/link", { method: "POST", body: JSON.stringify({ room, label, date, group_id: groupId }) }); await reload(); return r; },
    moveParty: async (fromRoom, toRoom, groupId, labels) => { try { await api("/v1/occupancy/move", { method: "POST", body: JSON.stringify({ from_room: fromRoom, to_room: toRoom, group_id: groupId, labels }) }); await reload(); return null; } catch (e) { return e instanceof ApiError ? e.problem.detail : String(e); } },
    freeRooms: async (g) => (await api<{ free_rooms: number }>(`/v1/availability?arrival=${g.arrival}&arrival_slot=${g.arrivalSlot}&departure=${g.departure}&departure_slot=${g.departureSlot}`)).free_rooms,
  }), [user, ready, rooms, groups, occupancy, loading, error, reload, loadOccupancy]);

  return <Ctx.Provider value={store}>{children}</Ctx.Provider>;
}
export const useStore = () => { const s = useContext(Ctx); if (!s) throw new Error("StoreProvider missing"); return s; };
