import { Link } from "react-router-dom";
import { PublicNav, Footer } from "../components/Layout";

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
      <p>Contact: <a href="mailto:hello@libraix.ai">hello@libraix.ai</a></p>
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
      <p>Libraix · United Kingdom · hello@libraix.ai</p>
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
