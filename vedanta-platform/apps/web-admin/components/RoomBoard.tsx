"use client";
import { useEffect, useMemo, useState, type DragEvent, type MouseEvent } from "react";
import { sections, type Slot, type Room } from "@/lib/data";
import { useStore } from "@/lib/store";
import { api, ApiError } from "@/lib/api";
import { fmt, addDays } from "@/lib/format";

const TODAY = new Date().toISOString().slice(0, 10);
type Cell = { label: string; colour: string; groupId: string };
type Editor = { room: string; date: string; slot: Slot; x: number; y: number; existing?: Cell[] };

export default function RoomBoard() {
  const { rooms, groups, occupancy, placeOccupant, removeOccupant, linkOccupant, linkBulk, moveParty, loadOccupancy, can } = useStore();
  const [bulk, setBulk] = useState<{ on: boolean; rooms: Set<string>; gid: string }>({ on: false, rooms: new Set(), gid: "" });
  const outOfUse = useMemo(() => new Set(rooms.filter(r => r.outOfUse).map(r => r.number)), [rooms]);
  const [start, setStart] = useState(addDays(TODAY, -2));
  const [span, setSpan] = useState<7 | 14>(7);
  const [section, setSection] = useState<string>("all");
  const [editor, setEditor] = useState<Editor | null>(null);
  const [toast, setToast] = useState<{ text: string; err?: boolean } | null>(null);
  const [drag, setDrag] = useState<{ room: string; groupId: string; labels: string[] } | null>(null);
  const [over, setOver] = useState<{ room: string; ok: boolean } | null>(null);

  const say = (text: string, err = false) => { setToast({ text, err }); setTimeout(() => setToast(null), 3000); };
  const editable = can("occupancy.write");
  const days = useMemo(() => Array.from({ length: span }, (_, i) => addDays(start, i)), [start, span]);
  useEffect(() => { loadOccupancy(days[0], days[days.length - 1]).catch(() => {}); }, [days, loadOccupancy]);
  const key = (r: string, d: string, s: Slot) => `${r}|${d}|${s}`;
  const occ = useMemo(() => {
    const m = new Map<string, Cell[]>();
    for (const o of occupancy) {
      const g = groups.find(x => x.id === o.groupId);
      const kk = key(o.room, o.date, o.slot);
      // Placements from the sheet that could not be tied to one group are shown in grey until someone links them.
      m.set(kk, [...(m.get(kk) ?? []), g ? { label: o.label, colour: g.colour, groupId: g.id } : { label: o.label, colour: "#8A9490", groupId: "" }]);
    }
    return m;
  }, [occupancy, groups]);

  const shownRooms = rooms.filter(r => section === "all" || r.section === section);
  const sellable = rooms.filter(r => !r.staffOnly && !outOfUse.has(r.number)).length;
  const tonight = new Set(occupancy.filter(o => o.date === TODAY && o.slot === "PM").map(o => o.room)).size;
  const arriving = groups.filter(g => g.arrival === TODAY && g.status !== "CANCELLED");
  const inRange = groups.filter(g => g.status !== "CANCELLED" && g.roomsWanted > 0 && g.departure >= days[0] && g.arrival <= days[days.length - 1]);
  const isWeekend = (d: string) => [0, 6].includes(new Date(d + "T00:00:00").getDay());
  const groupsOn = (date: string, slot: Slot) => groups.filter(g => g.status !== "CANCELLED" && (g.status !== "COMPLETED" || date < TODAY) && g.roomsWanted > 0 &&
    (g.arrival < date || (g.arrival === date && (slot === "PM" || g.arrivalSlot === "AM"))) &&
    (g.departure > date || (g.departure === date && (slot === "AM" || g.departureSlot === "PM"))));

  const openEditor = (e: MouseEvent, room: string, date: string, slot: Slot, existing?: Cell[]) => {
    const rect = (e.currentTarget as HTMLElement).getBoundingClientRect();
    setEditor({ room, date, slot, x: Math.min(rect.left, window.innerWidth - 320), y: Math.min(rect.bottom + 4, window.innerHeight - 260), existing });
  };

  const onDragStart = (e: DragEvent, room: string, cs: Cell[]) => { setDrag({ room, groupId: cs[0].groupId, labels: cs.filter(c => c.groupId === cs[0].groupId).map(c => c.label) }); e.dataTransfer.effectAllowed = "move"; };
  const onDragOver = (e: DragEvent, r: Room) => {
    if (!drag) return; e.preventDefault();
    const ok = !r.staffOnly && !outOfUse.has(r.number) && r.number !== drag.room;
    if (over?.room !== r.number) setOver({ room: r.number, ok });
  };
  const onDrop = async (r: Room) => {
    if (!drag) return;
    const err = await moveParty(drag.room, r.number, drag.groupId, drag.labels);
    say(err ?? `Moved ${drag.labels.join(", ")} to room ${r.number}`, !!err);
    setDrag(null); setOver(null);
  };

  return (
    <>
      <div className="topbar">
        <div><h1>Room board</h1><p>{editable ? "Click an empty cell to place someone; drag a stay to another room." : "Who is in which room, morning and evening."}</p></div>
        <div style={{ display: "flex", gap: 10, alignItems: "center" }}>
          <div className="seg">
            <button onClick={() => setStart(addDays(start, -span))} aria-label="Earlier">‹</button>
            <button onClick={() => setStart(addDays(TODAY, -2))}>Today</button>
            <input type="date" aria-label="Go to date" value={start} onChange={e => e.target.value && setStart(e.target.value)} style={{ border: 0, padding: "6px 8px", font: "inherit", color: "var(--ink-2)", background: "transparent" }} />
            <button onClick={() => setStart(addDays(start, span))} aria-label="Later">›</button>
          </div>
          <div className="seg"><button className={span === 7 ? "on" : ""} onClick={() => setSpan(7)}>Week</button><button className={span === 14 ? "on" : ""} onClick={() => setSpan(14)}>Fortnight</button></div>
          {editable && occupancy.some(o => !groups.find(x => x.id === o.groupId)) && <button className={"btn" + (bulk.on ? " primary" : "")} onClick={() => setBulk(b => ({ ...b, on: !b.on, rooms: new Set() }))}>{bulk.on ? "Done selecting" : "Link sheet names…"}</button>}
          <select className="btn" value={section} onChange={e => setSection(e.target.value)} aria-label="Section">
            <option value="all">All sections</option>{sections.map(s => <option key={s}>{s}</option>)}
          </select>
        </div>
      </div>

      {bulk.on && (() => {
        const inView = groups.filter(g => g.status !== "CANCELLED" && g.roomsWanted > 0 && g.departure >= days[0] && g.arrival <= days[days.length - 1]);
        const greyRooms = [...new Set(occupancy.filter(o => !groups.find(x => x.id === o.groupId) && o.date >= days[0] && o.date <= days[days.length - 1]).map(o => o.room))];
        return (
          <div className="bulkbar">
            <b>Tick the rooms whose grey names belong to</b>
            <select className="btn" value={bulk.gid} onChange={e => setBulk(b => ({ ...b, gid: e.target.value }))}><option value="">choose a booking…</option>{inView.map(g => <option key={g.id} value={g.id}>{g.name} · {fmt(g.arrival)}–{fmt(g.departure)}</option>)}</select>
            <button className="btn" onClick={() => setBulk(b => ({ ...b, rooms: new Set(greyRooms) }))}>All {greyRooms.length} grey rooms in view</button>
            <button className="btn" onClick={() => setBulk(b => ({ ...b, rooms: new Set() }))}>Clear</button>
            <button className="btn primary" disabled={!bulk.gid || bulk.rooms.size === 0} onClick={async () => {
              try { const r = await linkBulk([...bulk.rooms], bulk.gid, days[0], days[days.length - 1]); say(`Linked ${r.linked} half-days in ${bulk.rooms.size} rooms to ${r.group}`); setBulk({ on: false, rooms: new Set(), gid: "" }); }
              catch (e) { say(e instanceof ApiError ? e.problem.detail : "Could not link", true); } }}>Link {bulk.rooms.size} room{bulk.rooms.size === 1 ? "" : "s"}</button>
            <span style={{ color: "var(--ink-2)", fontSize: 12 }}>Only grey names inside the booking's dates are linked; nothing already linked is touched.</span>
          </div>);
      })()}
      <div className="stats">
        <div><b>{tonight} / {sellable}</b>rooms occupied tonight</div>
        <div><b>{arriving.reduce((n, g) => n + g.guests, 0)}</b>guests arriving today{arriving.length ? ` · ${arriving.map(g => g.organisation).join(", ")}` : ""}</div>
        <div><b>{outOfUse.size}</b>out of use</div>
        <div><b>{rooms.filter(r => r.staffOnly).length}</b>staff room</div>
      </div>

      <div className="boardwrap" onClick={() => editor && setEditor(null)}>
        <table className="board">
          <thead>
            <tr><th className="room" rowSpan={2}>Room <small>beds · max</small></th>
              {days.map(d => <th key={d} colSpan={2} className={d === TODAY ? "today" : ""}>{fmt(d)}</th>)}</tr>
            <tr>{days.flatMap(d => (["AM", "PM"] as Slot[]).map(s => <th key={d + s} className={d === TODAY ? "today" : ""}>{s}</th>))}</tr>
          </thead>
          <tbody>
            {sections.filter(s => section === "all" || s === section).map(sec => (<SectionRows key={sec} sec={sec} rooms={shownRooms.filter(r => r.section === sec)} days={days} occ={occ} k={key} editable={editable} outOfUse={outOfUse}
              isWeekend={isWeekend} onCell={openEditor} bulk={bulk.on ? { rooms: bulk.rooms, toggle: (n: string) => setBulk(b => { const r = new Set(b.rooms); r.has(n) ? r.delete(n) : r.add(n); return { ...b, rooms: r }; }) } : null} onDragStart={onDragStart} onDragOver={onDragOver} onDrop={onDrop} onDragLeave={() => setOver(null)} over={over} />))}
          </tbody>
        </table>
      </div>

      <div className="legend">
        {inRange.map(g => <span key={g.id}><i style={{ background: g.colour }} />{g.name}</span>)}
        {occupancy.some(o => !groups.find(x => x.id === o.groupId)) && <span><i style={{ background: "#8A9490" }} />From the sheet, no booking linked</span>}
        <span><i style={{ background: "repeating-linear-gradient(135deg,#f1f1f1 0 3px,#d8d8d8 3px 6px)" }} />Out of use</span>
      </div>

      {editor && <CellEditor ed={editor} candidates={groupsOn(editor.date, editor.slot)} onClose={() => setEditor(null)}
        editable={editable} rooms={rooms}
        onPlace={async (gid, label) => { const err = await placeOccupant(editor.room, gid, label); say(err ?? `Placed ${label} in room ${editor.room}`, !!err); if (!err) setEditor(null); }}
        onGuest={(m) => { say(m); setEditor(null); }}
        onLink={async (c, gid) => { try { const r = await linkOccupant(editor.room, c.label, editor.date, gid); say(`Linked ${c.label} to ${r.group}`); setEditor(null); } catch (e) { say(e instanceof ApiError ? e.problem.detail : "Could not link", true); } }}
        onRemove={async (c) => { await removeOccupant(editor.room, c.groupId, c.label); say(`Removed ${c.label} from room ${editor.room}`); setEditor(null); }} />}
      {toast && <div className={"toast" + (toast.err ? " err" : "")}>{toast.text}</div>}
    </>
  );
}

