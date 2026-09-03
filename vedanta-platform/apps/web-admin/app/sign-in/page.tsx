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
    // Returning from Microsoft: the API puts the session token in the URL fragment (never in the query string or logs).
    const m = window.location.hash.match(/token=([^&]+)/);
    if (m) { history.replaceState(null, "", window.location.pathname); signInWithToken(m[1]).catch(() => setErr("Sign-in did not complete. Try again.")); return; }
    const e = new URLSearchParams(window.location.search).get("error"); if (e) setErr(e);
    api<{ microsoft: boolean; dev: boolean; email?: boolean }>("/auth/providers").then(p => {
      const next = { microsoft: !!p.microsoft, dev: !!p.dev, email: p.email ?? !!p.dev };
      setProviders(next);
      if (next.dev) api<{ items: U[] }>("/auth/users").then(r => setUsers(r.items)).catch(() => {});
    }).catch(() => setErr("Cannot reach the API."));
  }, [signInWithToken]);
  useEffect(() => { if (user) router.replace("/groups/"); }, [user, router]);
  const go = async (e: string) => { setBusy(true); setErr(null); try { await signIn(e); } catch { setErr("No active user with that email."); } finally { setBusy(false); } };
  return (
    <div className="signin">
      <h1>Sign in</h1>
      {providers?.microsoft && (<>
        <p>Use your Vedanta Microsoft 365 account.</p>
        <a className="btn primary ms" href={`${API}/auth/microsoft`}><svg width="18" height="18" viewBox="0 0 21 21" aria-hidden="true"><rect x="1" y="1" width="9" height="9" fill="#f25022"/><rect x="11" y="1" width="9" height="9" fill="#7fba00"/><rect x="1" y="11" width="9" height="9" fill="#00a4ef"/><rect x="11" y="11" width="9" height="9" fill="#ffb900"/></svg>Sign in with Microsoft</a>
      </>)}
      {providers?.dev && (<>
        <p style={{ marginTop: providers.microsoft ? 28 : 0 }}>{providers.microsoft ? "Development only — pick a user:" : "Development sign-in: pick a user. In production staff sign in with Microsoft 365."}</p>
        <div className="users">{users.map(u => <button key={u.email} className="btn" disabled={busy} onClick={() => go(u.email)}><b>{u.name}</b><span>{u.role.replace(/_/g, " ").toLowerCase()}</span></button>)}</div>
      </>)}
      {providers?.email && (<>
        <p style={{ marginTop: providers.microsoft || providers.dev ? 28 : 0 }}>{providers.dev ? "Or type an email:" : "Type your staff email. First sign-in is shyam_1@hotmail.co.uk — no password for this trial."}</p>
        <div className="frow" style={{ maxWidth: 420, marginTop: 18 }}><input type="email" autoComplete="username" placeholder="shyam_1@hotmail.co.uk" value={email} onChange={e => setEmail(e.target.value)} onKeyDown={e => e.key === "Enter" && go(email)} /><button className="btn primary" disabled={!email || busy} onClick={() => go(email)}>Sign in</button></div>
      </>)}
      {providers && !providers.microsoft && !providers.dev && !providers.email && <div className="note">No sign-in method is configured. Set ALLOW_EMAIL_LOGIN=true on the API for the trial, or the MS_* variables for Microsoft 365.</div>}
      {err && <div className="note" style={{ marginTop: 14 }}>{err}</div>}
    </div>
  );
}
