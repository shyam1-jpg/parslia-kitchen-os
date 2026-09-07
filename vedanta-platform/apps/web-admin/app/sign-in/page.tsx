"use client";
import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { api, API } from "@/lib/api";
import { useStore } from "@/lib/store";
type U = { email: string; name: string; role: string };
type Prop = { name: string; kicker: string; tagline: string; website: string; company: string };
export default function SignIn() {
  const { signIn, signInWithToken, user } = useStore(); const router = useRouter();
  const [users, setUsers] = useState<U[]>([]); const [email, setEmail] = useState("shyam_1@hotmail.co.uk"); const [err, setErr] = useState<string | null>(null); const [busy, setBusy] = useState(false);
  const [providers, setProviders] = useState<{ microsoft: boolean; dev: boolean; email: boolean } | null>(null);
  const [prop, setProp] = useState<Prop>({ name: "The Vedanta Way", kicker: "Retreat Center", tagline: "A beautiful grade II-listed luxury retreat centre.", website: "https://www.thevedanta.org/", company: "The Vedanta Way Ltd" });
  useEffect(() => {
    api<Prop>("/guest/property").then(p => setProp({ name: p.name, kicker: p.kicker, tagline: p.tagline ?? prop.tagline, website: p.website, company: p.company })).catch(() => {});
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
          <div className="arrive-kicker">{prop.kicker}</div>
          <h1>{prop.name}</h1>
          <p className="lede">{prop.tagline}</p>
        </div>
        <div className="foot"><a href={prop.website}>{prop.website.replace(/^https?:\/\//, "")}</a><br />{prop.company}</div>
      </section>
      <section className="arrive-panel">
        <div className="arrive-card">
          <h2>Arrive</h2>
          <div className="rule" />
          {providers?.email && (<>
            <p>There is no password. Your email opens the house.</p>
            <input type="email" autoComplete="email" placeholder="shyam_1@hotmail.co.uk" value={email} onChange={e => setEmail(e.target.value)} onKeyDown={e => e.key === "Enter" && go(email)} />
            <button className="btn primary" disabled={!email || busy} onClick={() => go(email)}>{busy ? "Opening…" : "Enter"}</button>
          </>)}
          {providers?.dev && (<>
            <p style={{ marginTop: 28 }}>Development — choose a member of the house:</p>
            <div className="users">{users.map(u => <button key={u.email} className="btn" disabled={busy} onClick={() => go(u.email)}><b>{u.name}</b><span>{u.role.replace(/_/g, " ").toLowerCase()}</span></button>)}</div>
          </>)}
          {providers?.microsoft && !providers.email && (<>
            <p>Use your Vedanta Microsoft 365 account.</p>
            <a className="btn primary ms" href={`${API}/auth/microsoft`}><svg width="18" height="18" viewBox="0 0 21 21" aria-hidden="true"><rect x="1" y="1" width="9" height="9" fill="#f25022"/><rect x="11" y="1" width="9" height="9" fill="#7fba00"/><rect x="1" y="11" width="9" height="9" fill="#00a4ef"/><rect x="11" y="11" width="9" height="9" fill="#ffb900"/></svg>Sign in with Microsoft</a>
          </>)}
          {providers && !providers.microsoft && !providers.dev && !providers.email && <div className="note">No sign-in method is configured.</div>}
          {err && <div className="note" style={{ marginTop: 14 }}>{err}</div>}
          <p className="m" style={{ marginTop: 28 }}>Guests book at <a href="/book/">/book</a>. Staff use <a href="/pocket/">/pocket</a>.</p>
        </div>
      </section>
    </div>
  );
}
