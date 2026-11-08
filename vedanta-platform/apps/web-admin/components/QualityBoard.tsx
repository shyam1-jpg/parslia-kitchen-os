"use client";
import { useEffect, useState } from "react";
import Link from "next/link";
import { api, ApiError } from "@/lib/api";
import { useStore } from "@/lib/store";

const HOUSE_LINKS: { href: string; label: string }[] = [
  { href: "/house/", label: "Today" },
  { href: "/groups/", label: "Bookings" },
  { href: "/rooms/", label: "Room board" },
  { href: "/ops/", label: "House log" },
  { href: "/tasks/", label: "Tasks" },
  { href: "/front/", label: "Front desk" },
  { href: "/night/", label: "Night porter" },
  { href: "/service/", label: "Department boards" },
  { href: "/manual/", label: "Manual" },
  { href: "/housekeeping/", label: "Housekeeping" },
  { href: "/maintenance/", label: "Maintenance" },
  { href: "/kitchen/", label: "Kitchen" },
  { href: "/guests/", label: "Guests" },
  { href: "/staff-corner/", label: "Staff corner" },
  { href: "/payroll/", label: "Payroll" },
  { href: "/users/", label: "Names & positions" },
  { href: "/review/", label: "Imported bookings" },
  { href: "/quality/", label: "Data quality" },
  { href: "/reports/", label: "Reports" },
  { href: "/settings/", label: "Settings" },
  { href: "/book/", label: "My Stay / Guest Portal" },
  { href: "/pocket/", label: "Pocket" },
  { href: "/sign-in/", label: "House sign-in" },
];

type Finding = {
  code: string;
  title: string;
  detail: string;
  computed_status: string;
  house_status: string | null;
  status: string;
  note: string;
  decided_by: string | null;
  decided_at: string | null;
  evidence: Record<string, unknown>;
  lines?: string[];
  links: { href: string; label: string }[];
};
type Report = {
  generated_at: string;
  inventory: { configured: number; actual: number; guest: number; staff: number; numbers: string[] };
  import: { groups: number; assumed_departures: number; occupancy: number; unlinked_placements: number; skipped_progress_md: number; skipped_dry_run: number };
  packages: { count: number };
  items: Finding[];
};

const STATUSES = ["VERIFIED", "NEEDS_REVIEW", "SOURCE_CONFLICT", "MISSING"] as const;
const CHIP: Record<string, string> = {
  VERIFIED: "CONFIRMED",
  NEEDS_REVIEW: "PROVISIONAL",
  SOURCE_CONFLICT: "CANCELLED",
  MISSING: "ENQUIRY",
};
function label(s: string) {
  if (s === "VERIFIED") return "Verified";
  if (s === "NEEDS_REVIEW") return "Needs review";
  if (s === "SOURCE_CONFLICT") return "Source conflict";
  if (s === "MISSING") return "Missing";
  return s;
}

