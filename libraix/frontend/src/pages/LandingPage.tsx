import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { PublicNav, Footer } from "../components/Layout";
import { catalogApi, type Catalog } from "../lib/api";

export function LandingPage() {
  const [catalog, setCatalog] = useState<Catalog | null>(null);

  useEffect(() => {
    catalogApi.get().then(setCatalog).catch(console.error);
  }, []);

  const modelCount = catalog?.modelCount ?? 4;
  const toolCount = catalog?.toolCount ?? 9;
  const assistantCount = catalog?.assistantCount ?? 5;

  return (
    <div className="page-container">
      <PublicNav />

      <section className="hero">
        <h1>
          Your AI.<br />
          Everything in one place.
        </h1>
        <p>
          Chat with {modelCount} AI models. Generate images, analyse PDFs, search the web and summarise videos — all from one workspace. Free to start.
        </p>
        <div className="hero-actions">
          <Link to="/login?mode=signup" className="btn btn-primary">Start for free</Link>
          <a href="#features" className="btn btn-ghost">See how it works</a>
        </div>
        <div className="stats-row">
          <div className="stat"><div className="stat-num">{modelCount}</div><div className="stat-label">AI models</div></div>
          <div className="stat"><div className="stat-num">{toolCount}</div><div className="stat-label">Tools in one app</div></div>
          <div className="stat"><div className="stat-num">£0</div><div className="stat-label">To get started</div></div>
        </div>
      </section>

      <section className="section" id="features">
        <div className="section-label">Features</div>
        <h2 className="section-title">Everything you need in one place</h2>
        <p className="section-sub">Stop juggling separate subscriptions. Libraix gives you {toolCount} AI tools for one low price.</p>
        <div className="card-grid">
          {catalog?.tools.map((tool) => (
            <div className="feature-card" key={tool.id}>
              <h3>{tool.name}</h3>
              <p>{tool.description}</p>
              <span className={`badge ${tool.tier === "free" ? "badge-free" : "badge-pro"}`}>
                {tool.tier === "free" ? "Free" : "Pro"}
              </span>
            </div>
          )) ?? (
            <>
              <div className="feature-card"><h3>Multi-Model Chat</h3><p>Switch between models in one conversation.</p><span className="badge badge-free">Free</span></div>
              <div className="feature-card"><h3>PDF Chat</h3><p>Upload and question any document.</p><span className="badge badge-free">Free</span></div>
              <div className="feature-card"><h3>AI Image Generator</h3><p>Text-to-image with current OpenAI models.</p><span className="badge badge-pro">Pro</span></div>
            </>
          )}
        </div>
      </section>

      <section className="section" id="models">
        <div className="section-label">AI Models</div>
        <h2 className="section-title">Every top model. One subscription.</h2>
        <p className="section-sub">Stop paying separately for each AI. Get all {modelCount} models from £9/month.</p>
        <div className="model-grid">
          {catalog?.models.map((m) => (
            <div className="model-chip" key={m.id}>
              {m.displayName}
              <span className={`badge ${m.tier === "free" ? "badge-free" : "badge-pro"}`}>
                {m.tier === "free" ? "Free" : "Pro"}
              </span>
            </div>
          ))}
        </div>
      </section>

      <section className="section">
        <div className="section-label">Assistants</div>
        <h2 className="section-title">{assistantCount} specialist AI assistants</h2>
        <p className="section-sub">Pre-tuned agents for writing, coding, business and more — available on Pro.</p>
        <div className="card-grid">
          {catalog?.assistants.map((a) => (
            <div className="feature-card" key={a.id}>
              <h3>{a.name}</h3>
              <p>{a.description}</p>
            </div>
          ))}
        </div>
      </section>

      <section className="section" style={{ textAlign: "center" }}>
        <h2 className="section-title">Start thinking smarter today</h2>
        <p className="section-sub" style={{ margin: "0 auto 32px" }}>No credit card. No commitment. Just sign up and start.</p>
        <Link to="/login?mode=signup" className="btn btn-primary">Create free account</Link>
      </section>

      <Footer />
    </div>
  );
}
