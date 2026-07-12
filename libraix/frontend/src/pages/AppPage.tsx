import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import {
  Logo,
  IconPlus,
  IconSend,
  IconAttach,
  IconSearch,
  IconMenu,
  IconCopy,
} from "../components/Layout";
import { ComparePanel } from "../components/ComparePanel";
import { useAuth } from "../lib/auth";
import { advancedApi, type Project, type RouterMode } from "../lib/advanced";
import {
  chatApi,
  type ChatMessage,
  type Conversation,
  type ModelInfo,
} from "../lib/api";
import { friendlyError } from "../lib/errors";

function groupConversations(conversations: Conversation[]) {
  const now = new Date();
  const today = now.toDateString();
  const yesterday = new Date(now.getTime() - 86400000).toDateString();
  const weekAgo = now.getTime() - 7 * 86400000;

  const groups: { label: string; items: Conversation[] }[] = [
    { label: "Today", items: [] },
    { label: "Yesterday", items: [] },
    { label: "Previous 7 Days", items: [] },
    { label: "Older", items: [] },
  ];

  for (const c of conversations) {
    const d = new Date(c.updatedAt);
    const ds = d.toDateString();
    if (ds === today) groups[0].items.push(c);
    else if (ds === yesterday) groups[1].items.push(c);
    else if (d.getTime() >= weekAgo) groups[2].items.push(c);
    else groups[3].items.push(c);
  }

  return groups.filter((g) => g.items.length > 0);
}

