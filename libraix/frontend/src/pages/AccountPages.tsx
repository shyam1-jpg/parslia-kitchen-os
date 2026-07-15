import { useEffect, useState } from "react";
import { Link, useNavigate, useSearchParams } from "react-router-dom";
import { PublicNav, Footer } from "../components/Layout";
import { COMPANY } from "../lib/company";
import { useAuth } from "../lib/auth";
import { authApi, billingApi } from "../lib/api";
import { advancedApi, type Memory } from "../lib/advanced";
import { friendlyError } from "../lib/errors";
import { useSpeechOutput, type VoiceOption } from "../lib/useSpeechOutput";
import { SPEECH_LANGUAGE_OPTIONS } from "../lib/language";
import { getStoredTheme, toggleTheme, type ThemeMode } from "../lib/theme";
import { workspaceApi, type AutomationItem, type ConnectorItem } from "../lib/workspaceApi";

export function AccountPage() {
  const { user, usage, logout, refresh } = useAuth();
  const navigate = useNavigate();
  const [params] = useSearchParams();
  const [notice, setNotice] = useState("");
  const [billingLoading, setBillingLoading] = useState(false);
  const [canManageBilling, setCanManageBilling] = useState(false);

  useEffect(() => {
    if (params.get("upgraded") === "1") {
      setNotice("Thanks — your Pro upgrade is processing. Refresh in a moment if your plan has not updated.");
      refresh().catch(() => {});
    }
    if (params.get("cancelled") === "1") {
      setNotice("Checkout cancelled. You can upgrade anytime from this page.");
    }
  }, [params, refresh]);

  useEffect(() => {
    billingApi.status().then((s) => setCanManageBilling(s.canManageBilling)).catch(() => {});
  }, [user?.plan]);

  const handleLogout = async () => {
    await logout();
    navigate("/");
  };

  const startCheckout = async () => {
    setBillingLoading(true);
    try {
      const result = await billingApi.checkout("pro");
      if (result.url) window.location.href = result.url;
      else setNotice(result.message ?? "Checkout is not configured yet. Email hello@libraix.ai.");
    } catch (e) {
      setNotice(friendlyError(e instanceof Error ? e.message : "CHECKOUT_FAILED", "Checkout failed"));
    } finally {
      setBillingLoading(false);
    }
  };

  const openPortal = async () => {
    setBillingLoading(true);
    try {
      const result = await billingApi.portal();
      if (result.url) window.location.href = result.url;
    } catch (e) {
      setNotice(friendlyError(e instanceof Error ? e.message : "PORTAL_FAILED", "Could not open billing portal"));
    } finally {
      setBillingLoading(false);
    }
  };

  return (
    <div className="page-container">
      <PublicNav />
      <section className="section">
        <div className="section-label">Account</div>
        <h1 className="section-title">Your account</h1>

        {notice && <div className="info-banner" style={{ maxWidth: 640, marginBottom: 24 }}>{notice}</div>}

        <div className="account-grid">
          <div className="account-card">
            <h3>Email</h3>
            <div className="value" style={{ fontSize: 16 }}>{user?.email}</div>
          </div>
          <div className="account-card">
            <h3>Plan</h3>
            <div className="value" style={{ textTransform: "capitalize" }}>{user?.plan}</div>
          </div>
          <div className="account-card">
            <h3>Messages today</h3>
            <div className="value">{usage?.messagesUsed ?? 0} / {usage?.messagesLimit ?? 0}</div>
          </div>
          <div className="account-card">
            <h3>Remaining</h3>
            <div className="value">{usage?.remainingMessages ?? 0}</div>
          </div>
        </div>

        <div style={{ marginTop: 40, display: "flex", gap: 12, flexWrap: "wrap" }}>
          <Link to="/app" className="btn btn-primary">Back to workspace</Link>
          {user?.plan === "free" ? (
            <button className="btn btn-ghost" disabled={billingLoading} onClick={startCheckout}>
              {billingLoading ? "Please wait…" : "Upgrade to Pro"}
            </button>
          ) : canManageBilling ? (
            <button className="btn btn-ghost" disabled={billingLoading} onClick={openPortal}>
              {billingLoading ? "Please wait…" : "Manage subscription"}
            </button>
          ) : (
            <Link to="/pricing" className="btn btn-ghost">View plans</Link>
          )}
          <button className="btn btn-ghost" onClick={handleLogout}>Sign out</button>
        </div>
      </section>
      <Footer />
    </div>
  );
}

