import { useEffect, useState } from "react";
import { Link, useParams } from "react-router-dom";
import { MarkdownMessage } from "../components/MarkdownMessage";
import { Logo } from "../components/Layout";
import { workspaceApi } from "../lib/workspaceApi";
import { friendlyError } from "../lib/errors";

export function SharePage() {
  const { token = "" } = useParams();
  const [title, setTitle] = useState("");
  const [messages, setMessages] = useState<{ role: string; content: string }[]>([]);
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!token) return;
    setLoading(true);
    workspaceApi
      .getShared(token)
      .then((data) => {
        setTitle(data.title);
        setMessages(data.messages);
      })
      .catch((e) => setError(friendlyError(e instanceof Error ? e.message : "NOT_FOUND", "Shared chat not found")))
      .finally(() => setLoading(false));
  }, [token]);

  return (
    <div className="share-page">
      <header className="share-header">
        <Logo to="/" />
        <div>
          <p className="share-kicker">Shared conversation</p>
          <h1>{title || "Libraix chat"}</h1>
        </div>
        <Link to="/signup" className="btn btn-primary btn-sm">
          Try Libraix
        </Link>
      </header>
      <main className="share-body">
        {loading && <p className="dim">Loading…</p>}
        {error && <div className="error-banner">{error}</div>}
        {messages.map((m, i) => (
          <div key={i} className={`message ${m.role}`}>
            <div className="bubble">
              {m.role === "assistant" ? (
                <MarkdownMessage content={m.content} />
              ) : (
                m.content
              )}
            </div>
          </div>
        ))}
      </main>
    </div>
  );
}
