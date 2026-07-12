import { useEffect, useState } from "react";
import { Link, useSearchParams } from "react-router-dom";
import { PublicNav, Footer } from "../components/Layout";
import { useAuth } from "../lib/auth";
import { authApi, catalogApi, billingApi, type Catalog } from "../lib/api";
import { friendlyError } from "../lib/errors";

type AuthConfig = {
  oauth: { google: boolean; apple: boolean; microsoft: boolean };
  stripe: boolean;
};

export function LoginPage() {
  const [params] = useSearchParams();
  const isSignup = params.get("mode") === "signup";
  const oauthError = params.get("oauth_error");
  const [mode, setMode] = useState<"login" | "signup">(isSignup ? "signup" : "login");
  const [authConfig, setAuthConfig] = useState<AuthConfig | null>(null);
  const { login, signup } = useAuth();

  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [displayName, setDisplayName] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    setMode(isSignup ? "signup" : "login");
  }, [isSignup]);

  useEffect(() => {
    authApi.config().then(setAuthConfig).catch(() => setAuthConfig({ oauth: { google: false, apple: false, microsoft: false }, stripe: false }));
  }, []);

  useEffect(() => {
    if (oauthError) {
      setError(`${oauthError.charAt(0).toUpperCase()}${oauthError.slice(1)} sign-in is not available yet. Use email and password below.`);
    }
  }, [oauthError]);

  const oauthEnabled = authConfig
    ? Object.values(authConfig.oauth).some(Boolean)
    : false;

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
      setError(friendlyError(msg, msg));
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
              ? "Free account — 20 chat messages per day on Libraix Fast."
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
            {mode === "login" && (
              <p style={{ fontSize: 13, marginTop: -8 }}>
                <Link to="/forgot-password" style={{ color: "var(--c1)" }}>Forgot password?</Link>
              </p>
            )}
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

          {oauthEnabled && (
            <div className="oauth-row">
              <p style={{ fontSize: 12, color: "var(--dim)", textAlign: "center" }}>Or continue with</p>
              {authConfig?.oauth.google && (
                <button type="button" className="oauth-btn" onClick={() => { window.location.href = "/api/auth/oauth/google/start"; }}>
                  Continue with Google
                </button>
              )}
              {authConfig?.oauth.apple && (
                <button type="button" className="oauth-btn" onClick={() => { window.location.href = "/api/auth/oauth/apple/start"; }}>
                  Continue with Apple
                </button>
              )}
              {authConfig?.oauth.microsoft && (
                <button type="button" className="oauth-btn" onClick={() => { window.location.href = "/api/auth/oauth/microsoft/start"; }}>
                  Continue with Microsoft
                </button>
              )}
            </div>
          )}
        </div>
      </div>
      <Footer />
    </div>
  );
}

