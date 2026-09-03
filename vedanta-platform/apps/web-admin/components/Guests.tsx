"use client";
import { useEffect, useState } from "react";
import { api, ApiError } from "@/lib/api";
import { useStore } from "@/lib/store";
export type Guest = { id: string; given_name: string; family_name: string; email: string | null; phone: string | null; organisation: string | null; notes: string | null; diet: string[] | null; allergens: string[] | null; severity: string | null; diet_notes: string | null; declared_at: string | null; nights_on_board: number };
const ALLERGEN_LABEL: Record<string, string> = { celery: "Celery", cereals_gluten: "Gluten", crustaceans: "Crustaceans", eggs: "Eggs", fish: "Fish", lupin: "Lupin", milk: "Milk", molluscs: "Molluscs", mustard: "Mustard", nuts: "Tree nuts", peanuts: "Peanuts", sesame: "Sesame", soya: "Soya", sulphites: "Sulphites" };
const DIETS = ["vegetarian", "vegan", "jain", "halal", "kosher", "gluten_free", "dairy_free", "no_onion_garlic"];
const SEV: [string, string][] = [["PREFERENCE", "Preference"], ["INTOLERANCE", "Intolerance"], ["ALLERGY", "Allergy"], ["ANAPHYLAXIS", "Anaphylaxis — life-threatening"]];
export const sevClass = (s: string | null) => s === "ANAPHYLAXIS" ? "sev-high" : s === "ALLERGY" ? "sev-mid" : "sev-low";

export function DietEditor({ g, onSaved }: { g: Guest; onSaved: (msg: string) => void }) {
  const [d, setD] = useState({ diet: g.diet ?? [], allergens: g.allergens ?? [], severity: g.severity ?? "", notes: g.diet_notes ?? "" });
  const [err, setErr] = useState<string | null>(null); const [busy, setBusy] = useState(false);
  const tog = (k: "diet" | "allergens", v: string) => setD(s => ({ ...s, [k]: s[k].includes(v) ? s[k].filter(x => x !== v) : [...s[k], v] }));
  const save = async () => { setBusy(true); setErr(null); try { await api(`/v1/guests/${g.id}/diet`, { method: "PUT", body: JSON.stringify({ ...d, severity: d.severity || null }) }); onSaved(`Dietary record saved for ${g.given_name}`); } catch (e) { setErr(e instanceof ApiError ? e.problem.detail : "Could not save"); } finally { setBusy(false); } };
  return (
    <div className="diet">
      <div className="lbl">Diet</div>
      <div className="chips">{DIETS.map(x => <button key={x} className={"chipbtn" + (d.diet.includes(x) ? " on" : "")} onClick={() => tog("diet", x)}>{x.replace(/_/g, " ")}</button>)}</div>
      <div className="lbl" style={{ marginTop: 10 }}>Allergens (UK 14)</div>
      <div className="chips">{Object.entries(ALLERGEN_LABEL).map(([k, l]) => <button key={k} className={"chipbtn" + (d.allergens.includes(k) ? " on warn" : "")} onClick={() => tog("allergens", k)}>{l}</button>)}</div>
      {d.allergens.length > 0 && <label style={{ display: "block", marginTop: 10, fontSize: 12, color: "var(--ink-2)" }}>How serious<select className="btn" style={{ display: "block", marginTop: 4 }} value={d.severity} onChange={e => setD({ ...d, severity: e.target.value })}><option value="">choose…</option>{SEV.map(([v, l]) => <option key={v} value={v}>{l}</option>)}</select></label>}
      <label style={{ display: "block", marginTop: 10, fontSize: 12, color: "var(--ink-2)" }}>Notes for the kitchen<input style={{ display: "block", width: "100%", marginTop: 4, padding: "7px 9px", border: "1px solid var(--line)", borderRadius: 6, font: "inherit" }} value={d.notes} onChange={e => setD({ ...d, notes: e.target.value })} placeholder="e.g. carries an EpiPen; cross-contamination matters" /></label>
      {err && <div className="note" style={{ marginTop: 8 }}>{err}</div>}
      <div className="actions" style={{ borderTop: 0, paddingTop: 10 }}><button className="btn primary" disabled={busy} onClick={save}>Save dietary record</button>{g.declared_at && <span className="m" style={{ alignSelf: "center", fontSize: 12, color: "var(--ink-2)" }}>last declared {new Date(g.declared_at).toLocaleDateString("en-GB")}</span>}</div>
    </div>);
}

