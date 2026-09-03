"use client";
import { useEffect, useState } from "react";
import { api, ApiError } from "@/lib/api";

type Ing = { name: string; qty: string; from: string };
type Recipe = { weekday: string; title: string; method: string; ingredients: Ing[] };
type Stock = { id: string; name: string; category: string; supplier_code: string; par_note: string | null };
type Supplier = { code: string; name: string; supplies: string; note: string | null };
type Order = { id: string; for_date: string; needed_for: string; items: { name: string; qty: string }[]; notes: string | null; status: string; raised_by_name: string | null };
type Desk = { date: string; today: Recipe; tomorrow: Recipe; week: Recipe[]; suppliers: Supplier[]; stock: Stock[]; orders: Order[] };

const FROM: Record<string, string> = { kitchen: "Kitchen", foh: "Front of house", suma: "Suma", organic_wholesale: "Organic wholesale", walkers: "Walkers", nairns: "Nairn's" };

export default function FrontDesk() {
  const [desk, setDesk] = useState<Desk | null>(null);
  const [picked, setPicked] = useState<Record<string, string>>({});
  const [notes, setNotes] = useState("");
  const [forDate, setForDate] = useState("");
  const [toast, setToast] = useState<string | null>(null);
  const say = (t: string) => { setToast(t); setTimeout(() => setToast(null), 3000); };
  const load = () => api<Desk>("/v1/service/front-desk").then(r => { setDesk(r); if (!forDate) setForDate(r.date); }).catch(e => say(e instanceof ApiError ? e.problem.detail : "Could not open the front desk"));
  useEffect(() => { load(); }, []); // eslint-disable-line
  if (!desk) return <div className="empty">Opening the front desk…</div>;

  const sendOrder = async (extra: { name: string; qty: string }[]) => {
    const items = [
      ...Object.entries(picked).filter(([, qty]) => qty.trim()).map(([name, qty]) => ({ name, qty })),
      ...extra,
    ];
    try {
      await api("/v1/service/orders", { method: "POST", body: JSON.stringify({ for_date: forDate || desk.date, needed_for: "Front of house", items, notes }) });
      setPicked({}); setNotes(""); say("Order sent to the kitchen"); load();
    } catch (e) { say(e instanceof ApiError ? e.problem.detail : "Could not send"); }
  };

  return (
    <>
      <div className="topbar">
        <div>
          <h1>Front desk</h1>
          <p>Today&apos;s infused water, tomorrow&apos;s fruit, teas and biscuits. Order through the kitchen a day ahead. Suma for herbal bags; organic wholesale for loose teas. The full Look and Act is in the <a href="/manual/?slug=front-desk-day">front-desk chapter</a>.</p>
        </div>
      </div>
      <div className="house-grid">
        <section className="house-panel">
          <div className="k">Today · {desk.today.weekday}</div>
          <h2>{desk.today.title}</h2>
          <p>{desk.today.method}</p>
          <ul className="house-list">
            {desk.today.ingredients.map(i => (
              <li key={i.name}><span><div className="t">{i.name}</div><div className="m">{i.qty} · {FROM[i.from] ?? i.from}</div></span></li>
            ))}
          </ul>
          <button className="btn primary" style={{ marginTop: 12 }} onClick={() => sendOrder(desk.today.ingredients.map(i => ({ name: i.name, qty: i.qty })))}>Order today&apos;s fruit from the kitchen</button>
        </section>
        <section className="house-panel">
          <div className="k">Tomorrow · {desk.tomorrow.weekday}</div>
          <h2>{desk.tomorrow.title}</h2>
          <p>{desk.tomorrow.method}</p>
          <ul className="house-list">
            {desk.tomorrow.ingredients.map(i => (
              <li key={i.name}><span><div className="t">{i.name}</div><div className="m">{i.qty} · {FROM[i.from] ?? i.from}</div></span></li>
            ))}
          </ul>
          <button className="btn" style={{ marginTop: 12 }} onClick={() => sendOrder(desk.tomorrow.ingredients.map(i => ({ name: `${i.name} (for ${desk.tomorrow.weekday})`, qty: i.qty })))}>Order tomorrow&apos;s fruit now</button>
        </section>
      </div>

      <div className="house-panel" style={{ marginTop: 16 }}>
        <div className="k">The week</div>
        <h2>Seven waters</h2>
        <div className="kweek" style={{ marginTop: 12 }}>
          {desk.week.map(r => (
            <section key={r.weekday} className={"kday" + (r.weekday === desk.today.weekday ? " today" : "")}>
              <h3>{r.weekday}</h3>
              <p className="t">{r.title}</p>
              <p className="m">{r.ingredients.map(i => i.name).join(", ")}</p>
            </section>
          ))}
        </div>
      </div>

      <div className="house-grid" style={{ marginTop: 16 }}>
        <section className="house-panel">
          <div className="k">Stock to watch</div>
          <h2>Biscuits, teas, milk, fruit</h2>
          <p className="m" style={{ color: "var(--ink-2)" }}>Tick what is short, set a quantity, send to the kitchen.</p>
          <label>Needed for <input type="date" value={forDate} onChange={e => setForDate(e.target.value)} /></label>
          {(desk.stock).map(s => (
            <div key={s.id} className="ops-line">
              <b>{s.category}</b>
              <span>{s.name}{s.par_note ? ` — ${s.par_note}` : ""}</span>
              <input style={{ maxWidth: 90 }} placeholder="qty" value={picked[s.name] ?? ""} onChange={e => setPicked({ ...picked, [s.name]: e.target.value })} />
            </div>
          ))}
          <textarea rows={2} value={notes} onChange={e => setNotes(e.target.value)} placeholder="Note for the kitchen" />
          <button className="btn primary" onClick={() => sendOrder([])}>Send stock order to the kitchen</button>
        </section>
        <section className="house-panel">
          <div className="k">Suppliers</div>
          <h2>Where it comes from</h2>
          {desk.suppliers.map(s => (
            <div key={s.code} className="ops-card">
              <div className="ops-card-top"><b>{s.name}</b></div>
              <p>{s.supplies}</p>
              {s.note && <div className="m">{s.note}</div>}
            </div>
          ))}
          <div className="k" style={{ marginTop: 18 }}>Orders to the kitchen</div>
          {desk.orders.length === 0 && <p className="m">None this week.</p>}
          {desk.orders.map(o => (
            <div key={o.id} className="ops-card">
              <div className="ops-card-top"><b>{o.for_date}</b><span className="chip CONFIRMED">{o.status}</span></div>
              <p>{o.items.map(i => `${i.qty} ${i.name}`).join(", ")}</p>
              <div className="m">{o.raised_by_name}{o.notes ? ` · ${o.notes}` : ""}</div>
            </div>
          ))}
        </section>
      </div>
      {toast && <div className="toast">{toast}</div>}
    </>
  );
}
