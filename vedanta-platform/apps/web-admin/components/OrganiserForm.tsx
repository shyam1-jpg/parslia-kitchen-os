"use client";
/** Public page for organisers: /form/?t=<token>. No sign-in. */
import { useEffect, useState } from "react";
import { API } from "@/lib/api";
import { fmt } from "@/lib/format";
type Info = { name: string; organisation: string | null; arrival: string; arrival_slot: string; arrival_time: string | null; departure: string; departure_slot: string; departure_time: string | null; expected_guests: number | null; expected_rooms: number | null; retreat_type: string; form_submitted_at: string | null; package_name: string | null; property_name: string; attendees: number; allergens: string[] };
type Att = { given_name: string; family_name: string; email: string; diet: string[]; allergens: string[]; severity: string; diet_notes: string; room_preference: string; arrives_early: boolean };
const blank = (): Att => ({ given_name: "", family_name: "", email: "", diet: [], allergens: [], severity: "", diet_notes: "", room_preference: "twin", arrives_early: false });
const AL: Record<string, string> = { celery: "Celery", cereals_gluten: "Gluten", crustaceans: "Crustaceans", eggs: "Eggs", fish: "Fish", lupin: "Lupin", milk: "Milk", molluscs: "Molluscs", mustard: "Mustard", nuts: "Tree nuts", peanuts: "Peanuts", sesame: "Sesame", soya: "Soya", sulphites: "Sulphites" };
const DIETS = ["vegetarian", "vegan", "jain", "halal", "kosher", "gluten_free", "dairy_free", "no_onion_garlic"];

