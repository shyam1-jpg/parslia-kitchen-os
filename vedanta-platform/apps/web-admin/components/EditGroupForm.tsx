"use client";
import { useEffect, useMemo, useState } from "react";
import { api, ApiError } from "@/lib/api";
import { useStore } from "@/lib/store";
import type { Group, Slot } from "@/lib/data";
import { fmt, nights } from "@/lib/format";

const TYPES: [string, string][] = [["residential", "Residential retreat"], ["day_retreat", "Day retreat"], ["wedding", "Wedding"], ["venue_hire", "Venue hire"], ["volunteer", "Volunteer trip"], ["internal", "Internal"]];
type Pkg = { id: string; code: string; name: string; price_basis: string; price_twin: string | null; price_single: string | null; active: boolean };
const MEALS: [string, string][] = [["", "Default from arrival/departure time"], ["BREAKFAST", "Breakfast"], ["LUNCH", "Lunch"], ["DINNER", "Dinner"], ["NONE", "No meals"]];

export default function EditGroupForm({ g, onClose, onSaved }: { g: Group; onClose: () => void; onSaved: (msg: string) => void }) {
  const { updateGroup } = useStore();
  const [f, setF] = useState({
    name: g.name, organisation: g.organisation, contact: g.contact ?? "", retreatType: g.retreatType, useBasis: g.useBasis,
    arrival: g.arrival, arrivalSlot: g.arrivalSlot, arrivalTime: g.arrivalTime ?? "", departure: g.departure, departureSlot: g.departureSlot, departureTime: g.departureTime ?? "",
    guests: g.guests ?? 0, roomsWanted: g.roomsWanted ?? 0, packageName: g.packageName ?? "", priceNotes: g.priceNotes ?? "", notes: g.notes ?? "", dietaryNotes: g.dietaryNotes ?? "",
    mealsFrom: g.mealsFrom ?? "", mealsTo: g.mealsTo ?? "",
    packageId: g.packageId ?? "", agreedTwin: g.agreedTwin ?? "", agreedSingle: g.agreedSingle ?? "", singles: g.singles ?? 0, agreedTotal: g.agreedTotal ?? "",
  });
  const [pkgs, setPkgs] = useState<Pkg[]>([]);
  useEffect(() => { api<{ items: Pkg[] }>("/v1/packages").then(r => setPkgs(r.items.filter(x => x.active || x.id === g.packageId))).catch(() => {}); }, [g.packageId]);
  const pkg = pkgs.find(x => x.id === f.packageId);
  const set = <K extends keyof typeof f>(k: K, v: (typeof f)[K]) => setF(s => ({ ...s, [k]: v }));
  const [free, setFree] = useState<number | null>(null); const [err, setErr] = useState<string | null>(null); const [busy, setBusy] = useState(false);
  const isDay = f.retreatType === "day_retreat" || f.retreatType === "venue_hire";
  const datesChanged = f.arrival !== g.arrival || f.arrivalSlot !== g.arrivalSlot || f.departure !== g.departure || f.departureSlot !== g.departureSlot;
  const n = f.arrival && f.departure ? nights(f.arrival, f.departure) : 0;

  useEffect(() => {
    if (!f.arrival || !f.departure || f.departure < f.arrival) { setFree(null); return; }
    api<{ free_rooms: number }>(`/v1/availability?arrival=${f.arrival}&arrival_slot=${f.arrivalSlot}&departure=${f.departure}&departure_slot=${f.departureSlot}&exclude_group=${g.id}`).then(r => setFree(r.free_rooms)).catch(() => setFree(null));
  }, [f.arrival, f.arrivalSlot, f.departure, f.departureSlot, g.id]);

  const problems = useMemo(() => [
    !f.name && "The booking needs a name",
    !f.organisation && "Who is the organiser?",
    (!f.arrival || !f.departure || f.departure < f.arrival) && "Departure must be on or after arrival",
    !isDay && n === 0 && "A residential stay needs at least one night",
    !isDay && free !== null && f.roomsWanted > free && `Only ${free} rooms are free for those dates`,
  ].filter(Boolean) as string[], [f, isDay, n, free]);
  const covers = f.guests > 130 ? `${f.guests} covers — over 130, dining will need two sittings` : null;

  const save = async () => {
    setBusy(true); setErr(null);
    const patch: Record<string, unknown> = {};
    const map: [keyof typeof f, string][] = [["name", "name"], ["organisation", "organisation"], ["retreatType", "retreat_type"], ["useBasis", "use_basis"], ["arrival", "arrival_date"], ["arrivalSlot", "arrival_slot"], ["arrivalTime", "arrival_time"],
      ["departure", "departure_date"], ["departureSlot", "departure_slot"], ["departureTime", "departure_time"], ["guests", "expected_guests"], ["roomsWanted", "expected_rooms"], ["packageName", "package_name"], ["priceNotes", "price_notes"], ["packageId", "package_id"], ["agreedTwin", "agreed_price_twin"], ["agreedSingle", "agreed_price_single"], ["singles", "singles_count"], ["agreedTotal", "agreed_total"], ["notes", "notes"], ["dietaryNotes", "dietary_notes"], ["mealsFrom", "meals_from"], ["mealsTo", "meals_to"]];
    const orig: Record<string, unknown> = { name: g.name, organisation: g.organisation, retreatType: g.retreatType, useBasis: g.useBasis, arrival: g.arrival, arrivalSlot: g.arrivalSlot, arrivalTime: g.arrivalTime ?? "", departure: g.departure, departureSlot: g.departureSlot, departureTime: g.departureTime ?? "", guests: g.guests ?? 0, roomsWanted: g.roomsWanted ?? 0, packageName: g.packageName ?? "", priceNotes: g.priceNotes ?? "", notes: g.notes ?? "", dietaryNotes: g.dietaryNotes ?? "", mealsFrom: g.mealsFrom ?? "", mealsTo: g.mealsTo ?? "", packageId: g.packageId ?? "", agreedTwin: g.agreedTwin ?? "", agreedSingle: g.agreedSingle ?? "", singles: g.singles ?? 0, agreedTotal: g.agreedTotal ?? "" };
    for (const [k, col] of map) if (f[k] !== orig[k]) patch[col] = f[k] === "" ? null : f[k];
    if (f.packageId !== (g.packageId ?? "")) { patch.package_name = pkg?.name ?? null; patch.spa_access = !!pkg && /spa/i.test(pkg.name); }
    if (!Object.keys(patch).length) { onClose(); return; }
    if (datesChanged && g.roomsAllocated > 0 && !confirm(`Changing the dates will drop any room placements that fall outside the new dates. Continue?`)) { setBusy(false); return; }
    try { await updateGroup(g.id, patch); onSaved(`Saved changes to ${f.name}`); }
    catch (e) { setErr(e instanceof ApiError ? e.problem.detail : "Could not save"); } finally { setBusy(false); }
  };

  return (
    <div className="modal-backdrop" onClick={onClose}>
      <div className="modal" role="dialog" aria-modal="true" onClick={e => e.stopPropagation()}>
        <header><h2>Edit booking</h2><button className="btn" onClick={onClose} aria-label="Close">✕</button></header>
        <div className="fgrid">
          <label className="span2">Booking name<input value={f.name} onChange={e => set("name", e.target.value)} /></label>
          <label>Organisation<input value={f.organisation} onChange={e => set("organisation", e.target.value)} /></label>
          <label>Main contact<input value={f.contact} disabled title="Contact details are edited on the guest record (coming)" /></label>
          <label>Type<select value={f.retreatType} onChange={e => set("retreatType", e.target.value)}>{TYPES.map(([v, l]) => <option key={v} value={v}>{l}</option>)}</select></label>
          <label>Use of venue<select value={f.useBasis} onChange={e => set("useBasis", e.target.value as "SHARED" | "EXCLUSIVE")}><option value="SHARED">Shared with other guests</option><option value="EXCLUSIVE">Exclusive use</option></select></label>
        </div>
        <div className="fdates">
          <div><div className="lbl">Arrive</div>
            <div className="frow"><input type="date" value={f.arrival} onChange={e => set("arrival", e.target.value)} />
              <span className="seg"><button className={f.arrivalSlot === "AM" ? "on" : ""} onClick={() => set("arrivalSlot", "AM")}>AM</button><button className={f.arrivalSlot === "PM" ? "on" : ""} onClick={() => set("arrivalSlot", "PM")}>PM</button></span>
              <input value={f.arrivalTime} onChange={e => set("arrivalTime", e.target.value)} placeholder="4pm" style={{ width: 64 }} /></div></div>
          <div className="mid">{isDay ? "day visit" : `${n} night${n === 1 ? "" : "s"}`}</div>
          <div><div className="lbl">Depart</div>
            <div className="frow"><input type="date" value={f.departure} onChange={e => set("departure", e.target.value)} />
              <span className="seg"><button className={f.departureSlot === "AM" ? "on" : ""} onClick={() => set("departureSlot", "AM")}>AM</button><button className={f.departureSlot === "PM" ? "on" : ""} onClick={() => set("departureSlot", "PM")}>PM</button></span>
              <input value={f.departureTime} onChange={e => set("departureTime", e.target.value)} placeholder="2pm" style={{ width: 64 }} /></div></div>
        </div>
        <div className="fgrid">
          <label>Guests<input type="number" min={0} value={f.guests} onChange={e => set("guests", +e.target.value)} /></label>
          {!isDay && <label>Rooms wanted<input type="number" min={0} value={f.roomsWanted} onChange={e => set("roomsWanted", +e.target.value)} /></label>}
          <div className="avail">
            <span>Availability {fmt(f.arrival)} – {fmt(f.departure)}</span>
            <b className={!isDay && free !== null && f.roomsWanted > free ? "bad" : ""}>{free === null ? "…" : `${free} rooms free`}</b>
            <span>{g.roomsAllocated} allocated now{datesChanged && g.roomsAllocated > 0 ? " · placements outside the new dates will be dropped" : ""}</span>
          </div>
          <label>Package<select value={f.packageId} onChange={e => set("packageId", e.target.value)}><option value="">— not chosen —</option>{pkgs.map(p => <option key={p.id} value={p.id}>{p.name}{p.price_twin ? ` · ${p.price_basis === "FIXED" ? "" : "from "}£${Number(p.price_twin).toFixed(0)}${p.price_basis === "PER_PERSON_PER_NIGHT" ? " pp/night" : p.price_basis === "PER_PERSON" ? " pp" : ""}` : ""}</option>)}</select></label>
          <label>Price notes (as agreed in writing)<input value={f.priceNotes} onChange={e => set("priceNotes", e.target.value)} placeholder="Twin £249 pp · Single £339 pp" /></label>
          {pkg && pkg.price_basis !== "FIXED" && (<>
            <label>Agreed price per person (twin)<input type="number" step="0.01" value={f.agreedTwin} onChange={e => set("agreedTwin", e.target.value)} placeholder={pkg.price_twin ?? ""} /></label>
            <label>Agreed price per person (single)<input type="number" step="0.01" value={f.agreedSingle} onChange={e => set("agreedSingle", e.target.value)} placeholder={pkg.price_single ?? ""} /></label>
            <label>Guests in single rooms<input type="number" min={0} value={f.singles} onChange={e => set("singles", +e.target.value)} /></label>
          </>)}
          <label>{pkg?.price_basis === "FIXED" ? "Agreed price" : "Agreed total (overrides the calculation)"}<input type="number" step="0.01" value={f.agreedTotal} onChange={e => set("agreedTotal", e.target.value)} placeholder={pkg?.price_basis === "FIXED" ? (pkg.price_twin ?? "") : "leave blank to calculate"} /></label>
          <label>First meal on arrival day<select value={f.mealsFrom} onChange={e => set("mealsFrom", e.target.value)}>{MEALS.map(([v, l]) => <option key={v} value={v}>{l}</option>)}</select></label>
          <label>Last meal on departure day<select value={f.mealsTo} onChange={e => set("mealsTo", e.target.value)}>{MEALS.map(([v, l]) => <option key={v} value={v}>{l}</option>)}</select></label>
          <label className="span2">Dietary notes for the kitchen<input value={f.dietaryNotes} onChange={e => set("dietaryNotes", e.target.value)} placeholder="e.g. 3 gluten-free, 1 nut allergy (severe)" /></label>
          <label className="span2">Notes<textarea rows={2} value={f.notes} onChange={e => set("notes", e.target.value)} /></label>
        </div>
        {(err || problems[0] || covers) && <div className="note">{err ?? problems[0] ?? covers}</div>}
        <div className="actions">
          <button className="btn" onClick={onClose}>Cancel</button>
          <button className="btn primary" disabled={busy || problems.length > 0} title={problems[0]} onClick={save}>Save changes</button>
          <span style={{ marginLeft: "auto", color: "var(--ink-2)", fontSize: 12, alignSelf: "center" }}>v{g.version} · change is logged</span>
        </div>
      </div>
    </div>
  );
}
