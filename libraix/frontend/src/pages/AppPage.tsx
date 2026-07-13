import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import {
  Logo,
  IconPlus,
  IconSend,
  IconAttach,
  IconSearch,
  IconMic,
  IconMenu,
  IconCopy,
} from "../components/Layout";
import { ComparePanel } from "../components/ComparePanel";
import { MarkdownMessage } from "../components/MarkdownMessage";
import { useAuth } from "../lib/auth";
import { useSpeechInput } from "../lib/useSpeechInput";
import { useSpeechOutput } from "../lib/useSpeechOutput";
import { toolsApi, detectUrls, isYoutubeUrl } from "../lib/tools";
import { advancedApi, type Project, type RouterMode } from "../lib/advanced";
import {
  chatApi,
  catalogApi,
  authApi,
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
  const [assistants, setAssistants] = useState<{ id: string; name: string; systemPrompt: string }[]>([]);
  const [assistantId, setAssistantId] = useState("");
  const [verifyNotice, setVerifyNotice] = useState("");
  const [attachLoading, setAttachLoading] = useState(false);
  const [urlTools, setUrlTools] = useState<string[]>([]);
  const chatEndRef = useRef<HTMLDivElement>(null);
  const abortRef = useRef(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const speech = useSpeechInput(setInput);
  const speechOut = useSpeechOutput();

  const loadConversations = useCallback(async () => {
    const data = await chatApi.conversations();
    setConversations(data.conversations);
  }, []);

  useEffect(() => {
    chatApi.models().then((d) => {
      setModels(d.models);
      const first = d.models.find((m) => m.available !== false && m.capabilities.chat) ?? d.models.find((m) => m.capabilities.chat);
      if (first) setModelId(first.id);
    });
    catalogApi.get().then((c) => setAssistants(c.assistants.map((a) => ({ id: a.id, name: a.name, systemPrompt: a.systemPrompt })))).catch(() => {});
    advancedApi.routerModes().then((d) => setRouterModes(d.modes)).catch(() => {});
    loadConversations().catch(console.error);
    advancedApi.projects().then((d) => setProjects(d.projects)).catch(() => {});
  }, [loadConversations]);

  const activeAssistant = assistants.find((a) => a.id === assistantId);
  const systemPrompt = activeAssistant?.systemPrompt;

  const handleFileAttach = async (file: File) => {
    setError("");
    const isPdf = file.name.match(/\.pdf$/i) || file.type === "application/pdf";
    const isText = file.name.match(/\.(txt|md|csv|json|log)$/i) || file.type.startsWith("text/");

    if (!isPdf && !isText) {
      setError("Supported files: PDF, .txt, .md, .csv, .json");
      return;
    }
    if (file.size > 5_000_000) {
      setError("File too large (max 5MB).");
      return;
    }

    setAttachLoading(true);
    try {
      if (isPdf || file.size > 200_000) {
        const doc = await toolsApi.parseFile(file);
        const header = `--- ${doc.filename}${doc.pageCount ? ` (${doc.pageCount} pages)` : ""}${doc.truncated ? " [truncated]" : ""} ---`;
        setInput((prev) => (prev ? `${prev}\n\n${header}\n${doc.text}` : `${header}\n${doc.text}`));
      } else {
        const text = await file.text();
        setInput((prev) => (prev ? `${prev}\n\n--- ${file.name} ---\n${text}` : `--- ${file.name} ---\n${text}`));
      }
    } catch (err) {
      setError(friendlyError(err instanceof Error ? err.message : "ATTACH_FAILED", "Could not read file"));
    } finally {
      setAttachLoading(false);
    }
  };

  useEffect(() => {
    setUrlTools(detectUrls(input));
  }, [input]);

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

    if (routerMode !== "auto") {
      const selected = models.find((m) => m.id === modelId);
      if (selected?.available === false) {
        setError(selected.unavailableReason ?? "This model is not available yet.");
        return;
      }
    }

    setError("");
    setInput("");
    speech.stop();
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
      let modelLabel = "";
      setMessages((prev) => [...prev, { id: assistantId, role: "assistant", content: "", createdAt: new Date().toISOString() }]);

      try {
        for await (const chunk of advancedApi.streamRespond({
          message: content,
          modelId: routerMode === "auto" ? undefined : modelId,
          routerMode,
          history,
          systemPrompt,
        })) {
          if (abortRef.current) break;
          if (typeof chunk === "object" && chunk.meta) {
            modelLabel = `Generated using ${chunk.meta.displayName} (${chunk.meta.provider}) through Libraix`;
            continue;
          }
          fullContent += chunk;
          setMessages((prev) => prev.map((m) => (m.id === assistantId ? { ...m, content: fullContent, modelLabel: modelLabel || m.modelLabel } : m)));
        }
      } catch (streamErr) {
        /* stream unavailable — fall back below */
        console.warn("Stream failed, using non-stream fallback:", streamErr);
      }

      if (!fullContent.trim()) {
        const result = await chatApi.respond({
          message: content,
          modelId: routerMode === "auto" ? undefined : modelId,
          routerMode,
          history,
          systemPrompt,
        });
        fullContent = result.content;
        modelLabel = result.displayName
          ? `Generated using ${result.displayName} (${result.provider ?? "provider"}) through Libraix`
          : "";
        if (result.modelId) setModelId(result.modelId);
        setMessages((prev) => prev.map((m) => (m.id === assistantId ? { ...m, content: fullContent, modelLabel } : m)));
      } else if (modelLabel) {
        setMessages((prev) => prev.map((m) => (m.id === assistantId ? { ...m, modelLabel } : m)));
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

  const runUrlTool = async (url: string) => {
    setError("");
    try {
      const result = isYoutubeUrl(url)
        ? await toolsApi.youtube(url, input.trim() || undefined)
        : await toolsApi.analyseLink(url, input.trim() || undefined);
      const label = isYoutubeUrl(url) ? "YouTube summary" : "Link analysis";
      await sendMessage(`**${label}:** ${url}\n\n${result.summary}`);
    } catch (err) {
      setError(friendlyError(err instanceof Error ? err.message : "TOOL_FAILED", "Tool failed"));
    }
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

          <Link to="/app/images" className="conv-item" style={{ marginBottom: 12, display: "block", textAlign: "center", textDecoration: "none" }}>
            🎨 Image Studio
          </Link>

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
          <div className="user-menu" onClick={() => navigate("/app/billing")}>
            <div className="avatar">{initials}</div>
            <div style={{ flex: 1, minWidth: 0 }}>
              <div style={{ fontSize: 13, fontWeight: 600, overflow: "hidden", textOverflow: "ellipsis" }}>
                {user?.displayName ?? user?.email}
              </div>
              <div style={{ fontSize: 11, color: "var(--dim)", textTransform: "capitalize" }}>{user?.plan} plan</div>
            </div>
          </div>
          <div style={{ display: "flex", gap: 8, marginTop: 8 }}>
            <Link to="/app/settings" className="btn btn-ghost btn-sm" style={{ flex: 1 }}>Settings</Link>
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
            <select
              className="model-select"
              value={modelId}
              onChange={(e) => setModelId(e.target.value)}
              disabled={routerMode === "auto"}
              title={routerMode === "auto" ? "Switch to Manual to pick a model" : "Choose AI model"}
            >
              {models.filter((m) => m.capabilities.chat).map((m) => (
                <option key={m.id} value={m.id} disabled={m.available === false}>
                  {m.displayName}{m.available === false ? " (needs API key)" : ""}
                </option>
              ))}
            </select>
            {assistants.length > 0 && (
              <select className="model-select" value={assistantId} onChange={(e) => setAssistantId(e.target.value)} title="AI assistant persona">
                <option value="">No assistant</option>
                {assistants.map((a) => (
                  <option key={a.id} value={a.id}>{a.name}</option>
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

        {showCompare && <ComparePanel models={models.filter((m) => m.available !== false)} onClose={() => setShowCompare(false)} />}

        {!user?.emailVerified && (
          <div className="verify-banner">
            <span>Please verify your email to secure your account.</span>
            <button
              type="button"
              className="btn btn-ghost btn-sm"
              onClick={() => {
                authApi.resendVerification().then((r) => {
                  if (r.verifyUrl) {
                    setVerifyNotice(`Verification link: ${r.verifyUrl}`);
                    window.open(r.verifyUrl, "_blank");
                  } else {
                    setVerifyNotice("Verification email sent — check your inbox.");
                  }
                }).catch(() => setVerifyNotice("Could not send verification — try Settings."));
              }}
            >
              Verify email
            </button>
          </div>
        )}
        {verifyNotice && <div className="info-banner" style={{ margin: "0 24px" }}>{verifyNotice}</div>}

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
                <div className="bubble">
                  {m.role === "assistant" ? (
                    <MarkdownMessage
                      content={m.content}
                      streaming={streaming && m === messages[messages.length - 1] && m.role === "assistant"}
                    />
                  ) : (
                    m.content
                  )}
                </div>
                {m.role === "assistant" && m.content && (
                  <div className="msg-actions">
                    {m.modelLabel && <span className="model-disclosure">{m.modelLabel}</span>}
                    {speechOut.supported && (
                      <button className="msg-action" onClick={() => speechOut.toggle(m.content)} title="Read aloud">
                        {speechOut.speaking ? "■ Stop" : "🔊 Listen"}
                      </button>
                    )}
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
          {attachLoading && <div className="info-banner" style={{ maxWidth: 780, margin: "0 auto 8px" }}>Reading document…</div>}
          {urlTools.length > 0 && (
            <div className="url-tool-row" style={{ maxWidth: 780, margin: "0 auto 8px", display: "flex", gap: 8, flexWrap: "wrap" }}>
              {urlTools.map((url) => (
                <button key={url} type="button" className="suggestion-chip" disabled={loading || streaming} onClick={() => runUrlTool(url)}>
                  {isYoutubeUrl(url) ? "▶ Summarise video" : "🔗 Analyse link"}
                </button>
              ))}
            </div>
          )}
          {speech.error && (
            <div className="error-banner" style={{ maxWidth: 780, margin: "0 auto 8px" }}>{speech.error}</div>
          )}
          {speech.listening && (
            <div className="voice-listening-bar">Listening… speak now, click mic again to stop</div>
          )}
          <div className="composer">
            <div className="composer-actions">
              <button
                className={`icon-btn ${speech.listening ? "listening" : ""}`}
                title={speech.supported ? (speech.listening ? "Stop listening" : "Speak your message") : "Voice input requires Chrome or Edge"}
                disabled={!speech.supported || loading || streaming}
                onClick={() => {
                  speech.clearError();
                  speech.toggle(input);
                }}
              >
                <IconMic />
              </button>
              <button className="icon-btn" title="Attach PDF or text file" onClick={() => fileInputRef.current?.click()} disabled={loading || streaming || attachLoading}>
                <IconAttach />
              </button>
              <input
                ref={fileInputRef}
                type="file"
                accept=".pdf,.txt,.md,.csv,.json,application/pdf,text/plain,text/markdown"
                style={{ display: "none" }}
                onChange={(e) => {
                  const f = e.target.files?.[0];
                  if (f) handleFileAttach(f);
                  e.target.value = "";
                }}
              />
              <button
                className="icon-btn"
                title="Deep research mode (live web search)"
                disabled={loading || streaming}
                onClick={() => setRouterMode("deep-research")}
              >
                <IconSearch />
              </button>
            </div>
            <textarea
              rows={1}
              placeholder={speech.listening ? "Listening…" : "Message Libraix…"}
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
