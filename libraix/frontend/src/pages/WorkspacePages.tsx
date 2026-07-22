import { useEffect, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { toolsApi, type ResearchResult, type SourceHit } from "../lib/tools";
import { workspaceApi, type CustomAssistant, type PromptItem } from "../lib/workspaceApi";
import { friendlyError } from "../lib/errors";

export function SearchWorkspace() {
  const [tab, setTab] = useState<"search" | "research">("search");
  const [query, setQuery] = useState("");
  const [provider, setProvider] = useState<"all" | "wikipedia" | "web">("all");
  const [depth, setDepth] = useState<"quick" | "standard" | "deep">("standard");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [hits, setHits] = useState<SourceHit[]>([]);
  const [research, setResearch] = useState<ResearchResult | null>(null);

  const runSearch = async () => {
    if (!query.trim() || loading) return;
    setLoading(true);
    setError("");
    setResearch(null);
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

  const runResearch = async () => {
    if (!query.trim() || loading) return;
    setLoading(true);
    setError("");
    setHits([]);
    setResearch(null);
    try {
      const data = await toolsApi.research(query.trim(), depth);
      setResearch(data);
    } catch (e) {
      setResearch(null);
      setError(
        friendlyError(
          e instanceof Error ? e.message : "FEATURE_DISABLED",
          "Deep Research needs Pro — or try again in a moment.",
        ),
      );
    } finally {
      setLoading(false);
    }
  };

  const run = () => {
    if (tab === "research") void runResearch();
    else void runSearch();
  };

  return (
    <div className="search-workspace">
      <Link to="/app" className="btn btn-ghost btn-sm" style={{ marginBottom: 16 }}>
        ← Chat
      </Link>
      <h1>Libraix Search</h1>
      <p className="tagline">
        Fast Wikipedia + web lookup, or Deep Research for a cited multi-step report. Open any source link directly.
      </p>

      <div className="search-provider" style={{ marginBottom: 16 }}>
        <button
          type="button"
          className={`btn btn-ghost btn-sm ${tab === "search" ? "active" : ""}`}
          onClick={() => setTab("search")}
        >
          Quick search
        </button>
        <button
          type="button"
          className={`btn btn-ghost btn-sm ${tab === "research" ? "active" : ""}`}
          onClick={() => setTab("research")}
        >
          Deep Research
        </button>
      </div>

      <div className="search-bar-row">
        <input
          className="input"
          placeholder={tab === "research" ? "Research question…" : "Search people, topics, facts…"}
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === "Enter") run();
          }}
        />
        <button className="btn btn-primary" disabled={loading || !query.trim()} onClick={run}>
          {loading ? (tab === "research" ? "Researching…" : "Searching…") : tab === "research" ? "Research" : "Search"}
        </button>
      </div>

      {tab === "search" ? (
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
      ) : (
        <div className="search-provider">
          {(
            [
              ["quick", "Quick"],
              ["standard", "Standard"],
              ["deep", "Deep"],
            ] as const
          ).map(([id, label]) => (
            <button
              key={id}
              type="button"
              className={`btn btn-ghost btn-sm ${depth === id ? "active" : ""}`}
              onClick={() => setDepth(id)}
            >
              {label}
            </button>
          ))}
        </div>
      )}

      {error && <div className="error-banner">{error}</div>}

      {tab === "search" && (
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
      )}

      {tab === "research" && research && (
        <div className="research-report">
          <div className="research-meta">
            <span className="badge badge-beta">Deep Research</span>
            <span className="badge">Confidence: {research.confidence}</span>
          </div>
          <h2>Summary</h2>
          <p>{research.summary}</p>
          {research.keyFindings?.length > 0 && (
            <>
              <h3>Key findings</h3>
              <ul>
                {research.keyFindings.map((f, i) => (
                  <li key={i}>{f}</li>
                ))}
              </ul>
            </>
          )}
          {research.methodology && (
            <>
              <h3>Methodology</h3>
              <p className="dim">{research.methodology}</p>
            </>
          )}
          {research.sources?.length > 0 && (
            <>
              <h3>Sources</h3>
              <div>
                {research.sources.map((s, i) => (
                  <div key={`${s.url}-${i}`} className="search-hit">
                    <a href={s.url} target="_blank" rel="noopener noreferrer">
                      {s.title || s.url}
                    </a>
                    {s.snippet && <p>{s.snippet}</p>}
                  </div>
                ))}
              </div>
            </>
          )}
          {research.disclaimer && <p className="dim research-disclaimer">{research.disclaimer}</p>}
        </div>
      )}
    </div>
  );
}

