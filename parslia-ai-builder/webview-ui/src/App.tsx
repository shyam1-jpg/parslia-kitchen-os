import { useEffect, useMemo, useRef, useState } from "react";
import type { ProjectAnalysis, ProposedChanges, UiMessage } from "./types";
import { DiffReview } from "./components/DiffReview";
import { ProjectSummary } from "./components/ProjectSummary";

const vscode = acquireVsCodeApi();

function uid(): string {
  return `m_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`;
}

export function App() {
  const [messages, setMessages] = useState<UiMessage[]>([
    {
      id: "welcome",
      role: "assistant",
      content:
        "Parslia AI Builder is ready. Analyse your project, then ask for hospitality features like menu planning, allergen automation, stock alerts, or supplier updates.",
      status: "done"
    }
  ]);
  const [input, setInput] = useState("");
  const [status, setStatus] = useState("Idle");
  const [busy, setBusy] = useState(false);
  const [analysis, setAnalysis] = useState<ProjectAnalysis | null>(null);
  const [proposal, setProposal] = useState<ProposedChanges | null>(null);
  const [usage, setUsage] = useState({ totalTokens: 0 });
  const [hasApiKey, setHasApiKey] = useState(true);
  const [model, setModel] = useState("gpt-4.1");
  const endRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const onMessage = (event: MessageEvent) => {
      const msg = event.data;
      if (!msg?.type) return;
      switch (msg.type) {
        case "config":
          setHasApiKey(Boolean(msg.payload?.hasApiKey));
          setModel(msg.payload?.model || "gpt-4.1");
          break;
        case "status":
          setStatus(msg.payload?.message || "Working…");
          setBusy(true);
          break;
        case "message": {
          if (msg.payload?.reset) {
            setMessages([
              {
                id: uid(),
                role: "assistant",
                content: msg.payload.content,
                status: "done"
              }
            ]);
            setProposal(null);
            break;
          }
          setMessages((prev) => [
            ...prev,
            {
              id: uid(),
              role: msg.payload.role || "assistant",
              content: msg.payload.content || "",
              status: msg.payload.status,
              pendingChanges: msg.payload.pendingChanges
            }
          ]);
          if (msg.payload.pendingChanges) {
            setProposal(msg.payload.pendingChanges);
          }
          break;
        }
        case "proposal":
          setProposal(msg.payload);
          break;
        case "analysis":
          setAnalysis(msg.payload);
          break;
        case "usage":
          setUsage({ totalTokens: msg.payload?.totalTokens || 0 });
          break;
        case "error":
          setMessages((prev) => [
            ...prev,
            {
              id: uid(),
              role: "assistant",
              content: `Error: ${msg.payload?.message || "Unknown error"}`,
              status: "error"
            }
          ]);
          setBusy(false);
          setStatus("Error");
          break;
        case "done":
          setBusy(false);
          setStatus(msg.payload?.awaitingApproval ? "Awaiting approval" : "Idle");
          break;
        case "tool":
          if (msg.payload?.status === "running") {
            setStatus(`Tool: ${msg.payload.name}`);
          }
          break;
      }
    };
    window.addEventListener("message", onMessage);
    vscode.postMessage({ type: "ready" });
    return () => window.removeEventListener("message", onMessage);
  }, []);

  useEffect(() => {
    endRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages, proposal, status]);

  const examples = useMemo(
    () => [
      "Create a menu-planning page",
      "Add allergen automation",
      "Create fridge temperature records",
      "Add supplier price updates"
    ],
    []
  );

  function send(mode: "chat" | "build" = "build") {
    const message = input.trim();
    if (!message || busy) return;
    setInput("");
    setBusy(true);
    setStatus("Sending…");
    if (mode === "build") {
      vscode.postMessage({ type: "buildFeature", payload: { message } });
    } else {
      vscode.postMessage({ type: "chat", payload: { message } });
    }
  }

  return (
    <div className="app">
      <header className="hero">
        <div className="brand-mark" aria-hidden="true" />
        <div>
          <p className="eyebrow">Hospitality coding agent</p>
          <h1>Parslia AI Builder</h1>
          <p className="lede">Chat with the project, propose multi-file changes, review diffs, then run tests.</p>
        </div>
      </header>

      {!hasApiKey && (
        <div className="banner warn">
          Set <code>parslia.openaiApiKey</code> in VS Code settings (or <code>OPENAI_API_KEY</code>) to enable the agent.
        </div>
      )}

      <div className="meta-row">
        <span>{model}</span>
        <span>{usage.totalTokens} tokens</span>
        <span className={busy ? "pulse" : ""}>{status}</span>
      </div>

      {analysis && <ProjectSummary analysis={analysis} />}

      <div className="actions">
        <button type="button" onClick={() => vscode.postMessage({ type: "analyse" })} disabled={busy}>
          Analyse project
        </button>
        <button type="button" onClick={() => vscode.postMessage({ type: "runTestsFix" })} disabled={busy}>
          Run tests & fix
        </button>
        <button type="button" onClick={() => vscode.postMessage({ type: "undo" })}>
          Undo
        </button>
        <button type="button" onClick={() => vscode.postMessage({ type: "clearChat" })}>
          Clear
        </button>
      </div>

      <section className="feed" aria-live="polite">
        {messages.map((m) => (
          <article key={m.id} className={`bubble ${m.role} ${m.status || ""}`}>
            <header>{m.role}</header>
            <div className="body">{m.content}</div>
          </article>
        ))}

        {proposal && (
          <DiffReview
            proposal={proposal}
            disabled={busy}
            onApprove={() => {
              setBusy(true);
              vscode.postMessage({ type: "approveChanges" });
            }}
            onReject={() => {
              setProposal(null);
              vscode.postMessage({ type: "rejectChanges" });
            }}
          />
        )}
        <div ref={endRef} />
      </section>

      <div className="examples">
        {examples.map((ex) => (
          <button key={ex} type="button" className="chip" onClick={() => setInput(ex)} disabled={busy}>
            {ex}
          </button>
        ))}
      </div>

      <form
        className="composer"
        onSubmit={(e) => {
          e.preventDefault();
          send("build");
        }}
      >
        <textarea
          value={input}
          onChange={(e) => setInput(e.target.value)}
          placeholder="Create a stock-management page with products, quantities, low-stock alerts and supplier information…"
          rows={3}
          onKeyDown={(e) => {
            if (e.key === "Enter" && !e.shiftKey) {
              e.preventDefault();
              send("build");
            }
          }}
        />
        <div className="composer-actions">
          <button type="button" onClick={() => send("chat")} disabled={busy || !input.trim()}>
            Chat
          </button>
          <button type="submit" className="primary" disabled={busy || !input.trim()}>
            Build feature
          </button>
        </div>
      </form>
    </div>
  );
}