function GuestAttach({ ed, c, onDone }: { ed: Editor; c: Cell; onDone: (msg: string) => void }) {
  type G = { id: string; given_name: string; family_name: string; organisation: string | null; allergens: string[] | null; severity: string | null; diet: string[] | null };
  const [q, setQ] = useState(c.label); const [hits, setHits] = useState<G[]>([]); const [open, setOpen] = useState(false); const [busy, setBusy] = useState(false);
  useEffect(() => { if (!open) return; const t = setTimeout(() => api<{ items: G[] }>(`/v1/guests?q=${encodeURIComponent(q)}&limit=6`).then(r => setHits(r.items)).catch(() => {}), 200); return () => clearTimeout(t); }, [q, open]);
  const attach = async (pid: string, who: string) => { setBusy(true); try { await api("/v1/guests/attach", { method: "POST", body: JSON.stringify({ room: ed.room, label: c.label, date: ed.date, person_id: pid }) }); onDone(`${c.label} is now ${who}`); } catch (e) { onDone(e instanceof ApiError ? e.problem.detail : "Could not attach"); } finally { setBusy(false); } };
  const create = async () => { const parts = q.trim().split(/\s+/); const given = parts[0] ?? c.label, family = parts.slice(1).join(" ") || "—"; setBusy(true);
    try { const r = await api<{ id: string }>("/v1/guests", { method: "POST", body: JSON.stringify({ given_name: given, family_name: family }) }); await attach(r.id, `${given} ${family} (new guest record)`); } catch (e) { onDone(e instanceof ApiError ? e.problem.detail : "Could not create"); setBusy(false); } };
  if (!open) return <button className="linkbtn" style={{ fontSize: 12 }} onClick={() => setOpen(true)}>who is this?</button>;
  return (
    <div className="linkbox" style={{ marginTop: 6 }}>
      <label>Guest record for “{c.label}”<input autoFocus value={q} onChange={e => setQ(e.target.value)} placeholder="Search or type full name" style={{ display: "block", width: "100%", marginTop: 4, padding: "6px 8px", border: "1px solid var(--line)", borderRadius: 6, font: "inherit" }} /></label>
      <ul className="who" style={{ margin: "6px 0" }}>{hits.map(g => <li key={g.id}><i style={{ background: g.allergens?.length ? "var(--brick)" : g.diet?.length ? "var(--moss)" : "var(--line)" }} />{g.given_name} {g.family_name}<span className="m" style={{ fontSize: 11, color: "var(--ink-2)" }}>{g.organisation ? ` · ${g.organisation}` : ""}{g.allergens?.length ? ` · ${g.allergens.join(", ")}` : ""}</span><button className="btn" disabled={busy} onClick={() => attach(g.id, `${g.given_name} ${g.family_name}`)}>This one</button></li>)}</ul>
      <div style={{ display: "flex", gap: 6 }}><button className="btn primary" disabled={busy || !q.trim()} onClick={create}>Create “{q.trim()}”</button><button className="btn" onClick={() => setOpen(false)}>Cancel</button></div>
    </div>);
}