export default function OrganiserForm() {
  const [token, setToken] = useState<string | null>(null); const [info, setInfo] = useState<Info | null>(null); const [err, setErr] = useState<string | null>(null);
  const [rows, setRows] = useState<Att[]>([blank()]); const [organiser, setOrganiser] = useState({ name: "", email: "", notes: "" }); const [done, setDone] = useState<{ created: number; updated: number } | null>(null); const [busy, setBusy] = useState(false);
  useEffect(() => {
    const t = new URLSearchParams(window.location.search).get("t"); setToken(t);
    if (!t) { setErr("This link is missing its code. Please use the link exactly as it was sent to you."); return; }
    fetch(`${API}/public/form/${t}`).then(async r => { const b = await r.json(); if (!r.ok) throw new Error(b.detail ?? "This link is not valid"); setInfo(b); }).catch(e => setErr(e.message));
  }, []);
  const upd = (i: number, patch: Partial<Att>) => setRows(rs => rs.map((r, j) => j === i ? { ...r, ...patch } : r));
  const tog = (i: number, k: "diet" | "allergens", v: string) => setRows(rs => rs.map((r, j) => j === i ? { ...r, [k]: r[k].includes(v) ? r[k].filter(x => x !== v) : [...r[k], v] } : r));
  const problems = rows.map((r, i) => !r.given_name.trim() || !r.family_name.trim() ? `Guest ${i + 1}: first and last name needed` : r.allergens.length && !r.severity ? `${r.given_name}: please say how serious the allergy is` : null).filter(Boolean) as string[];
  const submit = async () => {
    setBusy(true); setErr(null);
    try { const r = await fetch(`${API}/public/form/${token}`, { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify({ organiser_name: organiser.name, organiser_email: organiser.email, notes: organiser.notes, attendees: rows.map(x => ({ ...x, severity: x.severity || undefined, email: x.email || undefined })) }) });
      const b = await r.json(); if (!r.ok) throw new Error(b.detail ?? "Could not submit"); setDone(b); }
    catch (e) { setErr((e as Error).message); } finally { setBusy(false); }
  };

  if (err && !info) return <div className="pub"><div className="pubcard"><h1>Booking form</h1><div className="note">{err}</div></div></div>;
  if (!info) return <div className="pub"><div className="pubcard">Loading…</div></div>;
  if (done) return <div className="pub"><div className="pubcard"><h1>Thank you</h1><p>We have {done.created + done.updated} guest{done.created + done.updated === 1 ? "" : "s"} on the list for <b>{info.name}</b>. The kitchen has the dietary needs. You can reopen this link to add or change names.</p></div></div>;
  return (
    <div className="pub">
      <div className="pubcard">
        <div className="pubbrand">{info.property_name}</div>
        <h1>Guest list for {info.name}</h1>
        <p className="m">{fmt(info.arrival, { weekday: "long", day: "numeric", month: "long" })} {info.arrival_slot}{info.arrival_time ? ` (${info.arrival_time.slice(0, 5)})` : ""} → {fmt(info.departure, { weekday: "long", day: "numeric", month: "long" })} {info.departure_slot}{info.departure_time ? ` (${info.departure_time.slice(0, 5)})` : ""}{info.package_name ? ` · ${info.package_name}` : ""}{info.expected_guests ? ` · ${info.expected_guests} guests expected` : ""}</p>
        {info.attendees > 0 && <div className="note">You already sent {info.attendees} name{info.attendees === 1 ? "" : "s"}. Names you enter again will be updated, new ones added.</div>}
        <p>Please give us everyone who is staying, with any dietary needs or allergies. We take allergies seriously — the kitchen sees exactly what you write here.</p>
        <div className="fgrid">
          <label>Your name<input value={organiser.name} onChange={e => setOrganiser({ ...organiser, name: e.target.value })} /></label>
          <label>Your email<input value={organiser.email} onChange={e => setOrganiser({ ...organiser, email: e.target.value })} /></label>
        </div>
        {rows.map((r, i) => (
          <div key={i} className="att">
            <div className="att-head"><b>Guest {i + 1}</b>{rows.length > 1 && <button className="linkbtn" onClick={() => setRows(rs => rs.filter((_, j) => j !== i))}>remove</button>}</div>
            <div className="fgrid">
              <label>First name<input value={r.given_name} onChange={e => upd(i, { given_name: e.target.value })} /></label>
              <label>Last name<input value={r.family_name} onChange={e => upd(i, { family_name: e.target.value })} /></label>
              <label>Email (optional)<input value={r.email} onChange={e => upd(i, { email: e.target.value })} /></label>
              <label>Room<select value={r.room_preference} onChange={e => upd(i, { room_preference: e.target.value })}><option value="twin">Sharing (twin)</option><option value="single">Single room</option><option value="any">No preference</option></select></label>
            </div>
            <div className="lbl">Diet</div>
            <div className="chips">{DIETS.map(x => <button key={x} type="button" className={"chipbtn" + (r.diet.includes(x) ? " on" : "")} onClick={() => tog(i, "diet", x)}>{x.replace(/_/g, " ")}</button>)}</div>
            <div className="lbl" style={{ marginTop: 8 }}>Allergies</div>
            <div className="chips">{Object.entries(AL).map(([k, l]) => <button key={k} type="button" className={"chipbtn" + (r.allergens.includes(k) ? " on warn" : "")} onClick={() => tog(i, "allergens", k)}>{l}</button>)}</div>
            {r.allergens.length > 0 && <div className="fgrid" style={{ marginTop: 8 }}>
              <label>How serious?<select value={r.severity} onChange={e => upd(i, { severity: e.target.value })}><option value="">choose…</option><option value="INTOLERANCE">Intolerance / discomfort</option><option value="ALLERGY">Allergy</option><option value="ANAPHYLAXIS">Severe — risk of anaphylaxis</option></select></label>
              <label>Anything the kitchen should know<input value={r.diet_notes} onChange={e => upd(i, { diet_notes: e.target.value })} placeholder="e.g. carries an EpiPen" /></label>
            </div>}
            <label style={{ display: "flex", gap: 8, alignItems: "center", marginTop: 8, fontSize: 13 }}><input type="checkbox" checked={r.arrives_early} onChange={e => upd(i, { arrives_early: e.target.checked })} />Arrives the night before</label>
          </div>))}
        <button className="btn" onClick={() => setRows(rs => [...rs, blank()])}>+ Add another guest</button>
        <label style={{ display: "block", marginTop: 16, fontSize: 12, color: "var(--ink-2)" }}>Anything else for us<textarea rows={2} style={{ display: "block", width: "100%", marginTop: 4, padding: 8, border: "1px solid var(--line)", borderRadius: 6, font: "inherit" }} value={organiser.notes} onChange={e => setOrganiser({ ...organiser, notes: e.target.value })} /></label>
        {(err || problems[0]) && <div className="note" style={{ marginTop: 12 }}>{err ?? problems[0]}</div>}
        <div className="actions"><button className="btn primary" disabled={busy || problems.length > 0} onClick={submit}>Send guest list ({rows.length})</button></div>
      </div>
    </div>
  );
}
