import { useState } from "react";
import { Link } from "react-router-dom";
import { PublicNav, Footer } from "../components/Layout";
import { useAuth } from "../lib/auth";

export function SupportPage() {
  const { user } = useAuth();
  const [email, setEmail] = useState(user?.email ?? "");
  const [subject, setSubject] = useState("");
  const [body, setBody] = useState("");
  const [requestType, setRequestType] = useState<"export" | "deletion" | "correction" | "other">("other");
  const [tab, setTab] = useState<"support" | "privacy">("support");
  const [msg, setMsg] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  const submitSupport = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    setLoading(true);
    try {
      const res = await fetch("/api/support", {
        method: "POST",
        credentials: "include",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email, subject, body }),
      });
      if (!res.ok) throw new Error("Failed to submit");
      setMsg("Your support request was sent. We will reply by email.");
      setSubject("");
      setBody("");
    } catch {
      setError("Could not send your request. Please email hello@libraix.ai directly.");
    } finally {
      setLoading(false);
    }
  };

  const submitPrivacy = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    setLoading(true);
    try {
      const res = await fetch("/api/privacy-request", {
        method: "POST",
        credentials: "include",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email, requestType, details: body }),
      });
      if (!res.ok) throw new Error("Failed to submit");
      setMsg("Your privacy request was received. We will confirm by email within 30 days.");
      setBody("");
    } catch {
      setError("Could not submit. Email privacy@libraix.ai directly.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="page-shell">
      <PublicNav />
      <main className="legal-page support-page">
        <h1>Help &amp; support</h1>
        <p>Contact Libraix support or submit a privacy request (GDPR).</p>

        <div className="admin-tabs" style={{ marginBottom: 24 }}>
          <button className={`admin-tab ${tab === "support" ? "active" : ""}`} onClick={() => { setTab("support"); setMsg(""); setError(""); }}>Support</button>
          <button className={`admin-tab ${tab === "privacy" ? "active" : ""}`} onClick={() => { setTab("privacy"); setMsg(""); setError(""); }}>Privacy request</button>
        </div>

        {msg && <div className="info-banner">{msg}</div>}
        {error && <div className="error-banner">{error}</div>}

        {tab === "support" ? (
          <form onSubmit={submitSupport} className="auth-form">
            <label>Email<input type="email" className="input" required value={email} onChange={(e) => setEmail(e.target.value)} /></label>
            <label>Subject<input className="input" required value={subject} onChange={(e) => setSubject(e.target.value)} /></label>
            <label>Message<textarea className="input" rows={6} required value={body} onChange={(e) => setBody(e.target.value)} /></label>
            <button type="submit" className="btn btn-primary" disabled={loading}>{loading ? "Sending…" : "Send support request"}</button>
          </form>
        ) : (
          <form onSubmit={submitPrivacy} className="auth-form">
            <label>Email<input type="email" className="input" required value={email} onChange={(e) => setEmail(e.target.value)} /></label>
            <label>Request type
              <select className="input" value={requestType} onChange={(e) => setRequestType(e.target.value as typeof requestType)}>
                <option value="export">Data export</option>
                <option value="deletion">Account / data deletion</option>
                <option value="correction">Data correction</option>
                <option value="other">Other privacy enquiry</option>
              </select>
            </label>
            <label>Details<textarea className="input" rows={6} value={body} onChange={(e) => setBody(e.target.value)} placeholder="Optional details" /></label>
            <button type="submit" className="btn btn-primary" disabled={loading}>{loading ? "Submitting…" : "Submit privacy request"}</button>
          </form>
        )}

        <p style={{ marginTop: 32 }}>
          <Link to="/">← Back to home</Link>
          {" · "}
          <Link to="/app/settings">Account settings</Link>
        </p>
      </main>
      <Footer />
    </div>
  );
}
