import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { PublicNav, Footer } from "../components/Layout";
import { catalogApi, type Catalog, type LaunchStatus } from "../lib/api";

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

  const modelCount = catalog?.modelCount ?? 1;
  const toolCount = catalog?.toolCount ?? 1;
  const freeDaily = catalog?.plans?.free?.dailyMessages ?? 30;

  return (
    <div className="page-container">
      <PublicNav />

      <section className="hero">
        <h1>
          Your AI.<br />
          Everything in one place.
        </h1>
        <p>
          Libraix is a secure AI workspace. Start with <strong>Libraix Fast</strong> chat today — additional models and tools roll out on Pro as they launch.
        </p>
        <div className="hero-actions">
          <Link to="/login?mode=signup" className="btn btn-primary">Start for free</Link>
          <a href="#models" className="btn btn-ghost">View models</a>
        </div>
        <p className="hero-subnote">No credit card required · Cancel online · Prompts may be sent to AI providers per our <Link to="/privacy">Privacy Policy</Link></p>
        <div className="stats-row">
          <div className="stat"><div className="stat-num">{modelCount}</div><div className="stat-label">Models available now</div></div>
          <div className="stat"><div className="stat-num">{toolCount}</div><div className="stat-label">Tools available now</div></div>
          <div className="stat"><div className="stat-num">{freeDaily}/day</div><div className="stat-label">Free fair-use messages</div></div>
        </div>
        {catalog?.launchNote && (
          <p className="hero-note">{catalog.launchNote}</p>
        )}
      </section>

      <section className="section" id="features">
        <div className="section-label">Features</div>
        <h2 className="section-title">Built for launch — more arriving soon</h2>
        <p className="section-sub">We only count tools that are live or in beta. Roadmap items are labelled clearly.</p>
        <div className="card-grid">
          {(catalog?.tools ?? []).map((tool) => (
            <div className="feature-card" key={tool.id}>
              <h3>{tool.name}</h3>
              <p>{tool.description}</p>
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

      <section className="section" id="models">
        <div className="section-label">AI Models</div>
        <h2 className="section-title">Libraix-branded models</h2>
        <p className="section-sub">Same names in the app, on pricing, and in the backend router.</p>
        <div className="model-grid">
          {(catalog?.models ?? []).map((m) => (
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

      <section className="section">
        <div className="section-label">Assistants</div>
        <h2 className="section-title">Specialist assistants (Pro beta)</h2>
        <p className="section-sub">Pre-tuned agents for writing, coding, and business — expanding with Pro.</p>
        <div className="card-grid">
          {(catalog?.assistants ?? []).map((a) => (
            <div className="feature-card" key={a.id}>
              <h3>{a.name}</h3>
              <p>{a.description}</p>
              <span className="badge badge-beta">Beta</span>
            </div>
          ))}
        </div>
      </section>

      <section className="section trust-section">
        <h2 className="section-title">Security & privacy</h2>
        <ul className="trust-list">
          <li>AI provider keys are stored on Libraix servers only — never in your browser.</li>
          <li>Sessions use httpOnly cookies. Traffic is encrypted in transit (HTTPS).</li>
          <li>We do not sell your personal data. See our <Link to="/privacy">Privacy Policy</Link> for retention and your rights.</li>
        </ul>
        <p className="trust-disclaimer">
          Libraix has not completed a SOC 2 Type II audit. We do not display compliance badges without formal certification.
        </p>
      </section>

      <section className="section" style={{ textAlign: "center" }}>
        <h2 className="section-title">Start with free chat</h2>
        <p className="section-sub" style={{ margin: "0 auto 32px" }}>{freeDaily} messages per day on the Free plan. No credit card required.</p>
        <Link to="/login?mode=signup" className="btn btn-primary">Create free account</Link>
      </section>

      <Footer />
    </div>
  );
}
