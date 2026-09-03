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

type Prop = { name: string; kicker: string; tagline: string; about: string; welcome: string; address: string; website: string; company: string; check_in_from: string; check_out_by: string; rooms: number };
type Prog = { id: string; name: string; host: string; kind: string; basis: string | null; arrival: string; arrival_time: string | null; departure: string; departure_time: string | null; nights: number; places: number | null; spa: boolean; meals: boolean; package: string | null; price: string | null; about: string | null };
type Pack = { code: string; name: string; basis: string; twin: number | null; single: number | null; spa: boolean; meals: boolean };
type Mine = { id: string; people: number; arrival: string; departure: string; status: string; programme_name: string | null; notes: string | null };
type Me = { name: string; email: string };

const dates = (p: Prog) => {
  const a = new Date(p.arrival + "T12:00:00");
  const d = new Date(p.departure + "T12:00:00");
  const o: Intl.DateTimeFormatOptions = { weekday: "short", day: "numeric", month: "short" };
  const night = p.nights === 1 ? "1 night" : p.nights > 1 ? `${p.nights} nights` : "Day";
  return `${a.toLocaleDateString("en-GB", o)} → ${d.toLocaleDateString("en-GB", o)} · ${night}`;
};
const gbp = (n: number | null) => n == null ? null : new Intl.NumberFormat("en-GB", { style: "currency", currency: "GBP", maximumFractionDigits: 0 }).format(n);

