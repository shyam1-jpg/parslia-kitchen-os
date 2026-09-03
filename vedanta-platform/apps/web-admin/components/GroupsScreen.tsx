"use client";
import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { type Group, type GroupStatus, RETREAT_TYPES } from "@/lib/data";
import { useStore } from "@/lib/store";
import NewGroupForm from "@/components/NewGroupForm";
import EditGroupForm from "@/components/EditGroupForm";
import EmailDialog from "@/components/EmailDialog";
import { bookingValue, gbp } from "@/lib/pricing";
import { api, ApiError } from "@/lib/api";
import { fmt, nights } from "@/lib/format";

const TODAY = new Date().toISOString().slice(0, 10);
const FLOW: GroupStatus[] = ["ENQUIRY", "PROVISIONAL", "CONFIRMED", "IN_HOUSE", "COMPLETED"];
const NEXT: Partial<Record<GroupStatus, { cmd: string; api: string; to: GroupStatus }[]>> = {
  ENQUIRY: [{ cmd: "Hold provisionally", api: "hold", to: "PROVISIONAL" }, { cmd: "Confirm", api: "confirm", to: "CONFIRMED" }],
  PROVISIONAL: [{ cmd: "Confirm", api: "confirm", to: "CONFIRMED" }],
  CONFIRMED: [{ cmd: "Check group in", api: "check_in", to: "IN_HOUSE" }],
  IN_HOUSE: [{ cmd: "Check group out", api: "check_out", to: "COMPLETED" }],
};

