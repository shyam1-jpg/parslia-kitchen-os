import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { Logo } from "../../components/Layout";
import { useAdminAuth } from "../../lib/adminAuth";

export function AdminLoginPage() {
  const { login } = useAdminAuth();
  const navigate = useNavigate();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [totpCode, setTotpCode] = useState("");
  const [need2fa, setNeed2fa] = useState(false);
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    setLoading(true);
    try {
      await login(email, password, need2fa ? totpCode : undefined);
      navigate("/admin");
    } catch (err) {
      const msg = err instanceof Error ? err.message : "Login failed";
      if (msg === "ADMIN_2FA_REQUIRED") {
        setNeed2fa(true);
        setError("Enter the 6-digit code from your authenticator app.");
      } else {
        setError(msg === "INVALID_ADMIN_CREDENTIALS" ? "Invalid owner credentials." : msg);
      }
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="admin-login-page">
      <div className="admin-login-card">
        <Logo to="/" />
        <h1>Owner login</h1>
        <p>Private Libraix management portal. Not for customers.</p>
        {error && <div className="error-banner">{error}</div>}
        <form onSubmit={handleSubmit} className="auth-form">
          <div>
            <label htmlFor="admin-email">Owner email</label>
            <input id="admin-email" type="email" className="input" required value={email} onChange={(e) => setEmail(e.target.value)} />
          </div>
          <div>
            <label htmlFor="admin-password">Password</label>
            <input id="admin-password" type="password" className="input" required value={password} onChange={(e) => setPassword(e.target.value)} />
          </div>
          {need2fa && (
            <div>
              <label htmlFor="admin-totp">Authenticator code</label>
              <input id="admin-totp" className="input" inputMode="numeric" maxLength={6} value={totpCode} onChange={(e) => setTotpCode(e.target.value)} />
            </div>
          )}
          <button type="submit" className="btn btn-primary" disabled={loading}>
            {loading ? "Signing in…" : "Sign in to admin"}
          </button>
        </form>
        <p className="admin-login-note">
          Super Admin accounts are created manually. Public signup cannot create admin access.
        </p>
      </div>
    </div>
  );
}
