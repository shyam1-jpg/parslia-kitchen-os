"use client";
import { useEffect, useState } from "react";

const API = process.env.NEXT_PUBLIC_API_URL ?? "";
const tok = {
  get: () => (typeof window === "undefined" ? null : sessionStorage.getItem("vedanta.staff.token")),
  set: (t: string | null) => { if (t) sessionStorage.setItem("vedanta.staff.token", t); else sessionStorage.removeItem("vedanta.staff.token"); },
};
async function api<T>(path: string, init: RequestInit = {}): Promise<T> {
  const headers: Record<string, string> = { "content-type": "application/json", ...(init.headers as Record<string, string> ?? {}) };
  const t = tok.get(); if (t) headers.authorization = `Bearer ${t}`;
  const res = await fetch(API + path, { ...init, headers });
  const body = res.status === 204 ? null : await res.json().catch(() => null);
  if (!res.ok) throw new Error(body?.detail ?? res.statusText);
  return body as T;
}

type Me = { name: string; email: string; role: string; role_name?: string };
export default function Pocket() {
  const [me, setMe] = useState<Me | null>(null);
  const [email, setEmail] = useState("");
  const [err, setErr] = useState<string | null>(null);
  const [tab, setTab] = useState<"clock" | "leave" | "duty" | "sop" | "log" | "desk" | "night" | "manual" | "tasks">("clock");
  const [desk, setDesk] = useState<{
    today: { weekday: string; title: string; method: string; ingredients: { name: string; qty: string }[] };
    tomorrow: { weekday: string; title: string; method: string; ingredients: { name: string; qty: string }[] };
    stock: { id: string; name: string; par_note: string | null }[];
  } | null>(null);
  const [pay, setPay] = useState<{ hours: number; shifts: { in_at: string; out_at: string | null; hours: number }[] } | null>(null);
  const [ops, setOps] = useState<{
    progress: { done: number; total: number };
    handover: { id: string; department: string; department_label: string; shift: string; shift_label: string; body: string; author_name: string | null }[];
    checklists: { id: string; department: string; department_label: string; title: string; due_time?: string | null; done: boolean }[];
    guest_requests: { id: string; guest_name: string | null; room_label: string | null; department_label: string; request_text: string; status: string }[];
    notices: { id: string; title: string; body: string }[];
  } | null>(null);
  const [note, setNote] = useState("");
  const [clock, setClock] = useState<{ last: string | null; hours_this_week: number } | null>(null);
  const [leave, setLeave] = useState<{ items: { id: string; kind: string; starts_on: string; ends_on: string; status: string }[] } | null>(null);
  const [form, setForm] = useState({ kind: "HOLIDAY", starts_on: "", ends_on: "", note: "" });
  const [sops, setSops] = useState<{ id: string; title: string; body: string; read_at: string | null }[]>([]);
  const [duty, setDuty] = useState<{ id: string; on_date: string; slot: string; kind: string; note: string | null }[]>([]);
  const [manuals, setManuals] = useState<{ slug: string; title: string; department_label: string; kind_label: string; summary: string; body: string; steps: { title: string; look: string; act: string }[]; diagram: { title: string; caption: string }[] }[]>([]);
  const [manualSlug, setManualSlug] = useState("app-how-to-use");
  const [nightNote, setNightNote] = useState("");
  const [tasks, setTasks] = useState<{
    items: { id: string; title: string; department_label: string; status: string; status_label: string; overdue: boolean; room_label: string; next: { status: string; label: string }[] }[];
    counts: { open: number; overdue: number };
  } | null>(null);
  const [taskTitle, setTaskTitle] = useState("");

  const load = async () => {
    const u = await api<Me>("/me"); setMe(u);
    setClock(await api("/staff/clock"));
    setLeave(await api("/staff/leave"));
    setSops((await api<{ items: typeof sops }>("/staff/sop")).items);
    setDuty((await api<{ items: typeof duty }>("/staff/duty")).items);
    try { setOps(await api("/v1/ops/board")); } catch { setOps(null); }
    try { setDesk(await api("/v1/service/front-desk")); } catch { setDesk(null); }
    try { setPay(await api("/staff/payroll")); } catch { setPay(null); }
    try { setManuals((await api<{ items: typeof manuals }>("/v1/manuals")).items); } catch { setManuals([]); }
    try { setTasks(await api("/v1/ops/tasks")); } catch { setTasks(null); }
  };
  useEffect(() => { if (tok.get()) load().catch(() => tok.set(null)); }, []);

  const enter = async () => {
    setErr(null);
    try {
      const r = await api<{ token: string }>("/auth/login", { method: "POST", body: JSON.stringify({ email, surface: "staff" }) });
      tok.set(r.token); await load();
    } catch (e) { setErr((e as Error).message); }
  };

  async function orderWater(which: "today" | "tomorrow") {
    const recipe = which === "today" ? desk?.today : desk?.tomorrow;
    try {
      await api("/v1/service/orders", {
        method: "POST",
        body: JSON.stringify({
          needed_for: "Front of house",
          items: (recipe?.ingredients ?? []).map(i => ({ name: i.name, qty: i.qty })),
        }),
      });
      setErr(null);
    } catch (e) {
      setErr((e as Error).message);
    }
  }

  if (!me) return (
    <>
      <div className="hero"><div className="kicker">Retreat Center</div><h1>The Vedanta Way</h1><p>Luxury retreat centre</p></div>
      <div className="wrap">
        <div className="card">
          <label>Staff email</label>
          <p className="m">There is no password.</p>
          <input value={email} onChange={e => setEmail(e.target.value)} placeholder="you@thevedanta.org" />
          <button className="btn" onClick={enter}>Enter the pocket</button>
          {err && <div className="note">{err}</div>}
        </div>
      </div>
    </>
  );

  return (
    <>
      <div className="hero"><div className="kicker">{me.role_name ?? me.role.replace(/_/g, " ")}</div><h1>{me.name}</h1></div>
      <div className="wrap">
        <div className="tabs">
          <button className={tab === "clock" ? "on" : ""} onClick={() => setTab("clock")}>Clock</button>
          <button className={tab === "leave" ? "on" : ""} onClick={() => setTab("leave")}>Holiday</button>
          <button className={tab === "duty" ? "on" : ""} onClick={() => setTab("duty")}>Duty</button>
          <button className={tab === "log" ? "on" : ""} onClick={() => setTab("log")}>House log</button>
          <button className={tab === "tasks" ? "on" : ""} onClick={() => setTab("tasks")}>Tasks</button>
          <button className={tab === "desk" ? "on" : ""} onClick={() => setTab("desk")}>Front desk</button>
          <button className={tab === "night" ? "on" : ""} onClick={() => setTab("night")}>Night</button>
          <button className={tab === "manual" ? "on" : ""} onClick={() => setTab("manual")}>Manual</button>
          <button className={tab === "sop" ? "on" : ""} onClick={() => setTab("sop")}>SOP</button>
        </div>
        {tab === "clock" && (
          <div className="card">
            <h2>This week · {pay?.hours ?? clock?.hours_this_week ?? 0} hours</h2>
            <p className="m">{clock?.last === "IN" ? "You are on the clock. Hours count until you clock out." : "You are clocked out."}</p>
            <button className="btn" onClick={async () => { setErr(null); try { await api("/staff/clock", { method: "POST", body: JSON.stringify({ kind: clock?.last === "IN" ? "OUT" : "IN" }) }); setClock(await api("/staff/clock")); setPay(await api("/staff/payroll")); } catch (e) { setErr((e as Error).message); } }}>{clock?.last === "IN" ? "Clock out" : "Clock in"}</button>
            {(pay?.shifts ?? []).map((s, i) => <div className="row" key={i}><span>{new Date(s.in_at).toLocaleString("en-GB", { weekday: "short", hour: "2-digit", minute: "2-digit" })} → {s.out_at ? new Date(s.out_at).toLocaleTimeString("en-GB", { hour: "2-digit", minute: "2-digit" }) : "still on"}</span><span className="m">{s.hours} hrs</span></div>)}
          </div>
        )}
        {tab === "leave" && (
          <div className="card">
            <h2>Request holiday</h2>
            <p className="m">Head of department signs first. Their own leave is signed by the general manager.</p>
            <label>Kind</label>
            <select value={form.kind} onChange={e => setForm({ ...form, kind: e.target.value })}><option>HOLIDAY</option><option>DAY_OFF</option><option>SICK</option><option>UNPAID</option></select>
            <label>From</label><input type="date" value={form.starts_on} onChange={e => setForm({ ...form, starts_on: e.target.value })} />
            <label>To</label><input type="date" value={form.ends_on} onChange={e => setForm({ ...form, ends_on: e.target.value })} />
            <label>Note</label><textarea rows={2} value={form.note} onChange={e => setForm({ ...form, note: e.target.value })} />
            <button className="btn" onClick={async () => { setErr(null); try { await api("/staff/leave", { method: "POST", body: JSON.stringify(form) }); setLeave(await api("/staff/leave")); } catch (e) { setErr((e as Error).message); } }}>Send request</button>
            {(leave?.items ?? []).map(l => <div className="row" key={l.id}><span>{l.kind.toLowerCase()} · {l.starts_on} → {l.ends_on}</span><span className="m">{l.status.replace(/_/g, " ").toLowerCase()}</span></div>)}
          </div>
        )}
        {tab === "duty" && (
          <div className="card">
            <h2>Your board</h2>
            <p className="m">The house places you here. Tips, pay and the rota stay in the house.</p>
            {duty.length === 0 && <p className="m">No shifts on the board yet.</p>}
            {duty.map(d => <div className="row" key={d.id}><span>{d.on_date} · {d.slot}</span><span className="m">{d.kind.toLowerCase()}{d.note ? ` · ${d.note}` : ""}</span></div>)}
          </div>
        )}
        {tab === "log" && (
          <div>
            <div className="card">
              <h2>Today · {ops?.progress.done ?? 0}/{ops?.progress.total ?? 0} checks</h2>
              <p className="m">Tick the round. Leave a note for the next shift. Guest asks land here instead of WhatsApp.</p>
              {(ops?.guest_requests ?? []).map(r => (
                <div className="row" key={r.id} style={{ display: "block" }}>
                  <b>{r.department_label}</b>
                  <div>{r.guest_name ? `${r.guest_name}${r.room_label ? ` · ${r.room_label}` : ""} — ` : ""}{r.request_text}</div>
                  {r.status !== "done" && <button className="btn" onClick={async () => { await api(`/v1/ops/guest-requests/${r.id}`, { method: "PATCH", body: JSON.stringify({ status: r.status === "open" ? "doing" : "done" }) }); setOps(await api("/v1/ops/board")); }}>{r.status === "open" ? "Take it" : "Mark done"}</button>}
                </div>
              ))}
            </div>
            {(ops?.checklists ?? []).map(c => (
              <label key={c.id} className="row" style={{ alignItems: "center" }}>
                <input type="checkbox" checked={c.done} onChange={async e => { await api(`/v1/ops/checklists/${c.id}/tick`, { method: "POST", body: JSON.stringify({ done: e.target.checked }) }); setOps(await api("/v1/ops/board")); }} />
                <span>{c.title}<div className="m">{c.department_label}</div></span>
              </label>
            ))}
            <div className="card">
              <h2>Handover</h2>
              {(ops?.handover ?? []).slice(0, 5).map(h => <div className="row" key={h.id} style={{ display: "block" }}><b>{h.department_label} · {h.shift_label}</b><div>{h.body}</div></div>)}
              <textarea rows={3} value={note} onChange={e => setNote(e.target.value)} placeholder="What the next shift needs to know" />
              <button className="btn" onClick={async () => { setErr(null); try { await api("/v1/ops/handover", { method: "POST", body: JSON.stringify({ department: "HOUSE", shift: "am", body: note }) }); setNote(""); setOps(await api("/v1/ops/board")); } catch (e) { setErr((e as Error).message); } }}>Leave a morning note</button>
            </div>
            {(ops?.notices ?? []).map(n => <div className="card" key={n.id}><h2>{n.title}</h2><p>{n.body}</p></div>)}
          </div>
        )}
        {tab === "tasks" && (
          <div>
            <div className="card">
              <h2>Tasks · {tasks?.counts.open ?? 0} open</h2>
              <p className="m">Acknowledge, start, pause, finish. History stays even if the wording is edited later.</p>
              <input value={taskTitle} onChange={e => setTaskTitle(e.target.value)} placeholder="New task for the house" />
              <button className="btn" onClick={async () => {
                setErr(null);
                try {
                  await api("/v1/ops/tasks", { method: "POST", body: JSON.stringify({ title: taskTitle, assigned_staff_id: undefined }) });
                  setTaskTitle("");
                  setTasks(await api("/v1/ops/tasks"));
                } catch (e) { setErr((e as Error).message); }
              }}>Open task</button>
            </div>
            {(tasks?.items ?? []).map(t => (
              <div className="card" key={t.id}>
                <h2>{t.title}</h2>
                <p className="m">{t.department_label}{t.room_label ? ` · ${t.room_label}` : ""} · {t.status_label}{t.overdue ? " · overdue" : ""}</p>
                <div className="tabs">
                  {t.next.map(a => (
                    <button key={a.status} className="btn" onClick={async () => {
                      try {
                        await api(`/v1/ops/tasks/${t.id}/status`, { method: "POST", body: JSON.stringify({ status: a.status }) });
                        setTasks(await api("/v1/ops/tasks"));
                      } catch (e) { setErr((e as Error).message); }
                    }}>{a.label}</button>
                  ))}
                </div>
              </div>
            ))}
            {(!tasks || tasks.items.length === 0) && <p className="m">No tasks on your list.</p>}
          </div>
        )}
        {tab === "desk" && (
          <div>
            <div className="card">
              <h2>Today · {desk?.today.weekday} · {desk?.today.title}</h2>
              <p>{desk?.today.method}</p>
              <p className="m">{desk?.today.ingredients.map(i => `${i.qty} ${i.name}`).join(" · ")}</p>
              <button className="btn" onClick={() => void orderWater("today")}>Order today&apos;s fruit</button>
            </div>
            <div className="card">
              <h2>Tomorrow · {desk?.tomorrow.weekday} · {desk?.tomorrow.title}</h2>
              <p className="m">{desk?.tomorrow.ingredients.map(i => `${i.qty} ${i.name}`).join(" · ")}</p>
              <button className="btn" onClick={() => void orderWater("tomorrow")}>Order tomorrow ahead</button>
            </div>
            <div className="card">
              <h2>Always ready</h2>
              <p className="m">Walkers and Nairn&apos;s (gluten-free) biscuits. Plant milks. Suma herbals. Loose teas from organic wholesale. Dirty cups to the wash; clean cups back to the restaurant. Coffee machines at 09:00.</p>
              {(desk?.stock ?? []).map(s => <div className="row" key={s.id}><span>{s.name}</span></div>)}
            </div>
          </div>
        )}
        {tab === "night" && (
          <div>
            <div className="card">
              <h2>Night porter</h2>
              <p className="m">Two lock-ups. Front door — never leave the latch off. Dirty cups away. Fill teas and cups for morning. Write the night note before you go.</p>
            </div>
            {(ops?.checklists ?? []).filter(c => c.department === "NIGHT").map(c => (
              <label key={c.id} className="row" style={{ alignItems: "center" }}>
                <input type="checkbox" checked={c.done} onChange={async e => { await api(`/v1/ops/checklists/${c.id}/tick`, { method: "POST", body: JSON.stringify({ done: e.target.checked }) }); setOps(await api("/v1/ops/board")); }} />
                <span>{c.due_time ? `${c.due_time} · ` : ""}{c.title}</span>
              </label>
            ))}
            <div className="card">
              <h2>Handover to morning</h2>
              {(ops?.handover ?? []).filter(h => h.shift === "night" || h.department === "NIGHT").slice(0, 4).map(h => <div className="row" key={h.id} style={{ display: "block" }}><b>{h.shift_label}</b><div>{h.body}</div></div>)}
              <textarea rows={3} value={nightNote} onChange={e => setNightNote(e.target.value)} placeholder="Who arrived late, what was unlocked, what ran out" />
              <button className="btn" onClick={async () => { setErr(null); try { await api("/v1/ops/handover", { method: "POST", body: JSON.stringify({ department: "NIGHT", shift: "night", body: nightNote }) }); setNightNote(""); setOps(await api("/v1/ops/board")); } catch (e) { setErr((e as Error).message); } }}>Leave the night note</button>
            </div>
          </div>
        )}
        {tab === "manual" && (
          <div>
            <p className="m">What it should look like, and how to act. A sent SOP also lands under SOP — mark that one received.</p>
            <div className="tabs">
              {manuals.map(m => <button key={m.slug} className={manualSlug === m.slug ? "on" : ""} onClick={() => setManualSlug(m.slug)}>{m.title}</button>)}
            </div>
            {manuals.filter(m => m.slug === manualSlug).map(m => (
              <div key={m.slug}>
                <div className="card">
                  <h2>{m.title}</h2>
                  <p className="m">{m.department_label} · {m.kind_label}</p>
                  <p><b>Look.</b> {m.summary}</p>
                  <p style={{ whiteSpace: "pre-wrap" }}><b>Act.</b> {m.body}</p>
                </div>
                {m.diagram.length > 0 && <div className="card"><p className="m">{m.diagram.map(d => d.title).join(" → ")}</p></div>}
                {m.steps.map(s => (
                  <div className="card" key={s.title}>
                    <h2>{s.title}</h2>
                    <p><b>Look.</b> {s.look}</p>
                    <p><b>Act.</b> {s.act}</p>
                  </div>
                ))}
              </div>
            ))}
          </div>
        )}
        {tab === "sop" && (
          <div>
            <p className="m">Chapters sent to you. Read, then mark received — that is the house knowing you have it. The full book is under Manual.</p>
            {sops.length === 0 && <p className="m">No SOP has been sent to you yet. Open Manual for the live book.</p>}
            {sops.map(s => (
              <div className="card" key={s.id}>
                <h2>{s.title}</h2>
                <p style={{ whiteSpace: "pre-wrap" }}>{s.body}</p>
                {!s.read_at && <button className="btn ghost" onClick={async () => { await api(`/staff/sop/${s.id}/read`, { method: "POST" }); setSops((await api<{ items: typeof sops }>("/staff/sop")).items); }}>Mark as read</button>}
              </div>
            ))}
          </div>
        )}
        {err && <div className="note">{err}</div>}
        <button className="btn ghost" onClick={() => { tok.set(null); setMe(null); }}>Sign out</button>
      </div>
    </>
  );
}
