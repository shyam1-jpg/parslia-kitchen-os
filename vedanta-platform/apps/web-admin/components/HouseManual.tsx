"use client";
import { useEffect, useMemo, useState } from "react";
import { api, ApiError } from "@/lib/api";

type Step = { title: string; look: string; act: string; note?: string };
type Node = { title: string; caption: string };
type Chapter = {
  id: string; slug: string; department: string; department_label: string;
  kind: string; kind_label: string; title: string; summary: string; body: string;
  steps: Step[]; diagram: Node[]; status: string; sort_order: number;
};
type List = { items: Chapter[]; can_edit: boolean };

function slugFromSearch() {
  if (typeof window === "undefined") return "app-how-to-use";
  return new URLSearchParams(window.location.search).get("slug") || "app-how-to-use";
}

export default function HouseManual() {
  const [list, setList] = useState<List | null>(null);
  const [slug, setSlug] = useState(slugFromSearch);
  const [edit, setEdit] = useState(false);
  const [draft, setDraft] = useState({ title: "", summary: "", body: "" });
  const [toast, setToast] = useState<string | null>(null);
  const [showWithdrawn, setShowWithdrawn] = useState(false);
  const say = (t: string) => { setToast(t); setTimeout(() => setToast(null), 3200); };
  const load = () => api<List>(`/v1/manuals${showWithdrawn ? "?include=withdrawn" : ""}`).then(setList).catch(e => say(e instanceof ApiError ? e.problem.detail : "Could not open the manual"));
  useEffect(() => { load(); }, [showWithdrawn]); // eslint-disable-line
  const items = list?.items ?? [];
  const chapter = items.find(c => c.slug === slug) ?? items[0];
  const groups = useMemo(() => {
    const map = new Map<string, Chapter[]>();
    for (const c of items) {
      const key = c.department_label;
      map.set(key, [...(map.get(key) ?? []), c]);
    }
    return [...map.entries()];
  }, [items]);

  useEffect(() => {
    if (chapter) setDraft({ title: chapter.title, summary: chapter.summary, body: chapter.body });
  }, [chapter?.slug]); // eslint-disable-line

  const open = (s: string) => {
    setSlug(s);
    setEdit(false);
    if (typeof window !== "undefined") window.history.replaceState(null, "", `/manual/?slug=${s}`);
  };

  if (!list) return <div className="empty">Opening the house manual…</div>;
  if (!chapter) return <div className="empty">No chapters yet.</div>;

  return (
    <>
      <div className="topbar">
        <div>
          <h1>House manual</h1>
          <p>What it should look like, and how to act — for every department. Heads of department can change a chapter later, send it to the Pocket, or withdraw it from the floor.</p>
        </div>
        {list.can_edit && (
          <label className="m" style={{ display: "flex", gap: 8, alignItems: "center" }}>
            <input type="checkbox" checked={showWithdrawn} onChange={e => setShowWithdrawn(e.target.checked)} /> Show withdrawn
          </label>
        )}
      </div>

      <div className="manual-map">
        {groups.map(([label, chs]) => (
          <button key={label} className={"manual-dept" + (chs.some(c => c.slug === chapter.slug) ? " on" : "")} onClick={() => open(chs[0].slug)}>
            <b>{label}</b>
            <span>{chs.length} {chs.length === 1 ? "chapter" : "chapters"}</span>
          </button>
        ))}
      </div>

      <div className="house-grid manual-layout">
        <aside className="house-panel">
          <div className="k">Contents</div>
          <h2>Chapters</h2>
          {groups.map(([label, chs]) => (
            <div key={label} className="manual-toc">
              <div className="manual-toc-h">{label}</div>
              {chs.map(c => (
                <button key={c.slug} className={c.slug === chapter.slug ? "on" : ""} onClick={() => open(c.slug)}>
                  {c.title}
                  {c.status === "withdrawn" && <span className="chip">Withdrawn</span>}
                </button>
              ))}
            </div>
          ))}
        </aside>

        <article className="house-panel">
          <div className="k">{chapter.department_label} · {chapter.kind_label}</div>
          <h2>{chapter.title}</h2>
          {chapter.status === "withdrawn" && <p className="note">This chapter is withdrawn. The floor no longer sees it. Receipts already sent stay on the Pocket.</p>}

          {chapter.diagram.length > 0 && (
            <div className="manual-flow" aria-label="How this work moves">
              {chapter.diagram.map((n, i) => (
                <span key={n.title} className="manual-step">
                  {i > 0 && <span className="manual-arrow" aria-hidden>→</span>}
                  <span className="manual-node">
                    <strong>{n.title}</strong>
                    <em>{n.caption}</em>
                  </span>
                </span>
              ))}
            </div>
          )}

          {!edit && (
            <>
              <section className="look-act">
                <div>
                  <div className="k">What it should look like</div>
                  <p>{chapter.summary}</p>
                </div>
                <div>
                  <div className="k">How to act</div>
                  <p style={{ whiteSpace: "pre-wrap" }}>{chapter.body}</p>
                </div>
              </section>
              <div className="k" style={{ marginTop: 22 }}>The steps</div>
              {chapter.steps.map((s, i) => (
                <div key={s.title} className="look-step">
                  <header><span>{i + 1}</span><h3>{s.title}</h3></header>
                  <div className="look-act tight">
                    <div><div className="k">Look</div><p>{s.look}</p></div>
                    <div><div className="k">Act</div><p>{s.act}</p></div>
                  </div>
                  {s.note && <p className="m">{s.note}</p>}
                </div>
              ))}
            </>
          )}

          {edit && list.can_edit && (
            <form className="ops-form" onSubmit={async e => {
              e.preventDefault();
              try {
                await api(`/v1/manuals/${chapter.slug}`, { method: "PATCH", body: JSON.stringify(draft) });
                say("Chapter saved — the house now teaches this wording");
                setEdit(false);
                load();
              } catch (err) { say(err instanceof ApiError ? err.problem.detail : "Could not save"); }
            }}>
              <label>Title<input value={draft.title} onChange={e => setDraft({ ...draft, title: e.target.value })} /></label>
              <label>What it should look like<textarea rows={5} value={draft.summary} onChange={e => setDraft({ ...draft, summary: e.target.value })} /></label>
              <label>How to act<textarea rows={10} value={draft.body} onChange={e => setDraft({ ...draft, body: e.target.value })} /></label>
              <p className="m">Steps and the diagram stay as they are unless a developer changes the default chapter. Words above are yours.</p>
              <div className="actions" style={{ border: 0 }}>
                <button className="btn" type="button" onClick={() => setEdit(false)}>Cancel</button>
                <button className="btn primary" type="submit">Save the chapter</button>
              </div>
            </form>
          )}

          {list.can_edit && !edit && (
            <div className="actions" style={{ border: 0, paddingTop: 18 }}>
              <button className="btn" onClick={() => setEdit(true)}>Change the wording</button>
              <button className="btn" onClick={async () => {
                try {
                  const r = await api<{ sent: number }>(`/v1/manuals/${chapter.slug}/send`, { method: "POST", body: "{}" });
                  say(`Sent to ${r.sent} people on the Pocket — they mark it received`);
                } catch (err) { say(err instanceof ApiError ? err.problem.detail : "Could not send"); }
              }}>Send to the Pocket</button>
              <button className="btn" onClick={async () => {
                const next = chapter.status === "withdrawn" ? "live" : "withdrawn";
                try {
                  await api(`/v1/manuals/${chapter.slug}/withdraw`, { method: "POST", body: JSON.stringify({ status: next }) });
                  say(next === "withdrawn" ? "Withdrawn from the floor" : "Restored to the floor");
                  load();
                } catch (err) { say(err instanceof ApiError ? err.problem.detail : "Could not change"); }
              }}>{chapter.status === "withdrawn" ? "Restore" : "Withdraw"}</button>
            </div>
          )}
        </article>
      </div>
      {toast && <div className="toast">{toast}</div>}
    </>
  );
}
