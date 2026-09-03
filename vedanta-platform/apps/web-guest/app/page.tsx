"use client";
import { useEffect, useState } from "react";
const API = process.env.NEXT_PUBLIC_API_URL ?? "";
const tok = {
  get: () => (typeof window === "undefined" ? null : sessionStorage.getItem("vedanta.guest.token")),
  set: (t: string | null) => { if (t) sessionStorage.setItem("vedanta.guest.token", t); else sessionStorage.removeItem("vedanta.guest.token"); },
};
async function api<T>(path: string, init: RequestInit = {}): Promise<T> {
  const headers: Record<string, string> = { "content-type": "application/json", ...(init.headers as Record<string, string> ?? {}) };
  const t = tok.get(); if (t) headers.authorization = `Bearer ${t}`;
  const res = await fetch(API + path, { ...init, headers });
  const body = res.status === 204 ? null : await res.json().catch(() => null);
  if (!res.ok) throw new Error(body?.detail ?? res.statusText);
  return body as T;
}

export default function Book() {
  const [prop, setProp] = useState<{ name: string; check_in_from: string; check_out_by: string; rooms: number } | null>(null);
  const [form, setForm] = useState({ name: "", email: "", people: "2", arrival: "", departure: "", notes: "" });
  const [ok, setOk] = useState<string | null>(null);
  const [err, setErr] = useState<string | null>(null);
  const [mine, setMine] = useState<{ id: string; people: number; arrival: string; departure: string; status: string }[] | null>(null);

  useEffect(() => { api<typeof prop>("/guest/property").then(setProp).catch(() => {}); if (tok.get()) api<{ items: NonNullable<typeof mine> }>("/guest/enquiries").then(r => setMine(r.items)).catch(() => tok.set(null)); }, []);

  const send = async () => {
    setErr(null);
    try {
      await api("/guest/enquiries", { method: "POST", body: JSON.stringify({ ...form, people: Number(form.people) }) });
      setOk("We have your enquiry. The house will write back.");
    } catch (e) { setErr((e as Error).message); }
  };
  const look = async () => {
    setErr(null);
    try {
      const r = await api<{ token: string }>("/guest/login", { method: "POST", body: JSON.stringify({ email: form.email }) });
      tok.set(r.token);
      setMine((await api<{ items: NonNullable<typeof mine> }>("/guest/enquiries")).items);
    } catch (e) { setErr((e as Error).message); }
  };

  return (
    <div className="page">
      <section className="left">
        <div className="kicker">Retreat Center</div>
        <h1>The Vedanta</h1>
        <p className="tag">Luxury retreat centre</p>
        <p>Check-in from {prop?.check_in_from ?? "15:00"}.</p>
      </section>
      <section className="right">
        <div className="card">
          <h2>Enquire</h2>
          <p className="m">Guests only.</p>
          <label>Your name</label><input value={form.name} onChange={e => setForm({ ...form, name: e.target.value })} />
          <label>Email</label><input type="email" value={form.email} onChange={e => setForm({ ...form, email: e.target.value })} />
          <label>How many people</label><input type="number" min={1} value={form.people} onChange={e => setForm({ ...form, people: e.target.value })} />
          <label>Arrive</label><input type="date" value={form.arrival} onChange={e => setForm({ ...form, arrival: e.target.value })} />
          <label>Depart</label><input type="date" value={form.departure} onChange={e => setForm({ ...form, departure: e.target.value })} />
          <label>Anything we should know</label><textarea rows={3} value={form.notes} onChange={e => setForm({ ...form, notes: e.target.value })} />
          <button className="btn" onClick={send}>Send to the house</button>
          <button className="btn" style={{ marginLeft: 8, background: "transparent", color: "var(--forest)", border: "1px solid var(--line)" }} onClick={look}>See my enquiries</button>
          {ok && <div className="note">{ok}</div>}
          {err && <div className="note">{err}</div>}
          {mine && <div style={{ marginTop: 18 }}>{mine.map(x => <div className="row" key={x.id}><span>{x.arrival} → {x.departure} · {x.people} people</span><span>{x.status.toLowerCase()}</span></div>)}</div>}
        </div>
      </section>
    </div>
  );
}
