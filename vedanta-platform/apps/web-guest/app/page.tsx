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

type Prop = { name: string; kicker: string; tagline: string; about: string; website: string; company: string; address: string; check_in_from: string; check_out_by: string; rooms: number };
type Prog = { id: string; name: string; kind: string; basis: string | null; arrival: string; arrival_time: string | null; departure: string; departure_time: string | null; nights: number; places: number | null; spa: boolean; meals: boolean; package: string | null; price: string | null; about: string | null };
type Room = { number: string; section: string | null };
type Mine = { id: string; people: number; arrival: string; departure: string; status: string; programme_name: string | null; notes: string | null; rooms: Room[] };
type Me = { name: string; email: string };

const fmt = (d: string) => {
  const x = new Date(d + "T12:00:00");
  return x.toLocaleDateString("en-GB", { weekday: "short", day: "numeric", month: "short", year: "numeric" });
};
const nights = (p: Prog) => p.nights === 1 ? "1 night" : p.nights > 1 ? `${p.nights} nights` : "Day retreat";

export default function Book() {
  const [prop, setProp] = useState<Prop | null>(null);
  const [me, setMe] = useState<Me | null>(null);
  const [programmes, setProgrammes] = useState<Prog[]>([]);
  const [mine, setMine] = useState<Mine[] | null>(null);
  const [sel, setSel] = useState<Prog | null>(null);
  const [auth, setAuth] = useState<"register" | "login">("register");
  const [form, setForm] = useState({ name: "", email: "", access_code: "", people: "1", arrival: "", departure: "", notes: "" });
  const [ok, setOk] = useState<string | null>(null);
  const [err, setErr] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  const loadSigned = async () => {
    const u = await api<Me>("/guest/me");
    setMe(u);
    setForm(f => ({ ...f, name: u.name, email: u.email }));
    const [enqs, progs] = await Promise.all([
      api<{ items: Mine[] }>("/guest/enquiries"),
      api<{ items: Prog[] }>("/guest/programmes"),
    ]);
    setMine(enqs.items);
    setProgrammes(progs.items);
  };

  useEffect(() => {
    api<Prop>("/guest/property").then(setProp).catch(() => {});
    if (tok.get()) loadSigned().catch(() => tok.set(null));
  }, []);

  const doRegister = async () => {
    setBusy(true); setErr(null); setOk(null);
    try {
      const r = await api<{ token: string; user: Me; access_code?: string | null }>("/guest/register", {
        method: "POST", body: JSON.stringify({ name: form.name, email: form.email }),
      });
      tok.set(r.token);
      setForm(f => ({ ...f, access_code: r.access_code ?? f.access_code ?? "" }));
      await loadSigned();
      setOk(r.access_code
        ? `Welcome. Your private access code is ${r.access_code}. Write it down — you will need it each time you sign in.`
        : "Welcome back.");
    } catch (e) { setErr((e as Error).message); } finally { setBusy(false); }
  };

  const doLogin = async () => {
    setBusy(true); setErr(null); setOk(null);
    try {
      const r = await api<{ token: string }>("/guest/login", {
        method: "POST", body: JSON.stringify({ email: form.email, access_code: form.access_code }),
      });
      tok.set(r.token); await loadSigned();
    } catch (e) { setErr((e as Error).message); } finally { setBusy(false); }
  };

  const doEnquiry = async (programme?: Prog | null) => {
    setBusy(true); setErr(null); setOk(null);
    try {
      const r = await api<{ token: string; user: Me; access_code?: string | null; id: string; status: string }>("/guest/enquiries", {
        method: "POST", body: JSON.stringify({
          name: form.name, email: form.email, people: Number(form.people), notes: form.notes,
          ...(programme ? { programme_id: programme.id } : { arrival: form.arrival, departure: form.departure }),
        }),
      });
      tok.set(r.token);
      if (r.access_code) setForm(f => ({ ...f, access_code: r.access_code ?? "" }));
      await loadSigned();
      setOk(r.access_code
        ? `Saved. Your private access code is ${r.access_code}. Write it down.`
        : programme
          ? `Your place on ${programme.name} is with the house.`
          : "Your enquiry is with the house.");
      setSel(null);
    } catch (e) { setErr((e as Error).message); } finally { setBusy(false); }
  };

  const signOut = () => { tok.set(null); setMe(null); setMine(null); setProgrammes([]); setSel(null); setOk(null); setErr(null); };

  return (
    <>
      <header className="top">
        <div className="mark">The Vedanta Way</div>
        <div className="who">
          {me
            ? <>{me.name} · <button onClick={signOut}>Sign out</button></>
            : <><button onClick={() => { setAuth("login"); setOk(null); setErr(null); }}>Sign in</button>{" "}<button onClick={() => { setAuth("register"); setOk(null); setErr(null); }}>Register</button></>}
        </div>
      </header>

      <section className="hero">
        <h1>The Vedanta Way</h1>
        <p className="tag">Retreat Center · Luxury Holistic</p>
        <p>{prop?.about}</p>
      </section>

      <div className="band">
        <div className="wrap">
          {!me && (
            <div className="split" style={{ maxWidth: 760 }}>
              <div>
                <h2>Your private guest book</h2>
                <p className="lead">Sign in to see only your own stay and rooms. Other guests&apos; names and bookings stay private — they are never listed here.</p>
                <p className="m">Check-in from {prop?.check_in_from ?? "15:00"} · Check-out by {prop?.check_out_by ?? "11:00"} · {prop?.rooms ?? 41} guest rooms.</p>
              </div>
              <div className="card">
                <h2 style={{ fontSize: 26 }}>{auth === "register" ? "Register" : "Sign in"}</h2>
                <p className="m">{auth === "register"
                  ? "Enter your name and email. You will receive a private 6-digit access code."
                  : "Enter your email and the access code from when you registered."}</p>
                {auth === "register" && <>
                  <label htmlFor="g-name">Your name</label>
                  <input id="g-name" autoComplete="name" value={form.name} onChange={e => setForm({ ...form, name: e.target.value })} />
                </>}
                <label htmlFor="g-email">Email</label>
                <input id="g-email" type="email" autoComplete="email" value={form.email} onChange={e => setForm({ ...form, email: e.target.value })} />
                {auth === "login" && <>
                  <label htmlFor="g-code">Access code</label>
                  <input id="g-code" inputMode="numeric" placeholder="6-digit code" value={form.access_code} onChange={e => setForm({ ...form, access_code: e.target.value })} />
                </>}
                <button className="btn" disabled={busy} onClick={auth === "register" ? doRegister : doLogin}>
                  {busy ? "…" : auth === "register" ? "Create my guest book" : "Open my guest book"}
                </button>
                <button className="btn sec" onClick={() => { setAuth(auth === "login" ? "register" : "login"); setErr(null); setOk(null); }}>
                  {auth === "login" ? "I need to register" : "I already have a book"}
                </button>
                {ok && <div className="note">{ok}</div>}
                {err && <div className="note">{err}</div>}
              </div>
            </div>
          )}

          {me && (
            <div className="split">
              <div>
                <h2>Your stay</h2>
                <p className="lead">Only you can see this. Other guests cannot open your rooms or details.</p>
                {mine && mine.length > 0 ? (
                  <div className="grid" style={{ marginBottom: 36 }}>
                    {mine.map(x => (
                      <div className="prog" key={x.id} style={{ cursor: "default" }}>
                        <div className="k">{x.status === "CONVERTED" ? "In the house book" : x.status.toLowerCase()}</div>
                        <h3>{x.programme_name ?? "Your dates"}</h3>
                        <div className="d">{fmt(x.arrival)} → {fmt(x.departure)} · {x.people} {Number(x.people) === 1 ? "person" : "people"}</div>
                        {x.rooms?.length
                          ? <div className="rooms">{x.rooms.map(r => <span key={r.number} className="room">{r.number}{r.section ? ` · ${r.section}` : ""}</span>)}</div>
                          : <p className="m" style={{ margin: "8px 0 0" }}>Rooms will appear here when the house assigns them to you.</p>}
                      </div>
                    ))}
                  </div>
                ) : (
                  <p className="m" style={{ marginBottom: 28 }}>No stay on your book yet. Ask about your own dates, or join a retreat the house has opened.</p>
                )}

                {programmes.length > 0 && (
                  <>
                    <h2>Open retreats</h2>
                    <p className="lead">Programmes the house has published for registration. Private client bookings are never listed here.</p>
                    <div className="grid">
                      {programmes.map(p => (
                        <button key={p.id} className={"prog" + (sel?.id === p.id ? " on" : "")} onClick={() => { setSel(p); setOk(null); setErr(null); }}>
                          <div className="k">{p.kind}</div>
                          <h3>{p.name}</h3>
                          <div className="d">{fmt(p.arrival)} → {fmt(p.departure)} · {nights(p)}</div>
                        </button>
                      ))}
                    </div>
                  </>
                )}
              </div>
              <aside>
                {sel && (
                  <div className="detail" style={{ marginBottom: 18 }}>
                    <div className="k">{sel.kind}</div>
                    <h3>{sel.name}</h3>
                    <p className="m">{fmt(sel.arrival)} → {fmt(sel.departure)} · {nights(sel)}</p>
                    {sel.arrival_time && <p className="m">Arrive {sel.arrival_time}{sel.departure_time ? ` · leave ${sel.departure_time}` : ""}</p>}
                    {sel.basis && <p className="m">{sel.basis}</p>}
                    {sel.places && <p className="m">About {sel.places} guests</p>}
                    {sel.about && <p className="copy">{sel.about}</p>}
                    <p className="m">{sel.meals ? "Meals included." : ""}{sel.spa ? " Spa access included." : ""}</p>
                    <label>How many people</label>
                    <input type="number" min={1} value={form.people} onChange={e => setForm({ ...form, people: e.target.value })} />
                    <label>Anything we should know</label>
                    <textarea rows={3} value={form.notes} onChange={e => setForm({ ...form, notes: e.target.value })} />
                    <button className="btn" disabled={busy} onClick={() => doEnquiry(sel)}>
                      {busy ? "…" : "Register my place"}
                    </button>
                  </div>
                )}
                <div className="card">
                  <h2 style={{ fontSize: 24 }}>Ask about your own dates</h2>
                  <label>Arrive</label>
                  <input type="date" value={form.arrival} onChange={e => setForm({ ...form, arrival: e.target.value })} />
                  <label>Depart</label>
                  <input type="date" value={form.departure} onChange={e => setForm({ ...form, departure: e.target.value })} />
                  <label>How many people</label>
                  <input type="number" min={1} value={form.people} onChange={e => setForm({ ...form, people: e.target.value })} />
                  <label>Notes</label>
                  <textarea rows={2} value={form.notes} onChange={e => setForm({ ...form, notes: e.target.value })} />
                  <button className="btn" disabled={busy} onClick={() => doEnquiry(null)}>{busy ? "…" : "Send to the house"}</button>
                  {ok && <div className="note">{ok}</div>}
                  {err && <div className="note">{err}</div>}
                </div>
              </aside>
            </div>
          )}
        </div>
      </div>
      <footer className="foot">
        The Vedanta Way · {prop?.company ?? "The Vedanta Way Ltd"} · {prop?.address}<br />
        <a href={prop?.website ?? "https://www.thevedanta.org/"}>{(prop?.website ?? "https://www.thevedanta.org/").replace(/^https?:\/\//, "")}</a>
      </footer>
    </>
  );
}