export function AppPage() {
  const { user, usage, logout, refresh } = useAuth();
  const navigate = useNavigate();
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [conversations, setConversations] = useState<Conversation[]>([]);
  const [projects, setProjects] = useState<Project[]>([]);
  const [activeId, setActiveId] = useState<string | null>(null);
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [models, setModels] = useState<ModelInfo[]>([]);
  const [routerModes, setRouterModes] = useState<RouterMode[]>([]);
  const [modelId, setModelId] = useState("libraix-fast");
  const [routerMode, setRouterMode] = useState("auto");
  const [searchQuery, setSearchQuery] = useState("");
  const [input, setInput] = useState("");
  const [loading, setLoading] = useState(false);
  const [streaming, setStreaming] = useState(false);
  const [error, setError] = useState("");
  const [showCompare, setShowCompare] = useState(false);
  const [routerHint, setRouterHint] = useState("");
  const chatEndRef = useRef<HTMLDivElement>(null);
  const abortRef = useRef(false);

  const loadConversations = useCallback(async () => {
    const data = await chatApi.conversations();
    setConversations(data.conversations);
  }, []);

  useEffect(() => {
    chatApi.models().then((d) => {
      setModels(d.models);
      if (d.models.length) setModelId(d.models[0].id);
    });
    advancedApi.routerModes().then((d) => setRouterModes(d.modes)).catch(() => {});
    loadConversations().catch(console.error);
    advancedApi.projects().then((d) => setProjects(d.projects)).catch(() => {});
  }, [loadConversations]);

  useEffect(() => {
    chatEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages, loading, streaming]);

  useEffect(() => {
    if (!input.trim() || routerMode !== "auto") {
      setRouterHint("");
      return;
    }
    const t = setTimeout(() => {
      advancedApi.routerPreview(input.slice(0, 200), routerMode, modelId)
        .then((r) => setRouterHint(`${r.displayName} · ${r.reason}`))
        .catch(() => setRouterHint(""));
    }, 500);
    return () => clearTimeout(t);
  }, [input, routerMode, modelId]);

  const filteredConversations = useMemo(() => {
    if (!searchQuery.trim()) return conversations;
    const q = searchQuery.toLowerCase();
    return conversations.filter((c) => c.title.toLowerCase().includes(q));
  }, [conversations, searchQuery]);

  const grouped = groupConversations(filteredConversations);

  const selectConversation = async (id: string) => {
    setActiveId(id);
    setSidebarOpen(false);
    const data = await chatApi.getConversation(id);
    setMessages(data.messages);
    setModelId(data.conversation.modelId);
  };

  const newChat = async () => {
    const conv = await chatApi.createConversation(modelId);
    setConversations((prev) => [conv, ...prev]);
    setActiveId(conv.id);
    setMessages([]);
    setSidebarOpen(false);
  };

  const sendMessage = async (text?: string) => {
    const content = (text ?? input).trim();
    if (!content || loading || streaming) return;
    if (usage?.limitReached) {
      setError("Daily message limit reached. Upgrade to Pro for more.");
      return;
    }

    setError("");
    setInput("");
    setLoading(true);
    abortRef.current = false;

    let convId = activeId;
    if (!convId) {
      const conv = await chatApi.createConversation(modelId, content.slice(0, 40));
      convId = conv.id;
      setActiveId(convId);
      setConversations((prev) => [conv, ...prev]);
    }

    const userMsg: ChatMessage = {
      id: crypto.randomUUID(),
      role: "user",
      content,
      createdAt: new Date().toISOString(),
    };
    setMessages((prev) => [...prev, userMsg]);

    try {
      await chatApi.addMessage(convId, "user", content);
      const history = messages.map((m) => ({ role: m.role, content: m.content }));

      const assistantId = crypto.randomUUID();
      setStreaming(true);
      setLoading(false);

      let fullContent = "";
      setMessages((prev) => [...prev, { id: assistantId, role: "assistant", content: "", createdAt: new Date().toISOString() }]);

      try {
        for await (const chunk of advancedApi.streamRespond({
          message: content,
          modelId: routerMode === "auto" ? undefined : modelId,
          routerMode,
          history,
        })) {
          if (abortRef.current) break;
          fullContent += chunk;
          setMessages((prev) => prev.map((m) => (m.id === assistantId ? { ...m, content: fullContent } : m)));
        }
      } catch {
        /* stream unavailable — fall back below */
      }

      if (!fullContent.trim()) {
        const result = await chatApi.respond({
          message: content,
          modelId: routerMode === "auto" ? undefined : modelId,
          routerMode,
          history,
        });
        fullContent = result.content;
        if (result.modelId) setModelId(result.modelId);
        setMessages((prev) => prev.map((m) => (m.id === assistantId ? { ...m, content: fullContent } : m)));
      }

      if (fullContent) {
        await chatApi.addMessage(convId, "assistant", fullContent);
      }
      await refresh();
      loadConversations();
    } catch (err) {
      const msg = err instanceof Error ? err.message : "Failed to send";
      setError(friendlyError(msg, msg));
      setMessages((prev) => prev.filter((m) => m.id !== userMsg.id));
    } finally {
      setLoading(false);
      setStreaming(false);
    }
  };

  const stopGeneration = () => {
    abortRef.current = true;
    setStreaming(false);
  };

  const copyMessage = (content: string) => {
    navigator.clipboard.writeText(content);
  };

  const initials = user?.displayName?.[0] ?? user?.email[0]?.toUpperCase() ?? "?";

  return (
    <div className="app-shell">
      {sidebarOpen && <div className="overlay" onClick={() => setSidebarOpen(false)} />}
      <aside className={`sidebar ${sidebarOpen ? "open" : ""}`}>
        <div className="sidebar-header">
          <Logo to="/app" />
          <button className="icon-btn" onClick={newChat} title="New chat"><IconPlus /></button>
        </div>

        <div className="sidebar-body">
          <button className="btn btn-primary btn-sm" style={{ width: "100%", marginBottom: 12 }} onClick={newChat}>
            <IconPlus /> New Chat
          </button>

          <input
            className="input sidebar-search"
            placeholder="Search conversations…"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
          />

          {projects.length > 0 && (
            <div>
              <div className="sidebar-section-label">Projects</div>
              {projects.map((p) => (
                <button key={p.id} className="conv-item" title={p.description ?? undefined}>
                  <span>{p.name}</span>
                </button>
              ))}
            </div>
          )}

          {grouped.map((group) => (
            <div key={group.label}>
              <div className="sidebar-section-label">{group.label}</div>
              {group.items.map((c) => (
                <button
                  key={c.id}
                  className={`conv-item ${activeId === c.id ? "active" : ""}`}
                  onClick={() => selectConversation(c.id)}
                >
                  <span>{c.title}</span>
                </button>
              ))}
            </div>
          ))}
        </div>

        <div className="sidebar-footer">
          <div className="user-menu" onClick={() => navigate("/account")}>
            <div className="avatar">{initials}</div>
            <div style={{ flex: 1, minWidth: 0 }}>
              <div style={{ fontSize: 13, fontWeight: 600, overflow: "hidden", textOverflow: "ellipsis" }}>
                {user?.displayName ?? user?.email}
              </div>
              <div style={{ fontSize: 11, color: "var(--dim)", textTransform: "capitalize" }}>{user?.plan} plan</div>
            </div>
          </div>
          <div style={{ display: "flex", gap: 8, marginTop: 8 }}>
            <Link to="/settings" className="btn btn-ghost btn-sm" style={{ flex: 1 }}>Settings</Link>
            <button className="btn btn-ghost btn-sm" onClick={() => logout().then(() => navigate("/"))}>Sign out</button>
          </div>
        </div>
      </aside>

      <main className="main-panel">
        <header className="top-bar">
          <div style={{ display: "flex", alignItems: "center", gap: 12, flexWrap: "wrap" }}>
            <button className="icon-btn mobile-menu-btn" onClick={() => setSidebarOpen(true)}><IconMenu /></button>
            <select className="model-select" value={routerMode} onChange={(e) => setRouterMode(e.target.value)}>
              {routerModes.map((m) => (
                <option key={m.id} value={m.id}>{m.label}</option>
              ))}
            </select>
            {routerMode !== "auto" && (
              <select className="model-select" value={modelId} onChange={(e) => setModelId(e.target.value)}>
                {models.filter((m) => m.capabilities.chat).map((m) => (
                  <option key={m.id} value={m.id}>{m.displayName}</option>
                ))}
              </select>
            )}
          </div>
          <div style={{ display: "flex", gap: 8 }}>
            {user?.plan !== "free" && (
              <button className="btn btn-ghost btn-sm" onClick={() => setShowCompare((v) => !v)}>Compare</button>
            )}
            <Link to="/pricing" className="btn btn-ghost btn-sm">Upgrade</Link>
          </div>
        </header>

        {showCompare && <ComparePanel models={models} onClose={() => setShowCompare(false)} />}

        <div className="chat-area">
          {messages.length === 0 && !loading && !streaming ? (
            <div className="welcome-state">
              <h2>What can I help you with?</h2>
              <p>Chat with Libraix models. Use Auto mode to let the Smart Router pick the best model.</p>
              <div className="suggestion-row">
                {["Write an email", "Explain a concept", "Business ideas", "Write code"].map((s) => (
                  <button key={s} className="suggestion-chip" onClick={() => sendMessage(s)}>{s}</button>
                ))}
              </div>
            </div>
          ) : (
            messages.map((m) => (
              <div key={m.id} className={`message ${m.role}`}>
                <div className="bubble">{m.content || (streaming && m.role === "assistant" ? "▍" : "")}</div>
                {m.role === "assistant" && m.content && (
                  <div className="msg-actions">
                    <button className="msg-action" onClick={() => copyMessage(m.content)}><IconCopy /> Copy</button>
                  </div>
                )}
              </div>
            ))
          )}
          {loading && (
            <div className="message assistant">
              <div className="bubble loading-dots">Thinking</div>
            </div>
          )}
          <div ref={chatEndRef} />
        </div>

        <div className="composer-wrap">
          {usage && (
            <div className={`usage-bar ${usage.limitReached ? "usage-limit" : ""}`}>
              {usage.limitReached
                ? `Daily limit reached (${usage.messagesUsed}/${usage.messagesLimit} messages used on ${usage.plan} plan).`
                : `${usage.remainingMessages} of ${usage.messagesLimit} messages remaining today`}
              {routerHint && routerMode === "auto" && !usage.limitReached && <span> · {routerHint}</span>}
            </div>
          )}
          {error && <div className="error-banner" style={{ maxWidth: 780, margin: "0 auto 8px" }}>{error}</div>}
          <div className="composer">
            <div className="composer-actions">
              <button className="icon-btn" title="File upload — coming soon" disabled><IconAttach /></button>
              <button className="icon-btn" title="Web search — coming soon" disabled><IconSearch /></button>
            </div>
            <textarea
              rows={1}
              placeholder="Message Libraix…"
              value={input}
              onChange={(e) => setInput(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === "Enter" && !e.shiftKey) {
                  e.preventDefault();
                  sendMessage();
                }
              }}
            />
            {streaming ? (
              <button className="send-btn" onClick={stopGeneration} title="Stop">■</button>
            ) : (
              <button className="send-btn" disabled={!input.trim() || loading} onClick={() => sendMessage()}>
                <IconSend />
              </button>
            )}
          </div>
        </div>
      </main>
    </div>
  );
}
