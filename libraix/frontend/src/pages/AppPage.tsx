import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import {
  Logo,
  IconPlus,
  IconMenu,
  IconCopy,
} from "../components/Layout";
import { ChatComposer } from "../components/ChatComposer";
import { ComparePanel } from "../components/ComparePanel";
import { ProjectPanel } from "../components/ProjectPanel";
import { MarkdownMessage } from "../components/MarkdownMessage";
import { useAuth } from "../lib/auth";
import { useSpeechOutput } from "../lib/useSpeechOutput";
import { toolsApi, detectUrls, isYoutubeUrl } from "../lib/tools";
import { detectImageRequest } from "../lib/imageIntent";
import { advancedApi, type Project, type RouterMode } from "../lib/advanced";
import {
  chatApi,
  catalogApi,
  authApi,
  imageApi,
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
  const [imageMode, setImageMode] = useState(false);
  const [activeProjectId, setActiveProjectId] = useState<string | null>(null);
  const [showArchived, setShowArchived] = useState(false);
  const chatEndRef = useRef<HTMLDivElement>(null);
  const abortRef = useRef(false);

  const speechOut = useSpeechOutput();

  const loadConversations = useCallback(async () => {
    const data = await chatApi.conversations(showArchived);
    setConversations(data.conversations);
  }, [showArchived]);

  useEffect(() => {
    chatApi.models().then((d) => {
      setModels(d.models);
      const first = d.models.find((m) => m.available !== false && m.capabilities.chat) ?? d.models.find((m) => m.capabilities.chat);
      if (first) setModelId(first.id);
    });
    catalogApi.get().then((c) => setAssistants(c.assistants.map((a) => ({ id: a.id, name: a.name, systemPrompt: a.systemPrompt })))).catch(() => {});
    advancedApi.routerModes().then((d) => setRouterModes(d.modes)).catch(() => {});
    advancedApi.projects().then((d) => setProjects(d.projects)).catch(() => {});
  }, []);

  useEffect(() => {
    loadConversations().catch(console.error);
  }, [loadConversations, showArchived]);

  const activeAssistant = assistants.find((a) => a.id === assistantId);
  const systemPrompt = activeAssistant?.systemPrompt;

  const handleFileAttach = async (file: File) => {
    setError("");
    const isPdf = file.name.match(/\.pdf$/i) || file.type === "application/pdf";
    const isDocx = file.name.match(/\.docx$/i) || file.type.includes("wordprocessingml");
    const isText = file.name.match(/\.(txt|md|csv|json|log)$/i) || file.type.startsWith("text/");

    if (!isPdf && !isDocx && !isText) {
      setError("Supported files: PDF, DOCX, .txt, .md, .csv, .json");
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
    setActiveProjectId(data.conversation.projectId ?? null);
  };

  const newChat = async () => {
    const conv = await chatApi.createConversation(modelId, undefined, activeProjectId);
    setConversations((prev) => [conv, ...prev]);
    setActiveId(conv.id);
    setMessages([]);
    setSidebarOpen(false);
  };

  const renameChat = async (id: string, currentTitle: string) => {
    const title = window.prompt("Rename conversation", currentTitle);
    if (!title?.trim() || title.trim() === currentTitle) return;
    try {
      await chatApi.renameConversation(id, title.trim());
      setConversations((prev) => prev.map((c) => (c.id === id ? { ...c, title: title.trim() } : c)));
    } catch {
      setError("Could not rename conversation.");
    }
  };

  const deleteChat = async (id: string) => {
    if (!window.confirm("Delete this conversation? This cannot be undone.")) return;
    try {
      await chatApi.deleteConversation(id);
      setConversations((prev) => prev.filter((c) => c.id !== id));
      if (activeId === id) {
        setActiveId(null);
        setMessages([]);
      }
    } catch {
      setError("Could not delete conversation.");
    }
  };

  const pinChat = async (id: string, pinned: boolean) => {
    await chatApi.pinConversation(id, pinned);
    loadConversations();
  };

  const archiveChat = async (id: string) => {
    await chatApi.archiveConversation(id, true);
    if (activeId === id) {
      setActiveId(null);
      setMessages([]);
    }
    loadConversations();
  };

  const exportChat = async (id: string) => {
    const data = await chatApi.exportConversation(id);
    const blob = new Blob([JSON.stringify(data, null, 2)], { type: "application/json" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `libraix-chat-${id.slice(0, 8)}.json`;
    a.click();
    URL.revokeObjectURL(url);
  };

  const regenerateLast = async () => {
    if (!activeId || streaming || loading) return;
    const lastUser = [...messages].reverse().find((m) => m.role === "user");
    if (!lastUser) return;
    try {
      await chatApi.regenerateConversation(activeId);
      const data = await chatApi.getConversation(activeId);
      setMessages(data.messages);
      await sendMessage(lastUser.content, true);
    } catch {
      setError("Could not regenerate response.");
    }
  };

  const editUserMessage = async (messageId: string, current: string) => {
    if (!activeId) return;
    const content = window.prompt("Edit your message", current);
    if (!content?.trim() || content === current) return;
    try {
      const { messages: updated } = await chatApi.editMessage(activeId, messageId, content.trim());
      setMessages(updated);
      await sendMessage(content.trim(), true);
    } catch {
      setError("Could not edit message.");
    }
  };

  const branchFromMessage = async (messageId: string) => {
    if (!activeId) return;
    try {
      const { conversation, messages: branched } = await chatApi.branchConversation(activeId, messageId, modelId);
      setConversations((prev) => [conversation, ...prev]);
      setActiveId(conversation.id);
      setMessages(branched);
      setSidebarOpen(false);
    } catch {
      setError("Could not branch conversation.");
    }
  };

  const handleProjectSelect = async (projectId: string | null) => {
    setActiveProjectId(projectId);
    if (activeId) {
      await chatApi.setConversationProject(activeId, projectId);
      loadConversations();
    }
  };

  const sendMessage = async (text?: string, resendOnly = false) => {
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
    setLoading(true);
    abortRef.current = false;

    let convId = activeId;
    if (!convId) {
      const conv = await chatApi.createConversation(modelId, content.slice(0, 40), activeProjectId);
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
    if (!resendOnly) {
      setMessages((prev) => [...prev, userMsg]);
    }

    const imagePrompt = imageMode ? content : detectImageRequest(content);

    try {
      if (imagePrompt) {
        const assistantId = crypto.randomUUID();
        setMessages((prev) => [
          ...prev,
          {
            id: assistantId,
            role: "assistant",
            content: "",
            imageGenerating: true,
            createdAt: new Date().toISOString(),
          },
        ]);
        setStreaming(true);
        setLoading(false);

        // Start image API immediately; save user message in parallel
        const saveUser = chatApi.addMessage(convId, "user", content).catch(() => {});

        try {
          const result = await imageApi.generate({ prompt: imagePrompt, speed: "fast" });
          await saveUser;
          const modelName = result.imageModel ?? "DALL·E";
          const fullContent = `![Generated image](${result.url})`;
          const modelLabel = `Generated using ${result.displayName} (${modelName}) through Libraix · fast mode`;
          setMessages((prev) =>
            prev.map((m) =>
              m.id === assistantId
                ? { ...m, content: fullContent, modelLabel, imageUrl: result.url, imageGenerating: false }
                : m
            )
          );
          chatApi.addMessage(convId, "assistant", fullContent).catch(() => {});
          setImageMode(false);
          refresh().catch(() => {});
          loadConversations();
        } catch (imgErr) {
          await saveUser;
          const msg = imgErr instanceof Error ? imgErr.message : "IMAGE_FAILED";
          setMessages((prev) => prev.filter((m) => m.id !== assistantId));
          setError(friendlyError(msg, "Image generation failed. Check OPENAI_API_KEY on server."));
        } finally {
          setStreaming(false);
        }
        return;
      }

      if (!resendOnly) {
        await chatApi.addMessage(convId, "user", content);
      }
      const history = (resendOnly ? messages : [...messages, userMsg])
        .filter((m) => m.content && !m.imageGenerating)
        .map((m) => ({ role: m.role, content: m.content }));

      const assistantId = crypto.randomUUID();
      setStreaming(true);
      setLoading(false);

      let fullContent = "";
      let modelLabel = "";
      let messageSources: ChatMessage["sources"];
      setMessages((prev) => [...prev, { id: assistantId, role: "assistant", content: "", createdAt: new Date().toISOString() }]);

      try {
        for await (const chunk of advancedApi.streamRespond({
          message: content,
          modelId: routerMode === "auto" ? undefined : modelId,
          routerMode,
          history,
          systemPrompt,
          projectId: activeProjectId ?? undefined,
        })) {
          if (abortRef.current) break;
          if (typeof chunk === "object" && chunk.meta) {
            modelLabel = `Generated using ${chunk.meta.displayName} (${chunk.meta.provider}) through Libraix`;
            if (chunk.meta.sources?.length) messageSources = chunk.meta.sources;
            if (chunk.meta.imageUrl) {
              setMessages((prev) => prev.map((m) => (m.id === assistantId ? { ...m, imageUrl: chunk.meta!.imageUrl, modelLabel, sources: messageSources } : m)));
            }
            continue;
          }
          fullContent += chunk;
          setMessages((prev) => prev.map((m) => (m.id === assistantId ? { ...m, content: fullContent, modelLabel: modelLabel || m.modelLabel, sources: messageSources } : m)));
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
          projectId: activeProjectId ?? undefined,
        });
        fullContent = result.content;
        modelLabel = result.displayName
          ? `Generated using ${result.displayName} (${result.provider ?? "provider"}) through Libraix`
          : "";
        if (result.modelId) setModelId(result.modelId);
        setMessages((prev) => prev.map((m) => (m.id === assistantId ? { ...m, content: fullContent, modelLabel, imageUrl: result.imageUrl, sources: result.sources } : m)));
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
      if (!resendOnly) setMessages((prev) => prev.filter((m) => m.id !== userMsg.id));
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

          <div style={{ display: "flex", gap: 8, marginBottom: 12 }}>
            <button type="button" className={`btn btn-ghost btn-sm${!showArchived ? " active-tab" : ""}`} style={{ flex: 1 }} onClick={() => setShowArchived(false)}>Chats</button>
            <button type="button" className={`btn btn-ghost btn-sm${showArchived ? " active-tab" : ""}`} style={{ flex: 1 }} onClick={() => setShowArchived(true)}>Archived</button>
          </div>

          <ProjectPanel
            projects={projects}
            activeProjectId={activeProjectId}
            onSelect={handleProjectSelect}
            onProjectsChange={() => advancedApi.projects().then((d) => setProjects(d.projects)).catch(() => {})}
            onError={setError}
            onClearError={() => setError("")}
          />

          {grouped.map((group) => (
            <div key={group.label}>
              <div className="sidebar-section-label">{group.label}</div>
              {group.items.map((c) => (
                <div key={c.id} className={`conv-item-wrap ${activeId === c.id ? "active" : ""}`}>
                  <button
                    className={`conv-item ${activeId === c.id ? "active" : ""}`}
                    onClick={() => selectConversation(c.id)}
                  >
                    <span>{c.pinned ? "📌 " : ""}{c.title}</span>
                  </button>
                  <div className="conv-item-actions">
                    {!showArchived && (
                      <button type="button" className="icon-btn conv-action-btn" title={c.pinned ? "Unpin" : "Pin"} onClick={() => pinChat(c.id, !c.pinned)}>📌</button>
                    )}
                    <button type="button" className="icon-btn conv-action-btn" title="Rename" onClick={() => renameChat(c.id, c.title)}>✎</button>
                    {activeId === c.id && (
                      <button type="button" className="icon-btn conv-action-btn" title="Export" onClick={() => exportChat(c.id)}>⤓</button>
                    )}
                    {!showArchived ? (
                      <button type="button" className="icon-btn conv-action-btn" title="Archive" onClick={() => archiveChat(c.id)}>🗄</button>
                    ) : null}
                    <button type="button" className="icon-btn conv-action-btn" title="Delete" onClick={() => deleteChat(c.id)}>×</button>
                  </div>
                </div>
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
                <option key={m.id} value={m.id} disabled={m.available === false} title={[m.description, m.speedHint && `Speed: ${m.speedHint}`, m.costHint && `Cost: ${m.costHint}`].filter(Boolean).join(" · ")}>
                  {m.displayName}{m.speedHint ? ` · ${m.speedHint}` : ""}{m.available === false ? " (needs API key)" : ""}
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
            {messages.some((m) => m.role === "assistant") && (
              <button type="button" className="btn btn-ghost btn-sm" onClick={regenerateLast} disabled={loading || streaming}>Regenerate</button>
            )}
            {user?.plan !== "free" && (
              <button className="btn btn-ghost btn-sm" onClick={() => setShowCompare((v) => !v)}>Compare</button>
            )}
            <Link to="/pricing" className="btn btn-ghost btn-sm">Upgrade</Link>
          </div>
        </header>

        {showCompare && (
          <ComparePanel
            models={models.filter((m) => m.capabilities.chat && m.available === true)}
            onClose={() => setShowCompare(false)}
          />
        )}

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
        {user?.billingStatus === "past_due" && (
          <div className="error-banner" style={{ margin: "0 24px" }}>
            Payment failed — <Link to="/app/billing">update billing</Link> to keep Pro features.
          </div>
        )}

        <div className="chat-area">
          {messages.length === 0 && !loading && !streaming ? (
            <div className="welcome-state">
              <h2>What can I help you with?</h2>
              <p>Type <strong>/i sunset</strong> or tap <strong>🎨</strong> for fast image render (~15s). Mic on the right for voice.</p>
              <div className="suggestion-row">
                {["Create an image of a sunset", "Write an email", "Explain a concept", "Write code"].map((s) => (
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
                      streaming={streaming && m === messages[messages.length - 1] && m.role === "assistant" && !m.imageGenerating}
                      imageGenerating={m.imageGenerating}
                    />
                  ) : (
                    m.content
                  )}
                </div>
                {m.role === "user" && (
                  <div className="msg-actions">
                    <button className="msg-action" onClick={() => editUserMessage(m.id, m.content)}>Edit</button>
                    <button className="msg-action" onClick={() => branchFromMessage(m.id)}>Branch</button>
                  </div>
                )}
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
                {m.sources && m.sources.length > 0 && (
                  <div className="citation-cards">
                    <div className="citation-label">Sources from project files</div>
                    {m.sources.map((s) => (
                      <div key={s.index} className="citation-card">
                        <strong>[{s.index}] {s.filename}</strong>
                        <p>{s.excerpt}</p>
                      </div>
                    ))}
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

        <ChatComposer
          value={input}
          onChange={setInput}
          onSend={() => sendMessage()}
          onStop={stopGeneration}
          loading={loading}
          streaming={streaming}
          attachLoading={attachLoading}
          imageMode={imageMode}
          onToggleImageMode={() => setImageMode((v) => !v)}
          onFileSelect={handleFileAttach}
          onDeepResearch={() => setRouterMode("deep-research")}
          placeholder={imageMode ? "Describe the image — fast render…" : "Message Libraix… (/i for quick image)"}
          extraAbove={
            <>
              {usage && (
                <div className={`usage-bar ${usage.limitReached ? "usage-limit" : ""}`}>
                  {usage.limitReached
                    ? `Daily limit reached (${usage.messagesUsed}/${usage.messagesLimit} messages used on ${usage.plan} plan).`
                    : `${usage.remainingMessages} of ${usage.messagesLimit} messages remaining today`}
                  {usage.premiumLimit > 0 && !usage.limitReached && (
                    <span> · Premium: {usage.premiumUsed}/{usage.premiumLimit}</span>
                  )}
                  {routerHint && routerMode === "auto" && !usage.limitReached && <span> · {routerHint}</span>}
                </div>
              )}
              {error && <div className="error-banner composer-banner">{error}</div>}
              {attachLoading && <div className="info-banner composer-banner">Reading document…</div>}
              {urlTools.length > 0 && (
                <div className="url-tool-row composer-banner">
                  {urlTools.map((url) => (
                    <button key={url} type="button" className="suggestion-chip" disabled={loading || streaming} onClick={() => runUrlTool(url)}>
                      {isYoutubeUrl(url) ? "▶ Summarise video" : "🔗 Analyse link"}
                    </button>
                  ))}
                </div>
              )}
            </>
          }
        />
      </main>
    </div>
  );
}
