"use client";
import { useEffect, useState } from "react";
import { api, ApiError } from "@/lib/api";
import { useStore } from "@/lib/store";

type Dept = { code: string; label: string };
type Board = {
  date: string;
  departments: Dept[];
  progress: { done: number; total: number };
  handover: { id: string; department: string; department_label: string; shift: string; shift_label: string; for_date: string; body: string; author_name: string | null; created_at: string }[];
  notices: { id: string; department: string | null; department_label: string; title: string; body: string; author_name: string | null; pinned: boolean; created_at: string }[];
  checklists: { id: string; department: string; department_label: string; title: string; due_time?: string | null; done: boolean; done_by_name: string | null }[];
  guest_requests: { id: string; guest_name: string | null; room_label: string | null; department: string; department_label: string; request_text: string; status: string; created_at: string }[];
};

const STATUS: Record<string, string> = { open: "Open", doing: "Doing", done: "Done" };

export default function OpsBoard({ compact = false }: { compact?: boolean }) {
  const { user } = useStore();
  const [board, setBoard] = useState<Board | null>(null);
  const [err, setErr] = useState<string | null>(null);
  const [toast, setToast] = useState<string | null>(null);
  const [dept, setDept] = useState("all");
  const [handover, setHandover] = useState({ department: "HOUSE", shift: "am", body: "" });
  const [notice, setNotice] = useState({ title: "", body: "", department: "", pinned: false });
  const [ask, setAsk] = useState({ guest_name: "", room_label: "", department: "", request_text: "" });
  const say = (t: string) => { setToast(t); setTimeout(() => setToast(null), 3000); };
  const load = () => api<Board>("/v1/ops/board").then(setBoard).catch(e => setErr(e instanceof ApiError ? e.problem.detail : "The house log could not be opened."));
  useEffect(() => { load(); }, []);
  if (err) return <div className="note">{err}</div>;
  if (!board) return <div className="empty">Opening the house log…</div>;

  const checks = board.checklists.filter(c => dept === "all" || c.department === dept);
  const requests = board.guest_requests.filter(r => dept === "all" || r.department === dept);
  const notes = board.handover.filter(h => dept === "all" || h.department === dept || h.department === "HOUSE");
  const notices = board.notices.filter(n => dept === "all" || !n.department || n.department === dept);

  const tick = async (id: string, done: boolean) => {
    try { await api(`/v1/ops/checklists/${id}/tick`, { method: "POST", body: JSON.stringify({ done }) }); say(done ? "Ticked" : "Unchecked"); load(); }
    catch (e) { say(e instanceof ApiError ? e.problem.detail : "Could not tick"); }
  };
  const setStatus = async (id: string, status: string) => {
    try { await api(`/v1/ops/guest-requests/${id}`, { method: "PATCH", body: JSON.stringify({ status }) }); load(); }
    catch (e) { say(e instanceof ApiError ? e.problem.detail : "Could not update"); }
  };

  if (compact) {
    const latest = board.handover[0];
    return (
      <section className="house-panel span2">
        <div className="k">House log</div>
        <h2>Today’s board</h2>
        <p className="m" style={{ color: "var(--ink-2)" }}>
          {board.guest_requests.length} guest {board.guest_requests.length === 1 ? "request" : "requests"} open · {board.progress.done}/{board.progress.total} checks done
          {latest ? ` · last note ${latest.department_label} ${latest.shift_label.toLowerCase()}` : ""}
        </p>
        {board.guest_requests.slice(0, 3).map(r => (
          <div key={r.id} className="ops-line">
            <b>{r.department_label}</b>
            <span>{r.guest_name ? `${r.guest_name}${r.room_label ? ` · ${r.room_label}` : ""} — ` : ""}{r.request_text}</span>
          </div>
        ))}
        {board.guest_requests.length === 0 && <p className="m" style={{ color: "var(--ink-2)" }}>No open guest requests.</p>}
        <div className="actions" style={{ border: 0, paddingTop: 12 }}>
          <a className="btn primary" href="/ops/">Open the house log</a>
        </div>
      </section>
    );
  }

  return (
    <>
      <div className="topbar">
        <div>
          <h1>House log</h1>
          <p>Shift notes, daily rounds and guest asks — one place instead of WhatsApp. {user?.name ? `Signed as ${user.name}.` : ""} {board.progress.done}/{board.progress.total} checks done today.</p>
        </div>
      </div>
      <div className="seg" style={{ marginBottom: 16 }}>
        <button className={dept === "all" ? "on" : ""} onClick={() => setDept("all")}>All</button>
        {board.departments.map(d => <button key={d.code} className={dept === d.code ? "on" : ""} onClick={() => setDept(d.code)}>{d.label}</button>)}
      </div>
      <div className="house-grid ops-grid">
        <section className="house-panel">
          <div className="k">Guest requests</div>
          <h2>What guests need</h2>
          {requests.length === 0 && <p className="m" style={{ color: "var(--ink-2)" }}>Nothing waiting.</p>}
          {requests.map(r => (
            <div key={r.id} className="ops-card">
              <div className="ops-card-top">
                <span className={"chip st-" + (r.status === "doing" ? "CLEANING" : "VACANT_CLEAN")}>{STATUS[r.status] ?? r.status}</span>
                <span className="m">{r.department_label}{r.room_label ? ` · ${r.room_label}` : ""}{r.guest_name ? ` · ${r.guest_name}` : ""}</span>
              </div>
              <p>{r.request_text}</p>
              <div className="hk-actions">
                {r.status === "open" && <button className="btn primary" onClick={() => setStatus(r.id, "doing")}>Take it</button>}
                {r.status !== "done" && <button className="btn" onClick={() => setStatus(r.id, "done")}>Done</button>}
              </div>
            </div>
          ))}
          <form className="ops-form" onSubmit={async e => {
            e.preventDefault();
            try {
              const r = await api<{ department_label: string }>("/v1/ops/guest-requests", { method: "POST", body: JSON.stringify(ask) });
              setAsk({ guest_name: "", room_label: "", department: "", request_text: "" });
              say(`Logged for ${r.department_label}`);
              load();
            } catch (err) { say(err instanceof ApiError ? err.problem.detail : "Could not log"); }
          }}>
            <label>Log a request from the floor<textarea required rows={2} value={ask.request_text} onChange={e => setAsk({ ...ask, request_text: e.target.value })} placeholder="e.g. Extra towels in 110" /></label>
            <div className="frow">
              <input value={ask.guest_name} onChange={e => setAsk({ ...ask, guest_name: e.target.value })} placeholder="Guest name" />
              <input value={ask.room_label} onChange={e => setAsk({ ...ask, room_label: e.target.value })} placeholder="Room" />
            </div>
            <label>Department (blank = route automatically)
              <select value={ask.department} onChange={e => setAsk({ ...ask, department: e.target.value })}>
                <option value="">Auto</option>
                {board.departments.filter(d => d.code !== "HOUSE").map(d => <option key={d.code} value={d.code}>{d.label}</option>)}
              </select>
            </label>
            <button className="btn" type="submit">Send to the board</button>
          </form>
        </section>

        <section className="house-panel">
          <div className="k">Daily round</div>
          <h2>Checklists</h2>
          <ul className="check">
            {checks.map(c => (
              <li key={c.id}>
                <button type="button" className={"box " + (c.done ? "ok" : "todo")} onClick={() => tick(c.id, !c.done)} aria-pressed={c.done}>{c.done ? "✓" : ""}</button>
                <span>
                  <div>{c.due_time ? `${c.due_time} · ` : ""}{c.title}</div>
                  <div className="m">{c.department_label}{c.done_by_name ? ` · ${c.done_by_name}` : ""}</div>
                </span>
              </li>
            ))}
          </ul>
        </section>

        <section className="house-panel">
          <div className="k">Handover</div>
          <h2>For the next shift</h2>
          {notes.length === 0 && <p className="m" style={{ color: "var(--ink-2)" }}>No notes yet today.</p>}
          {notes.map(h => (
            <div key={h.id} className="ops-card">
              <div className="ops-card-top"><b>{h.department_label} · {h.shift_label}</b><span className="m">{h.author_name ?? ""}</span></div>
              <p style={{ whiteSpace: "pre-wrap" }}>{h.body}</p>
            </div>
          ))}
          <form className="ops-form" onSubmit={async e => {
            e.preventDefault();
            try {
              await api("/v1/ops/handover", { method: "POST", body: JSON.stringify(handover) });
              setHandover({ ...handover, body: "" });
              say("Handover saved");
              load();
            } catch (err) { say(err instanceof ApiError ? err.problem.detail : "Could not save"); }
          }}>
            <div className="frow">
              <select value={handover.department} onChange={e => setHandover({ ...handover, department: e.target.value })}>
                {board.departments.map(d => <option key={d.code} value={d.code}>{d.label}</option>)}
              </select>
              <select value={handover.shift} onChange={e => setHandover({ ...handover, shift: e.target.value })}>
                <option value="am">Morning</option>
                <option value="pm">Evening</option>
              </select>
            </div>
            <textarea required rows={3} value={handover.body} onChange={e => setHandover({ ...handover, body: e.target.value })} placeholder="What the next shift needs to know" />
            <button className="btn primary" type="submit">Leave the note</button>
          </form>
        </section>

        <section className="house-panel">
          <div className="k">Notices</div>
          <h2>For the team</h2>
          {notices.length === 0 && <p className="m" style={{ color: "var(--ink-2)" }}>Nothing pinned.</p>}
          {notices.map(n => (
            <div key={n.id} className="ops-card">
              <div className="ops-card-top"><b>{n.title}</b>{n.pinned && <span className="chip CONFIRMED">Pinned</span>}</div>
              <p style={{ whiteSpace: "pre-wrap" }}>{n.body}</p>
              <div className="m">{n.department_label}{n.author_name ? ` · ${n.author_name}` : ""}</div>
            </div>
          ))}
          <form className="ops-form" onSubmit={async e => {
            e.preventDefault();
            try {
              await api("/v1/ops/notices", { method: "POST", body: JSON.stringify({ ...notice, department: notice.department || null }) });
              setNotice({ title: "", body: "", department: "", pinned: false });
              say("Notice posted");
              load();
            } catch (err) { say(err instanceof ApiError ? err.problem.detail : "Could not post"); }
          }}>
            <input required value={notice.title} onChange={e => setNotice({ ...notice, title: e.target.value })} placeholder="Title" />
            <textarea required rows={2} value={notice.body} onChange={e => setNotice({ ...notice, body: e.target.value })} placeholder="What the house should know" />
            <label style={{ display: "flex", gap: 8, alignItems: "center" }}>
              <input type="checkbox" checked={notice.pinned} onChange={e => setNotice({ ...notice, pinned: e.target.checked })} /> Pin at the top
            </label>
            <button className="btn" type="submit">Post notice</button>
          </form>
        </section>
      </div>
      {toast && <div className="toast">{toast}</div>}
    </>
  );
}
