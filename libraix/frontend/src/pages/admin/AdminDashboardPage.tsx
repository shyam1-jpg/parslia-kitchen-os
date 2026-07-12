import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { Logo } from "../../components/Layout";
import { useAdminAuth } from "../../lib/adminAuth";
import { adminApi } from "../../lib/adminApi";

type Tab = "overview" | "users" | "config" | "audit" | "security";

export function AdminDashboardPage() {
  const { admin, logout } = useAdminAuth();
  const [tab, setTab] = useState<Tab>("overview");
  const [stats, setStats] = useState<Record<string, unknown> | null>(null);
  const [users, setUsers] = useState<Array<Record<string, unknown>>>([]);
  const [config, setConfig] = useState<Record<string, unknown> | null>(null);
  const [logs, setLogs] = useState<Array<Record<string, unknown>>>([]);
  const [msg, setMsg] = useState("");
  const [qr, setQr] = useState("");

  const load = () => {
    adminApi.dashboard().then(setStats).catch(console.error);
    adminApi.users().then((d) => setUsers(d.users)).catch(console.error);
    adminApi.config().then(setConfig).catch(console.error);
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

  const userStats = stats?.users as Record<string, unknown> | undefined;
  const finance = stats?.finance as Record<string, number> | undefined;
  const usage = stats?.usage as Record<string, Record<string, number>> | undefined;

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
        {(["overview", "users", "config", "audit", "security"] as Tab[]).map((t) => (
          <button key={t} className={`admin-tab ${tab === t ? "active" : ""}`} onClick={() => setTab(t)}>
            {t.charAt(0).toUpperCase() + t.slice(1)}
          </button>
        ))}
        <Link to="/app" className="admin-tab-link">Customer workspace →</Link>
      </nav>

      {msg && <div className="info-banner admin-msg">{msg}</div>}

      <main className="admin-main">
        {tab === "overview" && stats && (
          <div className="admin-grid">
            <div className="admin-stat-card"><h3>Total users</h3><p>{userStats?.total as number}</p></div>
            <div className="admin-stat-card"><h3>Active today</h3><p>{userStats?.activeToday as number}</p></div>
            <div className="admin-stat-card"><h3>New this week</h3><p>{userStats?.newWeek as number}</p></div>
            <div className="admin-stat-card"><h3>Suspended</h3><p>{userStats?.suspended as number}</p></div>
            <div className="admin-stat-card"><h3>Free / Pro / Enterprise</h3>
              <p>{JSON.stringify(userStats?.byPlan ?? {})}</p>
            </div>
            <div className="admin-stat-card"><h3>Messages today</h3><p>{usage?.today?.messages ?? 0}</p></div>
            <div className="admin-stat-card"><h3>Tokens today</h3><p>{usage?.today?.tokens ?? 0}</p></div>
            <div className="admin-stat-card"><h3>AI cost today (pence)</h3><p>{usage?.today?.cost_cents ?? 0}</p></div>
            <div className="admin-stat-card"><h3>Est. monthly revenue (pence)</h3><p>{finance?.estimatedMonthlyRevenueCents ?? 0}</p></div>
            <div className="admin-stat-card"><h3>Est. monthly AI cost (pence)</h3><p>{finance?.estimatedMonthlyAiCostCents ?? 0}</p></div>
            <div className="admin-stat-card"><h3>Est. profit (pence)</h3><p>{finance?.estimatedProfitCents ?? 0}</p></div>
          </div>
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
                      <button className="btn btn-ghost btn-sm" onClick={() => adminApi.updateUser(u.id as string, { plan: "free" }).then(load)}>Set Free</button>
                      {admin?.role === "super_admin" && u.role !== "super_admin" && (
                        <button className="btn btn-ghost btn-sm" style={{ color: "var(--danger)" }} onClick={() => { if (confirm("Delete user?")) adminApi.deleteUser(u.id as string).then(load); }}>Delete</button>
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
              <h2>Plan limits (no code deploy required)</h2>
              {(["free", "pro", "enterprise"] as const).map((plan) => {
                const plans = config.plans as Record<string, { dailyMessages: number; premiumModelMessages: number; images: number }>;
                const p = plans[plan];
                return (
                  <div key={plan} className="admin-config-block">
                    <h3>{plan}</h3>
                    <label>Daily messages <input type="number" className="input" value={p.dailyMessages} onChange={(e) => setConfig({ ...config, plans: { ...plans, [plan]: { ...p, dailyMessages: Number(e.target.value) } } })} /></label>
                    <label>Premium messages <input type="number" className="input" value={p.premiumModelMessages} onChange={(e) => setConfig({ ...config, plans: { ...plans, [plan]: { ...p, premiumModelMessages: Number(e.target.value) } } })} /></label>
                    <label>Images <input type="number" className="input" value={p.images} onChange={(e) => setConfig({ ...config, plans: { ...plans, [plan]: { ...p, images: Number(e.target.value) } } })} /></label>
                  </div>
                );
              })}
              <button className="btn btn-primary btn-sm" onClick={savePlanLimits}>Save plan limits</button>
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
                {qr && <img src={qr} alt="2FA QR code" style={{ maxWidth: 200, marginTop: 16 }} />}
              </>
            )}
            <h2 style={{ marginTop: 32 }}>Recovery</h2>
            <p>If locked out, run <code>npm run seed:owner</code> on the server with <code>OWNER_EMAIL</code> and <code>OWNER_INITIAL_PASSWORD</code> to reset the Super Admin password.</p>
          </div>
        )}
      </main>
    </div>
  );
}
