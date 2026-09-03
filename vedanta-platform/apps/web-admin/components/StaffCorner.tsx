"use client";
import { useEffect, useState } from "react";
import { api, ApiError } from "@/lib/api";
import { useStore } from "@/lib/store";
import OrganogramView, { type Organogram } from "./Organogram";

type Person = { id: string; name: string; email: string; role: string; department: string | null; department_name?: string | null };
type Leave = { id: string; kind: string; starts_on: string; ends_on: string; hours: string; status: string; name: string; role: string; department: string | null; note: string | null };
type Duty = { id: string; on_date: string; slot: string; kind: string; name: string; role: string; room: string | null };
type ClockRow = { id: string; name: string; hours: number; last: string | null; department?: string | null };
type TipRow = { name: string; hours: number; share: number; department?: string | null };

const DEPTS = [
  ["", "All departments"],
  ["HK", "Housekeeping"],
  ["KITCHEN", "Kitchen"],
  ["RESTAURANT", "Restaurant"],
  ["FRONT", "Front of house"],
  ["GROUNDS", "Estate and grounds"],
  ["MAINT", "Maintenance"],
];

export default function StaffCorner() {
  const { can, user } = useStore();
  const showLeave = can("leave.approve_hod") || can("leave.approve_gm");
  const showHours = can("clock.manage");
  const showTips = can("tip.manage");
  const showSop = can("sop.manage");
  const showHr = can("hr.read");
  const tabs = ([
    ["house", "Household"],
    showLeave ? ["leave", "Leave"] : null,
    ["duty", "Duty"],
    showHours ? ["hours", "Hours"] : null,
    showTips ? ["tips", "Tips"] : null,
    showSop ? ["sop", "SOP"] : null,
    showHr ? ["hr", "Contracts & pay"] : null,
  ] as const).filter(Boolean) as [string, string][];
  const [tab, setTab] = useState(tabs[0]?.[0] ?? "house");
  const [people, setPeople] = useState<Person[]>([]);
  const [org, setOrg] = useState<Organogram | null>(null);
  const [leave, setLeave] = useState<Leave[]>([]);
  const [duty, setDuty] = useState<Duty[]>([]);
  const [hours, setHours] = useState<ClockRow[]>([]);
  const [hoursDept, setHoursDept] = useState(user?.department ?? "");
  const [toast, setToast] = useState<string | null>(null);
  const [dform, setDform] = useState({ user_id: "", on_date: new Date().toISOString().slice(0, 10), slot: "AM", kind: "DUTY" });
  const [tips, setTips] = useState({ total: "200", rate_per_hour: "0.20", method: "EVEN", department: user?.department ?? "" });
  const [split, setSplit] = useState<TipRow[] | null>(null);
  const [sop, setSop] = useState({ title: "", body: "", user_ids: [] as string[] });
  const [hr, setHr] = useState<{ id: string; name: string; role: string; designation: string | null; pay_note: string | null; contracted_hours: string | null }[]>([]);
  const say = (t: string) => { setToast(t); setTimeout(() => setToast(null), 3500); };
  const run = async (fn: () => Promise<unknown>, ok: string) => { try { await fn(); say(ok); } catch (e) { say(e instanceof ApiError ? e.problem.detail : "Could not save"); } };

  const load = () => {
    api<{ items: Person[] }>("/v1/workforce/people").then(r => setPeople(r.items)).catch(() => {});
    api<Organogram>("/v1/workforce/organogram").then(setOrg).catch(() => {});
    if (showLeave) api<{ items: Leave[] }>("/v1/workforce/leave").then(r => setLeave(r.items)).catch(() => {});
    api<{ items: Duty[] }>("/v1/workforce/duty?from=" + dform.on_date + "&to=" + dform.on_date).then(r => setDuty(r.items)).catch(() => {});
    if (showHours) api<{ items: ClockRow[] }>(`/v1/workforce/clock?department=${encodeURIComponent(hoursDept)}`).then(r => setHours(r.items)).catch(() => {});
    if (showHr) api<{ items: typeof hr }>("/v1/workforce/hr").then(r => setHr(r.items)).catch(() => {});
  };
  useEffect(load, [hoursDept]); // eslint-disable-line

  const deptPeople = tips.department ? people.filter(p => p.department === tips.department) : people;

  return (
    <>
      <div className="topbar"><div><h1>Staff</h1><p>Household, leave, hours and tips. Each department sees its own team.</p></div></div>
      <div className="seg" style={{ marginBottom: 16 }}>
        {tabs.map(([t, label]) => <button key={t} className={tab === t ? "on" : ""} onClick={() => setTab(t)}>{label}</button>)}
      </div>
      {tab === "house" && (
        <div>
          <p className="m" style={{ color: "var(--ink-2)", marginBottom: 14 }}>The people of the house.</p>
          {org ? <OrganogramView org={org} /> : <p className="m">Opening the household…</p>}
        </div>
      )}
      {tab === "leave" && showLeave && (
        <div className="panel">
          <h3>Holiday book</h3>
          <p className="m" style={{ color: "var(--ink-2)" }}>Ordinary staff: head of department, then general manager. Heads of department: general manager only.</p>
          {leave.length === 0 && <p className="m">No requests yet. Staff request holiday on the pocket app.</p>}
          {leave.map(l => (
            <div className="urow" key={l.id}>
              <div><div className="t">{l.name} · {l.kind.toLowerCase()}</div><div className="m">{l.starts_on} → {l.ends_on} · {l.hours} hrs · {l.department ?? l.role}{l.note ? ` · ${l.note}` : ""}</div></div>
              <span className={"chip " + (l.status === "APPROVED" ? "CONFIRMED" : l.status === "REJECTED" ? "CANCELLED" : "PROVISIONAL")}>{l.status.replace(/_/g, " ").toLowerCase()}</span>
              {(l.status === "SUBMITTED" || l.status === "HOD_APPROVED") && (
                <span style={{ display: "flex", gap: 6 }}>
                  <button className="btn primary" onClick={() => run(() => api(`/v1/workforce/leave/${l.id}/approve`, { method: "POST", body: "{}" }).then(load), "Signed")}>Approve</button>
                  <button className="btn danger" onClick={() => run(() => api(`/v1/workforce/leave/${l.id}/reject`, { method: "POST", body: "{}" }).then(load), "Refused")}>Refuse</button>
                </span>
              )}
            </div>
          ))}
        </div>
      )}
      {tab === "duty" && (
        <div className="panel">
          <h3>Who is on the board</h3>
          <div className="frow" style={{ flexWrap: "wrap", gap: 8 }}>
            <select className="btn" value={dform.user_id} onChange={e => setDform({ ...dform, user_id: e.target.value })}><option value="">Staff</option>{people.map(p => <option key={p.id} value={p.id}>{p.name}</option>)}</select>
            <input type="date" value={dform.on_date} onChange={e => setDform({ ...dform, on_date: e.target.value })} />
            <select className="btn" value={dform.slot} onChange={e => setDform({ ...dform, slot: e.target.value })}><option>AM</option><option>PM</option></select>
            <select className="btn" value={dform.kind} onChange={e => setDform({ ...dform, kind: e.target.value })}><option>DUTY</option><option>COVER</option></select>
            {can("cover.write") && <button className="btn primary" onClick={() => run(() => api("/v1/workforce/duty", { method: "POST", body: JSON.stringify(dform) }).then(load), "On the board")}>Place</button>}
          </div>
          {duty.map(d => <div className="urow" key={d.id}><div className="t">{d.name}</div><div className="m">{d.slot} · {d.kind.toLowerCase()}{d.room ? ` · room ${d.room}` : ""}</div></div>)}
        </div>
      )}
      {tab === "hours" && showHours && (
        <div className="panel">
          <h3>Hours this week</h3>
          <p className="m" style={{ color: "var(--ink-2)" }}>Only heads of department and management see hours. Filter by your team.</p>
          <select className="btn" value={hoursDept} onChange={e => setHoursDept(e.target.value)} style={{ marginBottom: 12 }}>
            {DEPTS.map(([c, n]) => <option key={c || "all"} value={c}>{n}</option>)}
          </select>
          {hours.length === 0 && <p className="m">No clock records for this department this week.</p>}
          {hours.map(h => <div className="urow" key={h.id}><div className="t">{h.name}</div><div className="m">{h.hours} hrs {h.last === "IN" ? "· on the clock" : ""}</div></div>)}
        </div>
      )}
      {tab === "tips" && showTips && (
        <div className="panel">
          <h3>Tip pool</h3>
          <p className="m" style={{ color: "var(--ink-2)" }}>Guests never see this. Choose a department, enter the total, then calculate — each person&apos;s share appears below.</p>
          <div className="frow" style={{ flexWrap: "wrap", gap: 8 }}>
            <label>Department<select className="btn" value={tips.department} onChange={e => { setTips({ ...tips, department: e.target.value }); setSplit(null); }}>{DEPTS.filter(([c]) => c).map(([c, n]) => <option key={c} value={c}>{n}</option>)}</select></label>
            <label>Total £<input type="number" value={tips.total} onChange={e => setTips({ ...tips, total: e.target.value })} /></label>
            <label>Rate £/hour<input type="number" step="0.01" value={tips.rate_per_hour} onChange={e => setTips({ ...tips, rate_per_hour: e.target.value })} /></label>
            <select className="btn" value={tips.method} onChange={e => setTips({ ...tips, method: e.target.value })}><option value="EVEN">Split evenly</option><option value="HOURS">Split rest by hours</option></select>
            <button className="btn primary" onClick={() => run(async () => {
              const r = await api<{ items: TipRow[] }>("/v1/workforce/tips", {
                method: "POST",
                body: JSON.stringify({
                  total: Number(tips.total),
                  rate_per_hour: Number(tips.rate_per_hour),
                  method: tips.method,
                  department: tips.department,
                  include_all: true,
                }),
              });
              setSplit(r.items);
            }, "Calculated")}>Calculate</button>
          </div>
          {split && split.length > 0 && (
            <div style={{ marginTop: 16 }}>
              <h4 style={{ marginBottom: 8 }}>Each person receives</h4>
              {split.map(s => <div className="urow" key={s.name}><div className="t">{s.name}</div><div className="m">{s.hours} hrs · £{Number(s.share).toFixed(2)}</div></div>)}
              <div className="m" style={{ marginTop: 8, fontWeight: 600 }}>Total £{split.reduce((a, s) => a + Number(s.share), 0).toFixed(2)}</div>
            </div>
          )}
          {split && split.length === 0 && <p className="m" style={{ marginTop: 12 }}>No staff in this department.</p>}
          <p className="m" style={{ marginTop: 16, color: "var(--ink-2)" }}>Team: {deptPeople.map(p => p.name).join(", ") || "none"}</p>
        </div>
      )}
      {tab === "sop" && showSop && (
        <div className="panel">
          <h3>Send an SOP to the pocket</h3>
          <p className="m" style={{ color: "var(--ink-2)" }}>Professional kitchen and hotel procedures. Select who receives it on their phone.</p>
          <input placeholder="Title" value={sop.title} onChange={e => setSop({ ...sop, title: e.target.value })} />
          <textarea rows={8} placeholder="Step-by-step procedure" value={sop.body} onChange={e => setSop({ ...sop, body: e.target.value })} style={{ width: "100%", marginTop: 8 }} />
          <div className="chips" style={{ margin: "10px 0" }}>{people.map(p => <button key={p.id} className={"chipbtn" + (sop.user_ids.includes(p.id) ? " on" : "")} onClick={() => setSop(s => ({ ...s, user_ids: s.user_ids.includes(p.id) ? s.user_ids.filter(i => i !== p.id) : [...s.user_ids, p.id] }))}>{p.name}</button>)}</div>
          <button className="btn primary" onClick={() => run(() => api("/v1/workforce/sop", { method: "POST", body: JSON.stringify(sop) }), "Sent to the pocket")}>Send</button>
        </div>
      )}
      {tab === "hr" && showHr && (
        <div className="panel">
          <h3>Designation, hours, pay note, contracts</h3>
          <p className="m" style={{ color: "var(--ink-2)" }}>General manager and HR only. Pay notes stay in the house — the pocket app cannot read them.</p>
          {hr.length === 0 && <p className="m">No HR records yet. Click Edit on a person to add designation and pay notes.</p>}
          {hr.map(h => (
            <div className="urow" key={h.id}>
              <div><div className="t">{h.name}</div><div className="m">{h.role} {h.designation ? `· ${h.designation}` : "· no designation yet"} {h.contracted_hours ? `· ${h.contracted_hours} hrs/week` : ""} {h.pay_note ? `· ${h.pay_note}` : ""}</div></div>
              <button className="btn" onClick={() => {
                const designation = prompt("Designation", h.designation ?? "") ?? h.designation;
                const contracted_hours = prompt("Contracted hours / week", h.contracted_hours ?? "") ?? h.contracted_hours;
                const pay_note = prompt("Pay note (house only)", h.pay_note ?? "") ?? h.pay_note;
                run(() => api(`/v1/workforce/hr/${h.id}`, { method: "PATCH", body: JSON.stringify({ designation, contracted_hours, pay_note }) }).then(load), "Saved");
              }}>Edit</button>
              <button className="btn" onClick={() => {
                const title = prompt("Contract title", "Contract of employment");
                const body = prompt("Contract text to send");
                if (title && body) run(() => api("/v1/workforce/contracts", { method: "POST", body: JSON.stringify({ user_id: h.id, title, body }) }), "Contract logged to send");
              }}>Send contract</button>
            </div>
          ))}
        </div>
      )}
      {toast && <div className="toast">{toast}</div>}
    </>
  );
}
