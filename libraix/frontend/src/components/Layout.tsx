import { Link } from "react-router-dom";
import { useAuth } from "../lib/auth";
import { LibraixLogoMark } from "./LibraixLogo";
import { CookieSettingsLink } from "./CookieBanner";

export function Logo({ to = "/" }: { to?: string }) {
  return (
    <Link to={to} className="logo">
      <LibraixLogoMark size={28} />
      <span>Libraix</span>
    </Link>
  );
}

export function PublicNav() {
  const { user } = useAuth();

  return (
    <nav className="public-nav">
      <Logo />
      <div className="nav-links">
        <a href="/#features">Features</a>
        <a href="/#models">Models</a>
        <Link to="/pricing">Pricing</Link>
      </div>
      <div className="nav-actions">
        {user ? (
          <>
            <Link to="/app" className="btn btn-ghost btn-sm">Workspace</Link>
            <Link to="/account" className="btn btn-primary btn-sm">Account</Link>
          </>
        ) : (
          <>
            <Link to="/login" className="btn btn-ghost btn-sm">Log in</Link>
            <Link to="/login?mode=signup" className="btn btn-primary btn-sm">Get started</Link>
          </>
        )}
      </div>
    </nav>
  );
}

export function Footer() {
  return (
    <footer className="footer">
      <div className="footer-links">
        <Link to="/about">About</Link>
        <Link to="/privacy">Privacy</Link>
        <Link to="/terms">Terms</Link>
        <Link to="/cookie-policy">Cookies</Link>
        <Link to="/acceptable-use">Acceptable Use</Link>
        <Link to="/subscriptions">Subscriptions</Link>
        <Link to="/refund-policy">Refunds</Link>
        <Link to="/security">Security</Link>
        <Link to="/subprocessors">Subprocessors</Link>
        <Link to="/ai-limitations">AI Limitations</Link>
        <Link to="/accessibility">Accessibility</Link>
        <Link to="/contact">Contact</Link>
        <Link to="/support">Support</Link>
        <CookieSettingsLink />
      </div>
      <p className="footer-identity">Libraix · United Kingdom · hello@libraix.ai · privacy@libraix.ai</p>
      <p className="footer-disclaimer">
        Libraix is an independent platform and is not affiliated with or endorsed by OpenAI, Anthropic, Google, Meta, xAI or other model providers.
      </p>
      <p>© {new Date().getFullYear()} Libraix. All rights reserved.</p>
    </footer>
  );
}

export function IconPlus() {
  return (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
      <path d="M12 5v14M5 12h14" />
    </svg>
  );
}

export function IconSend() {
  return (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
      <path d="M22 2L11 13M22 2l-7 20-4-9-9-4 20-7z" />
    </svg>
  );
}

export function IconAttach() {
  return (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
      <path d="M21.44 11.05l-9.19 9.19a6 6 0 01-8.49-8.49l9.19-9.19a4 4 0 015.66 5.66l-9.2 9.19a2 2 0 01-2.83-2.83l8.49-8.48" />
    </svg>
  );
}

export function IconSearch() {
  return (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
      <circle cx="11" cy="11" r="8" />
      <path d="M21 21l-4.35-4.35" />
    </svg>
  );
}

export function IconMenu() {
  return (
    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
      <path d="M3 12h18M3 6h18M3 18h18" />
    </svg>
  );
}

export function IconCopy() {
  return (
    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
      <rect x="9" y="9" width="13" height="13" rx="2" />
      <path d="M5 15H4a2 2 0 01-2-2V4a2 2 0 012-2h9a2 2 0 012 2v1" />
    </svg>
  );
}
