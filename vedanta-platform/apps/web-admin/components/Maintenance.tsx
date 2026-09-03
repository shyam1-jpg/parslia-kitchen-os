"use client";
import { useEffect, useState } from "react";
import { api, ApiError } from "@/lib/api";
import { useStore } from "@/lib/store";

const BUILDING_AREAS = [
  "Main building — ground floor",
  "Main building — first floor",
  "Main building — second floor",
  "Pink corridor",
  "Green corridor",
  "Kitchen",
  "Restaurant / dining room",
  "Reception",
  "Laundry",
  "Boiler room",
  "Lakeside path",
  "Gardens and grounds",
  "Car park",
  "Other",
];

const DEPARTMENTS = [
  ["HK", "Housekeeping"],
  ["KITCHEN", "Kitchen"],
  ["RESTAURANT", "Restaurant"],
  ["FRONT", "Front of house"],
  ["GROUNDS", "Estate and grounds"],
  ["MAINT", "Maintenance"],
  ["MGMT", "Management"],
];

type T = { id: string; number: number; title: string; description: string | null; priority: string; status: string; location: string | null; department: string | null; room: string | null; takes_room_out: boolean; resolution: string | null; created_at: string; resolved_at: string | null; reported_by: string | null; assigned_to: string | null; assigned_to_user_id: string | null; version: number };
const PRI: Record<string, string> = { SAFETY: "Safety", URGENT: "Urgent", NORMAL: "Normal", LOW: "Low" };
const ST: Record<string, string> = { OPEN: "Open", IN_PROGRESS: "In progress", WAITING_PARTS: "Waiting for parts", DONE: "Done", CANCELLED: "Cancelled" };

export function ReportFault({ room, onClose, onDone }: { room?: string; onClose: () => void; onDone: (msg: string) => void }) {
  const { user } = useStore();
  const [f, setF] = useState({
    title: "",
    description: "",
    room: room ?? "",
    location: "",
    location_pick: "",
    department: user?.department ?? "",
    priority: "NORMAL",
    takes_room_out: false,
  });
  const [err, setErr] = useState<string | null>(null);
  const submit = async () => {
    const location = f.room ? undefined : (f.location_pick === "Other" ? f.location : f.location_pick || f.location);
    try {
      const r = await api<{ number: number }>("/v1/maintenance", {
        method: "POST",
        body: JSON.stringify({
          title: f.title,
          description: f.description || undefined,
          room: f.room || undefined,
          location,
          department: f.department,
          priority: f.priority,
          takes_room_out: f.takes_room_out,
        }),
      });
      onDone(`Reported as M-${r.number}${f.takes_room_out && f.room ? ` — room ${f.room} is out of order` : ""}`);
    } catch (e) {
      setErr(e instanceof ApiError ? e.problem.detail : "Could not report");
    }
  };
  return (
    <div className="modal-backdrop" onClick={onClose}><div className="modal" onClick={e => e.stopPropagation()} role="dialog">
      <header><h2>Report a fault</h2><button className="btn" onClick={onClose}>✕</button></header>
      <div className="fgrid">
        <label className="span2">What is wrong?<input autoFocus value={f.title} onChange={e => setF({ ...f, title: e.target.value })} placeholder="e.g. Shower leaking into the corridor" /></label>
        <label>Reporting department<select value={f.department} onChange={e => setF({ ...f, department: e.target.value })}>{DEPARTMENTS.map(([c, n]) => <option key={c} value={c}>{n}</option>)}</select></label>
        <label>Priority<select value={f.priority} onChange={e => setF({ ...f, priority: e.target.value })}>{Object.entries(PRI).map(([k, l]) => <option key={k} value={k}>{l}</option>)}</select></label>
        <label>Room (if a bedroom)<input value={f.room} onChange={e => setF({ ...f, room: e.target.value })} placeholder="e.g. 110" /></label>
        <label>Building area<select value={f.location_pick} onChange={e => setF({ ...f, location_pick: e.target.value })}><option value="">Choose area…</option>{BUILDING_AREAS.map(a => <option key={a} value={a}>{a}</option>)}</select></label>
        {f.location_pick === "Other" && <label className="span2">Describe where<input value={f.location} onChange={e => setF({ ...f, location: e.target.value })} placeholder="e.g. Staff corridor near laundry" /></label>}
        <label style={{ display: "flex", gap: 8, alignItems: "center", marginTop: 20 }}><input type="checkbox" checked={f.takes_room_out} onChange={e => setF({ ...f, takes_room_out: e.target.checked })} disabled={!f.room} />Room can&apos;t be used until fixed</label>
        <label className="span2">Details<textarea rows={3} value={f.description} onChange={e => setF({ ...f, description: e.target.value })} /></label>
      </div>
      {err && <div className="note">{err}</div>}
      <div className="actions"><button className="btn" onClick={onClose}>Cancel</button><button className="btn primary" disabled={!f.title.trim() || !f.department || (!f.room && !f.location_pick && !f.location)} onClick={submit}>Report</button></div>
    </div></div>);
}

