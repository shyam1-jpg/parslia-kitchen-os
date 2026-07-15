import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { Logo } from "../../components/Layout";
import { useAdminAuth } from "../../lib/adminAuth";
import { adminApi } from "../../lib/adminApi";

type Tab = "overview" | "users" | "config" | "support" | "privacy" | "audit" | "security";

const FLAG_STATES = ["disabled", "internal", "beta", "enabled"] as const;

export function AdminDashboardPage() {
  const { admin, logout } = useAdminAuth();
  const [tab, setTab] = useState<Tab>("overview");
  const [stats, setStats] = useState<Record<string, unknown> | null>(null);
  const [users, setUsers] = useState<Array<Record<string, unknown>>>([]);
  const [config, setConfig] = useState<Record<string, unknown> | null>(null);
  const [logs, setLogs] = useState<Array<Record<string, unknown>>>([]);
  const [support, setSupport] = useState<Array<Record<string, unknown>>>([]);
  const [privacy, setPrivacy] = useState<Array<Record<string, unknown>>>([]);
  const [msg, setMsg] = useState("");
  const [qr, setQr] = useState("");
  const [totpCode, setTotpCode] = useState("");

  const load = () => {
    adminApi.dashboard().then(setStats).catch(console.error);
    adminApi.users().then((d) => setUsers(d.users)).catch(console.error);
    adminApi.config().then(setConfig).catch(console.error);
    adminApi.supportRequests().then((d) => setSupport(d.requests)).catch(console.error);
    adminApi.privacyRequests().then((d) => setPrivacy(d.requests)).catch(console.error);
    if (admin?.role === "super_admin") {
      adminApi.auditLogs().then((d) => setLogs(d.logs)).catch(console.error);
    }
  };

  useEffect(() => { load(); }, [admin?.role]);

  const savePlanLimits = async () => {
    if (!config?.plans) return;
    await adminApi.updateConfig({ plans: config.plans });
    setMsg("Plan limits saved.");
    load();
  };

  const saveMaintenance = async () => {
    await adminApi.updateConfig({
      maintenance: config?.maintenance,
      announcement: config?.announcement,
    });
    setMsg("Site status updated.");
  };

  const savePricing = async () => {
    await adminApi.updateConfig({ pricing: config?.pricing });
    setMsg("Pricing saved.");
  };

  const saveModels = async () => {
    await adminApi.updateConfig({ models: config?.modelOverrides });
    setMsg("Model settings saved.");
  };

  const saveFlags = async () => {
    await adminApi.updateConfig({ feature_flags: config?.featureFlagOverrides });
    setMsg("Feature flags saved.");
  };

  const enable2fa = async () => {
    if (!totpCode) return;
    await adminApi.enable2fa(totpCode);
    setMsg("2FA enabled.");
    setQr("");
    setTotpCode("");
    window.location.reload();
  };

  const userStats = stats?.users as Record<string, unknown> | undefined;
  const finance = stats?.finance as Record<string, number> | undefined;
  const usage = stats?.usage as Record<string, Record<string, number>> | undefined;
  const providers = stats?.providers as Array<Record<string, unknown>> | undefined;
  const recentErrors = stats?.recentErrors as Array<Record<string, unknown>> | undefined;
  const catalogDefaults = config?.catalogDefaults as { models?: Array<Record<string, unknown>>; featureFlags?: Array<Record<string, unknown>> } | undefined;

  return (
    <div className="admin-shell">
      <header className="admin-topbar">
        <Logo to="/admin" />
        <div className="admin-topbar-meta">
          <span>{admin?.email}</span>
          <span className="badge badge-beta">{admin?.role}</span>
          <button className="btn btn-ghost btn-sm" onClick={() => logout().then(() => { window.location.href = "/admin/login"; })}>Sign out</button>
        </div>
      </header>

      <nav className="admin-tabs">
        {(["overview", "users", "config", "support", "privacy", "audit", "security"] as Tab[]).map((t) => (
          <button key={t} className={`admin-tab ${tab === t ? "active" : ""}`} onClick={() => setTab(t)}>
            {t.charAt(0).toUpperCase() + t.slice(1)}
          </button>
        ))}
        <Link to="/app" className="admin-tab-link">Customer workspace →</Link>
      </nav>

      {msg && <div className="info-banner admin-msg">{msg}</div>}

      <main className="admin-main">
        {tab === "overview" && stats && (
          <>
            <div className="admin-grid">
              <div className="admin-stat-card"><h3>Total users</h3><p>{userStats?.total as number}</p></div>
              <div className="admin-stat-card"><h3>Active today</h3><p>{userStats?.activeToday as number}</p></div>
              <div className="admin-stat-card"><h3>Active this week</h3><p>{userStats?.activeWeek as number}</p></div>
              <div className="admin-stat-card"><h3>New today</h3><p>{userStats?.newToday as number}</p></div>
              <div className="admin-stat-card"><h3>New this week</h3><p>{userStats?.newWeek as number}</p></div>
              <div className="admin-stat-card"><h3>Suspended</h3><p>{userStats?.suspended as number}</p></div>
              <div className="admin-stat-card"><h3>Free / Pro / Enterprise</h3><p>{JSON.stringify(userStats?.byPlan ?? {})}</p></div>
              <div className="admin-stat-card"><h3>Messages today</h3><p>{usage?.today?.messages ?? 0}</p></div>
              <div className="admin-stat-card"><h3>Tokens today</h3><p>{usage?.today?.tokens ?? 0}</p></div>
              <div className="admin-stat-card"><h3>AI cost today (pence)</h3><p>{usage?.today?.cost_cents ?? 0}</p></div>
              <div className="admin-stat-card"><h3>Est. monthly revenue (pence)</h3><p>{finance?.estimatedMonthlyRevenueCents ?? 0}</p></div>
              <div className="admin-stat-card"><h3>Est. monthly AI cost (pence)</h3><p>{finance?.estimatedMonthlyAiCostCents ?? 0}</p></div>
              <div className="admin-stat-card"><h3>Est. profit (pence)</h3><p>{finance?.estimatedProfitCents ?? 0}</p></div>
            </div>
            <section className="admin-config" style={{ marginTop: 32 }}>
              <h2>Provider status</h2>
              <ul>{providers?.map((p) => <li key={p.id as string}>{p.id as string}: {p.status as string}</li>)}</ul>
            </section>
            {recentErrors && recentErrors.length > 0 && (
              <section className="admin-config" style={{ marginTop: 24 }}>
                <h2>Recent system errors</h2>
                <div className="admin-table-wrap">
                  <table className="admin-table">
                    <thead><tr><th>Time</th><th>Source</th><th>Message</th></tr></thead>
                    <tbody>
                      {recentErrors.map((e) => (
                        <tr key={e.id as string}>
                          <td>{e.createdAt as string}</td>
                          <td>{e.source as string}</td>
                          <td>{e.message as string}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </section>
            )}
          </>
        )}

        {tab === "users" && (
          <div className="admin-table-wrap">
            <table className="admin-table">
              <thead>
                <tr><th>Email</th><th>Plan</th><th>Role</th><th>Status</th><th>Actions</th></tr>
              </thead>
              <tbody>
                {users.map((u) => (
                  <tr key={u.id as string}>
                    <td>{u.email as string}</td>
                    <td>{u.plan as string}</td>
                    <td>{u.role as string}</td>
                    <td>{u.suspended ? "Suspended" : "Active"}</td>
                    <td className="admin-actions">
                      <button className="btn btn-ghost btn-sm" onClick={() => adminApi.updateUser(u.id as string, { suspended: !u.suspended }).then(load)}>Toggle suspend</button>
                      <button className="btn btn-ghost btn-sm" onClick={() => adminApi.updateUser(u.id as string, { plan: "pro" }).then(load)}>Set Pro</button>
                      <button className="btn btn-ghost btn-sm" onClick={() => adminApi.updateUser(u.id as string, { plan: "enterprise" }).then(load)}>Set Enterprise</button>
                      <button className="btn btn-ghost btn-sm" onClick={() => adminApi.updateUser(u.id as string, { plan: "free" }).then(load)}>Set Free</button>
                      {admin?.role === "super_admin" && u.role !== "super_admin" && (
                        <button className="btn btn-ghost btn-sm" style={{ color: "var(--danger)" }} onClick={() => { if (confirm("Delete user permanently?")) adminApi.deleteUser(u.id as string).then(load); }}>Delete</button>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}

        {tab === "config" && config && (
          <div className="admin-config">
            <section>
              <h2>Display pricing (GBP)</h2>
              <p>Actual Stripe charges use your Stripe price IDs. Update display prices here without redeploying.</p>
              <label>Pro monthly (£)
                <input type="number" className="input" value={(config.pricing as { proMonthlyGbp: number }).proMonthlyGbp} onChange={(e) => setConfig({ ...config, pricing: { ...(config.pricing as object), proMonthlyGbp: Number(e.target.value) } })} />
              </label>
              <label>Enterprise monthly (£)
                <input type="number" className="input" value={(config.pricing as { enterpriseMonthlyGbp: number }).enterpriseMonthlyGbp} onChange={(e) => setConfig({ ...config, pricing: { ...(config.pricing as object), enterpriseMonthlyGbp: Number(e.target.value) } })} />
              </label>
              <button className="btn btn-primary btn-sm" onClick={savePricing}>Save pricing</button>
            </section>

            <section>
              <h2>Plan limits (no code deploy required)</h2>
              {(["free", "pro", "enterprise"] as const).map((plan) => {
                const plans = config.plans as Record<string, { dailyMessages: number; premiumModelMessages: number; images: number; liveVoiceMinutes?: number }>;
                const p = plans[plan];
                return (
                  <div key={plan} className="admin-config-block">
                    <h3>{plan}</h3>
                    <label>Daily messages <input type="number" className="input" value={p.dailyMessages} onChange={(e) => setConfig({ ...config, plans: { ...plans, [plan]: { ...p, dailyMessages: Number(e.target.value) } } })} /></label>
                    <label>Premium messages <input type="number" className="input" value={p.premiumModelMessages} onChange={(e) => setConfig({ ...config, plans: { ...plans, [plan]: { ...p, premiumModelMessages: Number(e.target.value) } } })} /></label>
                    <label>Images <input type="number" className="input" value={p.images} onChange={(e) => setConfig({ ...config, plans: { ...plans, [plan]: { ...p, images: Number(e.target.value) } } })} /></label>
                    <label>
                      Live Voice minutes/day (−1 = unlimited)
                      <input
                        type="number"
                        className="input"
                        value={p.liveVoiceMinutes ?? (plan === "free" ? 5 : -1)}
                        onChange={(e) =>
                          setConfig({
                            ...config,
                            plans: { ...plans, [plan]: { ...p, liveVoiceMinutes: Number(e.target.value) } },
                          })
                        }
                      />
                    </label>
                  </div>
                );
              })}
              <button className="btn btn-primary btn-sm" onClick={savePlanLimits}>Save plan limits</button>
            </section>

            <section>
              <h2>Model availability</h2>
              {catalogDefaults?.models?.map((m) => {
                const id = m.id as string;
                const overrides = (config.modelOverrides ?? {}) as Record<string, { enabled?: boolean; tier?: string }>;
                const o = overrides[id] ?? {};
                return (
                  <div key={id} className="admin-config-block">
                    <h3>{m.displayName as string} ({id})</h3>
                    <label><input type="checkbox" checked={o.enabled ?? (m.enabled as boolean)} onChange={(e) => setConfig({ ...config, modelOverrides: { ...overrides, [id]: { ...o, enabled: e.target.checked } } })} /> Enabled</label>
                    <label>Tier
                      <select className="input" value={o.tier ?? (m.tier as string)} onChange={(e) => setConfig({ ...config, modelOverrides: { ...overrides, [id]: { ...o, tier: e.target.value } } })}>
                        <option value="free">free</option>
                        <option value="pro">pro</option>
                        <option value="enterprise">enterprise</option>
                      </select>
                    </label>
                  </div>
                );
              })}
              <button className="btn btn-primary btn-sm" onClick={saveModels}>Save models</button>
            </section>

            <section>
              <h2>Feature flags</h2>
              {catalogDefaults?.featureFlags?.map((f) => {
                const id = f.id as string;
                const overrides = (config.featureFlagOverrides ?? {}) as Record<string, string>;
                return (
                  <div key={id} className="admin-config-block">
                    <h3>{f.name as string}</h3>
                    <select className="input" value={overrides[id] ?? (f.state as string)} onChange={(e) => setConfig({ ...config, featureFlagOverrides: { ...overrides, [id]: e.target.value } })}>
                      {FLAG_STATES.map((s) => <option key={s} value={s}>{s}</option>)}
                    </select>
                  </div>
                );
              })}
              <button className="btn btn-primary btn-sm" onClick={saveFlags}>Save feature flags</button>
            </section>

            <section>
              <h2>Site status</h2>
              <label><input type="checkbox" checked={(config.maintenance as { enabled: boolean }).enabled} onChange={(e) => setConfig({ ...config, maintenance: { ...(config.maintenance as object), enabled: e.target.checked, message: (config.maintenance as { message: string }).message } })} /> Maintenance mode</label>
              <textarea className="input" rows={2} placeholder="Maintenance message" value={(config.maintenance as { message: string }).message} onChange={(e) => setConfig({ ...config, maintenance: { ...(config.maintenance as object), message: e.target.value } })} />
              <label><input type="checkbox" checked={(config.announcement as { active: boolean }).active} onChange={(e) => setConfig({ ...config, announcement: { ...(config.announcement as object), active: e.target.checked } })} /> Show announcement banner</label>
              <textarea className="input" rows={2} placeholder="Announcement text" value={(config.announcement as { message: string }).message} onChange={(e) => setConfig({ ...config, announcement: { ...(config.announcement as object), message: e.target.value } })} />
              <button className="btn btn-primary btn-sm" onClick={saveMaintenance}>Save site status</button>
            </section>
          </div>
        )}

        {tab === "support" && (
          <div className="admin-table-wrap">
            <table className="admin-table">
              <thead><tr><th>Date</th><th>Email</th><th>Subject</th><th>Status</th><th>Actions</th></tr></thead>
              <tbody>
                {support.map((r) => (
                  <tr key={r.id as string}>
                    <td>{r.created_at as string}</td>
                    <td>{r.email as string}</td>
                    <td>{r.subject as string}</td>
                    <td>{r.status as string}</td>
                    <td>
                      <button className="btn btn-ghost btn-sm" onClick={() => adminApi.updateSupportRequest(r.id as string, "closed").then(load)}>Close</button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}

        {tab === "privacy" && (
          <div className="admin-table-wrap">
            <table className="admin-table">
              <thead><tr><th>Date</th><th>Email</th><th>Type</th><th>Status</th><th>Actions</th></tr></thead>
              <tbody>
                {privacy.map((r) => (
                  <tr key={r.id as string}>
                    <td>{r.created_at as string}</td>
                    <td>{r.email as string}</td>
                    <td>{r.request_type as string}</td>
                    <td>{r.status as string}</td>
                    <td>
                      <button className="btn btn-ghost btn-sm" onClick={() => adminApi.updatePrivacyRequest(r.id as string, "completed").then(load)}>Complete</button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}

        {tab === "audit" && admin?.role === "super_admin" && (
          <div className="admin-table-wrap">
            <table className="admin-table">
              <thead><tr><th>Time</th><th>Admin</th><th>Action</th><th>Target</th></tr></thead>
              <tbody>
                {logs.map((l) => (
                  <tr key={l.id as string}>
                    <td>{l.createdAt as string}</td>
                    <td>{l.adminEmail as string}</td>
                    <td>{l.action as string}</td>
                    <td>{l.target as string}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}

        {tab === "security" && (
          <div className="admin-config">
            <h2>Two-factor authentication</h2>
            <p>Protect your owner account with TOTP (Google Authenticator, Authy, etc.).</p>
            {admin?.totpEnabled ? (
              <p className="badge badge-live">2FA is enabled</p>
            ) : (
              <>
                <button className="btn btn-primary btn-sm" onClick={() => adminApi.setup2fa().then((d) => setQr(d.qrDataUrl))}>Set up 2FA</button>
                {qr && (
                  <>
                    <img src={qr} alt="2FA QR code" style={{ maxWidth: 200, marginTop: 16, display: "block" }} />
                    <label style={{ marginTop: 16, display: "block" }}>Enter code from app
                      <input className="input" inputMode="numeric" maxLength={6} value={totpCode} onChange={(e) => setTotpCode(e.target.value)} />
                    </label>
                    <button className="btn btn-primary btn-sm" style={{ marginTop: 8 }} onClick={enable2fa}>Enable 2FA</button>
                  </>
                )}
              </>
            )}
            <h2 style={{ marginTop: 32 }}>Recovery</h2>
            <p>If locked out, run <code>npm run seed:owner</code> on the Render shell with <code>OWNER_EMAIL</code> and <code>OWNER_INITIAL_PASSWORD</code> to reset the Super Admin password.</p>
            <h2 style={{ marginTop: 24 }}>Security notes</h2>
            <ul>
              <li>API keys are server-side only — never shown in the browser</li>
              <li>Super Admin accounts cannot be created via public signup</li>
              <li>All admin config changes are audit-logged</li>
            </ul>
          </div>
        )}
      </main>
    </div>
  );
}
