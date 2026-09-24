"use client";
import { useEffect, useState } from "react";
import { api, ApiError } from "@/lib/api";
import { useStore } from "@/lib/store";

type Shift = { in_at: string; out_at: string | null; hours: number };
type Duty = { on_date: string; slot: string; kind: string };
type Row = {
  id: string; name: string; role: string; department: string | null; designation: string | null;
  contracted_hours: number | null; hourly_rate: number | null; hours: number; pay: number | null;
  variance: number | null; last: string | null; shifts: Shift[]; duty: Duty[];
};
type Pay = { from: string; to: string; kiteline: string; note: string; items: Row[] };

const DEPTS = [
  ["", "All departments"],
  ["FRONT", "Front of house"],
  ["HK", "Housekeeping"],
  ["KITCHEN", "Kitchen"],
  ["RESTAURANT", "Restaurant"],
  ["GROUNDS", "Estate and grounds"],
  ["MAINT", "Maintenance"],
];

const fmtTime = (iso: string) => new Date(iso).toLocaleString("en-GB", { weekday: "short", day: "numeric", month: "short", hour: "2-digit", minute: "2-digit" });

export default function Payroll() {
  const { can, user } = useStore();
  const [pay, setPay] = useState<Pay | null>(null);
  const [dept, setDept] = useState(user?.department ?? "");
  const [toast, setToast] = useState<string | null>(null);
  const say = (t: string) => { setToast(t); setTimeout(() => setToast(null), 3000); };
  const load = () => {
    api<Pay>(`/v1/workforce/payroll?department=${encodeURIComponent(dept)}`).then(setPay).catch(e => say(e instanceof ApiError ? e.problem.detail : "Could not open payroll"));
  };
  useEffect(load, [dept]); // eslint-disable-line
  const punch = async (kind: "IN" | "OUT") => {
    try {
      await api("/v1/workforce/clock", { method: "POST", body: JSON.stringify({ kind }) });
      say(kind === "IN" ? "Clocked in" : "Clocked out");
      load();
    } catch (e) { say(e instanceof ApiError ? e.problem.detail : "Could not clock"); }
  };
  const mine = pay?.items.find(i => i.name === user?.name);

  return (
    <>
      <div className="topbar">
        <div>
          <h1>Payroll</h1>
          <p>Hours start when someone clocks in and stop when they clock out. Pay is house-only. Kiteline still holds the published rota and PIN clock — this page uses the Vedanta clock and the house duty board.</p>
        </div>
        <div style={{ display: "flex", gap: 8 }}>
          <button className="btn primary" onClick={() => punch("IN")}>Clock in</button>
          <button className="btn" onClick={() => punch("OUT")}>Clock out</button>
        </div>
      </div>
      {mine && <div className="note">You have {mine.hours} hours this week{mine.last === "IN" ? " and you are on the clock." : "."}</div>}
      <div className="seg" style={{ marginBottom: 16 }}>
        {DEPTS.map(([c, n]) => <button key={c || "all"} className={dept === c ? "on" : ""} onClick={() => setDept(c)}>{n}</button>)}
      </div>
      {!pay && <div className="empty">Opening payroll…</div>}
      {pay && (
        <>
          <p className="m" style={{ color: "var(--ink-2)" }}>{pay.from} → {pay.to}. {pay.note} <a href={pay.kiteline} target="_blank" rel="noreferrer">Open Kiteline</a></p>
          {pay.items.length === 0 && <p className="m">No staff in this department.</p>}
          {pay.items.map(r => (
            <div key={r.id} className="panel" style={{ marginBottom: 12 }}>
              <div className="urow" style={{ border: 0 }}>
                <div>
                  <div className="t">{r.name}</div>
                  <div className="m">{r.designation || r.role}{r.department ? ` · ${r.department}` : ""}{r.last === "IN" ? " · on the clock" : ""}</div>
                </div>
                <div className="m">{r.hours} hrs{r.contracted_hours != null ? ` / ${r.contracted_hours} contracted` : ""}{r.variance != null ? ` · ${r.variance >= 0 ? "+" : ""}${r.variance}` : ""}</div>
                {can("hr.read") && <div className="t">{r.pay != null ? `£${r.pay.toFixed(2)}` : r.hourly_rate == null ? "Set a rate in Contracts" : ""}</div>}
              </div>
              {r.shifts.length > 0 && (
                <ul className="house-list">
                  {r.shifts.map((s, i) => (
                    <li key={i}><span>{fmtTime(s.in_at)} → {s.out_at ? fmtTime(s.out_at) : "still on"}</span><span className="m">{s.hours} hrs</span></li>
                  ))}
                </ul>
              )}
              {r.duty.length > 0 && <p className="m">House duty: {r.duty.map(d => `${d.on_date} ${d.slot}`).join(", ")}</p>}
            </div>
          ))}
        </>
      )}
      {toast && <div className="toast">{toast}</div>}
    </>
  );
}
