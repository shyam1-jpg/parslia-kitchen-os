import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { PublicNav, Footer } from "../components/Layout";
import { catalogApi, type Catalog, type LaunchStatus } from "../lib/api";
import { BRAND } from "../lib/brand";

function statusLabel(status: LaunchStatus) {
  if (status === "live") return "Available";
  if (status === "beta") return "Beta";
  if (status === "coming_soon") return "Coming soon";
  return "Disabled";
}

function statusClass(status: LaunchStatus) {
  if (status === "live") return "badge-live";
  if (status === "beta") return "badge-beta";
  return "badge-soon";
}

export function LandingPage() {
  const [catalog, setCatalog] = useState<Catalog | null>(null);

  useEffect(() => {
    catalogApi.get().then(setCatalog).catch(console.error);
  }, []);

  const freeDaily = catalog?.plans?.free?.dailyMessages ?? 30;

  return (
    <div className="page-container luxury-site">
      <PublicNav />

      <section className="luxury-hero" aria-label="Libraix">
        <div className="luxury-hero-atmosphere" aria-hidden />
        <div className="luxury-hero-grain" aria-hidden />
        <div className="luxury-hero-inner">
          <p className="luxury-brand">{BRAND.name}</p>
          <h1 className="luxury-headline">{BRAND.tagline}</h1>
          <p className="luxury-lede">
            {BRAND.slogan} Super mode, Vedic kundli & Ashtakoot match, Live Voice, Live Vision, and Deep Research — honestly labelled as live or beta.
          </p>
          <div className="hero-actions luxury-hero-actions">
            <Link to="/login?mode=signup" className="btn btn-primary">
              Begin free
            </Link>
            <Link to="/pricing" className="btn btn-ghost">
              View plans
            </Link>
          </div>
        </div>
      </section>

      <section className="section luxury-section" id="features">
        <div className="section-label">Capabilities</div>
        <h2 className="section-title">Advanced AI, shipped with care.</h2>
        <p className="section-sub">Only tools that are live or in beta appear here — labelled honestly.</p>
        <div className="luxury-list">
          {(catalog?.tools ?? []).map((tool) => (
            <div className="luxury-row" key={tool.id}>
              <div>
                <h3>{tool.name}</h3>
                <p>{tool.description}</p>
              </div>
              <div className="feature-badges">
                <span className={`badge ${tool.tier === "free" ? "badge-free" : "badge-pro"}`}>
                  {tool.tier === "free" ? "Free" : "Pro"}
                </span>
                <span className={`badge ${statusClass(tool.launchStatus)}`}>{statusLabel(tool.launchStatus)}</span>
              </div>
            </div>
          ))}
        </div>
      </section>

      <section className="section luxury-section" id="models">
        <div className="section-label">Models</div>
        <h2 className="section-title">A curated atelier of AI</h2>
        <p className="section-sub">
          Only models that are live on the server appear here — named under Libraix, never unfinished entries.
        </p>
        <div className="model-grid luxury-model-grid">
          {(catalog?.models ?? []).filter((m) => m.available !== false).map((m) => (
            <div className="model-chip" key={m.id}>
              {m.displayName}
              <span className={`badge ${m.tier === "free" ? "badge-free" : "badge-pro"}`}>
                {m.tier === "free" ? "Free" : "Pro"}
              </span>
              <span className={`badge ${statusClass(m.launchStatus)}`}>{statusLabel(m.launchStatus)}</span>
            </div>
          ))}
        </div>
      </section>

      <section className="section luxury-section">
        <div className="section-label">Assistants</div>
        <h2 className="section-title">Specialist companions</h2>
        <p className="section-sub">Writing, coding, astrology, security — tune the room to the task.</p>
        <div className="luxury-list luxury-list-compact">
          {(catalog?.assistants ?? []).map((a) => (
            <div className="luxury-row" key={a.id}>
              <div>
                <h3>{a.name}</h3>
                <p>{a.description}</p>
              </div>
              <span className="badge badge-beta">Beta</span>
            </div>
          ))}
        </div>
      </section>

      <section className="section luxury-section trust-section">
        <h2 className="section-title">Security & privacy</h2>
        <ul className="trust-list">
          <li>Provider keys stay on Libraix servers — never in your browser.</li>
          <li>HttpOnly session cookies. Traffic encrypted in transit (HTTPS).</li>
          <li>
            We do not sell personal data. See the <Link to="/privacy">Privacy Policy</Link>.
          </li>
        </ul>
        <p className="trust-disclaimer">
          Libraix has not completed a SOC 2 Type II audit. We do not display compliance badges without formal certification.
        </p>
      </section>

      <section className="section luxury-cta-band">
        <h2 className="section-title">Start with free chat</h2>
        <p className="section-sub">
          {freeDaily} messages + 5 minutes Live Voice per day on Free. Pro unlocks unlimited voice.
        </p>
        <Link to="/login?mode=signup" className="btn btn-primary">
          Create free account
        </Link>
      </section>

      <Footer />
    </div>
  );
}
