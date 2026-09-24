"use client";
import { useEffect, useState } from "react";
import { api, ApiError } from "@/lib/api";
import { useStore } from "@/lib/store";
import { fmt, addDays } from "@/lib/format";
import { ReportFault } from "@/components/Maintenance";
type R = { number: string; section: string; status: string; max_capacity: number; notes: string | null; staff_only: boolean; version: number; occupied_last_night: boolean; occupied_tonight: boolean; names: string | null; group_name: string | null; last_change: string | null; task: string | null };
type G = { name: string; organisation: string | null; arrival: string; departure: string; expected_rooms: number | null; expected_guests: number | null; rooms_placed: number };
const STATUS: Record<string, string> = { VACANT_DIRTY: "Dirty", CLEANING: "Cleaning", VACANT_CLEAN: "Clean", INSPECTED: "Inspected", OCCUPIED: "Occupied", OUT_OF_SERVICE: "Out of service", OUT_OF_ORDER: "Out of order" };
const TASK: Record<string, string> = { departure_clean: "Departure — full clean", stayover: "Stay-over — service", arrival_prepare: "Arrival today — must be ready", vacant: "Vacant", out: "Out of use" };
const NEXT: Record<string, [string, string][]> = {
  VACANT_DIRTY: [["start_cleaning", "Start cleaning"]], CLEANING: [["finish_cleaning", "Finished"]], VACANT_CLEAN: [["pass_inspection", "Inspected ✓"], ["fail_inspection", "Needs redoing"]],
  INSPECTED: [["fail_inspection", "Needs redoing"]], OCCUPIED: [], OUT_OF_SERVICE: [["restore", "Back in service"]], OUT_OF_ORDER: [["restore", "Back in service"]] };

