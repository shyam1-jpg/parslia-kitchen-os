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
  const [tab, setTab] = useState<"clock" | "leave" | "sop">("clock");
  const [clock, setClock] = useState<{ last: string | null; hours_this_week: number } | null>(null);
  const [leave, setLeave] = useState<{ items: { id: string; kind: string; starts_on: string; ends_on: string; status: string }[] } | null>(null);
  const [form, setForm] = useState({ kind: "HOLIDAY", starts_on: "", ends_on: "", note: "" });
  const [sops, setSops] = useState<{ id: string; title: string; body: string; read_at: string | null }[]>([]);

  const load = async () => {
    const u = await api<Me>("/me"); setMe(u);
    setClock(await api("/staff/clock"));
    setLeave(await api("/staff/leave"));
    setSops((await api<{ items: typeof sops }>("/staff/sop")).items);
  };
  useEffect(() => { if (tok.get()) load().catch(() => tok.set(null)); }, []);

  const enter = async () => {
    setErr(null);
    try {
      const r = await api<{ token: string }>("/auth/login", { method: "POST", body: JSON.stringify({ email, surface: "staff" }) });
      tok.set(r.token); await load();
    } catch (e) { setErr((e as Error).message); }
  };

  if (!me) return (
    <>
      <div className="hero"><div className="kicker">Retreat Center</div><h1>The Vedanta</h1><p>Luxury retreat centre</p></div>
      <div className="wrap">
        <div className="card">
          <label>Staff email</label>
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
          <button className={tab === "sop" ? "on" : ""} onClick={() => setTab("sop")}>SOP</button>
        </div>
        {tab === "clock" && (
          <div className="card">
            <h2>This week · {clock?.hours_this_week ?? 0} hours</h2>
            <p className="m">{clock?.last === "IN" ? "You are on the clock." : "You are clocked out."}</p>
            <button className="btn" onClick={async () => { setErr(null); try { await api("/staff/clock", { method: "POST", body: JSON.stringify({ kind: clock?.last === "IN" ? "OUT" : "IN" }) }); setClock(await api("/staff/clock")); } catch (e) { setErr((e as Error).message); } }}>{clock?.last === "IN" ? "Clock out" : "Clock in"}</button>
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
        {tab === "sop" && (
          <div>
            {sops.length === 0 && <p className="m">No SOP has been sent to you yet.</p>}
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
