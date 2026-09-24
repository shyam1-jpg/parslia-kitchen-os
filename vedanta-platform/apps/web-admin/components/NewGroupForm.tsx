"use client";
import { useEffect, useState } from "react";
import { useStore } from "@/lib/store";
import { type Group, type Slot, RETREAT_TYPES } from "@/lib/data";
import { ApiError } from "@/lib/api";
import { fmt, nights } from "@/lib/format";

const TYPES = Object.keys(RETREAT_TYPES);
const PACKAGES = ["Standard", "Standard with spa", "Premium", "Premium with spa", "Day retreat", "Venue hire", "The Grand Vedanta Package", "Other"];

export default function NewGroupForm({ onClose, onCreated }: { onClose: () => void; onCreated: (g: Group) => void }) {
  const { addGroup, freeRooms } = useStore();
  const [f, setF] = useState({
    name: "", organisation: "", contact: "", contactEmail: "", retreatType: TYPES[0], useBasis: "SHARED" as "SHARED" | "EXCLUSIVE",
    arrival: "2026-05-01", arrivalSlot: "PM" as Slot, arrivalTime: "4pm", departure: "2026-05-03", departureSlot: "PM" as Slot, departureTime: "2pm",
    guests: 20, roomsWanted: 10, packageName: PACKAGES[0], priceNotes: "", notes: "", dietaryNotes: "",
    publicTitle: "", openOnGuestBook: false,
  });
  const set = <K extends keyof typeof f>(k: K, v: (typeof f)[K]) => setF(s => ({ ...s, [k]: v }));
  const [err, setErr] = useState<string | null>(null);

  const isDay = f.retreatType === "day_retreat" || f.retreatType === "venue_hire";
  const [free, setFree] = useState<number | null>(null);
  useEffect(() => { if (f.arrival && f.departure && f.departure >= f.arrival) { setFree(null); freeRooms(f).then(setFree).catch(() => setFree(null)); } }, [f.arrival, f.arrivalSlot, f.departure, f.departureSlot, freeRooms]);
  const n = f.arrival && f.departure ? nights(f.arrival, f.departure) : 0;
  const problems = [
    !f.name && "Give the booking a name",
    !f.organisation && "Who is the organiser?",
    (!f.arrival || !f.departure || f.departure < f.arrival) && "Departure must be on or after arrival",
    !isDay && n === 0 && "A residential stay needs at least one night",
    !isDay && free !== null && f.roomsWanted > free && `Only ${free} rooms are free for those dates`,
    f.guests > 130 && "More than 130 covers — dining will need two sittings",
  ].filter(Boolean) as string[];
  const blocking = problems.filter(p => !p.startsWith("More than 130"));

  const [busy, setBusy] = useState(false);
  const submit = async () => {
    if (blocking.length) { setErr(blocking[0]); return; }
    setBusy(true);
    try {
      const g = await addGroup({ name: f.name, organisation: f.organisation, contact_email: f.contactEmail || null, retreat_type: f.retreatType, use_basis: f.useBasis,
        arrival: f.arrival, arrival_slot: f.arrivalSlot, arrival_time: f.arrivalTime, departure: f.departure, departure_slot: f.departureSlot, departure_time: f.departureTime,
        expected_guests: f.guests, expected_rooms: isDay ? 0 : f.roomsWanted, package_name: f.packageName, price_notes: f.priceNotes, spa_access: f.packageName.includes("spa"), notes: f.notes, dietary_notes: f.dietaryNotes,
        public_title: f.publicTitle || null, open_for_guests: f.openOnGuestBook });
      onCreated(g);
    } catch (e) { setErr(e instanceof ApiError ? e.problem.detail : "Could not create the booking"); }
    finally { setBusy(false); }
  };

  return (
    <div className="modal-backdrop" onClick={onClose}>
      <div className="modal" role="dialog" aria-modal="true" aria-labelledby="ng-title" onClick={e => e.stopPropagation()}>
        <header><h2 id="ng-title">New group booking</h2><button className="btn" onClick={onClose} aria-label="Close">✕</button></header>

        <div className="fgrid">
          <label className="span2">Booking name<input value={f.name} onChange={e => set("name", e.target.value)} placeholder="e.g. Hoffman Process — May" autoFocus /></label>
          <label>Organisation<input value={f.organisation} onChange={e => set("organisation", e.target.value)} placeholder="Hoffman Institute" /></label>
          <label>Contact email<input type="email" value={f.contactEmail} onChange={e => set("contactEmail", e.target.value)} placeholder="organiser@example.org" /></label>
          <label>Type<select value={f.retreatType} onChange={e => set("retreatType", e.target.value)}>{TYPES.map(t => <option key={t} value={t}>{RETREAT_TYPES[t]}</option>)}</select></label>
          <label>Use of venue<select value={f.useBasis} onChange={e => set("useBasis", e.target.value as "SHARED" | "EXCLUSIVE")}><option value="SHARED">Shared with other guests</option><option value="EXCLUSIVE">Exclusive use</option></select></label>
        </div>

        <div className="fdates">
          <div>
            <div className="lbl">Arrive</div>
            <div className="frow"><input type="date" value={f.arrival} onChange={e => set("arrival", e.target.value)} />
              <span className="seg"><button className={f.arrivalSlot === "AM" ? "on" : ""} onClick={() => set("arrivalSlot", "AM")}>AM</button><button className={f.arrivalSlot === "PM" ? "on" : ""} onClick={() => set("arrivalSlot", "PM")}>PM</button></span>
              <input value={f.arrivalTime} onChange={e => set("arrivalTime", e.target.value)} placeholder="4pm" style={{ width: 64 }} /></div>
          </div>
          <div className="mid">{isDay ? "day visit" : `${n} night${n === 1 ? "" : "s"}`}</div>
          <div>
            <div className="lbl">Depart</div>
            <div className="frow"><input type="date" value={f.departure} onChange={e => set("departure", e.target.value)} />
              <span className="seg"><button className={f.departureSlot === "AM" ? "on" : ""} onClick={() => set("departureSlot", "AM")}>AM</button><button className={f.departureSlot === "PM" ? "on" : ""} onClick={() => set("departureSlot", "PM")}>PM</button></span>
              <input value={f.departureTime} onChange={e => set("departureTime", e.target.value)} placeholder="2pm" style={{ width: 64 }} /></div>
          </div>
        </div>

        <div className="fgrid">
          <label>Guests<input type="number" min={1} value={f.guests} onChange={e => set("guests", +e.target.value)} /></label>
          {!isDay && <label>Rooms wanted<input type="number" min={0} value={f.roomsWanted} onChange={e => set("roomsWanted", +e.target.value)} /></label>}
          <div className="avail">
            <span>Availability {f.arrival && f.departure ? `${fmt(f.arrival)} – ${fmt(f.departure)}` : ""}</span>
            <b className={!isDay && free !== null && f.roomsWanted > free ? "bad" : ""}>{free === null ? "…" : `${free} rooms free`}</b>
            <span>Covers {f.guests > 130 ? <em className="bad">{f.guests} — over 130</em> : `${f.guests} of 130`}</span>
          </div>
          <label>Package<select value={f.packageName} onChange={e => set("packageName", e.target.value)}>{PACKAGES.map(t => <option key={t}>{t}</option>)}</select></label>
          <label>Price as agreed<input value={f.priceNotes} onChange={e => set("priceNotes", e.target.value)} placeholder="Twin £249 pp · Single £339 pp" /></label>
          <label className="span2">Dietary and allergen notes for the kitchen<input value={f.dietaryNotes} onChange={e => set("dietaryNotes", e.target.value)} placeholder="e.g. 4 vegan, 1 severe nut allergy, all vegetarian" /></label>
          <label className="span2">Notes<textarea rows={2} value={f.notes} onChange={e => set("notes", e.target.value)} placeholder="Early arrivals, meals, anything the team needs to know" /></label>
          <label className="span2">Public title on /book (optional)<input value={f.publicTitle} onChange={e => set("publicTitle", e.target.value)} placeholder="e.g. Autumn Yoga Retreat — shown to guests instead of the house name" /></label>
          <label className="span2" style={{ display: "flex", alignItems: "center", gap: 10 }}>
            <input type="checkbox" checked={f.openOnGuestBook} onChange={e => set("openOnGuestBook", e.target.checked)} />
            Offer on the guest book after dates are held or confirmed — enquiries stay private
          </label>
        </div>

        {(err || problems.length > 0) && <div className="note">{err ?? problems[0]}</div>}
        <div className="actions">
          <button className="btn" onClick={onClose}>Discard</button>
          <button className="btn primary" onClick={submit} disabled={blocking.length > 0 || busy} title={blocking[0]}>{busy ? "Creating…" : "Create enquiry"}</button>
          <span style={{ marginLeft: "auto", color: "var(--ink-2)", fontSize: 12, alignSelf: "center" }}>Starts as an enquiry · send the booking form next</span>
        </div>
      </div>
    </div>
  );
}