export function SettingsPage() {
  const { user } = useAuth();
  const [memories, setMemories] = useState<Memory[]>([]);
  const [memoryEnabled, setMemoryEnabled] = useState(true);
  const [privacyMode, setPrivacyMode] = useState("standard");
  const [newMemory, setNewMemory] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(true);
  const [theme, setTheme] = useState<ThemeMode>(() => getStoredTheme());
  const [connectors, setConnectors] = useState<ConnectorItem[]>([]);
  const [automations, setAutomations] = useState<AutomationItem[]>([]);
  const [autoName, setAutoName] = useState("");
  const [autoPrompt, setAutoPrompt] = useState("");
  const tts = useSpeechOutput();

  useEffect(() => {
    Promise.all([
      advancedApi.memoryPreferences(),
      advancedApi.memories(),
    ])
      .then(([prefs, mems]) => {
        setMemoryEnabled(prefs.memoryEnabled);
        setPrivacyMode(prefs.privacyMode);
        setMemories(mems.memories);
      })
      .catch((e) => setError(friendlyError(e instanceof Error ? e.message : "Failed to load settings")))
      .finally(() => setLoading(false));

    workspaceApi.connectors().then((d) => setConnectors(d.connectors)).catch(() => {});
    workspaceApi.automations().then((d) => setAutomations(d.automations)).catch(() => {});
  }, []);

  const savePrefs = async (updates: { memoryEnabled?: boolean; privacyMode?: string }) => {
    try {
      const p = await advancedApi.updateMemoryPreferences(updates);
      setMemoryEnabled(p.memoryEnabled);
      setPrivacyMode(p.privacyMode);
      setError("");
    } catch (e) {
      setError(friendlyError(e instanceof Error ? e.message : "Could not save preferences"));
    }
  };

  const addMemory = async () => {
    if (!newMemory.trim()) return;
    try {
      const m = await advancedApi.createMemory("preference", newMemory.trim());
      setMemories((prev) => [m, ...prev]);
      setNewMemory("");
      setError("");
    } catch (e) {
      setError(friendlyError(e instanceof Error ? e.message : "Could not add memory"));
    }
  };

  return (
    <div className="page-container">
      <PublicNav />
      <section className="section" style={{ maxWidth: 640 }}>
        <div className="section-label">Settings</div>
        <h1 className="section-title">Preferences</h1>

        {error && <div className="error-banner" style={{ marginBottom: 16 }}>{error}</div>}
        {!user?.emailVerified && (
          <div className="info-banner" style={{ marginBottom: 16 }}>
            Your email is not verified.{" "}
            <button type="button" className="btn btn-ghost btn-sm" onClick={() => authApi.resendVerification().then(() => setError("Verification email sent.")).catch(() => setError("Could not send verification email."))}>
              Resend verification email
            </button>
          </div>
        )}
        {loading && <p style={{ color: "var(--muted)", marginBottom: 16 }}>Loading settings…</p>}

        <div className="settings-group">
          <h2>Profile</h2>
          <div className="settings-row">
            <span>Display name</span>
            <span style={{ color: "var(--muted)" }}>{user?.displayName ?? "Not set"}</span>
          </div>
          <div className="settings-row">
            <span>Email</span>
            <span style={{ color: "var(--muted)" }}>{user?.email}</span>
          </div>
        </div>

        <div className="settings-group">
          <h2>Appearance</h2>
          <div className="settings-row">
            <span>Theme</span>
            <button
              type="button"
              className="btn btn-ghost btn-sm"
              onClick={() => setTheme(toggleTheme())}
            >
              {theme === "light" ? "☀ Light" : "☾ Dark"} — tap to switch
            </button>
          </div>
          <p style={{ fontSize: 13, color: "var(--dim)" }}>
            Tip: on your phone, use the browser Share / Add to Home Screen for the Libraix PWA app icon.
          </p>
        </div>

        <div className="settings-group">
          <h2>Privacy mode</h2>
          <div className="settings-row">
            <span>Mode</span>
            <select className="model-select" value={privacyMode} onChange={(e) => savePrefs({ privacyMode: e.target.value })}>
              <option value="standard">Standard — history retained per policy</option>
              <option value="temporary">Temporary — limited retention</option>
              <option value="business">Business — org-controlled</option>
            </select>
          </div>
        </div>

        <div className="settings-group">
          <h2>Voice</h2>
          <p style={{ fontSize: 13, color: "var(--dim)", marginBottom: 12 }}>
            AI voice works in many languages — speak Hindi, Tamil, Spanish, etc. and Libraix answers in the same language. OpenAI TTS reads the reply naturally in that language.
          </p>
          <div className="settings-row" style={{ flexWrap: "wrap", gap: 8, marginBottom: 10 }}>
            <span>Reply language</span>
            <select
              className="model-select"
              defaultValue={(() => {
                try {
                  return localStorage.getItem("libraix_reply_lang") || "auto";
                } catch {
                  return "auto";
                }
              })()}
              onChange={(e) => {
                try {
                  localStorage.setItem("libraix_reply_lang", e.target.value);
                } catch { /* ignore */ }
              }}
            >
              <option value="auto">Auto-detect from your message</option>
              {SPEECH_LANGUAGE_OPTIONS.map((o) => (
                <option key={o.code} value={o.code}>{o.name}</option>
              ))}
            </select>
          </div>
          {tts.voices.length > 0 && (
            <div className="settings-row" style={{ flexWrap: "wrap", gap: 8 }}>
              <span>Voice style</span>
              <select
                className="model-select"
                value={tts.voice}
                onChange={(e) => tts.saveVoice(e.target.value as VoiceOption["id"])}
              >
                {tts.voices.map((v) => (
                  <option key={v.id} value={v.id}>{v.label} — {v.description}</option>
                ))}
              </select>
            </div>
          )}
          <div style={{ marginTop: 10 }}>
            <button
              className="btn btn-ghost btn-sm"
              disabled={tts.loading || tts.speaking}
              onClick={() => tts.speaking || tts.loading
                ? tts.stop()
                : tts.speak("Hello! Namaste! Vanakkam! This is how I sound in different languages.")}
            >
              {tts.loading ? "⏳ Loading…" : tts.speaking ? "■ Stop preview" : "🔊 Preview voice"}
            </button>
          </div>
        </div>

        <div className="settings-group">
          <h2>Memory</h2>
          <div className="settings-row">
            <span>Enable memory</span>
            <button className="btn btn-ghost btn-sm" onClick={() => savePrefs({ memoryEnabled: !memoryEnabled })}>
              {memoryEnabled ? "On" : "Off"}
            </button>
          </div>
          <p style={{ fontSize: 13, color: "var(--dim)", marginBottom: 12 }}>
            When Memory is On, Libraix learns useful facts from your chats (name, preferences, notes you ask it to remember) and uses them in future replies. Temporary privacy mode stops learning. You can see, edit, and delete everything remembered.
          </p>
          <div style={{ display: "flex", gap: 8, marginBottom: 16 }}>
            <input className="input" placeholder="Add a memory…" value={newMemory} onChange={(e) => setNewMemory(e.target.value)} />
            <button className="btn btn-primary btn-sm" onClick={addMemory}>Add</button>
          </div>
          {memories.map((m) => (
            <div key={m.id} className="settings-row">
              <span style={{ color: "var(--muted)", fontSize: 13 }}>
                {m.category?.startsWith("auto:") ? (
                  <span style={{ opacity: 0.7, marginRight: 6 }}>Learned ·</span>
                ) : null}
                {m.content}
              </span>
              <button className="btn btn-ghost btn-sm" onClick={() => advancedApi.deleteMemory(m.id).then(() => setMemories((p) => p.filter((x) => x.id !== m.id)))}>Delete</button>
            </div>
          ))}
          {memories.length > 0 && (
            <button className="btn btn-ghost btn-sm" style={{ marginTop: 8 }} onClick={() => advancedApi.deleteAllMemories().then(() => setMemories([]))}>
              Delete all memories
            </button>
          )}
        </div>

        <div className="settings-group">
          <h2>Connectors</h2>
          <p style={{ fontSize: 13, color: "var(--dim)", marginBottom: 12 }}>
            Connect Google Drive, Gmail, Calendar, or GitHub for Agent mode tools. Full live sync needs OAuth keys; pending connections still expose drafting/search tools.
          </p>
          {connectors.map((c) => (
            <div key={c.id} className="settings-row">
              <span>
                {c.name}
                <span style={{ color: "var(--dim)", fontSize: 12, marginLeft: 8 }}>{c.status}</span>
                {c.tools?.length ? (
                  <span style={{ color: "var(--dim)", fontSize: 11, marginLeft: 8 }}>{c.tools.join(", ")}</span>
                ) : null}
              </span>
              {c.status === "disconnected" ? (
                <button
                  type="button"
                  className="btn btn-ghost btn-sm"
                  onClick={async () => {
                    try {
                      const r = await workspaceApi.connect(c.id);
                      setConnectors((prev) => prev.map((x) => (x.id === c.id ? r.connector : x)));
                      if (r.hint) setError(r.hint);
                    } catch (e) {
                      setError(friendlyError(e instanceof Error ? e.message : "", "Could not connect"));
                    }
                  }}
                >
                  Connect
                </button>
              ) : (
                <button
                  type="button"
                  className="btn btn-ghost btn-sm"
                  onClick={async () => {
                    const r = await workspaceApi.disconnect(c.id);
                    setConnectors((prev) => prev.map((x) => (x.id === c.id ? r.connector : x)));
                  }}
                >
                  Disconnect
                </button>
              )}
            </div>
          ))}
        </div>

        <div className="settings-group">
          <h2>Automations</h2>
          <p style={{ fontSize: 13, color: "var(--dim)", marginBottom: 12 }}>
            Scheduled prompts run when you open chat (daily / weekdays / weekly).
          </p>
          <div style={{ display: "grid", gap: 8, marginBottom: 12 }}>
            <input className="input" placeholder="Name (e.g. Morning brief)" value={autoName} onChange={(e) => setAutoName(e.target.value)} />
            <input className="input" placeholder="Prompt to run…" value={autoPrompt} onChange={(e) => setAutoPrompt(e.target.value)} />
            <button
              className="btn btn-primary btn-sm"
              disabled={!autoName.trim() || !autoPrompt.trim()}
              onClick={async () => {
                try {
                  const a = await workspaceApi.createAutomation({
                    name: autoName.trim(),
                    prompt: autoPrompt.trim(),
                    schedule: "daily",
                  });
                  setAutomations((prev) => [a, ...prev]);
                  setAutoName("");
                  setAutoPrompt("");
                } catch (e) {
                  setError(friendlyError(e instanceof Error ? e.message : "", "Could not create automation"));
                }
              }}
            >
              Add daily automation
            </button>
          </div>
          {automations.map((a) => (
            <div key={a.id} className="settings-row">
              <span style={{ fontSize: 13 }}>
                {a.enabled ? "●" : "○"} {a.name} · {a.schedule}
              </span>
              <button
                type="button"
                className="btn btn-ghost btn-sm"
                onClick={() => workspaceApi.deleteAutomation(a.id).then(() => setAutomations((p) => p.filter((x) => x.id !== a.id)))}
              >
                Delete
              </button>
            </div>
          ))}
        </div>

        <div className="settings-group">
          <h2>Data & account</h2>
          <div className="settings-row">
            <span>Export active chat</span>
            <button className="btn btn-ghost btn-sm" disabled title="Open a conversation in the workspace first">
              From workspace
            </button>
          </div>
          <div className="settings-row">
            <span>Delete account & all data</span>
            <button
              className="btn btn-ghost btn-sm"
              style={{ color: "var(--danger)" }}
              onClick={async () => {
                if (!confirm("Delete your Libraix account and all conversations permanently?")) return;
                await authApi.deleteAccount();
                window.location.href = "/";
              }}
            >
              Delete account
            </button>
          </div>
        </div>

        <div className="settings-group">
          <h2>Security</h2>
          <p style={{ fontSize: 13, color: "var(--dim)", marginBottom: 12 }}>
            Libraix routes all AI requests through secure server-side providers. You never enter or store OpenAI or other provider API keys in the browser.
          </p>
          <div className="settings-row">
            <span>Two-factor authentication</span>
            <button className="btn btn-ghost btn-sm" disabled>Coming soon</button>
          </div>
        </div>

        <Link to="/app" className="btn btn-primary" style={{ marginTop: 24 }}>Back to workspace</Link>
      </section>
      <Footer />
    </div>
  );
}

