import { Link } from "react-router-dom";
import { useEffect, useState } from "react";
import { PublicNav, Footer } from "../components/Layout";
import { COMPANY } from "../lib/company";

function LegalShell({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div className="page-container">
      <PublicNav />
      <article className="legal-page">
        <h1>{title}</h1>
        {children}
      </article>
      <Footer />
    </div>
  );
}

export function AboutPage() {
  return (
    <LegalShell title="About Libraix">
      <p>Last updated: July 2026</p>
      <p>
        Libraix is an AI workspace that gives individuals and teams access to multiple models through one secure interface.
        We use Libraix-branded model names (Fast, Smart, Advanced, Image) mapped to current provider APIs from server-side configuration,
        so the product stays current as providers update their models.
      </p>
      <h2>Our approach</h2>
      <ul>
        <li>Server-side AI routing — your browser never holds provider API keys.</li>
        <li>Honest feature labelling — roadmap items are marked Coming Soon, not advertised as live.</li>
        <li>Privacy by design — see our <Link to="/privacy">Privacy Policy</Link>.</li>
      </ul>
      <h2>Contact</h2>
      <p><a href={`mailto:${COMPANY.supportEmail}`}>{COMPANY.supportEmail}</a></p>
      <p><a href={`mailto:${COMPANY.privacyEmail}`}>{COMPANY.privacyEmail}</a> (privacy)</p>
      <h2>Registered address</h2>
      <p>{COMPANY.fullAddress}</p>
    </LegalShell>
  );
}

export function ContactPage() {
  return (
    <LegalShell title="Contact">
      <p>We aim to respond within 2 business days.</p>
      <h2>General enquiries</h2>
      <p><a href="mailto:hello@libraix.ai">hello@libraix.ai</a></p>
      <h2>Support</h2>
      <p>Use our <Link to="/support">support form</Link> or email <a href="mailto:support@libraix.ai">support@libraix.ai</a>.</p>
      <h2>Privacy &amp; data requests</h2>
      <p>Submit via <Link to="/support">Privacy request</Link> or email <a href="mailto:privacy@libraix.ai">privacy@libraix.ai</a>.</p>
      <h2>Company</h2>
      <p>{COMPANY.legalName}</p>
      <p>{COMPANY.fullAddress}</p>
      <p><a href={`mailto:${COMPANY.supportEmail}`}>{COMPANY.supportEmail}</a></p>
    </LegalShell>
  );
}

export function RefundPolicyPage() {
  return (
    <LegalShell title="Refund Policy">
      <p>Last updated: July 2026</p>
      <h2>Free plan</h2>
      <p>The Free plan is provided at no charge. No refunds apply.</p>
      <h2>Paid subscriptions (Pro / Enterprise)</h2>
      <ul>
        <li>Monthly subscriptions renew automatically until cancelled.</li>
        <li>You may cancel anytime from <Link to="/app/billing">Billing</Link> or the Stripe customer portal.</li>
        <li>Access continues until the end of the current billing period after cancellation.</li>
        <li>Refunds are considered within 14 days of purchase if the service was materially unavailable. Contact <a href="mailto:hello@libraix.ai">hello@libraix.ai</a>.</li>
      </ul>
      <h2>How to request a refund</h2>
      <p>Email hello@libraix.ai with your account email and payment date. We process eligible refunds via Stripe within 10 business days.</p>
    </LegalShell>
  );
}

export function CookiePolicyPage() {
  return (
    <LegalShell title="Cookie Policy">
      <p>Last updated: July 2026</p>
      <h2>What cookies we use</h2>
      <p>Libraix uses only essential cookies required to operate the service:</p>
      <ul>
        <li><strong>Session cookie</strong> (`connect.sid`) — keeps you signed in. HttpOnly, Secure in production.</li>
        <li><strong>Cookie consent</strong> — stores your banner preference in browser local storage (not a tracking cookie).</li>
      </ul>
      <h2>What we do not use</h2>
      <ul>
        <li>Advertising or third-party tracking cookies</li>
        <li>Cross-site profiling</li>
      </ul>
      <h2>Managing cookies</h2>
      <p>You can clear cookies in your browser settings. Clearing session cookies will sign you out.</p>
      <p>See also our <Link to="/privacy">Privacy Policy</Link>.</p>
    </LegalShell>
  );
}

export function BlogPage() {
  return (
    <LegalShell title="Blog">
      <p>The Libraix blog is coming soon. For product updates, contact <a href="mailto:hello@libraix.ai">hello@libraix.ai</a>.</p>
      <Link to="/" className="btn btn-ghost btn-sm">← Back to home</Link>
    </LegalShell>
  );
}