function CellEditor({ ed, candidates, onClose, onPlace, onRemove, onLink, editable, rooms, onGuest }: { ed: Editor; candidates: { id: string; name: string }[]; onClose: () => void; onPlace: (gid: string, label: string) => void; onRemove: (c: Cell) => void; onLink: (c: Cell, gid: string) => void; editable: boolean; rooms: Room[]; onGuest: (msg: string) => void }) {
  const [linkGid, setLinkGid] = useState(candidates[0]?.id ?? "");
  const existing = ed.existing ?? [];
  const [gid, setGid] = useState(existing[0]?.groupId ?? candidates[0]?.id ?? "");
  const [label, setLabel] = useState("");
  const room = rooms.find(r => r.number === ed.room)!;
  const full = existing.length >= room.max;
  const canAdd = editable && candidates.length > 0 && !full;
  return (
    <div className="pop" style={{ left: ed.x, top: ed.y }} onClick={e => e.stopPropagation()} role="dialog">
      <h3>Room {ed.room} <span style={{ color: "var(--ink-2)", fontWeight: 400, fontSize: 12 }}>· {room.beds} · sleeps {room.max}</span></h3>
      {existing.length > 0 && (
        <ul className="who">{existing.map(c => <li key={c.groupId + c.label}><i style={{ background: c.colour }} />{c.label}{!c.groupId && <span className="m" style={{ fontSize: 11, color: "var(--ink-2)" }}>· from the sheet</span>}{editable && <button className="btn danger" onClick={() => onRemove(c)}>Remove</button>}</li>)}</ul>)}
      {editable && existing.map(c => <GuestAttach key={"ga" + c.label} ed={ed} c={c} onDone={onGuest} />)}
      {editable && existing.some(c => !c.groupId) && (candidates.length > 0 ? (
        <div className="linkbox">
          <label>Link {existing.filter(c => !c.groupId).length > 1 ? "these names" : existing.find(c => !c.groupId)!.label} to<select value={linkGid} onChange={e => setLinkGid(e.target.value)}>{candidates.map(g => <option key={g.id} value={g.id}>{g.name}</option>)}</select></label>
          <button className="btn primary" style={{ marginTop: 8 }} disabled={!linkGid} onClick={() => existing.filter(c => !c.groupId).forEach(c => onLink(c, linkGid))}>Link to booking</button>
        </div>) : <div style={{ color: "var(--ink-2)", fontSize: 12, marginTop: 6 }}>No booking is in house on this date to link to.</div>)}
      {candidates.length === 0 && existing.length === 0 && <div style={{ color: "var(--ink-2)" }}>No group is in house on {fmt(ed.date)} {ed.slot}. Create the booking first.</div>}
      {full && <div style={{ color: "var(--ink-2)", fontSize: 12 }}>Room is full. Drag the bar to move everyone to another room.</div>}
      {canAdd && (<>
        {existing.length === 0 && <label>Group<select value={gid} onChange={e => setGid(e.target.value)}>{candidates.map(g => <option key={g.id} value={g.id}>{g.name}</option>)}</select></label>}
        <label>{existing.length ? "Add another person" : "Name"}<input autoFocus value={label} onChange={e => setLabel(e.target.value)} placeholder="As on the booking form" onKeyDown={e => { if (e.key === "Enter" && label.trim()) onPlace(gid, label.trim()); if (e.key === "Escape") onClose(); }} /></label>
      </>)}
      <div className="actions">
        {canAdd && <button className="btn primary" disabled={!label.trim() || !gid} onClick={() => onPlace(gid, label.trim())}>Place for whole stay</button>}
        <button className="btn" onClick={onClose}>{canAdd ? "Cancel" : "Close"}</button>
      </div>
    </div>
  );
}

