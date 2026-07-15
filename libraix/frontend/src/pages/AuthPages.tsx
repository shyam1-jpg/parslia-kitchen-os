import { useEffect, useState, type ReactElement } from "react";
import { Link, useSearchParams } from "react-router-dom";
import { PublicNav, Footer } from "../components/Layout";
import { useAuth } from "../lib/auth";
import { authApi, catalogApi, billingApi, type Catalog } from "../lib/api";
import { friendlyError } from "../lib/errors";

type AuthConfig = {
  oauth: { google: boolean; apple: boolean; microsoft: boolean };
  stripe: boolean;
};

type OAuthProviderId = "google" | "apple" | "microsoft";

const OAUTH_PROVIDERS: {
  id: OAuthProviderId;
  label: string;
  Icon: () => ReactElement;
}[] = [
  {
    id: "google",
    label: "Continue with Google",
    Icon: GoogleIcon,
  },
  {
    id: "apple",
    label: "Continue with Apple",
    Icon: AppleIcon,
  },
  {
    id: "microsoft",
    label: "Continue with Microsoft",
    Icon: MicrosoftIcon,
  },
];

function GoogleIcon() {
  return (
    <svg className="oauth-icon" viewBox="0 0 24 24" aria-hidden>
      <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92a5.06 5.06 0 0 1-2.2 3.32v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.1z" />
      <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" />
      <path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z" />
      <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" />
    </svg>
  );
}

function AppleIcon() {
  return (
    <svg className="oauth-icon" viewBox="0 0 24 24" aria-hidden>
      <path fill="currentColor" d="M17.05 20.28c-.98.95-2.05.8-3.08.35-1.09-.46-2.09-.48-3.24 0-1.44.62-2.2.44-3.06-.35C2.79 15.25 3.51 7.59 9.05 7.31c1.35.07 2.29.74 3.08.8 1.18-.24 2.31-.93 3.57-.84 1.51.12 2.65.72 3.4 1.8-3.12 1.87-2.38 5.98.48 7.13-.57 1.5-1.31 2.99-2.54 4.09zM12.03 7.25c-.15-2.23 1.66-4.07 3.74-4.25.29 2.58-2.34 4.5-3.74 4.25z" />
    </svg>
  );
}

function MicrosoftIcon() {
  return (
    <svg className="oauth-icon" viewBox="0 0 24 24" aria-hidden>
      <path fill="#F25022" d="M1 1h10v10H1z" />
      <path fill="#7FBA00" d="M13 1h10v10H13z" />
      <path fill="#00A4EF" d="M1 13h10v10H1z" />
      <path fill="#FFB900" d="M13 13h10v10H13z" />
    </svg>
  );
}

function OAuthHowItWorks() {
  const [open, setOpen] = useState(false);

  return (
    <div className="oauth-how">
      <button type="button" className="oauth-how-toggle" onClick={() => setOpen((v) => !v)} aria-expanded={open}>
        How does sign-in with Google, Apple, or Microsoft work?
      </button>
      {open && (
        <div className="oauth-how-body">
          <p>
            Libraix never sees your Google, Apple, or Microsoft password. When you tap a provider button, your browser
            opens that company&apos;s official sign-in page.
          </p>
          <ol>
            <li>You choose Google, Apple, or Microsoft on this page.</li>
            <li>You sign in on their website (they may ask for 2FA or Face ID).</li>
            <li>They send Libraix only your name and email — enough to create or open your account.</li>
            <li>You are redirected back to Libraix, already signed in.</li>
          </ol>
          <p className="oauth-how-note">
            Emails like &ldquo;Sign-in request from Libraix&rdquo; or security alerts come from the provider you chose,
            not from Libraix directly. That is normal OAuth behaviour — the same pattern ChatGPT and other apps use.
          </p>
        </div>
      )}
    </div>
  );
}

