"use client";
import { useEffect, useState } from "react";
import { api } from "@/lib/api";
import { fmt, addDays } from "@/lib/format";

type Day = { date: string; breakfast: number; lunch: number; dinner: number; groups: { id: string; name: string; colour: string; guests: number; meals: string[]; note?: string; dietary?: string; status: string }[] };
const TODAY = new Date().toISOString().slice(0, 10);

export default function Kitchen() {
  const [start, setStart] = useState(TODAY);
  const [days, setDays] = useState<Day[]>([]); const [max, setMax] = useState(130); const [err, setErr] = useState<string | null>(null);
  const end = addDays(start, 6);
  type Flag = { date: string; name: string; room: string; diet: string[] | null; allergens: string[] | null; severity: string | null; notes: string | null; group_name: string | null };
  const [flags, setFlags] = useState<Flag[]>([]);
  type FohOrder = { id: string; for_date: string; items: { name: string; qty: string }[]; notes: string | null; status: string; raised_by_name: string | null };
  const [orders, setOrders] = useState<FohOrder[]>([]);
  useEffect(() => { api<{ max_covers: number; days: Day[] }>(`/v1/covers?from=${start}&to=${end}`).then(r => { setDays(r.days); setMax(r.max_covers); setErr(null); }).catch(e => setErr(e.message));
    api<{ items: Flag[] }>(`/v1/guests/in-house?from=${start}&to=${end}`).then(r => setFlags(r.items)).catch(() => setFlags([]));
    api<{ orders: FohOrder[] }>("/v1/service/front-desk").then(r => setOrders(r.orders.filter(o => o.status !== "done"))).catch(() => setOrders([]));
  }, [start, end]);
  const LABEL: Record<string, string> = { celery: "celery", cereals_gluten: "gluten", crustaceans: "crustaceans", eggs: "eggs", fish: "fish", lupin: "lupin", milk: "milk", molluscs: "molluscs", mustard: "mustard", nuts: "tree nuts", peanuts: "peanuts", sesame: "sesame", soya: "soya", sulphites: "sulphites" };
  const byDate = new Map(days.map(d => [d.date, d]));
  const week = Array.from({ length: 7 }, (_, i) => addDays(start, i));
  const total = (d?: Day) => d ? d.breakfast + d.lunch + d.dinner : 0;
  const busiest = Math.max(1, ...days.flatMap(d => [d.breakfast, d.lunch, d.dinner]));

  return (
    <>
      <div className="topbar">
        <div><h1>The kitchen</h1><p>Covers for each sitting. Maximum {max} at the Main Dining Room. Front of house orders for fruit, milk, biscuits and teas appear below.</p></div>
        <div className="seg"><button onClick={() => setStart(addDays(start, -7))} aria-label="Earlier">‹</button><button onClick={() => setStart(TODAY)}>This week</button><button onClick={() => setStart(addDays(start, 7))} aria-label="Later">›</button></div>
      </div>
      {err && <div className="note">{err}</div>}
      {orders.length > 0 && (
        <div className="panel" style={{ marginBottom: 16 }}>
          <h3>Front of house needs</h3>
          {orders.map(o => (
            <div className="urow" key={o.id}>
              <div><div className="t">{o.for_date} · {o.items.map(i => `${i.qty} ${i.name}`).join(", ")}</div><div className="m">{o.raised_by_name}{o.notes ? ` · ${o.notes}` : ""}</div></div>
              <button className="btn" onClick={async () => { await api(`/v1/service/orders/${o.id}`, { method: "PATCH", body: JSON.stringify({ status: "done" }) }); setOrders(orders.filter(x => x.id !== o.id)); }}>Done</button>
            </div>
          ))}
        </div>
      )}
      <div className="kweek">
        {week.map(date => { const d = byDate.get(date); return (
          <section key={date} className={"kday" + (date === TODAY ? " today" : "") + (total(d) === 0 ? " quiet" : "")}>
            <h3>{fmt(date, { weekday: "long" })}<small>{fmt(date, { day: "numeric", month: "short" })}</small></h3>
            <div className="meals">
              {(["breakfast", "lunch", "dinner"] as const).map(m => { const n = d?.[m] ?? 0; return (
                <div key={m} className={"meal" + (n > max ? " over" : n === 0 ? " none" : "")}>
                  <span>{m}</span><b>{n}</b>
                  <i style={{ width: `${Math.min(100, (n / Math.max(busiest, max)) * 100)}%` }} />
                </div>); })}
            </div>
            {d?.groups.length ? <ul className="kgroups">{d.groups.map(g => (
              <li key={g.id}><i style={{ background: g.colour }} /><div><div className="n">{g.name} <span>{g.guests}</span></div>
                {g.note && <div className="m">{g.note} · {g.meals.length ? g.meals.join(", ") : "no meals"}</div>}
                {g.dietary && <div className="diet">{g.dietary}</div>}
                {g.status === "PROVISIONAL" && <div className="m warn">provisional</div>}
              </div></li>))}</ul> : <div className="m" style={{ color: "var(--ink-2)" }}>No groups in house.</div>}
              {flags.filter(f => f.date === date).length > 0 && <ul className="flags">{flags.filter(f => f.date === date).map(f => (
                <li key={f.name + f.room} className={f.severity === "ANAPHYLAXIS" ? "sev-high" : f.severity === "ALLERGY" ? "sev-mid" : "sev-low"}>
                  <b>{f.name}</b> · room {f.room}{f.allergens?.length ? <> · <b>{f.allergens.map(a => LABEL[a] ?? a).join(", ")}</b>{f.severity === "ANAPHYLAXIS" ? " — life-threatening" : ""}</> : null}{f.diet?.length ? ` · ${f.diet.join(", ").replace(/_/g, " ")}` : ""}{f.notes ? ` · ${f.notes}` : ""}
                </li>))}</ul>}
          </section>); })}
      </div>
    </>
  );
}