export default function Guests() {
  const { can } = useStore();
  const [q, setQ] = useState(""); const [onlyAllergens, setOnly] = useState(false); const [items, setItems] = useState<Guest[]>([]); const [sel, setSel] = useState<Guest | null>(null);
  const [adding, setAdding] = useState(false); const [add, setAdd] = useState({ given_name: "", family_name: "", email: "", phone: "", organisation: "" });
  const [toast, setToast] = useState<string | null>(null); const say = (t: string) => { setToast(t); setTimeout(() => setToast(null), 3500); };
  const load = () => api<{ items: Guest[] }>(`/v1/guests?q=${encodeURIComponent(q)}&allergens=${onlyAllergens ? 1 : 0}`).then(r => { setItems(r.items); if (sel) setSel(r.items.find(x => x.id === sel.id) ?? null); }).catch(() => {});
  useEffect(() => { const t = setTimeout(load, 200); return () => clearTimeout(t); }, [q, onlyAllergens]); // eslint-disable-line react-hooks/exhaustive-deps
  const create = async () => { try { const r = await api<{ id: string }>("/v1/guests", { method: "POST", body: JSON.stringify(add) }); setAdding(false); setAdd({ given_name: "", family_name: "", email: "", phone: "", organisation: "" }); say("Guest added"); await load(); setQ(add.family_name); } catch (e) { say(e instanceof ApiError ? e.problem.detail : "Could not add"); } };
  return (
    <>
      <div className="topbar"><div><h1>Guests</h1><p>The people behind the names on the board. What you record here is what the kitchen sees.</p></div>
        {can("guest.write") && <button className="btn primary" onClick={() => setAdding(true)}>Add guest</button>}</div>
      <div className="frow" style={{ marginBottom: 12, maxWidth: 640 }}>
        <input placeholder="Search name, email or organisation" value={q} onChange={e => setQ(e.target.value)} style={{ flex: 1 }} />
        <label style={{ display: "flex", gap: 6, alignItems: "center", fontSize: 13 }}><input type="checkbox" checked={onlyAllergens} onChange={e => setOnly(e.target.checked)} />With allergens</label>
      </div>
      <div className="split">
        <div className="list">
          {items.length === 0 && <div className="empty">No guests match.</div>}
          {items.map(g => (
            <button key={g.id} className={"row" + (sel?.id === g.id ? " sel" : "")} onClick={() => setSel(g)}>
              <span className="bar" style={{ background: g.allergens?.length ? "var(--brick)" : g.diet?.length ? "var(--moss)" : "var(--line)" }} />
              <span><div className="t">{g.given_name} {g.family_name}</div><div className="m">{[g.organisation, g.email].filter(Boolean).join(" · ") || "—"}{g.nights_on_board ? ` · ${g.nights_on_board} nights on the board` : ""}</div></span>
              <span className="r">{g.allergens?.length ? <span className={"chip " + sevClass(g.severity)}>{g.allergens.map(a => ALLERGEN_LABEL[a]).join(", ")}</span> : null}{g.diet?.length ? <span className="chip PROVISIONAL">{g.diet.join(", ").replace(/_/g, " ")}</span> : null}</span>
            </button>))}
        </div>
        {sel ? (
          <section className="detail">
            <header><div><h2>{sel.given_name} {sel.family_name}</h2><div style={{ color: "var(--ink-2)" }}>{[sel.organisation, sel.email, sel.phone].filter(Boolean).join(" · ") || "No contact details"}</div></div></header>
            {sel.allergens?.length ? <div className={"note " + sevClass(sel.severity)}><b>{sel.severity === "ANAPHYLAXIS" ? "Life-threatening allergy" : sel.severity === "ALLERGY" ? "Allergy" : sel.severity?.toLowerCase()}:</b> {sel.allergens.map(a => ALLERGEN_LABEL[a]).join(", ")}{sel.diet_notes ? ` — ${sel.diet_notes}` : ""}</div> : null}
            <h3>Dietary record</h3>
            {can("diet.write") ? <DietEditor key={sel.id + (sel.declared_at ?? "")} g={sel} onSaved={m => { say(m); load(); }} /> : <div className="m">{sel.diet?.join(", ") || "Nothing declared"}</div>}
          </section>) : <div className="detail empty">Select a guest</div>}
      </div>
      {adding && (
        <div className="modal-backdrop" onClick={() => setAdding(false)}><div className="modal" onClick={e => e.stopPropagation()} role="dialog">
          <header><h2>Add guest</h2><button className="btn" onClick={() => setAdding(false)}>✕</button></header>
          <div className="fgrid">
            <label>First name<input value={add.given_name} onChange={e => setAdd({ ...add, given_name: e.target.value })} autoFocus /></label>
            <label>Last name<input value={add.family_name} onChange={e => setAdd({ ...add, family_name: e.target.value })} /></label>
            <label>Email<input value={add.email} onChange={e => setAdd({ ...add, email: e.target.value })} /></label>
            <label>Phone<input value={add.phone} onChange={e => setAdd({ ...add, phone: e.target.value })} /></label>
            <label className="span2">Organisation / group<input value={add.organisation} onChange={e => setAdd({ ...add, organisation: e.target.value })} placeholder="e.g. Hoffman Institute" /></label>
          </div>
          <div className="actions"><button className="btn" onClick={() => setAdding(false)}>Cancel</button><button className="btn primary" disabled={!add.given_name || !add.family_name} onClick={create}>Add guest</button></div>
        </div></div>)}
      {toast && <div className="toast">{toast}</div>}
    </>
  );
}
