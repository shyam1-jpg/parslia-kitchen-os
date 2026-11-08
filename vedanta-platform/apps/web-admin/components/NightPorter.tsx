"use client";
import { useEffect, useState } from "react";
import Link from "next/link";
import { api, ApiError } from "@/lib/api";

type Check = { id: string; department: string; department_label: string; title: string; due_time?: string | null; done: boolean; done_by_name: string | null };
type Note = { id: string; department: string; shift: string; shift_label: string; body: string; author_name: string | null };
type Board = { date: string; checklists: Check[]; handover: Note[] };
type Estate = {
  pulse: { rooms_tonight: number; guest_rooms: number; arriving: number };
  arriving: { id: string; name: string; organisation: string | null; expected_guests: number | null; arrival_slot: string }[];
};

const HOW = [
  "Sit the front so a guest can find you, then walk the house — a round, not a desk job.",
  "Two lock-ups: after the house settles (~22:00) and again in the small hours. Doors, windows, fire exits. Double-check.",
  "After hours, guests come to the front door. Let them in and out. Never leave the latch off.",
  "Dirty cups to the wash. Tables wiped. Inventory teas, cups, milk and biscuits, then fill them for morning. Keys and lost property in the safe.",
  "Last job: write the night handover for whoever opens.",
];

export default function NightPorter() {
  const [board, setBoard] = useState<Board | null>(null);
  const [estate, setEstate] = useState<Estate | null>(null);
  const [note, setNote] = useState("");
  const [toast, setToast] = useState<string | null>(null);
  const say = (t: string) => { setToast(t); setTimeout(() => setToast(null), 3000); };
  const load = () => {
    api<Board>("/v1/ops/board").then(setBoard).catch(e => say(e instanceof ApiError ? e.problem.detail : "Could not open the night board"));
    api<Estate>("/v1/estate").then(setEstate).catch(() => {});
  };
  useEffect(() => { load(); }, []);
  const checks = (board?.checklists ?? []).filter(c => c.department === "NIGHT");
  const notes = (board?.handover ?? []).filter(h => h.department === "NIGHT" || h.shift === "night");
  const tick = async (id: string, done: boolean) => {
    try { await api(`/v1/ops/checklists/${id}/tick`, { method: "POST", body: JSON.stringify({ done }) }); load(); }
    catch (e) { say(e instanceof ApiError ? e.problem.detail : "Could not tick"); }
  };

  return (
    <>
      <div className="topbar">
        <div>
          <h1>Night porter</h1>
          <p>The house after the day team has gone home. Lock-up, the late door, the tea station, then a note for morning.</p>
        </div>
        <Link className="btn" href="/manual/?slug=night-porter">Open the night chapter</Link>
      </div>

      <div className="manual-flow" style={{ marginBottom: 18 }}>
        {["22:00 lock-up", "Late door", "01:00 round", "05:30 station", "06:30 handover"].map((n, i) => (
          <span key={n} className="manual-step">
            {i > 0 && <span className="manual-arrow" aria-hidden>→</span>}
            <span className="manual-node">{n}</span>
          </span>
        ))}
      </div>

      <div className="house-grid">
        <section className="house-panel">
          <div className="k">How the night is worked</div>
          <h2>A round, then the door</h2>
          <ol className="manual-ol">
            {HOW.map(line => <li key={line}>{line}</li>)}
          </ol>
          <p className="m" style={{ marginTop: 12 }}>Photographs of the lock-up walk live on <Link href="/service/">Department boards → Night porter</Link>.</p>
        </section>
        <section className="house-panel">
          <div className="k">Tonight</div>
          <h2>{estate ? `${estate.pulse.rooms_tonight} rooms` : "Opening…"}</h2>
          <p className="m">{estate ? `of ${estate.pulse.guest_rooms} guest rooms. ${estate.pulse.arriving} arriving today — know who is still out.` : ""}</p>
          {(estate?.arriving ?? []).map(g => (
            <div key={g.id} className="ops-line">
              <b>{g.arrival_slot}</b>
              <span>{g.name}{g.expected_guests ? ` · ${g.expected_guests} guests` : ""}</span>
            </div>
          ))}
          {estate && estate.arriving.length === 0 && <p className="m">No arrivals on the book today. Still walk the house.</p>}
        </section>
      </div>

      <div className="house-grid" style={{ marginTop: 16 }}>
        <section className="house-panel">
          <div className="k">The night round</div>
          <h2>Tick as you walk</h2>
          <ul className="check">
            {checks.map(c => (
              <li key={c.id}>
                <button type="button" className={"box " + (c.done ? "ok" : "todo")} onClick={() => tick(c.id, !c.done)} aria-pressed={c.done}>{c.done ? "✓" : ""}</button>
                <span>
                  <div>{c.due_time ? <span className="chip">{c.due_time}</span> : null}{c.title}</div>
                  <div className="m">{c.done_by_name ?? "Not yet"}</div>
                </span>
              </li>
            ))}
          </ul>
          {checks.length === 0 && <p className="m">The night round has not been seeded yet.</p>}
        </section>
        <section className="house-panel">
          <div className="k">Before you go home</div>
          <h2>Handover to morning</h2>
          {notes.length === 0 && <p className="m">No night note yet.</p>}
          {notes.map(h => (
            <div key={h.id} className="ops-card">
              <div className="ops-card-top"><b>{h.shift_label}</b><span className="m">{h.author_name ?? ""}</span></div>
              <p style={{ whiteSpace: "pre-wrap" }}>{h.body}</p>
            </div>
          ))}
          <form className="ops-form" onSubmit={async e => {
            e.preventDefault();
            try {
              await api("/v1/ops/handover", { method: "POST", body: JSON.stringify({ department: "NIGHT", shift: "night", body: note }) });
              setNote("");
              say("Night note left for morning");
              load();
            } catch (err) { say(err instanceof ApiError ? err.problem.detail : "Could not save"); }
          }}>
            <textarea required rows={4} value={note} onChange={e => setNote(e.target.value)} placeholder="Who arrived late, what was left unlocked, what ran out, who needed help" />
            <button className="btn primary" type="submit">Leave the night note</button>
          </form>
        </section>
      </div>
      {toast && <div className="toast">{toast}</div>}
    </>
  );
}
