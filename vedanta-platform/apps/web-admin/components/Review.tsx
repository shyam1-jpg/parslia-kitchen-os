"use client";
import { useEffect, useState } from "react";
import { api, ApiError } from "@/lib/api";
import { fmt, nights } from "@/lib/format";

type Slot = "AM" | "PM";
type G = { id: string; name: string; organisation: string | null; arrival: string; arrival_slot: Slot; departure: string; departure_slot: Slot; expected_guests: number | null; expected_rooms: number | null; status: string; review_reason: string; sheet_text: string | null; version: number };
const TODAY = new Date().toISOString().slice(0, 10);

function highlight(text: string) {
  // Lines that mention check-out / departure are what the reviewer needs; show them first and bold.
  const lines = text.split("\n").map(l => l.trim()).filter(Boolean);
  const key = lines.filter(l => /check.?out|depart|leav/i.test(l)); const rest = lines.filter(l => !key.includes(l));
  return [...key.map(l => <div key={"k" + l} className="sheetkey">{l}</div>), ...rest.map((l, i) => <div key={i}>{l}</div>)];
}

export default function Review() {
  const [items, setItems] = useState<G[]>([]); const [showPast, setShowPast] = useState(false);
  const [edit, setEdit] = useState<Record<string, { departure: string; departure_slot: Slot }>>({});
  const [toast, setToast] = useState<string | null>(null); const [busy, setBusy] = useState<string | null>(null);
  const say = (t: string) => { setToast(t); setTimeout(() => setToast(null), 3500); };
  const load = () => api<{ items: G[] }>("/v1/groups/review").then(r => setItems(r.items)).catch(e => say(e instanceof ApiError ? e.problem.detail : "Could not load"));
  useEffect(() => { load(); }, []);

  const upcoming = items.filter(g => g.departure >= TODAY); const past = items.filter(g => g.departure < TODAY);
  const val = (g: G) => edit[g.id] ?? { departure: g.departure, departure_slot: g.departure_slot };

  const save = async (g: G, confirmAsIs = false) => {
    const v = val(g); setBusy(g.id);
    try {
      await api(`/v1/groups/${g.id}`, { method: "PATCH", version: g.version, body: JSON.stringify(confirmAsIs ? { review_reason: null } : { departure_date: v.departure, departure_slot: v.departure_slot, review_reason: null }) });
      say(confirmAsIs ? `${g.name}: kept ${fmt(g.departure)} ${g.departure_slot}` : `${g.name}: departure set to ${fmt(v.departure)} ${v.departure_slot}`);
      setItems(is => is.filter(x => x.id !== g.id));
    } catch (e) { say(e instanceof ApiError ? e.problem.detail : "Could not save"); } finally { setBusy(null); }
  };

  const Row = ({ g }: { g: G }) => {
    const v = val(g); const changed = v.departure !== g.departure || v.departure_slot !== g.departure_slot; const n = nights(g.arrival, v.departure);
    return (
      <div className="rv">
        <div className="rv-main">
          <div className="t">{g.name}{g.organisation && g.organisation !== g.name ? <span className="m"> · {g.organisation}</span> : null}</div>
          <div className="m">{g.expected_guests ?? "?"} guests{g.expected_rooms ? ` · ${g.expected_rooms} rooms` : ""} · <span className={"chip " + g.status}>{g.status.toLowerCase()}</span></div>
          <div className="sheet">{g.sheet_text ? highlight(g.sheet_text) : <em>The sheet had no arrival/departure text for this row.</em>}</div>
        </div>
        <div className="rv-dates">
          <div className="lbl">Arrive</div><div className="d">{fmt(g.arrival)} <small>{g.arrival_slot}</small></div>
          <div className="lbl" style={{ marginTop: 10 }}>Depart <span className="warn">(assumed)</span></div>
          <div className="frow"><input type="date" value={v.departure} min={g.arrival} onChange={e => setEdit(s => ({ ...s, [g.id]: { ...v, departure: e.target.value } }))} />
            <span className="seg"><button className={v.departure_slot === "AM" ? "on" : ""} onClick={() => setEdit(s => ({ ...s, [g.id]: { ...v, departure_slot: "AM" } }))}>AM</button><button className={v.departure_slot === "PM" ? "on" : ""} onClick={() => setEdit(s => ({ ...s, [g.id]: { ...v, departure_slot: "PM" } }))}>PM</button></span></div>
          <div className="m" style={{ marginTop: 4 }}>{n === 0 ? "day visit" : `${n} night${n === 1 ? "" : "s"}`}</div>
          <div className="actions" style={{ borderTop: 0, paddingTop: 10 }}>
            {changed ? <button className="btn primary" disabled={busy === g.id} onClick={() => save(g)}>Save departure</button>
              : <button className="btn primary" disabled={busy === g.id} onClick={() => save(g, true)}>2 nights is right</button>}
          </div>
        </div>
      </div>);
  };

  return (
    <>
      <div className="topbar">
        <div><h1>Imported bookings to check</h1><p>The sheet didn&apos;t say when these groups leave, so the import assumed two nights. Read what the sheet said and set the real departure.</p></div>
        <div className="stats" style={{ margin: 0 }}><div><b>{upcoming.length}</b>upcoming</div><div><b>{past.length}</b>already past</div></div>
      </div>
      {upcoming.length === 0 && <div className="empty" style={{ background: "var(--paper)", border: "1px solid var(--line)", borderRadius: 10 }}>All upcoming imported bookings have been checked.</div>}
      {upcoming.map(g => <Row key={g.id} g={g} />)}
      {past.length > 0 && (
        <div style={{ marginTop: 18 }}>
          <button className="linkbtn" onClick={() => setShowPast(s => !s)}>{showPast ? "Hide" : "Show"} {past.length} past bookings (dates only matter for reports)</button>
          {showPast && past.map(g => <Row key={g.id} g={g} />)}
        </div>)}
      {toast && <div className="toast">{toast}</div>}
    </>
  );
}
