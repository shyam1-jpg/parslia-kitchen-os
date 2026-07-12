import { useEffect, useState } from "react";
import { Link } from "react-router-dom";

const KEY = "libraix_cookie_consent";

export function CookieBanner() {
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    if (!localStorage.getItem(KEY)) setVisible(true);
  }, []);

  if (!visible) return null;

  return (
    <div className="cookie-banner" role="dialog" aria-label="Cookie notice">
      <p>
        Libraix uses essential session cookies to keep you signed in and enforce plan limits.{" "}
        <Link to="/privacy">Privacy Policy</Link>
      </p>
      <button
        className="btn btn-primary btn-sm"
        onClick={() => {
          localStorage.setItem(KEY, "accepted");
          setVisible(false);
        }}
      >
        Accept
      </button>
    </div>
  );
}