/** Prompt library + custom assistants hub */
export function LibraryWorkspace() {
  const navigate = useNavigate();
  const [tab, setTab] = useState<"prompts" | "assistants">("prompts");
  const [prompts, setPrompts] = useState<PromptItem[]>([]);
  const [assistants, setAssistants] = useState<CustomAssistant[]>([]);
  const [error, setError] = useState("");
  const [title, setTitle] = useState("");
  const [body, setBody] = useState("");
  const [aName, setAName] = useState("");
  const [aDesc, setADesc] = useState("");
  const [aPrompt, setAPrompt] = useState("");

  const reload = () => {
    workspaceApi.prompts().then((d) => setPrompts(d.prompts)).catch(() => {});
    workspaceApi
      .customAssistants()
      .then((d) => setAssistants(d.assistants))
      .catch((e) => setError(friendlyError(e instanceof Error ? e.message : "", "Could not load assistants")));
  };

  useEffect(() => {
    reload();
  }, []);

  return (
    <div className="search-workspace library-workspace">
      <Link to="/app" className="btn btn-ghost btn-sm" style={{ marginBottom: 16 }}>
        ← Chat
      </Link>
      <h1>Library</h1>
      <p className="tagline">Saved prompts and your custom assistants — reuse anytime in chat.</p>

      <div className="search-provider" style={{ marginBottom: 20 }}>
        <button type="button" className={`btn btn-ghost btn-sm ${tab === "prompts" ? "active" : ""}`} onClick={() => setTab("prompts")}>
          Prompt library
        </button>
        <button type="button" className={`btn btn-ghost btn-sm ${tab === "assistants" ? "active" : ""}`} onClick={() => setTab("assistants")}>
          Custom assistants
        </button>
      </div>

      {error && <div className="error-banner">{error}</div>}

      {tab === "prompts" && (
        <>
          <div className="library-form">
            <input className="input" placeholder="Prompt title" value={title} onChange={(e) => setTitle(e.target.value)} />
            <textarea className="input" rows={4} placeholder="Prompt text…" value={body} onChange={(e) => setBody(e.target.value)} />
            <button
              className="btn btn-primary"
              disabled={!title.trim() || !body.trim()}
              onClick={async () => {
                try {
                  await workspaceApi.createPrompt(title.trim(), body.trim());
                  setTitle("");
                  setBody("");
                  reload();
                } catch (e) {
                  setError(friendlyError(e instanceof Error ? e.message : "", "Could not save prompt"));
                }
              }}
            >
              Save prompt
            </button>
          </div>
          <div className="library-list">
            {prompts.map((p) => (
              <div key={p.id} className="library-card">
                <strong>{p.title}</strong>
                <p>{p.body}</p>
                <div className="library-card-actions">
                  <button
                    type="button"
                    className="btn btn-ghost btn-sm"
                    onClick={() => {
                      try {
                        sessionStorage.setItem("libraix_prefill", p.body);
                      } catch { /* ignore */ }
                      navigate("/app");
                    }}
                  >
                    Use in chat
                  </button>
                  <button
                    type="button"
                    className="btn btn-ghost btn-sm"
                    onClick={async () => {
                      await workspaceApi.deletePrompt(p.id);
                      reload();
                    }}
                  >
                    Delete
                  </button>
                </div>
              </div>
            ))}
            {prompts.length === 0 && <p className="dim">No saved prompts yet.</p>}
          </div>
        </>
      )}

      {tab === "assistants" && (
        <>
          <div className="library-form">
            <input className="input" placeholder="Assistant name" value={aName} onChange={(e) => setAName(e.target.value)} />
            <input className="input" placeholder="Short description" value={aDesc} onChange={(e) => setADesc(e.target.value)} />
            <textarea
              className="input"
              rows={5}
              placeholder="System instructions (how this assistant should behave)…"
              value={aPrompt}
              onChange={(e) => setAPrompt(e.target.value)}
            />
            <button
              className="btn btn-primary"
              disabled={!aName.trim() || !aPrompt.trim()}
              onClick={async () => {
                try {
                  await workspaceApi.createAssistant({
                    name: aName.trim(),
                    description: aDesc.trim(),
                    systemPrompt: aPrompt.trim(),
                  });
                  setAName("");
                  setADesc("");
                  setAPrompt("");
                  reload();
                } catch (e) {
                  setError(friendlyError(e instanceof Error ? e.message : "", "Could not create assistant"));
                }
              }}
            >
              Create assistant
            </button>
          </div>
          <div className="library-list">
            {assistants.map((a) => (
              <div key={a.id} className="library-card">
                <strong>🧩 {a.name}</strong>
                {a.description && <p className="dim">{a.description}</p>}
                <p>{a.systemPrompt.slice(0, 220)}{a.systemPrompt.length > 220 ? "…" : ""}</p>
                <div className="library-card-actions">
                  <button
                    type="button"
                    className="btn btn-ghost btn-sm"
                    onClick={() => {
                      try {
                        sessionStorage.setItem("libraix_custom_assistant", a.id);
                      } catch { /* ignore */ }
                      navigate("/app");
                    }}
                  >
                    Open in chat
                  </button>
                  <button
                    type="button"
                    className="btn btn-ghost btn-sm"
                    onClick={async () => {
                      await workspaceApi.deleteAssistant(a.id);
                      reload();
                    }}
                  >
                    Delete
                  </button>
                </div>
              </div>
            ))}
            {assistants.length === 0 && <p className="dim">No custom assistants yet — create one above.</p>}
          </div>
        </>
      )}
    </div>
  );
}