function SectionRows(p: { sec: string; rooms: Room[]; days: string[]; occ: Map<string, Cell[]>; k: (r: string, d: string, s: Slot) => string; isWeekend: (d: string) => boolean;
  onCell: (e: MouseEvent, room: string, d: string, s: Slot, existing?: Cell[]) => void; editable: boolean; outOfUse: Set<string>; onDragStart: (e: DragEvent, room: string, cs: Cell[]) => void; onDragOver: (e: DragEvent, r: Room) => void; onDrop: (r: Room) => void; onDragLeave: () => void; over: { room: string; ok: boolean } | null; bulk: { rooms: Set<string>; toggle: (n: string) => void } | null }) {
  const { sec, rooms, days, occ, k, isWeekend, outOfUse } = p;
  return (<>
    <tr className="sect"><th className="room">{sec}</th><td colSpan={days.length * 2} /></tr>
    {rooms.map(r => (
      <tr key={r.number} className={p.over?.room === r.number ? (p.over.ok ? "drop-ok" : "drop-no") : ""} onDragOver={e => p.onDragOver(e, r)} onDragLeave={p.onDragLeave} onDrop={() => p.onDrop(r)}>
        <th className="room" title={r.features.join(", ")}>{p.bulk && !r.staffOnly && <input type="checkbox" checked={p.bulk.rooms.has(r.number)} onChange={() => p.bulk!.toggle(r.number)} style={{ marginRight: 8 }} aria-label={`Select room ${r.number}`} />}{r.number}<small>{r.beds} · {r.max}</small></th>
        {days.flatMap(d => (["AM", "PM"] as Slot[]).map(s => {
          if (outOfUse.has(r.number)) return <td key={d + s} className="oou">{s === "AM" ? "out of use" : ""}</td>;
          if (r.staffOnly) return <td key={d + s} className="oou">{s === "AM" ? "staff" : ""}</td>;
          const cs = occ.get(k(r.number, d, s));
          if (!cs || cs.length === 0) return <td key={d + s} className={"free" + (isWeekend(d) ? " wk" : "")} onClick={e => { e.stopPropagation(); p.onCell(e, r.number, d, s); }} />;
          const sig = (x?: Cell[]) => x ? x.map(c => c.groupId + "/" + c.label).sort().join("|") : "";
          const me = sig(cs);
          const same = sig(s === "PM" ? occ.get(k(r.number, d, "AM")) : occ.get(k(r.number, addDays(d, -1), "PM"))) === me;
          const cont = sig(s === "AM" ? occ.get(k(r.number, d, "PM")) : occ.get(k(r.number, addDays(d, 1), "AM"))) === me;
          const text = cs.map(c => c.label).join(" · ");
          return <td key={d + s} className="occ" draggable={p.editable} onDragStart={e => p.onDragStart(e, r.number, cs)} onClick={e => { e.stopPropagation(); p.onCell(e, r.number, d, s, cs); }}
            style={{ background: cs[0].colour, borderRightColor: cont ? cs[0].colour : undefined, borderRadius: `${same ? 0 : 4}px ${cont ? 0 : 4}px ${cont ? 0 : 4}px ${same ? 0 : 4}px` }} title={text}>{same ? "" : text}</td>;
        }))}
      </tr>))}
  </>);
}
