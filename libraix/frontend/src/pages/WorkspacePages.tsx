import { useState } from "react";
import { Link } from "react-router-dom";
import { toolsApi, type SourceHit } from "../lib/tools";
import { friendlyError } from "../lib/errors";

function Soon({ title, tagline }: { title: string; tagline: string }) {
  return (
    <div style={{ minHeight: "100vh", display: "grid", placeItems: "center", padding: 24 }}>
      <div style={{ maxWidth: 520, textAlign: "center" }}>
        <p style={{ opacity: 0.7, fontSize: 13, letterSpacing: 1 }}>COMING SOON</p>
        <h1 style={{ margin: "0 0 10px" }}>{title}</h1>
        <p style={{ opacity: 0.75, margin: "0 0 22px" }}>{tagline}</p>
        <Link to="/app" className="btn btn-primary">Back to Chat</Link>
      </div>
    </div>
  );
}

export function SearchWorkspace() {
  const [query, setQuery] = useState("");
  const [provider, setProvider] = useState<"all" | "wikipedia" | "web">("all");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [hits, setHits] = useState<SourceHit[]>([]);

  const run = async () => {
    if (!query.trim() || loading) return;
    setLoading(true);
    setError("");
    try {
      const data = await toolsApi.search(query.trim(), provider);
      setHits(data.sources?.length ? data.sources : [...(data.wikipedia ?? []), ...(data.web ?? [])]);
    } catch (e) {
      setHits([]);
      setError(friendlyError(e instanceof Error ? e.message : "SEARCH_FAILED", "Search failed"));
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="search-workspace">
      <Link to="/app" className="btn btn-ghost btn-sm" style={{ marginBottom: 16 }}>
        ← Chat
      </Link>
      <h1>Libraix Search</h1>
      <p className="tagline">
        Fast Wikipedia + web sources, cached for repeat lookups. Open any result — Wikipedia links go straight to the article.
      </p>

      <div className="search-bar-row">
        <input
          className="input"
          placeholder="Search people, topics, facts…"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === "Enter") run();
          }}
        />
        <button className="btn btn-primary" disabled={loading || !query.trim()} onClick={run}>
          {loading ? "Searching…" : "Search"}
        </button>
      </div>

      <div className="search-provider">
        {(
          [
            ["all", "All sources"],
            ["wikipedia", "Wikipedia"],
            ["web", "Web"],
          ] as const
        ).map(([id, label]) => (
          <button
            key={id}
            type="button"
            className={`btn btn-ghost btn-sm ${provider === id ? "active" : ""}`}
            onClick={() => setProvider(id)}
          >
            {label}
          </button>
        ))}
      </div>

      {error && <div className="error-banner">{error}</div>}

      <div>
        {hits.map((h, i) => (
          <div key={`${h.url}-${i}`} className="search-hit">
            <a href={h.url} target="_blank" rel="noopener noreferrer">
              {h.title}
            </a>
            <span className="badge">
              {h.kind ?? (/wikipedia\.org/i.test(h.url) ? "wikipedia" : "web")}
            </span>
            {h.snippet && <p>{h.snippet}</p>}
          </div>
        ))}
        {!loading && !error && hits.length === 0 && query && (
          <p style={{ color: "var(--dim)" }}>No results yet — try another query.</p>
        )}
      </div>
    </div>
  );
}

export const LibraryWorkspace = () => <Soon title="Libraix Library" tagline="One home for every file you upload or generate, private to your account." />;
export const ImagesWorkspace = () => <Soon title="Libraix Images" tagline="Generate and edit images from a prompt, saved to your Library." />;
export const CodeWorkspace = () => <Soon title="Libraix Code" tagline="AI coding projects with clear diffs, tests and an isolated sandbox." />;
