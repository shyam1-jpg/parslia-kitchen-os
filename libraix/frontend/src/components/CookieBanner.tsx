import { useEffect, useState } from "react";
import { Link } from "react-router-dom";

const KEY = "libraix_cookie_consent";

type Consent = "all" | "essential" | "rejected";

function saveConsent(value: Consent) {
  localStorage.setItem(KEY, value);
}

export function CookieBanner() {
  const [visible, setVisible] = useState(false);
  const [showManage, setShowManage] = useState(false);

  useEffect(() => {
    if (!localStorage.getItem(KEY)) setVisible(true);
  }, []);

  if (!visible) return null;

  return (
    <div className="cookie-banner" role="dialog" aria-label="Cookie consent">
      <div className="cookie-banner-inner">
        <p>
          Libraix uses essential session cookies to keep you signed in. We do not load advertising or analytics cookies.
          {" "}<Link to="/cookie-policy">Cookie Policy</Link>
        </p>
        {showManage && (
          <p style={{ fontSize: 13, color: "var(--dim)" }}>
            Essential cookies are required for login and plan limits. Rejecting non-essential cookies means we only use essential cookies.
          </p>
        )}
        <div className="cookie-banner-actions">
          <button className="btn btn-ghost btn-sm" onClick={() => { saveConsent("rejected"); setVisible(false); }}>
            Reject non-essential
          </button>
          <button className="btn btn-ghost btn-sm" onClick={() => setShowManage((v) => !v)}>
            Manage
          </button>
          <button className="btn btn-primary btn-sm" onClick={() => { saveConsent("all"); setVisible(false); }}>
            Accept all
          </button>
        </div>
      </div>
    </div>
  );
}

/** Footer link to reopen cookie preferences */
export function CookieSettingsLink() {
  return (
    <button
      type="button"
      className="footer-link-btn"
      onClick={() => {
        localStorage.removeItem(KEY);
        window.location.reload();
      }}
    >
      Cookie settings
    </button>
  );
}