export default function Maintenance() {
  const { can } = useStore(); const work = can("maintenance.work");
  const [items, setItems] = useState<T[]>([]); const [assignees, setAssignees] = useState<{ id: string; name: string }[]>([]); const [closed, setClosed] = useState(false); const [reporting, setReporting] = useState(false);
  const [toast, setToast] = useState<string | null>(null); const say = (t: string) => { setToast(t); setTimeout(() => setToast(null), 3500); };
  const load = () => api<{ items: T[]; assignees: { id: string; name: string }[] }>(`/v1/maintenance?status=${closed ? "closed" : "open"}`).then(r => { setItems(r.items); setAssignees(r.assignees); }).catch(() => {});
  useEffect(() => { load(); }, [closed]); // eslint-disable-line react-hooks/exhaustive-deps
  const cmd = async (t: T, c: string) => {
    const body: Record<string, unknown> = {};
    if (c === "done") { body.resolution = prompt("What was done?") ?? ""; if (t.takes_room_out && t.room) body.room_back_in_service = confirm(`Put room ${t.room} back in service? Only if a safety check has been done.`); }
    if (c === "cancel") body.resolution = prompt("Why cancel?") ?? "";
    try { await api(`/v1/maintenance/${t.id}/commands/${c}`, { method: "POST", body: JSON.stringify(body) }); say(`M-${t.number} ${c === "done" ? "closed" : c === "start" ? "started" : c}`); load(); } catch (e) { say(e instanceof ApiError ? e.problem.detail : "Could not update"); }
  };
  const deptName = (c: string | null) => DEPARTMENTS.find(([d]) => d === c)?.[1] ?? c ?? "—";
  return (
    <>
      <div className="topbar"><div><h1>Maintenance</h1><p>{closed ? "Closed tickets" : `${items.length} open · ${items.filter(t => t.priority === "SAFETY" || t.priority === "URGENT").length} urgent or safety`}</p></div>
        <div style={{ display: "flex", gap: 10 }}><div className="seg"><button className={!closed ? "on" : ""} onClick={() => setClosed(false)}>Open</button><button className={closed ? "on" : ""} onClick={() => setClosed(true)}>Closed</button></div>{can("maintenance.report") && <button className="btn primary" onClick={() => setReporting(true)}>Report a fault</button>}</div></div>
      {items.length === 0 && <div className="empty" style={{ background: "var(--paper)", border: "1px solid var(--line)", borderRadius: 10 }}>{closed ? "Nothing closed yet." : "Nothing open."}</div>}
      <div className="hkgrid">{items.map(t => (
        <div key={t.id} className={"hk " + (t.priority === "SAFETY" || t.priority === "URGENT" ? "VACANT_DIRTY" : t.status === "IN_PROGRESS" ? "CLEANING" : t.status === "DONE" ? "INSPECTED" : "VACANT_CLEAN")}>
          <div className="hk-top"><b>M-{t.number} · {t.room ? `Room ${t.room}` : t.location ?? "—"}</b><span className={"chip " + (t.priority === "SAFETY" ? "sev-high" : t.priority === "URGENT" ? "sev-mid" : "PROVISIONAL")}>{PRI[t.priority]}</span></div>
          <div style={{ fontWeight: 500, marginTop: 4 }}>{t.title}</div>
          {t.description && <div className="m">{t.description}</div>}
          <div className="m" style={{ marginTop: 4 }}>{ST[t.status]} · {deptName(t.department)} · reported by {t.reported_by ?? "—"} {new Date(t.created_at).toLocaleDateString("en-GB")}{t.takes_room_out ? " · room out of order" : ""}</div>
          {t.resolution && <div className="m" style={{ marginTop: 2 }}>Resolution: {t.resolution}</div>}
          {work && !closed && <div style={{ marginTop: 8 }}><select className="btn" value={t.assigned_to_user_id ?? ""} onChange={e => api(`/v1/maintenance/${t.id}`, { method: "PATCH", body: JSON.stringify({ assigned_to_user_id: e.target.value || null }) }).then(load)}><option value="">Unassigned</option>{assignees.map(a => <option key={a.id} value={a.id}>{a.name}</option>)}</select></div>}
          {work && <div className="hk-actions">
            {(t.status === "OPEN" || t.status === "WAITING_PARTS") && <button className="btn primary" onClick={() => cmd(t, "start")}>Start</button>}
            {(t.status === "OPEN" || t.status === "IN_PROGRESS") && <button className="btn" onClick={() => cmd(t, "wait")}>Waiting for parts</button>}
            {!["DONE", "CANCELLED"].includes(t.status) && <><button className="btn primary" onClick={() => cmd(t, "done")}>Done</button><button className="btn danger" onClick={() => cmd(t, "cancel")}>Cancel</button></>}
            {["DONE", "CANCELLED"].includes(t.status) && <button className="btn" onClick={() => cmd(t, "reopen")}>Reopen</button>}
          </div>}
        </div>))}</div>
      {reporting && <ReportFault onClose={() => setReporting(false)} onDone={m => { setReporting(false); say(m); load(); }} />}
      {toast && <div className="toast">{toast}</div>}
    </>
  );
}
