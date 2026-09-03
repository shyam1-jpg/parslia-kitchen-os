"use client";
import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { api, API } from "@/lib/api";
import { useStore } from "@/lib/store";
type U = { email: string; name: string; role: string };
export default function SignIn() {
  const { signIn, signInWithToken, user } = useStore(); const router = useRouter();
  const [users, setUsers] = useState<U[]>([]); const [email, setEmail] = useState(""); const [err, setErr] = useState<string | null>(null); const [busy, setBusy] = useState(false);
  const [providers, setProviders] = useState<{ microsoft: boolean; dev: boolean; email: boolean } | null>(null);
  useEffect(() => {
    const m = window.location.hash.match(/token=([^&]+)/);
    if (m) { history.replaceState(null, "", window.location.pathname); signInWithToken(m[1]).catch(() => setErr("Sign-in did not complete. Try again.")); return; }
    const e = new URLSearchParams(window.location.search).get("error"); if (e) setErr(e);
    api<{ microsoft: boolean; dev: boolean; email?: boolean }>("/auth/providers").then(p => {
      const next = { microsoft: !!p.microsoft, dev: !!p.dev, email: p.email ?? !!p.dev };
      setProviders(next);
      if (next.dev) api<{ items: U[] }>("/auth/users").then(r => setUsers(r.items)).catch(() => {});
    }).catch(() => setErr("Cannot reach the house. Try again in a moment."));
  }, [signInWithToken]);
  useEffect(() => { if (user) router.replace("/house/"); }, [user, router]);
  const go = async (e: string) => { setBusy(true); setErr(null); try { await signIn(e); } catch { setErr("No one on the staff list has that email."); } finally { setBusy(false); } };
  return (
    <div className="arrive">
      <section className="arrive-hero">
        <div>
          <div className="arrive-kicker">The Vedanta Way</div>
          <h1>Retreat<br />Center</h1>
          <p className="lede">Luxury Holistic</p>
        </div>
        <div className="foot">The Vedanta Way Ltd</div>
      </section>
      <section className="arrive-panel">
        <div className="arrive-card">
          <h2>Arrive</h2>
          <div className="rule" />
          {providers?.microsoft && (<>
            <p>Use your Vedanta Microsoft 365 account.</p>
            <a className="btn primary ms" href={`${API}/auth/microsoft`}><svg width="18" height="18" viewBox="0 0 21 21" aria-hidden="true"><rect x="1" y="1" width="9" height="9" fill="#f25022"/><rect x="11" y="1" width="9" height="9" fill="#7fba00"/><rect x="1" y="11" width="9" height="9" fill="#00a4ef"/><rect x="11" y="11" width="9" height="9" fill="#ffb900"/></svg>Sign in with Microsoft</a>
          </>)}
          {providers?.dev && (<>
            <p style={{ marginTop: providers.microsoft ? 28 : 0 }}>Development — choose a member of the house:</p>
            <div className="users">{users.map(u => <button key={u.email} className="btn" disabled={busy} onClick={() => go(u.email)}><b>{u.name}</b><span>{u.role.replace(/_/g, " ").toLowerCase()}</span></button>)}</div>
          </>)}
          {providers?.email && (<>
            <p style={{ marginTop: providers.microsoft || providers.dev ? 28 : 0 }}>{providers.dev ? "Or enter your email." : "Staff email. First key: shyam_1@hotmail.co.uk"}</p>
            <div className="frow" style={{ marginTop: 18 }}><input type="email" autoComplete="username" placeholder="shyam_1@hotmail.co.uk" value={email} onChange={e => setEmail(e.target.value)} onKeyDown={e => e.key === "Enter" && go(email)} /><button className="btn primary" disabled={!email || busy} onClick={() => go(email)}>{busy ? "Opening…" : "Enter"}</button></div>
          </>)}
          {providers && !providers.microsoft && !providers.dev && !providers.email && <div className="note">No sign-in method is configured.</div>}
          {err && <div className="note" style={{ marginTop: 14 }}>{err}</div>}
        </div>
      </section>
    </div>
  );
}