export function PrivacyPage() {
  return (
    <div className="page-container">
      <PublicNav />
      <article className="legal-page">
        <h1>Privacy Policy</h1>
        <p>Last updated: July 2026</p>

        <h2>Data controller</h2>
        <p>
          <strong>{COMPANY.tradingName}</strong> ({COMPANY.legalName})<br />
          {COMPANY.fullAddress}<br />
          Privacy contact: <a href={`mailto:${COMPANY.privacyEmail}`}>{COMPANY.privacyEmail}</a>
        </p>

        <h2>What we collect</h2>
        <ul>
          <li><strong>Account data:</strong> email, display name, password hash, plan tier.</li>
          <li><strong>Workspace data:</strong> conversations, messages, memory entries you save, usage counters.</li>
          <li><strong>Technical data:</strong> session cookies, IP-derived logs for security and rate limiting.</li>
        </ul>

        <h2>Why we process data</h2>
        <ul>
          <li>Provide the Libraix AI workspace and enforce plan limits.</li>
          <li>Authenticate users and maintain sessions.</li>
          <li>Improve reliability and prevent abuse.</li>
        </ul>

        <h2>Who receives data</h2>
        <p>
          Depending on the model or mode you select, your prompt and relevant conversation context may be transmitted to the applicable AI provider to generate a response. We do not sell personal data.
        </p>
        <p>
          Current subprocessors include OpenAI (chat), Stripe (payments), Netlify and Render (hosting). See our <Link to="/subprocessors">Subprocessor List</Link>.
        </p>

        <h2>Retention</h2>
        <p>
          Account and conversation data is retained while your account is active. You may delete memories in Settings
          or request full account deletion. Backups may persist for up to 30 days after deletion.
        </p>

        <h2>Cookies</h2>
        <p>
          Libraix uses essential session cookies (`connect.sid`) to keep you signed in. No advertising cookies are used.
        </p>

        <h2>Your rights (UK/EU GDPR)</h2>
        <p>
          You may request access, correction, export, or deletion of your data by emailing {COMPANY.privacyEmail}.
          You may lodge a complaint with the UK Information Commissioner&apos;s Office (ICO) at ico.org.uk.
        </p>

        <h2>AI limitations</h2>
        <p>
          AI responses may be inaccurate. Do not rely on Libraix for legal, medical, or financial decisions without independent verification.
          Provider terms may apply to generated content.
        </p>

        <h2>Training</h2>
        <p>
          Libraix does not use your workspace content to train Libraix models. Third-party AI providers apply their own
          API data policies — review OpenAI&apos;s business/API terms for current retention and training settings.
        </p>
      </article>
      <Footer />
    </div>
  );
}

export function TermsPage() {
  return (
    <div className="page-container">
      <PublicNav />
      <article className="legal-page">
        <h1>Terms of Service</h1>
        <p>Last updated: July 2026</p>
        <h2>Service</h2>
        <p>Libraix provides access to AI models and tools subject to your subscription plan and fair-use limits.</p>
        <h2>Acceptable use</h2>
        <p>You may not use Libraix for illegal activity, abuse, or attempts to circumvent usage limits or security controls.</p>
        <h2>Subscriptions</h2>
        <p>Paid plans renew monthly unless cancelled. Access continues until the end of the billing period after cancellation.</p>
        <h2>Provider disclosure</h2>
        <p>Libraix routes requests to third-party AI providers including OpenAI. Provider terms apply to generated content where relevant.</p>
      </article>
      <Footer />
    </div>
  );
}