export default function GroupsScreen() {
  const { groups, updateGroup, command, can, loading, reload } = useStore();
  const [filter, setFilter] = useState<"upcoming" | "attention" | "all">("upcoming");
  const [selId, setSelId] = useState<string | null>(null);
  const [creating, setCreating] = useState(false);
  const [editing, setEditing] = useState(false);
  const [formUrl, setFormUrl] = useState<string | null>(null);
  const [email, setEmail] = useState<"form_link" | "confirmation" | null>(null);
  const [attendees, setAttendees] = useState<{ given_name: string; family_name: string; diet: string[] | null; allergens: string[] | null; severity: string | null; room_preference: string | null; arrives_early: boolean }[] | null>(null);
  const [toast, setToast] = useState<string | null>(null);
  const [enquiries, setEnquiries] = useState<{ id: string; name: string; email: string; people: number; arrival: string; departure: string; notes: string | null; programme_name?: string | null }[]>([]);
  const today = new Date().toISOString().slice(0, 10);
  const sel = groups.find(g => g.id === selId) ?? groups.filter(g => g.status !== "CANCELLED" && g.status !== "COMPLETED" && g.departure >= today).sort((a, b) => a.arrival.localeCompare(b.arrival))[0];
  useEffect(() => { setAttendees(null); setFormUrl(null); if (sel?.attendees) api<{ items: typeof attendees }>(`/v1/groups/${sel.id}/attendees`).then(r => setAttendees(r.items)).catch(() => {}); }, [sel?.id, sel?.attendees]); // eslint-disable-line react-hooks/exhaustive-deps
  useEffect(() => { api<{ items: typeof enquiries }>("/v1/guest-enquiries").then(r => setEnquiries(r.items)).catch(() => {}); }, []);

  const shown = useMemo(() => {
    const live = groups.filter(g => g.status !== "CANCELLED" && g.status !== "COMPLETED" && g.departure >= TODAY);
    if (filter === "attention") return live.filter(g => g.bookingForm !== "COMPLETE" || !g.termsSigned || g.status === "ENQUIRY");
    if (filter === "all") return groups;
    return live;
  }, [groups, filter]);

  const byMonth = useMemo(() => {
    const m = new Map<string, Group[]>();
    for (const g of [...shown].sort((a, b) => a.arrival.localeCompare(b.arrival))) {
      const k = fmt(g.arrival, { month: "long", year: "numeric" });
      m.set(k, [...(m.get(k) ?? []), g]);
    }
    return [...m.entries()];
  }, [shown]);

  const say = (t: string) => { setToast(t); setTimeout(() => setToast(null), 3500); };
  const run = async (fn: () => Promise<unknown>) => { try { await fn(); } catch (e) { say(e instanceof ApiError ? e.problem.detail : "Something went wrong"); } };
  const apply = (id: string, patch: Record<string, unknown>) => run(() => updateGroup(id, patch));
  const cmd = (id: string, c: string, reason?: string) => run(() => command(id, c, reason));

  const roomsAllocated = sel?.roomsAllocated ?? 0;
  const stepIdx = sel ? FLOW.indexOf(sel.status) : -1;
  const paperworkTodo = sel ? [sel.bookingForm !== "COMPLETE", !sel.termsSigned].filter(Boolean).length : 0; // rooms can be allocated after confirming

  return (
    <>
      <div className="topbar">
        <div><h1>The book</h1><p>{shown.length} shown · {groups.filter(g => g.status === "CONFIRMED" && g.departure >= TODAY).length} confirmed ahead{loading ? " · refreshing…" : ""}</p></div>
        <div style={{ display: "flex", gap: 10, alignItems: "center" }}>
          <div className="seg" role="tablist">
            {(["upcoming", "attention", "all"] as const).map(f => (
              <button key={f} role="tab" aria-selected={filter === f} className={filter === f ? "on" : ""} onClick={() => setFilter(f)}>
                {f === "upcoming" ? "Upcoming" : f === "attention" ? "Needs attention" : "All"}
              </button>))}
          </div>
          {can("group.create") && <button className="btn primary" onClick={() => setCreating(true)}>New group booking</button>}
        </div>
      </div>

      {enquiries.length > 0 && (
        <div className="panel" style={{ marginBottom: 18 }}>
          <h3>From the guest book</h3>
          <p className="m" style={{ color: "var(--ink-2)" }}>Guests sent these from /book. Take one into the house book to hold rooms.</p>
          {enquiries.map(e => (
            <div className="urow" key={e.id}>
              <div><div className="t">{e.name}{e.programme_name ? ` · ${e.programme_name}` : ""}</div><div className="m">{e.email} · {e.arrival} → {e.departure} · {e.people} people{e.notes ? ` · ${e.notes}` : ""}</div></div>
              {can("group.create") && <button className="btn primary" onClick={() => run(async () => { await api(`/v1/guest-enquiries/${e.id}/take`, { method: "POST" }); setEnquiries(s => s.filter(x => x.id !== e.id)); await reload(); say("In the book"); })}>Take into the book</button>}
            </div>
          ))}
        </div>
      )}

      <div className="split">
        <div className="list">
          {byMonth.length === 0 && <div className="empty">{loading ? "Loading bookings…" : "Nothing here."}</div>}
          {byMonth.map(([month, gs]) => (
            <div key={month}>
              <div className="month">{month}</div>
              {gs.map(g => {
                const todo = (g.bookingForm !== "COMPLETE" ? 1 : 0) + (!g.termsSigned ? 1 : 0);
                return (
                  <button key={g.id} className={"row" + (g.id === sel?.id ? " sel" : "")} onClick={() => setSelId(g.id)}>
                    <span className="bar" style={{ background: g.colour }} />
                    <span>
                      <div className="t">{g.name}</div>
                      <div className="m">{fmt(g.arrival)} {g.arrivalSlot} → {fmt(g.departure)} {g.departureSlot} · {g.guests} guests{g.roomsWanted ? ` · ${g.roomsWanted} rooms` : ""}</div>
                    </span>
                    <span className="r">
                      <span className={"chip " + g.status}>{g.status.replace("_", " ").toLowerCase()}</span>
                      {todo > 0 && g.status !== "CANCELLED" && <span className="warn">{todo} paperwork item{todo > 1 ? "s" : ""}</span>}
                    </span>
                  </button>);
              })}
            </div>))}
        </div>

        {sel ? (
          <section className="detail" aria-live="polite">
            <header>
              <div>
                <h2>{sel.name}</h2>
                <div style={{ color: "var(--ink-2)" }}>{sel.organisation}{sel.contact ? ` · ${sel.contact}` : ""} · {RETREAT_TYPES[sel.retreatType] ?? sel.retreatType} · {sel.useBasis === "EXCLUSIVE" ? "Exclusive use" : "Shared use"}{sel.source === "IMPORT:SHEET" ? " · from the sheet" : ""}</div>
              </div>
              <div style={{ display: "flex", gap: 8, alignItems: "center" }}>
                {can("group.update") && sel.status !== "CANCELLED" && <button className="btn" onClick={() => setEditing(true)}>Edit</button>}
                <span className={"chip " + sel.status}>{sel.status.replace("_", " ").toLowerCase()}</span>
              </div>
            </header>

            <div className="steps" aria-label="Booking progress">
              {FLOW.map((s, i) => <span key={s} className={i < stepIdx ? "done" : i === stepIdx ? "now" : ""}>{s.replace("_", " ").toLowerCase()}</span>)}
            </div>

            <div className="dates">
              <div><div className="d">{fmt(sel.arrival)}</div><div className="s">Arrive {sel.arrivalSlot}{sel.arrivalTime ? ` · ${sel.arrivalTime}` : ""}</div></div>
              <div className="arrow">{nights(sel.arrival, sel.departure) === 0 ? "day" : `${nights(sel.arrival, sel.departure)} nights`} →</div>
              <div style={{ textAlign: "right" }}><div className="d">{fmt(sel.departure)}</div><div className="s">Depart {sel.departureSlot}{sel.departureTime ? ` · ${sel.departureTime}` : ""}</div></div>
            </div>

            <div className="facts">
              <div><span>Guests</span><b>{sel.guests}</b></div>
              <div><span>Rooms</span><b>{sel.roomsWanted ? `${roomsAllocated} of ${sel.roomsWanted} allocated` : "None (day visit)"}</b></div>
              <div><span>Meal covers</span><b>{sel.guests} per service{sel.guests > 130 ? " — over 130, split sittings" : ""}</b></div>
              <div><span>Package</span><b>{sel.packageInfo?.name ?? sel.packageName ?? "—"}{sel.spa ? " · spa access" : ""}</b></div>
              <div><span>Price as agreed</span><b>{sel.priceNotes || "—"}</b></div>
              <div>{(() => { const v = bookingValue(sel); return <><span>Booking value</span><b>{v.value == null ? <span className="warn">Not priced — {v.how}</span> : gbp(v.value)}</b>{v.value != null && <div className="m" style={{ fontSize: 11, color: "var(--ink-2)" }}>{v.how}</div>}</>; })()}</div>
            </div>

            {sel.dietaryNotes && <div className="note" style={{ borderColor: "var(--moss)", background: "var(--moss-soft)" }}>Dietary: {sel.dietaryNotes}</div>}
            {sel.notes && <div className="note" style={{ whiteSpace: "pre-wrap", maxHeight: 140, overflow: "auto" }}>{sel.notes}</div>}

            <h3>Paperwork</h3>
            <ul className="check">
              <li><span className={"box " + (sel.bookingForm === "COMPLETE" ? "ok" : "todo")}>{sel.bookingForm === "COMPLETE" ? "✓" : ""}</span>Booking form
                <em>{sel.bookingForm === "COMPLETE" ? "Complete" : sel.bookingForm === "SENT" ? "Sent, awaiting reply" : "Not sent"}</em>
                {can("group.update") && <button className="btn" style={{ marginLeft: 8 }} onClick={() => run(async () => { const r = await api<{ url: string }>(`/v1/groups/${sel.id}/form-link`, { method: "POST", body: "{}" }); await navigator.clipboard?.writeText(r.url).catch(() => {}); setFormUrl(r.url); say("Form link copied — send it to the organiser"); })}>{sel.formToken ? "Copy link" : "Create link"}</button>}
                {can("email.send") && sel.formToken && <button className="btn" style={{ marginLeft: 4 }} onClick={() => setEmail("form_link")}>Email organiser</button>}
                {sel.bookingForm !== "COMPLETE" && sel.bookingForm === "SENT" && <button className="btn" style={{ marginLeft: 8 }} disabled={!can("group.update")} onClick={() => apply(sel.id, { booking_form_status: "COMPLETE" })}>Mark complete</button>}
              </li>
              <li><span className={"box " + (sel.termsSigned ? "ok" : "todo")}>{sel.termsSigned ? "✓" : ""}</span>Terms and conditions signed
                <em>{sel.termsSigned ? "2025/26 T&Cs on file" : "Outstanding"}</em>
                {!sel.termsSigned && <button className="btn" style={{ marginLeft: 8 }} disabled={!can("group.update")} onClick={() => apply(sel.id, { terms_signed: true })}>Record signed copy</button>}
              </li>
              <li><span className={"box " + (sel.roomsWanted === 0 || roomsAllocated >= sel.roomsWanted ? "ok" : "todo")}>{sel.roomsWanted === 0 || roomsAllocated >= sel.roomsWanted ? "✓" : ""}</span>Rooms allocated
                <em>{sel.roomsWanted === 0 ? "Not needed" : `${roomsAllocated} of ${sel.roomsWanted}`}</em>
                <Link className="btn" style={{ marginLeft: 8 }} href="/rooms/">Open room board</Link>
              </li>
              <li><span className={"box " + (sel.feedback === "RECEIVED" ? "ok" : "")}>{sel.feedback === "RECEIVED" ? "✓" : ""}</span>Feedback form
                <em>{sel.status === "COMPLETED" ? (sel.feedback === "RECEIVED" ? "Received" : "Send after departure") : "After the stay"}</em>
                {sel.status === "COMPLETED" && sel.feedback !== "RECEIVED" && <button className="btn" style={{ marginLeft: 8 }} disabled={!can("group.update")} onClick={() => apply(sel.id, { feedback_form_status: sel.feedback === "SENT" ? "RECEIVED" : "SENT" })}>{sel.feedback === "SENT" ? "Mark received" : "Send form"}</button>}
              </li>
            </ul>

            {formUrl && <div className="note" style={{ wordBreak: "break-all" }}>Organiser form link: <a href={formUrl} target="_blank" rel="noreferrer">{formUrl}</a></div>}
            {attendees && attendees.length > 0 && (<>
              <h3 style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>Attendees from the organiser form ({attendees.length}{sel.formSubmittedAt ? ` · submitted ${new Date(sel.formSubmittedAt).toLocaleDateString("en-GB")}` : ""})
                {can("occupancy.write") && sel.status !== "COMPLETED" && sel.status !== "CANCELLED" && <button className="btn" onClick={() => run(async () => { const r = await api<{ placed: { room: string; names: string[] }[]; unplaced: string[]; note?: string }>(`/v1/groups/${sel.id}/auto-place`, { method: "POST", body: "{}" }); say(r.placed.length ? `Placed ${r.placed.reduce((n, p) => n + p.names.length, 0)} people in ${r.placed.length} rooms${r.unplaced.length ? `; ${r.unplaced.length} could not be placed` : ""}` : (r.note ?? "Nothing to place")); })}>Place on the board</button>}</h3>
              <ul className="who" style={{ marginBottom: 14 }}>{attendees.map(a => <li key={a.given_name + a.family_name}><i style={{ background: a.allergens?.length ? "var(--brick)" : a.diet?.length ? "var(--moss)" : "var(--line)" }} />{a.given_name} {a.family_name}
                <span className="m" style={{ fontSize: 12, color: "var(--ink-2)" }}>{[a.room_preference?.replace("share_with:", "share with "), a.arrives_early ? "arrives early" : null, a.diet?.join(", ").replace(/_/g, " "), a.allergens?.length ? `${a.allergens.join(", ")} (${a.severity?.toLowerCase()})` : null].filter(Boolean).join(" · ")}</span></li>)}</ul>
            </>)}
            <div className="actions">
              {(NEXT[sel.status] ?? []).map(n => (
                <button key={n.cmd} className="btn primary" disabled={!can("group.confirm") || (n.to === "CONFIRMED" && paperworkTodo > 0)}
                  title={n.to === "CONFIRMED" && paperworkTodo > 0 ? "Complete the paperwork first" : undefined}
                  onClick={() => cmd(sel.id, n.api)}>{n.cmd}</button>))}
              {sel.status !== "CANCELLED" && sel.status !== "COMPLETED" && can("group.cancel") && (
                <button className="btn danger" onClick={() => { const why = prompt(`Cancel ${sel.name}? This releases ${roomsAllocated} rooms. Reason:`); if (why !== null) cmd(sel.id, "cancel", why); }}>Cancel booking</button>)}
              <span style={{ marginLeft: "auto", color: "var(--ink-2)", fontSize: 12, alignSelf: "center" }}>v{sel.version} · every change is logged</span>
            </div>
          </section>
        ) : <div className="detail empty">Select a booking</div>}
      </div>
      {email && sel && <EmailDialog groupId={sel.id} kind={email} onClose={() => setEmail(null)} onSent={m => { setEmail(null); say(m); }} />}
      {editing && sel && <EditGroupForm g={sel} onClose={() => setEditing(false)} onSaved={m => { setEditing(false); say(m); }} />}
      {creating && <NewGroupForm onClose={() => setCreating(false)} onCreated={g => { setCreating(false); setSelId(g.id); setFilter("upcoming"); say(`Created ${g.name} as an enquiry`); }} />}
      {toast && <div className="toast">{toast}</div>}
    </>
  );
}
