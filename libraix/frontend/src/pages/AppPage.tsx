import { useCallback, useEffect, useRef, useState } from "react";
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
import { useAuth } from "../lib/auth";
import {
  chatApi,
  type ChatMessage,
  type Conversation,
  type ModelInfo,
} from "../lib/api";

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
  const [activeId, setActiveId] = useState<string | null>(null);
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [models, setModels] = useState<ModelInfo[]>([]);
  const [modelId, setModelId] = useState("libraix-fast");
  const [input, setInput] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const chatEndRef = useRef<HTMLDivElement>(null);

  const loadConversations = useCallback(async () => {
    const data = await chatApi.conversations();
    setConversations(data.conversations);
  }, []);

  useEffect(() => {
    chatApi.models().then((d) => {
      setModels(d.models);
      if (d.models.length) setModelId(d.models[0].id);
    });
    loadConversations().catch(console.error);
  }, [loadConversations]);

  useEffect(() => {
    chatEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages, loading]);

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
    if (!content || loading) return;
    if (usage?.limitReached) {
      setError("Daily message limit reached. Upgrade to Pro for more.");
      return;
    }

    setError("");
    setInput("");
    setLoading(true);

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
      const result = await chatApi.respond({ message: content, modelId, history });
      const assistantMsg: ChatMessage = {
        id: crypto.randomUUID(),
        role: "assistant",
        content: result.content,
        createdAt: new Date().toISOString(),
      };
      setMessages((prev) => [...prev, assistantMsg]);
      await chatApi.addMessage(convId, "assistant", result.content);
      await refresh();
      loadConversations();
    } catch (err) {
      const msg = err instanceof Error ? err.message : "Failed to send";
      setError(msg === "USAGE_LIMIT_REACHED" ? "Daily limit reached." : msg);
      setMessages((prev) => prev.filter((m) => m.id !== userMsg.id));
    } finally {
      setLoading(false);
    }
  };

  const copyMessage = (content: string) => {
    navigator.clipboard.writeText(content);
  };

  const initials = user?.displayName?.[0] ?? user?.email[0]?.toUpperCase() ?? "?";
  const grouped = groupConversations(conversations);

  return (
    <div className="app-shell">
      {sidebarOpen && <div className="overlay" onClick={() => setSidebarOpen(false)} />}
      <aside className={`sidebar ${sidebarOpen ? "open" : ""}`}>
        <div className="sidebar-header">
          <Logo to="/app" />
          <button className="icon-btn" onClick={newChat} title="New chat">
            <IconPlus />
          </button>
        </div>

        <div className="sidebar-body">
          <button className="btn btn-primary btn-sm" style={{ width: "100%", marginBottom: 12 }} onClick={newChat}>
            <IconPlus /> New Chat
          </button>

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
          <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
            <button className="icon-btn mobile-menu-btn" onClick={() => setSidebarOpen(true)}>
              <IconMenu />
            </button>
            <select className="model-select" value={modelId} onChange={(e) => setModelId(e.target.value)}>
              {models.map((m) => (
                <option key={m.id} value={m.id}>{m.displayName}</option>
              ))}
            </select>
          </div>
          <Link to="/pricing" className="btn btn-ghost btn-sm">Upgrade</Link>
        </header>

        <div className="chat-area">
          {messages.length === 0 && !loading ? (
            <div className="welcome-state">
              <h2>What can I help you with?</h2>
              <p>Chat with Libraix models, generate images, analyse documents and more.</p>
              <div className="suggestion-row">
                {["Write an email", "Explain a concept", "Business ideas", "Write code"].map((s) => (
                  <button key={s} className="suggestion-chip" onClick={() => sendMessage(s)}>{s}</button>
                ))}
              </div>
            </div>
          ) : (
            messages.map((m) => (
              <div key={m.id} className={`message ${m.role}`}>
                <div className="bubble">{m.content}</div>
                {m.role === "assistant" && (
                  <div className="msg-actions">
                    <button className="msg-action" onClick={() => copyMessage(m.content)}>
                      <IconCopy /> Copy
                    </button>
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
            <div className="usage-bar">
              {usage.remainingMessages} of {usage.messagesLimit} messages remaining today
            </div>
          )}
          {error && <div className="error-banner" style={{ maxWidth: 780, margin: "0 auto 8px" }}>{error}</div>}
          <div className="composer">
            <div className="composer-actions">
              <button className="icon-btn" title="Attach file"><IconAttach /></button>
              <button className="icon-btn" title="Web search"><IconSearch /></button>
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
            <button className="send-btn" disabled={!input.trim() || loading} onClick={() => sendMessage()}>
              <IconSend />
            </button>
          </div>
        </div>
      </main>
    </div>
  );
}
