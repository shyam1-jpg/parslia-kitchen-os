"use client";
import { useEffect, useState } from "react";
import Link from "next/link";
import { api } from "@/lib/api";
import { fmt } from "@/lib/format";
import OpsBoard from "@/components/OpsBoard";

type Estate = {
  today: string;
  property: { name: string; legal_entity: string; check_in_from: string; check_out_by: string; guest_rooms: number; dining: { name: string; seats: number; max_covers: number } | null };
  pulse: {
    in_house: number; arriving: number; departing: number; rooms_tonight: number; guest_rooms: number; dinner: number;
    in_house_guests?: number; rooms_ready?: number; rooms_dirty?: number; rooms_inspected?: number;
    out_of_order?: number; open_tasks?: number; critical_issues?: number; payments_due?: number | null;
  };
  arriving: { id: string; name: string; organisation: string | null; expected_guests: number | null; arrival_slot: string }[];
  departing: { id: string; name: string; organisation: string | null; expected_guests: number | null; departure_slot: string }[];
  in_house: { id: string; name: string; organisation: string | null; expected_guests: number | null }[];
  next: { name: string; organisation: string | null; arrival: string; arrival_slot: string; expected_guests: number | null } | null;
  timeline?: { time: string; label: string }[];
};

function money(n: number | null | undefined, currency = "GBP") {
  if (n == null) return "—";
  return new Intl.NumberFormat("en-GB", { style: "currency", currency, maximumFractionDigits: 0 }).format(n);
}

export default function HouseToday() {
  const [e, setE] = useState<Estate | null>(null);
  const [book, setBook] = useState(0);
  const [err, setErr] = useState<string | null>(null);
  useEffect(() => {
    api<Estate>("/v1/estate").then(setE).catch(() => setErr("The house ledger could not be opened."));
    api<{ items: unknown[] }>("/v1/guest-enquiries").then(r => setBook(r.items.length)).catch(() => {});
  }, []);
  if (err) return <div className="note">{err}</div>;
  if (!e) return <div className="empty">Opening the house…</div>;
  const d = fmt(e.today, { weekday: "long", day: "numeric", month: "long" });
  const p = e.pulse;
  const nowHm = new Date().toLocaleTimeString("en-GB", { timeZone: "Europe/London", hour: "2-digit", minute: "2-digit", hour12: false });
  return (
    <>
      <div className="topbar">
        <div>
          <h1>Today at the house</h1>
          <p>{d}. Check-in from {e.property.check_in_from}, departure by {e.property.check_out_by}. {e.property.dining ? `${e.property.dining.name}, ${e.property.dining.max_covers} covers.` : ""}</p>
        </div>
        <div style={{ display: "flex", gap: 10 }}>
          {book > 0 && <Link className="btn" href="/groups/">{book} guest portal {book === 1 ? "enquiry" : "enquiries"}</Link>}
          <Link className="btn" href="/front/">Front desk</Link>
          <Link className="btn" href="/night/">Night porter</Link>
          <Link className="btn" href="/manual/">Manual</Link>
          <Link className="btn primary" href="/groups/">Open the book</Link>
        </div>
      </div>
      <div className="pulse pulse-wide">
        <article><div className="k">Occupancy</div><b>{p.rooms_tonight} / {p.guest_rooms}</b><div className="s">rooms tonight</div></article>
        <article><div className="k">Arrivals</div><b>{p.arriving}</b><div className="s">groups due today</div></article>
        <article><div className="k">Departures</div><b>{p.departing}</b><div className="s">leaving today</div></article>
        <article><div className="k">In-house guests</div><b>{p.in_house_guests ?? "—"}</b><div className="s">from the book</div></article>
        <article><div className="k">Rooms ready</div><b>{p.rooms_ready ?? "—"}</b><div className="s">clean or inspected</div></article>
        <article><div className="k">Rooms dirty</div><b>{p.rooms_dirty ?? "—"}</b><div className="s">need a turn</div></article>
        <article><div className="k">Inspected</div><b>{p.rooms_inspected ?? "—"}</b><div className="s">passed today</div></article>
        <article><div className="k">Out of order</div><b>{p.out_of_order ?? 0}</b><div className="s">not sellable</div></article>
        <article><div className="k">Payments due</div><b>{money(p.payments_due)}</b><div className="s">folio not live yet</div></article>
        <article><div className="k">Open tasks</div><b>{p.open_tasks ?? 0}</b><div className="s">across the house</div></article>
        <article className={(p.critical_issues ?? 0) > 0 ? "crit" : ""}><div className="k">Critical issues</div><b>{p.critical_issues ?? 0}</b><div className="s">need a manager now</div></article>
      </div>
      <div className="house-grid">
        <section className="house-panel">
          <div className="k">Today&apos;s timeline</div>
          <h2>The live pulse</h2>
          <ol className="day-beats">
            {(e.timeline ?? []).map(b => (
              <li key={b.time} className={b.time <= nowHm ? "done" : ""}>
                <span className="t">{b.time}</span>
                <span>{b.label}</span>
              </li>
            ))}
          </ol>
        </section>
        <section className="house-panel">
          <div className="k">Arrivals</div>
          <h2>Coming in</h2>
          {e.arriving.length === 0 ? <p className="m" style={{ color: "var(--ink-2)" }}>No arrivals today. A quiet morning.</p> : (
            <ul className="house-list">{e.arriving.map(g => (
              <li key={g.id}><span><div className="t">{g.name}</div><div className="m">{g.organisation || "Private"} · {g.expected_guests ?? "—"} guests</div></span><span className="chip CONFIRMED">{g.arrival_slot}</span></li>
            ))}</ul>
          )}
        </section>
        <section className="house-panel">
          <div className="k">Departures</div>
          <h2>Leaving</h2>
          {e.departing.length === 0 ? <p className="m" style={{ color: "var(--ink-2)" }}>No departures today.</p> : (
            <ul className="house-list">{e.departing.map(g => (
              <li key={g.id}><span><div className="t">{g.name}</div><div className="m">{g.organisation || "Private"} · {g.expected_guests ?? "—"} guests</div></span><span className="chip ENQUIRY">{g.departure_slot}</span></li>
            ))}</ul>
          )}
          {e.next && <div className="next-stay">Next: {e.next.name} · {fmt(e.next.arrival, { weekday: "short", day: "numeric", month: "short" })} {e.next.arrival_slot}{e.next.expected_guests ? ` · ${e.next.expected_guests} guests` : ""}</div>}
        </section>
        <OpsBoard compact />
      </div>
    </>
  );
}