export function PricingPage() {
  const [catalog, setCatalog] = useState<Catalog | null>(null);
  const [checkoutMsg, setCheckoutMsg] = useState("");
  const [checkoutLoading, setCheckoutLoading] = useState(false);
  const { user } = useAuth();

  useEffect(() => {
    catalogApi.get().then(setCatalog).catch(console.error);
  }, []);

  const startCheckout = async (plan: "pro" | "enterprise") => {
    if (!user) {
      window.location.href = "/login?mode=signup";
      return;
    }

    setCheckoutMsg("");
    setCheckoutLoading(true);
    try {
      const data = await billingApi.checkout(plan);
      if (data.url) {
        window.location.href = data.url;
      } else if (data.devMode) {
        setCheckoutMsg(data.message ?? "Online checkout is not live yet. Email hello@libraix.ai to upgrade to Pro.");
      }
    } catch (err) {
      setCheckoutMsg(friendlyError(err instanceof Error ? err.message : "CHECKOUT_FAILED", "Could not start checkout."));
    } finally {
      setCheckoutLoading(false);
    }
  };

  const freePlan = catalog?.plans.free;
  const proPlan = catalog?.plans.pro;

  return (
    <div className="page-container">
      <PublicNav />
      <section className="section">
        <div className="section-label">Pricing</div>
        <h1 className="section-title">Simple, honest pricing</h1>
        <p className="section-sub">Start free. Upgrade when you need more. Cancel anytime.</p>

        {checkoutMsg && (
          <div className="info-banner" style={{ maxWidth: 720, margin: "0 auto 24px" }}>{checkoutMsg}</div>
        )}

        <div className="pricing-grid">
          <div className="price-card">
            <h3>Free</h3>
            <div className="price-amount">£0<span>/mo</span></div>
            <ul className="price-features">
              <li>✓ {freePlan?.dailyMessages ?? 20} messages per day (fair use)</li>
              <li>✓ Libraix Fast model (live)</li>
              <li>✓ Secure server-side AI — no API key required</li>
            </ul>
            <Link to="/login?mode=signup" className="btn btn-ghost" style={{ width: "100%" }}>Get started free</Link>
          </div>

          <div className="price-card featured">
            <h3>Pro</h3>
            <div className="price-amount">£9<span>/mo</span></div>
            <ul className="price-features">
              <li>✓ All live & beta models</li>
              <li>✓ {proPlan?.dailyMessages ?? 500} messages per day (fair use)</li>
            </ul>
            <button type="button" className="btn btn-primary" style={{ width: "100%" }} disabled={checkoutLoading} onClick={() => startCheckout("pro")}>
              {checkoutLoading ? "Please wait…" : user ? "Start Pro — £9/mo" : "Sign up for Pro"}
            </button>
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

export function ForgotPasswordPage() {
  const [email, setEmail] = useState("");
  const [message, setMessage] = useState("");
  const [resetUrl, setResetUrl] = useState("");
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    try {
      const res = await authApi.forgotPassword(email);
      setMessage(res.message);
      if (res.resetUrl) setResetUrl(res.resetUrl);
    } catch {
      setMessage("Could not process request. Try again.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="page-container">
      <PublicNav />
      <div className="auth-page">
        <div className="auth-card">
          <h1>Reset password</h1>
          <p>Enter your email. If an account exists, we will send reset instructions.</p>
          {message && <div className="info-banner" style={{ marginBottom: 16 }}>{message}</div>}
          {resetUrl && (
            <p style={{ fontSize: 12, color: "var(--dim)", marginBottom: 16 }}>
              Dev reset link: <a href={resetUrl}>{resetUrl}</a>
            </p>
          )}
          <form className="auth-form" onSubmit={handleSubmit}>
            <div>
              <label htmlFor="email">Email</label>
              <input id="email" type="email" className="input" required value={email} onChange={(e) => setEmail(e.target.value)} />
            </div>
            <button type="submit" className="btn btn-primary" disabled={loading}>
              {loading ? "Please wait…" : "Send reset link"}
            </button>
          </form>
          <p style={{ marginTop: 20, fontSize: 13, textAlign: "center" }}>
            <Link to="/login">Back to login</Link>
          </p>
        </div>
      </div>
      <Footer />
    </div>
  );
}

export function ResetPasswordPage() {
  const [params] = useSearchParams();
  const token = params.get("token") ?? "";
  const [password, setPassword] = useState("");
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!token) {
      setError("Invalid reset link.");
      return;
    }
    setLoading(true);
    setError("");
    try {
      await authApi.resetPassword(token, password);
      setMessage("Password updated. You can log in now.");
    } catch (err) {
      setError(friendlyError(err instanceof Error ? err.message : "FAILED", "Reset failed"));
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="page-container">
      <PublicNav />
      <div className="auth-page">
        <div className="auth-card">
          <h1>Choose a new password</h1>
          {message ? (
            <p>{message} <Link to="/login">Log in</Link></p>
          ) : (
            <form className="auth-form" onSubmit={handleSubmit}>
              {error && <div className="error-banner">{error}</div>}
              <div>
                <label htmlFor="password">New password</label>
                <input id="password" type="password" className="input" required minLength={8} value={password} onChange={(e) => setPassword(e.target.value)} />
              </div>
              <button type="submit" className="btn btn-primary" disabled={loading || !token}>
                {loading ? "Please wait…" : "Update password"}
              </button>
            </form>
          )}
        </div>
      </div>
      <Footer />
    </div>
  );
}