export default function Housekeeping() {
  const { can } = useStore(); const editable = can("room.status.update");
  const [date, setDate] = useState(new Date().toISOString().slice(0, 10)); const [rooms, setRooms] = useState<R[]>([]); const [counts, setCounts] = useState<Record<string, number>>({});
  const [groups, setGroups] = useState<{ arrivals: G[]; departures: G[]; stayovers: G[]; unplaced: G[] } | null>(null);
  const [hint, setHint] = useState<string | null>(null);
  const [filter, setFilter] = useState<string>("todo"); const [toast, setToast] = useState<string | null>(null); const [fault, setFault] = useState<string | null>(null);
  const say = (t: string) => { setToast(t); setTimeout(() => setToast(null), 3000); };
  const load = () => api<{ rooms: R[]; counts: Record<string, number>; groups?: { arrivals: G[]; departures: G[]; stayovers: G[]; unplaced: G[] }; hint?: string | null }>(`/v1/housekeeping?date=${date}`).then(r => { setRooms(r.rooms); setCounts(r.counts); setGroups(r.groups ?? null); setHint(r.hint ?? null); }).catch(e => say(e instanceof ApiError ? e.problem.detail : "Could not load"));
  useEffect(() => { load(); }, [date]); // eslint-disable-line react-hooks/exhaustive-deps
  const cmd = async (r: R, c: string) => {
    const body: Record<string, unknown> = {};
    if (c === "restore") { if (!confirm(`Confirm an authorised safety check has been done on room ${r.number}?`)) return; body.safety_check_passed = true; }
    if (c.startsWith("set_out")) { const reason = prompt("Why is the room out of use?"); if (!reason) return; body.reason = reason; }
    try { const x = await api<{ status: string }>(`/v1/rooms/${r.number}/commands/${c}`, { method: "POST", body: JSON.stringify(body), version: r.version }); say(`Room ${r.number}: ${STATUS[x.status]}`); load(); }
    catch (e) { say(e instanceof ApiError ? e.problem.detail : "Could not update"); }
  };
  const shown = rooms.filter(r => !r.staff_only && (filter === "all" || (filter === "todo" ? ["departure_clean", "stayover", "arrival_prepare"].includes(r.task ?? "") && r.status !== "INSPECTED" : r.task === filter)));
  const sections = [...new Set(shown.map(r => r.section))];
  return (
    <>
      <div className="topbar">
        <div><h1>Housekeeping</h1><p>The rooms, in the order the house needs them. {fmt(date, { weekday: "long", day: "numeric", month: "long" })} · {counts.departure_clean ?? 0} departures · {counts.arrival_prepare ?? 0} arrivals · {counts.stayover ?? 0} stay-overs · {counts.out ?? 0} out of use</p></div>
        <div className="seg"><button onClick={() => setDate(addDays(date, -1))}>‹</button><button onClick={() => setDate(new Date().toISOString().slice(0, 10))}>Today</button><input type="date" aria-label="Go to date" value={date} onChange={e => e.target.value && setDate(e.target.value)} style={{ border: 0, padding: "6px 8px", font: "inherit", color: "var(--ink-2)", background: "transparent" }} /><button onClick={() => setDate(addDays(date, 1))}>›</button></div>
      </div>
      <div className="seg" style={{ marginBottom: 14 }}>
        {[["todo", "To do"], ["departure_clean", "Departures"], ["arrival_prepare", "Arrivals"], ["stayover", "Stay-overs"], ["vacant", "Vacant"], ["out", "Out of use"], ["all", "All rooms"]].map(([k, l]) => <button key={k} className={filter === k ? "on" : ""} onClick={() => setFilter(k)}>{l}</button>)}
      </div>
      {hint && <div className="note" style={{ marginBottom: 14 }}>{hint}</div>}
      {groups && (groups.arrivals.length + groups.departures.length + groups.stayovers.length > 0) && (
        <div className="panel" style={{ marginBottom: 14 }}>
          <h3 style={{ marginTop: 0 }}>Groups in house today</h3>
          {groups.departures.length > 0 && <p className="m"><b>Departing ({groups.departures.length}):</b> {groups.departures.map(g => g.name).join(", ")}</p>}
          {groups.arrivals.length > 0 && <p className="m"><b>Arriving ({groups.arrivals.length}):</b> {groups.arrivals.map(g => g.name).join(", ")}</p>}
          {groups.stayovers.length > 0 && <p className="m"><b>Staying over ({groups.stayovers.length}):</b> {groups.stayovers.map(g => g.name).join(", ")}</p>}
          {groups.unplaced.length > 0 && <p className="m" style={{ color: "var(--brick)" }}><b>Rooms not placed:</b> {groups.unplaced.map(g => `${g.name} (${g.rooms_placed}/${g.expected_rooms ?? "?"} rooms)`).join("; ")}</p>}
        </div>
      )}
      {shown.length === 0 && <div className="empty" style={{ background: "var(--paper)", border: "1px solid var(--line)", borderRadius: 10 }}>Nothing here — all done.</div>}
      {sections.map(sec => (
        <div key={sec}>
          <h3 style={{ margin: "14px 0 8px" }}>{sec}</h3>
          <div className="hkgrid">
            {shown.filter(r => r.section === sec).map(r => (
              <div key={r.number} className={"hk " + r.status + (r.task === "arrival_prepare" ? " urgent" : "")}>
                <div className="hk-top"><b>{r.number}</b><span className={"chip st-" + r.status}>{STATUS[r.status]}</span></div>
                <div className="m">{TASK[r.task ?? "vacant"]}{r.group_name ? ` · ${r.group_name}` : ""}</div>
                {r.names && <div className="m" style={{ marginTop: 2 }}>{r.names}</div>}
                {r.notes && <div className="m" style={{ marginTop: 2, fontStyle: "italic" }}>{r.notes}</div>}
                {r.last_change && <div className="m" style={{ marginTop: 4, fontSize: 11 }}>{r.last_change}</div>}
                {editable && <div className="hk-actions">
                  {(NEXT[r.status] ?? []).map(([c, l]) => <button key={c} className={"btn" + (c === "start_cleaning" || c === "finish_cleaning" || c === "pass_inspection" ? " primary" : "")} onClick={() => cmd(r, c)}>{l}</button>)}
                  {can("maintenance.report") && <button className="btn" onClick={() => setFault(r.number)}>Report fault</button>}
                </div>}
              </div>))}
          </div>
        </div>))}
      {fault && <ReportFault room={fault} onClose={() => setFault(null)} onDone={m => { setFault(null); say(m); load(); }} />}
      {toast && <div className="toast">{toast}</div>}
    </>
  );
}
