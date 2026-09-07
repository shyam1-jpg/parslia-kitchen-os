"use client";
import { useEffect, useState } from "react";
import { api, ApiError } from "@/lib/api";
import { useStore } from "@/lib/store";

type Dept = { code: string; label: string };
type Action = { status: string; label: string };
type Task = {
  id: string;
  title: string;
  notes: string;
  department: string;
  department_label: string;
  team: string;
  location_label: string;
  asset_label: string;
  room_label: string;
  guest_name: string;
  event_label: string;
  sop_slug: string;
  parent_id: string | null;
  priority: string;
  priority_label: string;
  severity: string;
  severity_label: string;
  status: string;
  status_label: string;
  overdue: boolean;
  due_at: string | null;
  start_at: string | null;
  expected_minutes: number | null;
  actual_minutes: number | null;
  blocked_reason: string;
  assigned_staff_id: string | null;
  assigned_label: string;
  assigned_name: string | null;
  created_by_name: string | null;
  created_at: string;
  next: Action[];
};
type Event = {
  id: string;
  kind: string;
  actor_name: string | null;
  from_status: string | null;
  to_status: string | null;
  field_name: string | null;
  previous_value: string | null;
  new_value: string | null;
  body: string;
  attachment_kind: string | null;
  created_at: string;
};
type Detail = Task & { events: Event[]; children: Task[]; can_assign: boolean; can_approve: boolean };
type Board = {
  items: Task[];
  counts: { total: number; open: number; done: number; overdue: number };
  departments: Dept[];
  statuses: { code: string; label: string }[];
  priorities: { code: string; label: string }[];
  severities: { code: string; label: string }[];
  can_assign: boolean;
  can_approve: boolean;
};
type Person = { id: string; name: string; role_name: string };

const emptyForm = {
  title: "", notes: "", department: "HOUSE", priority: "normal", severity: "none",
  due_at: "", assigned_staff_id: "", assigned_label: "", room_label: "", guest_name: "",
  location_label: "", asset_label: "", event_label: "", sop_slug: "", expected_minutes: "",
};

function when(iso: string | null) {
  if (!iso) return "";
  return new Date(iso).toLocaleString("en-GB", { day: "numeric", month: "short", hour: "2-digit", minute: "2-digit" });
}