/** Browser sandboxed JS runner (+ tips for Python via AI) */
export function CodeWorkspace() {
  const [code, setCode] = useState(`// Libraix Code Sandbox\nconst name = "Libraix";\nconsole.log("Hello from", name);\n\n// Return a value to see it below:\nreturn 2 + 2;`);
  const [output, setOutput] = useState("");
  const [running, setRunning] = useState(false);

  const run = () => {
    setRunning(true);
    const logs: string[] = [];
    const fakeConsole = {
      log: (...args: unknown[]) => logs.push(args.map(String).join(" ")),
      error: (...args: unknown[]) => logs.push("Error: " + args.map(String).join(" ")),
      warn: (...args: unknown[]) => logs.push("Warn: " + args.map(String).join(" ")),
    };
    try {
      // eslint-disable-next-line no-new-func
      const fn = new Function("console", `"use strict";\n${code}`);
      const result = fn(fakeConsole);
      if (result !== undefined) logs.push("→ " + String(result));
      setOutput(logs.join("\n") || "(no output)");
    } catch (e) {
      setOutput((e instanceof Error ? e.message : String(e)));
    } finally {
      setRunning(false);
    }
  };

  return (
    <div className="search-workspace code-workspace">
      <Link to="/app" className="btn btn-ghost btn-sm" style={{ marginBottom: 16 }}>
        ← Chat
      </Link>
      <h1>Code Sandbox</h1>
      <p className="tagline">
        Run JavaScript safely in your browser. For Python/data work, use the Coding Expert assistant in chat.
      </p>
      <textarea className="code-editor input" rows={14} value={code} onChange={(e) => setCode(e.target.value)} spellCheck={false} />
      <div style={{ display: "flex", gap: 8, margin: "12px 0" }}>
        <button className="btn btn-primary" onClick={run} disabled={running}>
          {running ? "Running…" : "Run"}
        </button>
        <button className="btn btn-ghost" onClick={() => setCode("")}>
          Clear
        </button>
      </div>
      <pre className="code-output">{output || "Output appears here."}</pre>
    </div>
  );
}

export const ImagesWorkspace = () => null;