export default function Book() {
  const [prop, setProp] = useState<Prop | null>(null);
  const [programmes, setProgrammes] = useState<Prog[]>([]);
  const [packs, setPacks] = useState<Pack[]>([]);
  const [sel, setSel] = useState<Prog | null>(null);
  const [me, setMe] = useState<Me | null>(null);
  const [mine, setMine] = useState<Mine[] | null>(null);
  const [auth, setAuth] = useState<"in" | "register" | "login">("register");
  const [form, setForm] = useState({ name: "", email: "", access_code: "", people: "1", arrival: "", departure: "", notes: "" });
  const [ok, setOk] = useState<string | null>(null);
  const [err, setErr] = useState<string | null>(null);

  const loadMine = async () => {
    const u = await api<Me>("/guest/me"); setMe(u);
    setMine((await api<{ items: Mine[] }>("/guest/enquiries")).items);
    setForm(f => ({ ...f, name: u.name, email: u.email }));
    setAuth("in");
  };
  useEffect(() => {
    api<Prop>("/guest/property").then(setProp).catch(() => {});
    api<{ items: Prog[] }>("/guest/programmes").then(r => setProgrammes(r.items)).catch(() => {});
    api<{ items: Pack[] }>("/guest/packages").then(r => setPacks(r.items)).catch(() => {});
    if (tok.get()) loadMine().catch(() => tok.set(null));
  }, []);

  const register = async () => {
    setErr(null); setOk(null);
    try {
      const r = await api<{ token: string; user: Me; access_code?: string | null }>("/guest/register", { method: "POST", body: JSON.stringify({ name: form.name, email: form.email }) });
      tok.set(r.token); await loadMine();
      setForm(f => ({ ...f, access_code: r.access_code ?? f.access_code ?? "" }));
      setOk(r.access_code
        ? `Registered. Your private access code is ${r.access_code}. Keep this safe.`
        : "You are registered. Choose a programme, or ask about your own dates.");
    } catch (e) { setErr((e as Error).message); }
  };
  const login = async () => {
    setErr(null); setOk(null);
    try {
      const r = await api<{ token: string }>("/guest/login", { method: "POST", body: JSON.stringify({ email: form.email, access_code: form.access_code }) });
      tok.set(r.token); await loadMine();
    } catch (e) { setErr((e as Error).message); }
  };
  const send = async (programme?: Prog | null) => {
    setErr(null); setOk(null);
    try {
      const r = await api<{ token: string; user: Me; access_code?: string | null }>("/guest/enquiries", { method: "POST", body: JSON.stringify({
        name: form.name, email: form.email, people: Number(form.people), notes: form.notes,
        ...(programme ? { programme_id: programme.id } : { arrival: form.arrival, departure: form.departure }),
      }) });
      tok.set(r.token); await loadMine();
      if (r.access_code) setForm(f => ({ ...f, access_code: r.access_code ?? "" }));
      setOk(r.access_code
        ? `Saved. Your private access code is ${r.access_code}. Keep this safe.`
        : (programme ? `We have your place on ${programme.name}. The house will write back.` : "We have your enquiry. The house will write back."));
    } catch (e) { setErr((e as Error).message); }
  };

  return (
    <>
      <header className="top">
        <div className="mark">Retreat Center</div>
        <div className="who">
          {me ? <>{me.name} · <button onClick={() => { tok.set(null); setMe(null); setMine(null); setAuth("login"); setOk(null); }}>Sign out</button></> : (
            <>
              <button onClick={() => setAuth("login")}>Sign in</button>{" "}
              <button onClick={() => setAuth("register")}>Register</button>
            </>
          )}
        </div>
      </header>
      <section className="hero">
        <div className="kicker">{prop?.kicker ?? "Retreat Center"}</div>
        <h1>{prop?.name ?? "The Vedanta Way"}</h1>
        <p className="tag">{prop?.tagline ?? "Luxury retreat centre"}</p>
        <p>{prop?.about}</p>
        <p>{prop?.welcome}</p>
      </section>
      <div className="band">
        <div className="wrap">
          <div className="facts">
            <div><b>{prop?.rooms ?? 41}</b><span>Guest rooms</span></div>
            <div><b>From {prop?.check_in_from ?? "15:00"}</b><span>Check-in</span></div>
            <div><b>By {prop?.check_out_by ?? "11:00"}</b><span>Check-out</span></div>
          </div>
          <div className="split">
            <div>
              <h2>Programmes</h2>
              <p className="lead">Every open retreat on the house book. Open one to see dates, what it is, and the price — then register your place.</p>
              <div className="grid">
                {programmes.length === 0 && <p className="m">No programmes are open just now. You can still ask about your own dates.</p>}
                {programmes.map(p => (
                  <button key={p.id} className={"prog" + (sel?.id === p.id ? " on" : "")} onClick={() => { setSel(p); setOk(null); setErr(null); }}>
                    <div className="k">{p.kind}</div>
                    <h3>{p.name}</h3>
                    <div className="d">{dates(p)}</div>
                    {p.price && <div className="d" style={{ marginTop: 6 }}>{p.price.split("\n")[0]}</div>}
                  </button>
                ))}
              </div>
              <div className="stay">
                {packs.filter(p => p.code !== "GRAND_VEDANTA").map(p => (
                  <article key={p.code}>
                    <h3>{p.name}</h3>
                    <p className="m">{p.basis}{p.twin != null ? ` · Twin ${gbp(p.twin)}` : ""}{p.single != null ? ` · Single ${gbp(p.single)}` : ""}{p.meals ? " · Meals" : ""}{p.spa ? " · Spa" : ""}</p>
                  </article>
                ))}
              </div>
            </div>
            <aside>
              {sel && (
                <div className="detail">
                  <div className="kicker" style={{ letterSpacing: ".16em", textTransform: "uppercase", color: "var(--gold)", fontSize: 10 }}>{sel.kind}</div>
                  <h3>{sel.name}</h3>
                  <p className="m">{dates(sel)}</p>
                  {sel.arrival_time ? <p className="m">Arrive {sel.arrival_time}{sel.departure_time ? ` · leave ${sel.departure_time}` : ""}</p> : null}
                  {sel.basis && <p className="m">{sel.basis}</p>}
                  {sel.places && <p className="m">About {sel.places} guests</p>}
                  {sel.package && <p className="m">{sel.package}</p>}
                  {sel.about && <p className="copy">{sel.about}</p>}
                  {sel.price && <p className="copy">{sel.price}</p>}
                  <p className="m">{sel.meals ? "Meals included." : ""}{sel.spa ? " Spa access." : ""}</p>
                  <label>How many people</label>
                  <input id="prog-people" name="people" type="number" min={1} value={form.people} onChange={e => setForm({ ...form, people: e.target.value })} />
                  <label>Anything we should know</label>
                  <textarea id="prog-notes" name="notes" rows={3} value={form.notes} onChange={e => setForm({ ...form, notes: e.target.value })} />
                  {!me && (<>
                    <label>Your name</label><input id="prog-name" name="name" autoComplete="name" value={form.name} onChange={e => setForm({ ...form, name: e.target.value })} />
                    <label>Email</label><input id="prog-email" name="email" type="email" autoComplete="email" value={form.email} onChange={e => setForm({ ...form, email: e.target.value })} />
                  </>)}
                  <button className="btn" onClick={() => send(sel)}>Register for this programme</button>
                </div>
              )}
              <div className="card">
                {auth === "in" && me ? <h2 style={{ fontSize: 28 }}>Your book</h2> : <h2 style={{ fontSize: 28 }}>{auth === "login" ? "Sign in" : "Register"}</h2>}
                <p className="m">Guests only. Use your email and private access code. The house never opens from this page.</p>
                {auth !== "in" && (<>
                  {auth === "register" && <><label htmlFor="guest-name">Your name</label><input id="guest-name" name="name" autoComplete="name" value={form.name} onChange={e => setForm({ ...form, name: e.target.value })} /></>}
                  <label htmlFor="guest-email">Email</label>
                  <input id="guest-email" name="email" type="email" autoComplete="email" value={form.email} onChange={e => setForm({ ...form, email: e.target.value })} />
                  {auth === "login" && <>
                    <label htmlFor="guest-code">Access code</label>
                    <input id="guest-code" name="access_code" inputMode="numeric" placeholder="6-digit code" value={form.access_code} onChange={e => setForm({ ...form, access_code: e.target.value })} />
                  </>}
                  {auth === "register" ? <button className="btn" onClick={register}>Create my guest book</button> : <button className="btn" onClick={login}>Open my guest book</button>}
                  <button className="btn sec" onClick={() => { setAuth(auth === "login" ? "register" : "login"); setErr(null); }}>{auth === "login" ? "I need to register" : "I already have a book"}</button>
                </>)}
                <label htmlFor="own-arrive">Or ask about your own dates</label>
                <input id="own-arrive" name="arrival" type="date" value={form.arrival} onChange={e => setForm({ ...form, arrival: e.target.value })} />
                <label htmlFor="own-depart">Depart</label>
                <input id="own-depart" name="departure" type="date" value={form.departure} onChange={e => setForm({ ...form, departure: e.target.value })} />
                <label htmlFor="own-people">How many people</label>
                <input id="own-people" name="own-people" type="number" min={1} value={form.people} onChange={e => setForm({ ...form, people: e.target.value })} />
                <button className="btn" onClick={() => send(null)}>Send to the house</button>
                {ok && <div className="note">{ok}</div>}
                {err && <div className="note">{err}</div>}
                {mine && mine.length > 0 && (
                  <div style={{ marginTop: 18 }}>
                    {mine.map(x => (
                      <div className="row" key={x.id}>
                        <span>{x.programme_name ?? "Own dates"} · {x.arrival} → {x.departure} · {x.people}</span>
                        <span>{x.status.toLowerCase()}</span>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </aside>
          </div>
        </div>
      </div>
      <footer className="foot">
        {prop?.name ?? "The Vedanta Way"} · {prop?.company ?? "The Vedanta Way Ltd"} · {prop?.address}<br />
        <a href={prop?.website ?? "https://www.thevedanta.org/"}>{(prop?.website ?? "https://www.thevedanta.org/").replace(/^https:\/\//, "")}</a>
      </footer>
    </>
  );
}