export default function TaskBoard() {
  const { user } = useStore();
  const [board, setBoard] = useState<Board | null>(null);
  const [people, setPeople] = useState<Person[]>([]);
  const [err, setErr] = useState<string | null>(null);
  const [toast, setToast] = useState<string | null>(null);
  const [dept, setDept] = useState("all");
  const [filter, setFilter] = useState("open");
  const [sel, setSel] = useState<string | null>(null);
  const [detail, setDetail] = useState<Detail | null>(null);
  const [form, setForm] = useState(emptyForm);
  const [comment, setComment] = useState("");
  const [sub, setSub] = useState("");
  const say = (t: string) => { setToast(t); setTimeout(() => setToast(null), 3000); };

  const query = () => {
    const p = new URLSearchParams();
    if (dept !== "all") p.set("department", dept);
    if (filter === "mine") p.set("mine", "1");
    if (filter === "overdue") p.set("overdue", "1");
    if (filter === "done") p.set("status", "done");
    return p.toString();
  };
  const load = () => api<Board>(`/v1/ops/tasks?${query()}`).then(setBoard).catch(e => setErr(e instanceof ApiError ? e.problem.detail : "Tasks could not be opened."));
  const loadOne = (id: string) => api<Detail>(`/v1/ops/tasks/${id}`).then(setDetail).catch(e => say(e instanceof ApiError ? e.problem.detail : "Could not open the task"));

  useEffect(() => { load(); api<{ items: Person[] }>("/v1/ops/tasks/people").then(r => setPeople(r.items)).catch(() => {}); }, [dept, filter]);
  useEffect(() => { if (sel) loadOne(sel); else setDetail(null); }, [sel]);

  if (err) return <div className="note">{err}</div>;
  if (!board) return <div className="empty">Opening tasks…</div>;

  const items = board.items.filter(t => {
    if (filter === "open") return !["completed", "verified", "cancelled"].includes(t.status);
    if (filter === "done") return ["completed", "verified"].includes(t.status);
    return true;
  });

  const move = async (id: string, status: string, extra: Record<string, string> = {}) => {
    try {
      await api(`/v1/ops/tasks/${id}/status`, { method: "POST", body: JSON.stringify({ status, ...extra }) });
      say("Updated");
      load();
      if (sel === id) loadOne(id);
    } catch (e) { say(e instanceof ApiError ? e.problem.detail : "Could not update"); }
  };

  return (
    <>
      <div className="topbar">
        <div>
          <h1>Tasks</h1>
          <p>
            One list for every department. Guest requests, checklists and maintenance tickets stay where they are —
            this is extra work the house assigns. {user?.name ? `Signed as ${user.name}.` : ""}
            {" "}{board.counts.open} open · {board.counts.overdue} overdue · {board.counts.done} done.
          </p>
        </div>
      </div>
      <div className="seg" style={{ marginBottom: 10 }}>
        <button className={dept === "all" ? "on" : ""} onClick={() => setDept("all")}>All</button>
        {board.departments.map(d => <button key={d.code} className={dept === d.code ? "on" : ""} onClick={() => setDept(d.code)}>{d.label}</button>)}
      </div>
      <div className="seg" style={{ marginBottom: 16 }}>
        <button className={filter === "open" ? "on" : ""} onClick={() => setFilter("open")}>Open</button>
        <button className={filter === "mine" ? "on" : ""} onClick={() => setFilter("mine")}>Mine</button>
        <button className={filter === "overdue" ? "on" : ""} onClick={() => setFilter("overdue")}>Overdue</button>
        <button className={filter === "done" ? "on" : ""} onClick={() => setFilter("done")}>Done</button>
      </div>

      <div className="split">
        <div>
          <div className="list">
            {items.length === 0 && <div className="empty" style={{ padding: 24 }}>Nothing on this list.</div>}
            {items.map(t => (
              <button key={t.id} className={"row" + (sel === t.id ? " sel" : "")} onClick={() => setSel(t.id)}>
                <span className="bar" style={{ background: t.overdue ? "var(--brick)" : t.priority === "urgent" ? "var(--marigold)" : "var(--forest)" }} />
                <span>
                  <div className="t">{t.title}</div>
                  <div className="m">{t.department_label}{t.room_label ? ` · ${t.room_label}` : ""}{t.assigned_name ? ` · ${t.assigned_name}` : t.assigned_label ? ` · ${t.assigned_label}` : ""}</div>
                </span>
                <span className="r">
                  <span className={"chip " + (t.overdue ? "CANCELLED" : t.status === "completed" || t.status === "verified" ? "CONFIRMED" : "PROVISIONAL")}>{t.status_label}</span>
                  {t.due_at && <span>{when(t.due_at)}</span>}
                </span>
              </button>
            ))}
          </div>

          <form className="house-panel" style={{ marginTop: 16 }} onSubmit={async e => {
            e.preventDefault();
            try {
              const created = await api<Task>("/v1/ops/tasks", {
                method: "POST",
                body: JSON.stringify({
                  ...form,
                  due_at: form.due_at || null,
                  expected_minutes: form.expected_minutes || null,
                  assigned_staff_id: form.assigned_staff_id || null,
                }),
              });
              setForm(emptyForm);
              say("Task opened");
              setSel(created.id);
              load();
            } catch (e2) { say(e2 instanceof ApiError ? e2.problem.detail : "Could not open the task"); }
          }}>
            <div className="k">New task</div>
            <h2>Add work</h2>
            <div className="ops-form">
              <input required value={form.title} onChange={e => setForm({ ...form, title: e.target.value })} placeholder="What needs doing" />
              <div className="frow">
                <select value={form.department} onChange={e => setForm({ ...form, department: e.target.value })}>
                  {board.departments.map(d => <option key={d.code} value={d.code}>{d.label}</option>)}
                </select>
                <select value={form.priority} onChange={e => setForm({ ...form, priority: e.target.value })}>
                  {board.priorities.map(p => <option key={p.code} value={p.code}>{p.label}</option>)}
                </select>
              </div>
              <div className="frow">
                <input type="datetime-local" value={form.due_at} onChange={e => setForm({ ...form, due_at: e.target.value })} />
                <input value={form.room_label} onChange={e => setForm({ ...form, room_label: e.target.value })} placeholder="Room" />
              </div>
              <div className="frow">
                <input value={form.guest_name} onChange={e => setForm({ ...form, guest_name: e.target.value })} placeholder="Guest" />
                <input value={form.location_label} onChange={e => setForm({ ...form, location_label: e.target.value })} placeholder="Location" />
              </div>
              <div className="frow">
                <select value={form.assigned_staff_id} onChange={e => setForm({ ...form, assigned_staff_id: e.target.value })}>
                  <option value="">Assign later</option>
                  {people.map(p => <option key={p.id} value={p.id}>{p.name}</option>)}
                </select>
                <input value={form.assigned_label} onChange={e => setForm({ ...form, assigned_label: e.target.value })} placeholder="Team or name" />
              </div>
              <textarea rows={2} value={form.notes} onChange={e => setForm({ ...form, notes: e.target.value })} placeholder="Notes" />
              <button className="btn primary" type="submit">Open task</button>
            </div>
          </form>
        </div>

        <div className="detail">
          {!detail && <p className="m">Choose a task, or open a new one.</p>}
          {detail && (
            <>
              <header>
                <div>
                  <div className="k">{detail.department_label}</div>
                  <h2>{detail.title}</h2>
                  <p className="m" style={{ marginTop: 6 }}>
                    {detail.created_by_name ? `Opened by ${detail.created_by_name}` : "Opened"}
                    {detail.assigned_name ? ` · ${detail.assigned_name}` : detail.assigned_label ? ` · ${detail.assigned_label}` : ""}
                    {detail.room_label ? ` · ${detail.room_label}` : ""}
                    {detail.guest_name ? ` · ${detail.guest_name}` : ""}
                  </p>
                </div>
                <span className={"chip " + (detail.overdue ? "CANCELLED" : "CONFIRMED")}>{detail.status_label}</span>
              </header>
              {detail.notes && <p style={{ whiteSpace: "pre-wrap" }}>{detail.notes}</p>}
              <div className="facts">
                <div><span>Priority</span><b>{detail.priority_label}</b></div>
                <div><span>Due</span><b>{detail.due_at ? when(detail.due_at) : "—"}</b></div>
                <div><span>Time</span><b>{detail.actual_minutes != null ? `${detail.actual_minutes} min` : "—"}{detail.expected_minutes ? ` / ${detail.expected_minutes}` : ""}</b></div>
              </div>
              {(detail.location_label || detail.asset_label || detail.event_label || detail.sop_slug) && (
                <p className="m">
                  {[detail.location_label, detail.asset_label, detail.event_label, detail.sop_slug && `SOP ${detail.sop_slug}`].filter(Boolean).join(" · ")}
                </p>
              )}
              <div className="actions" style={{ flexWrap: "wrap", gap: 8 }}>
                {detail.next.map(a => (
                  <button key={a.status} className="btn primary" onClick={() => move(detail.id, a.status)}>{a.label}</button>
                ))}
                {board.can_approve && detail.status === "completed" && (
                  <button className="btn" onClick={() => api(`/v1/ops/tasks/${detail.id}/verify`, { method: "POST", body: JSON.stringify({}) }).then(() => { say("Verified"); load(); loadOne(detail.id); }).catch(e => say(e instanceof ApiError ? e.problem.detail : "Could not verify"))}>Verify</button>
                )}
                {board.can_approve && ["completed", "verified", "cancelled"].includes(detail.status) && (
                  <button className="btn" onClick={() => api(`/v1/ops/tasks/${detail.id}/reopen`, { method: "POST", body: JSON.stringify({}) }).then(() => { say("Reopened"); load(); loadOne(detail.id); }).catch(e => say(e instanceof ApiError ? e.problem.detail : "Could not reopen"))}>Reopen</button>
                )}
                {board.can_approve && !["completed", "verified", "cancelled"].includes(detail.status) && (
                  <button className="btn danger" onClick={() => move(detail.id, "cancelled")}>Cancel</button>
                )}
              </div>

              {detail.children.length > 0 && (
                <div style={{ marginTop: 18 }}>
                  <div className="k">Subtasks</div>
                  {detail.children.map(c => (
                    <button key={c.id} className="ops-line" style={{ width: "100%", background: "transparent", borderLeft: 0, borderRight: 0, textAlign: "left", cursor: "pointer" }} onClick={() => setSel(c.id)}>
                      <b>{c.status_label}</b>
                      <span>{c.title}</span>
                    </button>
                  ))}
                </div>
              )}
              <form className="ops-form" onSubmit={async e => {
                e.preventDefault();
                if (!sub.trim()) return;
                try {
                  await api("/v1/ops/tasks", { method: "POST", body: JSON.stringify({ title: sub, department: detail.department, parent_id: detail.id }) });
                  setSub("");
                  say("Subtask added");
                  load();
                  loadOne(detail.id);
                } catch (e2) { say(e2 instanceof ApiError ? e2.problem.detail : "Could not add"); }
              }}>
                <input value={sub} onChange={e => setSub(e.target.value)} placeholder="Add a subtask" />
              </form>

              <form className="ops-form" onSubmit={async e => {
                e.preventDefault();
                try {
                  await api(`/v1/ops/tasks/${detail.id}/comment`, { method: "POST", body: JSON.stringify({ body: comment }) });
                  setComment("");
                  loadOne(detail.id);
                } catch (e2) { say(e2 instanceof ApiError ? e2.problem.detail : "Could not comment"); }
              }}>
                <textarea required rows={2} value={comment} onChange={e => setComment(e.target.value)} placeholder="Comment — this is kept even if the task is edited" />
                <button className="btn" type="submit">Add comment</button>
              </form>

              <label className="btn" style={{ marginTop: 8, display: "inline-block" }}>
                Add photo
                <input type="file" accept="image/*" hidden onChange={async e => {
                  const file = e.target.files?.[0];
                  if (!file) return;
                  const reader = new FileReader();
                  reader.onload = async () => {
                    try {
                      await api(`/v1/ops/tasks/${detail.id}/attachment`, { method: "POST", body: JSON.stringify({ kind: "photo", data: String(reader.result) }) });
                      say("Photo added");
                      loadOne(detail.id);
                    } catch (err) { say(err instanceof ApiError ? err.problem.detail : "Could not attach"); }
                  };
                  reader.readAsDataURL(file);
                }} />
              </label>

              <div style={{ marginTop: 22 }}>
                <div className="k">History</div>
                {(detail.events ?? []).length === 0 && <p className="m">No events yet.</p>}
                {(detail.events ?? []).map(ev => (
                  <div key={ev.id} className="ops-card">
                    <div className="ops-card-top">
                      <b>{ev.kind === "status" ? `${ev.from_status ?? "—"} → ${ev.to_status}` : ev.kind}</b>
                      <span className="m">{ev.actor_name} · {when(ev.created_at)}</span>
                    </div>
                    {ev.kind === "field" && <p className="m">{ev.field_name}: {ev.previous_value || "—"} → {ev.new_value || "—"}</p>}
                    {ev.kind === "comment" && <p style={{ whiteSpace: "pre-wrap" }}>{ev.body}</p>}
                    {ev.kind === "attachment" && ev.body.startsWith("data:image/") && <img src={ev.body} alt="" style={{ maxWidth: "100%", marginTop: 8 }} />}
                    {ev.body && ev.kind !== "comment" && ev.kind !== "field" && !ev.body.startsWith("data:") && <p>{ev.body}</p>}
                  </div>
                ))}
              </div>
            </>
          )}
        </div>
      </div>
      {toast && <div className="toast">{toast}</div>}
    </>
  );
}