export default function QualityBoard() {
  const { can } = useStore();
  const [report, setReport] = useState<Report | null>(null);
  const [toast, setToast] = useState<string | null>(null);
  const [draft, setDraft] = useState<Record<string, { status: string; note: string }>>({});
  const [busy, setBusy] = useState<string | null>(null);
  const say = (t: string) => { setToast(t); setTimeout(() => setToast(null), 4000); };
  const load = () => api<Report>("/v1/quality").then(setReport).catch(e => say(e instanceof ApiError ? e.problem.detail : "Could not load data quality"));
  useEffect(() => { load(); }, []);

  const save = async (code: string) => {
    const d = draft[code]; if (!d) return;
    setBusy(code);
    try {
      await api(`/v1/quality/${code}`, { method: "PATCH", body: JSON.stringify({ status: d.status, note: d.note }) });
      say("House note saved. Import rows were not changed.");
      setDraft(s => { const n = { ...s }; delete n[code]; return n; });
      await load();
    } catch (e) { say(e instanceof ApiError ? e.problem.detail : "Could not save"); }
    finally { setBusy(null); }
  };

  if (!report) return <div className="empty">Opening data quality…</div>;
  const inv = report.inventory;
  const imp = report.import;

  return (
    <>
      <div className="topbar">
        <div>
          <h1>Data quality</h1>
          <p>
            Live counts from the house database. Nothing here invents a room, a departure date or a price.
            Source import text stays on the booking. Use Imported bookings to fix assumed departures.
          </p>
        </div>
        <div className="stats" style={{ margin: 0 }}>
          <div><b>{inv.actual}</b>rooms imported</div>
          <div><b>{inv.configured}</b>stated in config</div>
          <div><b>{imp.assumed_departures}</b>assumed departures</div>
          <div><b>{imp.unlinked_placements}</b>unlinked half-days</div>
        </div>
      </div>

      <section className="house-panel" style={{ marginBottom: 16 }}>
        <div className="k">House pages</div>
        <h2>Every working link</h2>
        <p className="m" style={{ color: "var(--ink-2)", marginBottom: 10 }}>
          My Stay / Guest Portal at /book/ lists published programmes only — open a booking and use Publish on /book.
          Guests can still search dates and rooms without an account. Pocket is /pocket/. The public root / opens the guest portal, not the house.
        </p>
        <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
          {HOUSE_LINKS.map(l => <Link key={l.href} className="btn" href={l.href}>{l.label}</Link>)}
        </div>
      </section>

      <section className="house-panel" style={{ marginBottom: 16 }}>
        <div className="k">Live inventory</div>
        <h2>What is in the database now</h2>
        <p>
          {inv.actual} rooms ({inv.guest} guest, {inv.staff} staff). Configured total is {inv.configured}.
          Numbers: {inv.numbers.join(", ") || "none"}.
          Bookings: {imp.groups}. Occupancy half-days: {imp.occupancy}.
          Packages: {report.packages.count}. Documented skipped rows: {imp.skipped_progress_md} in PROGRESS.md vs {imp.skipped_dry_run} in the dry-run note.
        </p>
      </section>

      {report.items.map(item => {
        const d = draft[item.code] ?? { status: item.status, note: item.note };
        return (
          <section key={item.code} className="house-panel" style={{ marginBottom: 16 }}>
            <div className="ops-card-top">
              <div>
                <div className="k">{item.code.replace(/_/g, " ")}</div>
                <h2>{item.title}</h2>
              </div>
              <span className={"chip " + (CHIP[item.computed_status] ?? "PROVISIONAL")}>{label(item.computed_status)}</span>
            </div>
            <p>{item.detail}</p>
            <p className="m" style={{ color: "var(--ink-2)" }}>
              Live data: {label(item.computed_status)}.
              {item.house_status
                ? ` House note: ${label(item.house_status)}${item.decided_by ? ` · ${item.decided_by}` : ""}${item.note ? ` — ${item.note}` : ""}.`
                : " House has not marked this yet."}
            </p>
            <ul className="m" style={{ color: "var(--ink-2)", marginTop: 8, paddingLeft: 18 }}>
              {(item.lines ?? []).map(line => <li key={line}>{line}</li>)}
            </ul>
            <div style={{ display: "flex", gap: 8, flexWrap: "wrap", marginTop: 10 }}>
              {item.links.map(l => <Link key={l.href} className="btn" href={l.href}>{l.label}</Link>)}
            </div>
            {can("group.update") && (
              <div className="fgrid" style={{ marginTop: 14 }}>
                <label>House status
                  <select value={d.status} onChange={e => setDraft(s => ({ ...s, [item.code]: { ...d, status: e.target.value } }))}>
                    {STATUSES.map(st => <option key={st} value={st}>{label(st)}</option>)}
                  </select>
                </label>
                <label className="span2">Note (does not change import rows)
                  <input value={d.note} onChange={e => setDraft(s => ({ ...s, [item.code]: { ...d, note: e.target.value } }))} placeholder="e.g. House confirmed 42 rooms is the 2026 inventory" />
                </label>
                <div>
                  <button className="btn primary" disabled={busy === item.code || (d.status === item.status && d.note === item.note)} onClick={() => save(item.code)}>Save house note</button>
                </div>
              </div>
            )}
          </section>
        );
      })}
      {toast && <div className="toast">{toast}</div>}
    </>
  );
}
