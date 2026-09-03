"use client";
import { useEffect, useState } from "react";
import { api, ApiError } from "@/lib/api";
import { useStore } from "@/lib/store";
type U = { id: string; email: string; name: string; status: string; role: string | null; role_name: string | null; department: string | null; last_sign_in: string | null };
type Ref = { code: string; name: string };

export default function Users() {
  const { user } = useStore();
  const [items, setItems] = useState<U[]>([]); const [roles, setRoles] = useState<Ref[]>([]); const [depts, setDepts] = useState<Ref[]>([]);
  const [add, setAdd] = useState({ email: "", name: "", role: "RECEPTIONIST", department: "" }); const [toast, setToast] = useState<string | null>(null); const [busy, setBusy] = useState(false);
  const say = (t: string) => { setToast(t); setTimeout(() => setToast(null), 3500); };
  const load = () => api<{ items: U[]; roles: Ref[]; departments: Ref[] }>("/v1/users").then(r => { setItems(r.items); setRoles(r.roles); setDepts(r.departments); }).catch(e => say(e instanceof ApiError ? e.problem.detail : "Could not load"));
  useEffect(() => { load(); }, []);
  const run = async (fn: () => Promise<unknown>, ok: string) => { setBusy(true); try { await fn(); say(ok); await load(); } catch (e) { say(e instanceof ApiError ? e.problem.detail : "Something went wrong"); } finally { setBusy(false); } };
  const active = items.filter(u => u.status === "ACTIVE"), gone = items.filter(u => u.status !== "ACTIVE");

  const Row = ({ u }: { u: U }) => (
    <div className="urow">
      <div><div className="t">{u.name}{u.email === user?.email ? <span className="m"> · you</span> : null}</div><div className="m">{u.email}{u.last_sign_in ? ` · last signed in ${new Date(u.last_sign_in).toLocaleDateString("en-GB")}` : " · never signed in"}</div></div>
      <select className="btn" value={u.role ?? ""} disabled={busy || u.status !== "ACTIVE"} onChange={e => run(() => api(`/v1/users/${u.id}`, { method: "PATCH", body: JSON.stringify({ role: e.target.value, department: u.department ?? undefined }) }), `${u.name} is now ${roles.find(r => r.code === e.target.value)?.name}`)}>
        {roles.map(r => <option key={r.code} value={r.code}>{r.name}</option>)}</select>
      {u.status === "ACTIVE"
        ? <button className="btn danger" disabled={busy || u.email === user?.email} onClick={() => { if (confirm(`Remove access for ${u.name}? They will be signed out.`)) run(() => api(`/v1/users/${u.id}`, { method: "PATCH", body: JSON.stringify({ status: "LEFT" }) }), `${u.name} no longer has access`); }}>Remove access</button>
        : <button className="btn" disabled={busy} onClick={() => run(() => api(`/v1/users/${u.id}`, { method: "PATCH", body: JSON.stringify({ status: "ACTIVE" }) }), `${u.name} can sign in again`)}>Restore</button>}
    </div>);

  return (
    <>
      <div className="topbar"><div><h1>Staff of the house</h1><p>Who may enter, and as what. Email must match their Microsoft account when that is connected.</p></div></div>
      <div className="panel">
        <h3>Add a person</h3>
        <div className="frow" style={{ flexWrap: "wrap", gap: 8 }}>
          <input placeholder="name@thevedanta.org" value={add.email} onChange={e => setAdd({ ...add, email: e.target.value })} style={{ flex: 2, minWidth: 200 }} />
          <input placeholder="Display name" value={add.name} onChange={e => setAdd({ ...add, name: e.target.value })} style={{ flex: 1, minWidth: 140 }} />
          <select className="btn" value={add.role} onChange={e => setAdd({ ...add, role: e.target.value })}>{roles.map(r => <option key={r.code} value={r.code}>{r.name}</option>)}</select>
          <select className="btn" value={add.department} onChange={e => setAdd({ ...add, department: e.target.value })}><option value="">Department…</option>{depts.map(d => <option key={d.code} value={d.code}>{d.name}</option>)}</select>
          <button className="btn primary" disabled={busy || !add.email.includes("@") || !add.name} onClick={() => run(() => api("/v1/users", { method: "POST", body: JSON.stringify({ ...add, department: add.department || undefined }) }), `Added ${add.name}`).then(() => setAdd({ email: "", name: "", role: "RECEPTIONIST", department: "" }))}>Add</button>
        </div>
      </div>
      <div className="list" style={{ marginTop: 14 }}>{active.map(u => <Row key={u.id} u={u} />)}</div>
      {gone.length > 0 && <><h3 style={{ margin: "18px 0 8px", color: "var(--ink-2)" }}>No longer have access</h3><div className="list">{gone.map(u => <Row key={u.id} u={u} />)}</div></>}
      {toast && <div className="toast">{toast}</div>}
    </>
  );
}