function OAuthButtons({
  authConfig,
}: {
  authConfig: AuthConfig | null;
}) {
  const configLoaded = authConfig !== null;

  return (
    <div className="oauth-stack">
      {OAUTH_PROVIDERS.map(({ id, label, Icon }) => {
        const isApple = id === "apple";
        const enabled = !isApple && Boolean(authConfig?.oauth[id]);
        // Show as disabled (greyed out + "Soon") when not configured or Apple
        const comingSoon = !enabled;

        if (comingSoon) {
          return (
            <button
              key={id}
              type="button"
              className={`oauth-btn oauth-btn-${id} oauth-btn-disabled`}
              disabled
              aria-label={`${label} — coming soon`}
              title={isApple ? "Apple sign-in coming soon" : configLoaded ? "Email sign-in is available below" : "Loading…"}
            >
              <Icon />
              <span>{label}</span>
              <span className="oauth-badge">Soon</span>
            </button>
          );
        }

        return (
          <button
            key={id}
            type="button"
            className={`oauth-btn oauth-btn-${id}`}
            onClick={() => { window.location.href = `/api/auth/oauth/${id}/start`; }}
            aria-label={label}
          >
            <Icon />
            <span>{label}</span>
          </button>
        );
      })}
    </div>
  );
}

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
  const [acceptTerms, setAcceptTerms] = useState(false);
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
      const name = oauthError.charAt(0).toUpperCase() + oauthError.slice(1);
      setError(`${name} sign-in could not be completed. Try again or use email and password below.`);
    }
  }, [oauthError]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    setLoading(true);
    try {
      if (mode === "signup" && !acceptTerms) {
        setError("Please accept the Terms of Service and Privacy Policy.");
        setLoading(false);
        return;
      }
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
        <div className="auth-card auth-card-chatgpt">
          <h1>{mode === "signup" ? "Create your account" : "Welcome back"}</h1>
          <p>
            {mode === "signup"
              ? "One AI workspace. Multiple models. Free — 30 messages/day + 5 min Live Voice."
              : "Sign in to Libraix — balance meets intelligence."}
          </p>

          {error && <div className="error-banner auth-error">{error}</div>}

          <OAuthButtons authConfig={authConfig} />

          <div className="auth-divider" role="separator">
            <span>OR</span>
          </div>

          <form className="auth-form" onSubmit={handleSubmit}>
            {mode === "signup" && (
              <div>
                <label htmlFor="name">Display name</label>
                <input id="name" className="input" value={displayName} onChange={(e) => setDisplayName(e.target.value)} placeholder="Optional" />
              </div>
            )}
            <div>
              <label htmlFor="email">Email address</label>
              <input id="email" type="email" className="input" required value={email} onChange={(e) => setEmail(e.target.value)} autoComplete="email" />
            </div>
            <div>
              <label htmlFor="password">Password</label>
              <input
                id="password"
                type="password"
                className="input"
                required
                minLength={10}
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                autoComplete={mode === "signup" ? "new-password" : "current-password"}
              />
              {mode === "signup" && <p className="auth-hint">At least 10 characters, with a letter and a number</p>}
            </div>
            {mode === "signup" && (
              <label className="auth-terms">
                <input type="checkbox" checked={acceptTerms} onChange={(e) => setAcceptTerms(e.target.checked)} />
                <span>
                  I agree to the <Link to="/terms">Terms of Service</Link> and acknowledge the{" "}
                  <Link to="/privacy">Privacy Policy</Link>.
                </span>
              </label>
            )}
            {mode === "login" && (
              <p className="auth-forgot">
                <Link to="/forgot-password">Forgot password?</Link>
              </p>
            )}
            <button type="submit" className="btn btn-primary auth-submit" disabled={loading}>
              {loading ? "Please wait…" : mode === "signup" ? "Create account" : "Log in"}
            </button>
          </form>

          <p className="auth-switch">
            {mode === "signup" ? "Already have an account?" : "Don't have an account?"}{" "}
            <button type="button" className="auth-switch-btn" onClick={() => setMode(mode === "signup" ? "login" : "signup")}>
              {mode === "signup" ? "Log in" : "Sign up"}
            </button>
          </p>

          <OAuthHowItWorks />
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
              <li>✓ {freePlan?.dailyMessages ?? 30} messages per day</li>
              <li>✓ Live Voice: {freePlan?.liveVoiceMinutes ?? 5} minutes per day</li>
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
              <li>✓ {proPlan?.dailyMessages ?? 500} messages per day</li>
              <li>✓ Unlimited Live Voice</li>
            </ul>
            <button type="button" className="btn btn-primary" style={{ width: "100%" }} disabled={checkoutLoading} onClick={() => startCheckout("pro")}>
              {checkoutLoading ? "Please wait…" : user ? "Start Pro — £9/mo" : "Sign up for Pro"}
            </button>
          </div>

          <div className="price-card">
            <h3>Enterprise</h3>
            <div className="price-amount">Custom</div>
            <ul className="price-features">
              <li>✓ Everything in Pro today</li>
              <li>○ Higher limits &amp; priority support</li>
              <li>○ Team workspace — coming soon</li>
              <li>○ SSO &amp; API access — coming soon</li>
            </ul>
            <p style={{ fontSize: 12, color: "var(--dim)", marginBottom: 12 }}>
              We only sell Enterprise features that are live. Ask about early access.
            </p>
            <a href="mailto:hello@libraix.ai?subject=Libraix%20Enterprise" className="btn btn-ghost" style={{ width: "100%" }}>
              Contact sales
            </a>
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
                <input id="password" type="password" className="input" required minLength={10} value={password} onChange={(e) => setPassword(e.target.value)} placeholder="10+ chars, letter + number" />
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
