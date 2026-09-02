"use client";
import { useEffect, useState } from "react";
import { api } from "@/lib/api";
type M = { ym: string; label: string; bookings: number; cancelled: number; guests: number; guest_nights: number; day_events: number; weddings: number; exclusive: number; room_nights: number; bed_nights: number; available_room_nights: number; occupancy_pct: number; revenue: number; bookings_priced: number; bookings_unpriced: number };
type Rep = { year: number; sellable_rooms: number; items: M[]; top_organisations: { organisation: string; bookings: number; guests: number }[]; note: string };

export default function Reports() {
  const [year, setYear] = useState(new Date().getFullYear()); const [rep, setRep] = useState<Rep | null>(null); const [err, setErr] = useState<string | null>(null);
  useEffect(() => { api<Rep>(`/v1/reports/monthly?year=${year}`).then(r => { setRep(r); setErr(null); }).catch(e => setErr(e.message)); }, [year]);
  const tot = (k: keyof M) => rep?.items.reduce((n, m) => n + (m[k] as number), 0) ?? 0;
  const csv = () => { if (!rep) return; const cols = ["ym", "bookings", "cancelled", "guests", "guest_nights", "room_nights", "bed_nights", "available_room_nights", "occupancy_pct", "revenue", "bookings_priced", "bookings_unpriced", "day_events", "weddings", "exclusive"] as (keyof M)[];
    const text = [cols.join(","), ...rep.items.map(m => cols.map(c => m[c]).join(","))].join("\n"); const a = document.createElement("a"); a.href = URL.createObjectURL(new Blob([text], { type: "text/csv" })); a.download = `vedanta-${year}-monthly.csv`; a.click(); };
  const maxRN = Math.max(1, ...(rep?.items.map(m => m.room_nights) ?? [1]));
  return (
    <>
      <div className="topbar"><div><h1>Reports</h1><p>Monthly occupancy and volume from the bookings and the room board. {rep ? `${rep.sellable_rooms} sellable rooms.` : ""}</p></div>
        <div style={{ display: "flex", gap: 10 }}><div className="seg"><button onClick={() => setYear(y => y - 1)}>‹</button><button className="on">{year}</button><button onClick={() => setYear(y => y + 1)}>›</button></div><button className="btn" onClick={csv} disabled={!rep}>Download CSV</button></div></div>
      {err && <div className="note">{err}</div>}
      {rep && (<>
        <div className="stats"><div><b>{tot("bookings")}</b>bookings</div><div><b>{tot("guests").toLocaleString()}</b>guests</div><div><b>{tot("room_nights").toLocaleString()}</b>room-nights on the board</div><div><b>{rep.items.length ? Math.round(tot("room_nights") / Math.max(1, tot("available_room_nights")) * 100) : 0}%</b>occupancy</div><div><b>£{tot("revenue").toLocaleString()}</b>revenue ({tot("bookings_priced")} of {tot("bookings_priced") + tot("bookings_unpriced")} priced)</div><div><b>{tot("weddings")}</b>weddings</div><div><b>{tot("day_events")}</b>day events</div></div>
        <div className="panel" style={{ overflowX: "auto" }}>
          <table className="rpt">
            <thead><tr><th>Month</th><th>Bookings</th><th>Cancelled</th><th>Guests</th><th>Guest-nights</th><th>Room-nights</th><th>Occupancy</th><th></th><th>Revenue</th><th>Priced</th><th>Day events</th><th>Weddings</th><th>Exclusive use</th></tr></thead>
            <tbody>{rep.items.map(m => (
              <tr key={m.ym}><td>{m.label}</td><td>{m.bookings}</td><td className="m">{m.cancelled || ""}</td><td>{m.guests.toLocaleString()}</td><td>{m.guest_nights.toLocaleString()}</td><td>{m.room_nights.toLocaleString()}</td><td>{m.occupancy_pct}%</td>
                <td style={{ width: 160 }}><div className="barbg"><div className="barfg" style={{ width: `${100 * m.room_nights / maxRN}%` }} /></div></td><td>{m.revenue ? "£" + m.revenue.toLocaleString() : ""}</td><td className="m">{m.bookings_priced || m.bookings_unpriced ? `${m.bookings_priced}/${m.bookings_priced + m.bookings_unpriced}` : ""}</td><td>{m.day_events || ""}</td><td>{m.weddings || ""}</td><td>{m.exclusive || ""}</td></tr>))}</tbody>
          </table>
        </div>
        <div className="split" style={{ marginTop: 14 }}>
          <div className="panel"><h3>Top organisations {year}</h3><table className="rpt"><tbody>{rep.top_organisations.map(o => <tr key={o.organisation}><td>{o.organisation}</td><td>{o.bookings} booking{o.bookings === 1 ? "" : "s"}</td><td>{o.guests?.toLocaleString() ?? "—"} guests</td></tr>)}</tbody></table></div>
          <div className="panel"><h3>How to read this</h3><p className="m">Room-nights and occupancy come from names on the room board (a room with anyone in it that evening counts once), so months before the board was kept will read low. Guests and guest-nights come from the numbers on the bookings.</p><p className="m">{rep.note}</p></div>
        </div>
      </>)}
    </>
  );
}