export function AcceptableUsePage() {
  return (
    <LegalShell title="Acceptable Use Policy">
      <p>Last updated: July 2026</p>
      <p>You may not use Libraix for illegal activity, malware, harassment, spam, credential theft, or attempts to bypass usage limits or security controls.</p>
      <p>Do not upload confidential third-party data without permission. Do not use Libraix to generate content that violates applicable law.</p>
      <p>We may suspend accounts that abuse the service. Report abuse via <Link to="/support">Support</Link>.</p>
    </LegalShell>
  );
}

export function SubscriptionsPage() {
  return (
    <LegalShell title="Subscription & Cancellation Policy">
      <p>Last updated: July 2026</p>
      <h2>Plans</h2>
      <p>Free, Pro and Enterprise plans include fair-use message limits shown at checkout and in your account. Subscriptions renew automatically until cancelled.</p>
      <h2>Cancellation</h2>
      <p>Cancel online from <Link to="/app/billing">Billing</Link> or the Stripe customer portal. Access continues until the end of the paid period.</p>
      <h2>Price changes</h2>
      <p>We will give reasonable notice before price changes take effect on renewal.</p>
    </LegalShell>
  );
}

export function SubprocessorsPage() {
  return (
    <LegalShell title="Subprocessor List">
      <p>Last updated: July 2026</p>
      <p>Depending on features used, Libraix may share data with:</p>
      <table className="admin-table">
        <thead><tr><th>Provider</th><th>Purpose</th><th>Data</th></tr></thead>
        <tbody>
          <tr><td>OpenAI</td><td>AI chat (when selected)</td><td>Prompts and conversation context</td></tr>
          <tr><td>Stripe</td><td>Payments</td><td>Billing identity and payment metadata</td></tr>
          <tr><td>Netlify</td><td>Website hosting</td><td>Technical logs</td></tr>
          <tr><td>Render</td><td>Backend hosting</td><td>Technical logs, account data</td></tr>
          <tr><td>Resend / SMTP</td><td>Transactional email</td><td>Email address</td></tr>
        </tbody>
      </table>
      <p>Review each provider&apos;s API/data policy for retention and training settings.</p>
    </LegalShell>
  );
}

export function SecurityPage() {
  return (
    <LegalShell title="Security">
      <p>Last updated: July 2026</p>
      <ul>
        <li>HTTPS encryption in transit for all web traffic.</li>
        <li>Passwords hashed with bcrypt; sessions use httpOnly cookies.</li>
        <li>AI provider keys stored server-side only — never in the browser.</li>
        <li>Rate limiting on authentication and AI endpoints.</li>
        <li>Admin actions audit-logged.</li>
      </ul>
      <p>Report security issues: <a href="mailto:security@libraix.ai">security@libraix.ai</a></p>
      <p>We do not claim &quot;100% secure&quot; or military-grade encryption. No system is risk-free.</p>
    </LegalShell>
  );
}

export function AiLimitationsPage() {
  return (
    <LegalShell title="AI Safety & Limitations">
      <p>Last updated: July 2026</p>
      <ul>
        <li>AI responses may be incorrect, incomplete or outdated.</li>
        <li>Not a substitute for professional medical, legal or financial advice.</li>
        <li>Generated code may contain vulnerabilities — review before use.</li>
        <li>Citations and web results may be wrong — verify independently.</li>
        <li>Images may be synthetic — do not use to deceive others.</li>
      </ul>
      <p>Depending on the model selected, your prompt may be sent to a third-party AI provider to generate a response.</p>
    </LegalShell>
  );
}

export function AccessibilityPage() {
  return (
    <LegalShell title="Accessibility Statement">
      <p>Last updated: July 2026</p>
      <p>Libraix aims to meet WCAG 2.2 AA over time. We are improving keyboard navigation, contrast and screen-reader labels.</p>
      <p>Report accessibility barriers: <a href="mailto:hello@libraix.ai">hello@libraix.ai</a></p>
    </LegalShell>
  );
}

export function VerifyEmailPage() {
  const [status, setStatus] = useState<"loading" | "ok" | "error">("loading");
  useEffect(() => {
    const token = new URLSearchParams(window.location.search).get("token");
    if (!token) { setStatus("error"); return; }
    fetch("/api/auth/verify-email", {
      method: "POST",
      credentials: "include",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ token }),
    })
      .then((r) => (r.ok ? setStatus("ok") : setStatus("error")))
      .catch(() => setStatus("error"));
  }, []);
  return (
    <LegalShell title="Verify email">
      {status === "loading" && <p>Verifying your email…</p>}
      {status === "ok" && <p>Email verified. You can <Link to="/app">open your workspace</Link>.</p>}
      {status === "error" && <p>Invalid or expired link. Log in and request a new verification email from Settings.</p>}
    </LegalShell>
  );
}
