"use client";
import { useEffect, useState } from "react";
import { api, ApiError } from "@/lib/api";
export default function EmailDialog({ groupId, kind, onClose, onSent }: { groupId: string; kind: "form_link" | "confirmation"; onClose: () => void; onSent: (msg: string) => void }) {
  const [d, setD] = useState<{ to: string; subject: string; body: string; configured: boolean } | null>(null); const [err, setErr] = useState<string | null>(null); const [busy, setBusy] = useState(false);
  useEffect(() => { api<typeof d>(`/v1/groups/${groupId}/email/${kind}`, { method: "POST", body: "{}" }).then(r => setD(r ? { ...r, to: r.to ?? "" } : null)).catch(e => setErr(e instanceof ApiError ? e.problem.detail : "Could not draft")); }, [groupId, kind]);
  const send = async () => { if (!d) return; setBusy(true); try { const r = await api<{ status: string; error?: string }>(`/v1/groups/${groupId}/email/${kind}`, { method: "POST", body: JSON.stringify({ ...d, send: true }) });
    onSent(r.status === "SENT" ? `Sent to ${d.to}` : r.status === "LOGGED" ? `Saved to the email log (sending is not set up yet) — copy the text to Outlook` : `Failed: ${r.error}`); } catch (e) { setErr(e instanceof ApiError ? e.problem.detail : "Could not send"); } finally { setBusy(false); } };
  return (
    <div className="modal-backdrop" onClick={onClose}><div className="modal" onClick={e => e.stopPropagation()} role="dialog">
      <header><h2>{kind === "form_link" ? "Email the guest-list link" : "Email booking confirmation"}</h2><button className="btn" onClick={onClose}>✕</button></header>
      {err && <div className="note">{err}</div>}
      {d && (<>
        {!d.configured && <div className="note">Email sending isn&apos;t configured on the server yet (SMTP_URL). Sending will save a copy to the log; copy the text into Outlook meanwhile.</div>}
        <div className="fgrid">
          <label className="span2">To<input value={d.to} onChange={e => setD({ ...d, to: e.target.value })} placeholder="organiser@example.org" /></label>
          <label className="span2">Subject<input value={d.subject} onChange={e => setD({ ...d, subject: e.target.value })} /></label>
          <label className="span2">Message<textarea rows={14} value={d.body} onChange={e => setD({ ...d, body: e.target.value })} style={{ fontFamily: "var(--sans)" }} /></label>
        </div>
        <div className="actions"><button className="btn" onClick={onClose}>Cancel</button><button className="btn" onClick={() => navigator.clipboard?.writeText(`${d.subject}\n\n${d.body}`)}>Copy text</button><button className="btn primary" disabled={busy || !d.to.includes("@")} onClick={send}>{d.configured ? "Send" : "Save to log"}</button></div>
      </>)}
    </div></div>);
}
