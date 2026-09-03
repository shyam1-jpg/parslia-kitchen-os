"use client";
import { useEffect, useState } from "react";
import Link from "next/link";
import { api } from "@/lib/api";
import { fmt } from "@/lib/format";
import OpsBoard from "@/components/OpsBoard";

type Estate = {
  today: string;
  property: { name: string; legal_entity: string; check_in_from: string; check_out_by: string; guest_rooms: number; dining: { name: string; seats: number; max_covers: number } | null };
  pulse: { in_house: number; arriving: number; departing: number; rooms_tonight: number; guest_rooms: number; dinner: number };
  arriving: { id: string; name: string; organisation: string | null; expected_guests: number | null; arrival_slot: string }[];
  departing: { id: string; name: string; organisation: string | null; expected_guests: number | null; departure_slot: string }[];
  in_house: { id: string; name: string; organisation: string | null; expected_guests: number | null }[];
  next: { name: string; organisation: string | null; arrival: string; arrival_slot: string; expected_guests: number | null } | null;
};

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
  return (
    <>
      <div className="topbar">
        <div>
          <h1>Today at the house</h1>
          <p>{d}. Check-in from {e.property.check_in_from}, departure by {e.property.check_out_by}. {e.property.dining ? `${e.property.dining.name}, ${e.property.dining.max_covers} covers.` : ""}</p>
        </div>
        <div style={{ display: "flex", gap: 10 }}>
          {book > 0 && <Link className="btn" href="/groups/">{book} guest book {book === 1 ? "enquiry" : "enquiries"}</Link>}
          <Link className="btn primary" href="/groups/">Open the book</Link>
        </div>
      </div>
      <div className="pulse">
        <article><div className="k">In residence</div><b>{e.pulse.in_house}</b><div className="s">groups on the estate</div></article>
        <article><div className="k">Arriving</div><b>{e.pulse.arriving}</b><div className="s">due today</div></article>
        <article><div className="k">Rooms tonight</div><b>{e.pulse.rooms_tonight}</b><div className="s">of {e.pulse.guest_rooms} guest rooms</div></article>
        <article><div className="k">Dinner</div><b>{e.pulse.dinner}</b><div className="s">covers this evening</div></article>
      </div>
      <div className="house-grid">
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
