import { useEffect, useState } from "react";
import { Link, useSearchParams } from "react-router-dom";
import { PublicNav, Footer } from "../components/Layout";
import { useAuth } from "../lib/auth";
import { catalogApi, type Catalog } from "../lib/api";

export function LoginPage() {
  const [params] = useSearchParams();
  const isSignup = params.get("mode") === "signup";
  const [mode, setMode] = useState<"login" | "signup">(isSignup ? "signup" : "login");
  const { login, signup } = useAuth();

  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [displayName, setDisplayName] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    setMode(isSignup ? "signup" : "login");
  }, [isSignup]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    setLoading(true);
    try {
      if (mode === "signup") {
        await signup(email, password, displayName || undefined);
      } else {
        await login(email, password);
      }
      window.location.href = "/app";
    } catch (err) {
      const msg = err instanceof Error ? err.message : "Something went wrong";
      const labels: Record<string, string> = {
        INVALID_CREDENTIALS: "Incorrect email or password.",
        EMAIL_EXISTS: "An account with this email already exists.",
        INVALID_INPUT: "Please check your input and try again.",
      };
      setError(labels[msg] ?? msg);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="page-container">
      <PublicNav />
      <div className="auth-page">
        <div className="auth-card">
          <h1>{mode === "signup" ? "Create your account" : "Welcome back"}</h1>
          <p>
            {mode === "signup"
              ? "One account for email, Google, Apple and Microsoft sign-in."
              : "Sign in to your Libraix workspace."}
          </p>

          {error && <div className="error-banner" style={{ marginBottom: 16 }}>{error}</div>}

          <form className="auth-form" onSubmit={handleSubmit}>
            {mode === "signup" && (
              <div>
                <label htmlFor="name">Display name</label>
                <input id="name" className="input" value={displayName} onChange={(e) => setDisplayName(e.target.value)} placeholder="Optional" />
              </div>
            )}
            <div>
              <label htmlFor="email">Email</label>
              <input id="email" type="email" className="input" required value={email} onChange={(e) => setEmail(e.target.value)} />
            </div>
            <div>
              <label htmlFor="password">Password</label>
              <input id="password" type="password" className="input" required minLength={8} value={password} onChange={(e) => setPassword(e.target.value)} />
            </div>
            <button type="submit" className="btn btn-primary" disabled={loading}>
              {loading ? "Please wait…" : mode === "signup" ? "Create account" : "Log in"}
            </button>
          </form>

          <p style={{ marginTop: 20, fontSize: 13, color: "var(--muted)", textAlign: "center" }}>
            {mode === "signup" ? "Already have an account?" : "Don't have an account?"}{" "}
            <button
              type="button"
              style={{ background: "none", border: "none", color: "var(--c1)", cursor: "pointer", fontWeight: 600 }}
              onClick={() => setMode(mode === "signup" ? "login" : "signup")}
            >
              {mode === "signup" ? "Log in" : "Sign up"}
            </button>
          </p>

          <div className="oauth-row">
            <p style={{ fontSize: 12, color: "var(--dim)", textAlign: "center" }}>Or continue with</p>
            <button type="button" className="oauth-btn" disabled title="Connect OAuth provider in production">
              Continue with Google
            </button>
            <button type="button" className="oauth-btn" disabled title="Connect OAuth provider in production">
              Continue with Apple
            </button>
            <button type="button" className="oauth-btn" disabled title="Connect OAuth provider in production">
              Continue with Microsoft
            </button>
          </div>
        </div>
      </div>
      <Footer />
    </div>
  );
}

export function PricingPage() {
  const [catalog, setCatalog] = useState<Catalog | null>(null);

  useEffect(() => {
    catalogApi.get().then(setCatalog).catch(console.error);
  }, []);

  const freePlan = catalog?.plans.free;
  const proPlan = catalog?.plans.pro;

  return (
    <div className="page-container">
      <PublicNav />
      <section className="section">
        <div className="section-label">Pricing</div>
        <h1 className="section-title">Simple, honest pricing</h1>
        <p className="section-sub">Start free. Upgrade when you need more. Cancel anytime.</p>

        <div className="pricing-grid">
          <div className="price-card">
            <h3>Free</h3>
            <div className="price-amount">£0<span>/mo</span></div>
            <ul className="price-features">
              <li>✓ {freePlan?.dailyMessages ?? 20} messages per day</li>
              <li>✓ Libraix Fast model</li>
              <li>✓ Chat, Web Search, PDF Chat</li>
              <li>✓ YouTube & Link Summariser</li>
            </ul>
            <Link to="/login?mode=signup" className="btn btn-ghost" style={{ width: "100%" }}>Get started free</Link>
          </div>

          <div className="price-card featured">
            <h3>Pro</h3>
            <div className="price-amount">£9<span>/mo</span></div>
            <ul className="price-features">
              <li>✓ All {catalog?.modelCount ?? 4} models unlocked</li>
              <li>✓ {proPlan?.dailyMessages ?? 500} messages per day</li>
              <li>✓ HD image generation</li>
              <li>✓ {catalog?.assistantCount ?? 5} AI Assistants</li>
              <li>✓ Prompt library</li>
            </ul>
            <Link to="/login?mode=signup" className="btn btn-primary" style={{ width: "100%" }}>Start Pro — £9/mo</Link>
          </div>

          <div className="price-card">
            <h3>Enterprise</h3>
            <div className="price-amount">£29<span>/mo per seat</span></div>
            <ul className="price-features">
              <li>✓ Everything in Pro</li>
              <li>✓ Team workspace</li>
              <li>✓ Custom AI Assistants</li>
              <li>✓ API access</li>
              <li>✓ SSO & admin controls</li>
            </ul>
            <a href="mailto:hello@libraix.ai" className="btn btn-ghost" style={{ width: "100%" }}>Contact sales</a>
          </div>
        </div>
      </section>
      <Footer />
    </div>
  );
}
