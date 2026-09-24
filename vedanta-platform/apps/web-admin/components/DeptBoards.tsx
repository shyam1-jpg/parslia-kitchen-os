"use client";
import { useEffect, useState } from "react";
import { api, ApiError } from "@/lib/api";

const LABELS: Record<string, string> = {
  FRONT: "Front of house",
  NIGHT: "Night porter",
  HK: "Housekeeping",
  RESTAURANT: "Restaurant",
  KITCHEN: "Kitchen",
  MAINT: "Maintenance",
  GROUNDS: "Estate and grounds",
};

type Photo = { id: string; caption: string; image_data: string };
type Board = { department: string; about: string; photos: Photo[] };

export default function DeptBoards() {
  const [items, setItems] = useState<Board[]>([]);
  const [dept, setDept] = useState("FRONT");
  const [about, setAbout] = useState("");
  const [caption, setCaption] = useState("");
  const [toast, setToast] = useState<string | null>(null);
  const say = (t: string) => { setToast(t); setTimeout(() => setToast(null), 3000); };
  const load = () => api<{ items: Board[] }>("/v1/service/boards").then(r => {
    setItems(r.items);
    const cur = r.items.find(i => i.department === dept);
    if (cur) setAbout(cur.about);
  }).catch(e => say(e instanceof ApiError ? e.problem.detail : "Could not open the boards"));
  useEffect(() => { load(); }, []); // eslint-disable-line
  const board = items.find(i => i.department === dept);
  useEffect(() => { if (board) setAbout(board.about); }, [dept, board?.about]); // eslint-disable-line

  const addPhoto = async (file: File) => {
    if (file.size > 500_000) { say("Use a smaller picture (under 500 KB)"); return; }
    const image_data = await new Promise<string>((resolve, reject) => {
      const r = new FileReader();
      r.onload = () => resolve(String(r.result));
      r.onerror = () => reject(new Error("Could not read"));
      r.readAsDataURL(file);
    });
    try {
      await api(`/v1/service/boards/${dept}/photos`, { method: "POST", body: JSON.stringify({ caption, image_data }) });
      setCaption("");
      say("Photograph saved");
      load();
    } catch (e) { say(e instanceof ApiError ? e.problem.detail : "Could not save picture"); }
  };

  return (
    <>
      <div className="topbar">
        <div>
          <h1>Department boards</h1>
          <p>Where things live — notes and photographs for housekeeping, front of house, night porter, restaurant and kitchen. A new starter should be able to find the cupboard from the picture. How to act is in the <a href="/manual/">house manual</a>.</p>
        </div>
      </div>
      <div className="seg" style={{ marginBottom: 16 }}>
        {Object.entries(LABELS).map(([code, label]) => (
          <button key={code} className={dept === code ? "on" : ""} onClick={() => setDept(code)}>{label}</button>
        ))}
      </div>
      <div className="house-grid">
        <section className="house-panel">
          <div className="k">{LABELS[dept]}</div>
          <h2>How this room works</h2>
          <textarea rows={10} value={about} onChange={e => setAbout(e.target.value)} style={{ width: "100%", marginTop: 8 }} />
          <div className="actions" style={{ border: 0 }}>
            <button className="btn primary" onClick={async () => {
              try { await api(`/v1/service/boards/${dept}`, { method: "PATCH", body: JSON.stringify({ about }) }); say("Notes saved"); load(); }
              catch (e) { say(e instanceof ApiError ? e.problem.detail : "Could not save"); }
            }}>Save notes</button>
          </div>
        </section>
        <section className="house-panel">
          <div className="k">Photographs</div>
          <h2>Show where things are</h2>
          <p className="m" style={{ color: "var(--ink-2)" }}>Cupboards, machines, racks, the tea tray. Keep pictures small.</p>
          <div className="photo-grid">
            {(board?.photos ?? []).map(p => (
              <figure key={p.id} className="photo-card">
                <img src={p.image_data} alt={p.caption || "Department photograph"} />
                <figcaption>
                  {p.caption || "—"}
                  <button className="linkbtn" onClick={async () => { await api(`/v1/service/photos/${p.id}`, { method: "DELETE" }); load(); }}>Remove</button>
                </figcaption>
              </figure>
            ))}
          </div>
          {(board?.photos ?? []).length === 0 && <p className="m" style={{ color: "var(--ink-2)" }}>No photographs yet.</p>}
          <form className="ops-form" onSubmit={e => e.preventDefault()}>
            <input value={caption} onChange={e => setCaption(e.target.value)} placeholder="Caption — e.g. Coffee machines, welcome sideboard" />
            <input type="file" accept="image/*" onChange={e => { const f = e.target.files?.[0]; if (f) addPhoto(f); e.target.value = ""; }} />
          </form>
        </section>
      </div>
      {toast && <div className="toast">{toast}</div>}
    </>
  );
}
