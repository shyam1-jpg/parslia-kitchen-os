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
import { CanvasPanel } from "../components/CanvasPanel";
import { MarkdownMessage } from "../components/MarkdownMessage";
import { ChatGeneratedImage } from "../components/ChatGeneratedImage";
import { WeatherCard } from "../components/WeatherCard";
import { encodeWeatherMarker, extractWeatherCard } from "../lib/weather";
import { useAuth } from "../lib/auth";
import { useSpeechOutput } from "../lib/useSpeechOutput";
import { useCamera } from "../lib/useCamera";
import type { LiveTranscript } from "../lib/useLiveVoice";
import { toolsApi, detectUrls, isYoutubeUrl } from "../lib/tools";
import { detectImageRequest } from "../lib/imageIntent";
import { detectLanguage, SPEECH_LANGUAGE_OPTIONS } from "../lib/language";
import { advancedApi, type Project, type RouterMode } from "../lib/advanced";
import { workspaceApi, type ChatFolder, type CustomAssistant } from "../lib/workspaceApi";
import { getStoredTheme, toggleTheme, type ThemeMode } from "../lib/theme";
import {
  chatApi,
  catalogApi,
  authApi,
  imageApi,
  locationApi,
  type ChatMessage,
  type Conversation,
  type ModelInfo,
} from "../lib/api";
import { friendlyError } from "../lib/errors";
import { BRAND } from "../lib/brand";
import { OnboardingModal, hasCompletedOnboarding } from "../components/OnboardingModal";

const ASSISTANT_UI: Record<
  string,
  { emoji: string; title: string; blurb: string; suggestions: string[] }
> = {
  security: {
    emoji: "🔐",
    title: "Security & Kali Linux",
    blurb: "Penetration testing · Kali tools · CTFs · Scripts · CVEs",
    suggestions: [
      "Nmap scan a target host",
      "Explain a SQL injection attack",
      "Write a Python reverse shell",
      "How do I use Metasploit?",
    ],
  },
  astrology: {
    emoji: "✨",
    title: "Astrology & Horoscope",
    blurb: "Deep advanced readings every time — charts, transits, love, career, Vedic & Western",
    suggestions: [
      "Give me a deep advanced daily horoscope — I'm a Leo rising Virgo",
      "Full natal chart reading — 14 July 1995, London, 3:20pm (houses, aspects, career & love)",
      "Deep compatibility reading: Cancer Sun / Scorpio Moon with Taurus Sun / Libra Rising",
      "Advanced transit forecast for me this month — Saturn & Jupiter focus",
    ],
  },
  writing: {
    emoji: "✍️",
    title: "Writing Coach",
    blurb: "Emails, essays, reports and rewrites",
    suggestions: ["Rewrite this email more politely", "Outline a blog post", "Improve my CV summary", "Write a short story opener"],
  },
  coding: {
    emoji: "💻",
    title: "Coding Expert",
    blurb: "Write, explain and debug code",
    suggestions: ["Write a Python script that…", "Explain this error", "Review my function", "Build a REST API stub"],
  },
  business: {
    emoji: "📈",
    title: "Business Advisor",
    blurb: "Strategy, marketing and operations",
    suggestions: ["Draft a one-page business plan", "Price my SaaS product", "Write a cold outreach email", "Analyse this market"],
  },
  creative: {
    emoji: "🎨",
    title: "Creative Partner",
    blurb: "Brainstorming, stories and worldbuilding",
    suggestions: ["Brainstorm product names", "Build a fantasy world", "Plot twist ideas", "Write a scene in my story"],
  },
  data: {
    emoji: "📊",
    title: "Data Analyst",
    blurb: "SQL, Python, stats and charts",
    suggestions: ["Write a SQL query for…", "Explain this chart", "Pandas clean this CSV", "What test should I run?"],
  },
};

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
  const [customAssistants, setCustomAssistants] = useState<CustomAssistant[]>([]);
  const [folders, setFolders] = useState<ChatFolder[]>([]);
  const [folderFilter, setFolderFilter] = useState<string>("");
  const [assistantId, setAssistantId] = useState("");
  const [canvasOpen, setCanvasOpen] = useState(false);
  const [canvasContent, setCanvasContent] = useState("");
  const [canvasTitle, setCanvasTitle] = useState("Canvas");
  const [theme, setTheme] = useState<ThemeMode>(() => getStoredTheme());
  const [verifyNotice, setVerifyNotice] = useState("");
  const [attachLoading, setAttachLoading] = useState(false);
  const [urlTools, setUrlTools] = useState<string[]>([]);
  const [imageMode, setImageMode] = useState(false);
  const [activeProjectId, setActiveProjectId] = useState<string | null>(null);
  const [showArchived, setShowArchived] = useState(false);
  /** Whether a background home location exists — never display the place name in the UI. */
  const [hasHomeLocation, setHasHomeLocation] = useState(false);
  const [showOnboarding, setShowOnboarding] = useState(() => !hasCompletedOnboarding());
  const [showUsageDetails, setShowUsageDetails] = useState(false);
  const chatEndRef = useRef<HTMLDivElement>(null);
  const abortRef = useRef(false);
  const abortCtrlRef = useRef<AbortController | null>(null);

  const speechOut = useSpeechOutput();
  const { setSpeechLocale: setTtsLocale } = speechOut;
  const camera = useCamera();

  const appendLiveTranscript = useCallback((entry: LiveTranscript) => {
    const text = entry.text.trim();
    if (!text) return;
    setMessages((prev) => [
      ...prev,
      {
        id: `live-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
        role: entry.role,
        content: text,
        createdAt: new Date().toISOString(),
        modelLabel: entry.role === "assistant" ? "Live Voice" : undefined,
      },
    ]);
  }, []);
  const [preferredLanguage, setPreferredLanguage] = useState(() => {
    try {
      return localStorage.getItem("libraix_reply_lang") || "auto";
    } catch {
      return "auto";
    }
  });
  const [speechLocale, setSpeechLocale] = useState(() => {
    try {
      return localStorage.getItem("libraix_speech_locale") || navigator.language || "en-GB";
    } catch {
      return navigator.language || "en-GB";
    }
  });

  useEffect(() => {
    setTtsLocale(speechLocale);
  }, [speechLocale, setTtsLocale]);

  const resolveLangForTurn = (text: string) => {
    if (preferredLanguage && preferredLanguage !== "auto") {
      const opt = SPEECH_LANGUAGE_OPTIONS.find((o) => o.code === preferredLanguage);
      return {
        code: preferredLanguage,
        speechLocale: opt?.speechLocale || preferredLanguage,
      };
    }
    const detected = detectLanguage(text);
    return { code: detected.code, speechLocale: detected.speechLocale };
  };

  const loadConversations = useCallback(async () => {
    const data = await chatApi.conversations(showArchived);
    setConversations(data.conversations);
  }, [showArchived]);

  useEffect(() => {
    // Wake Render cold starts early so the first chat feels faster
    fetch("/api/health", { credentials: "include" }).catch(() => {});
    chatApi.models().then((d) => {
      setModels(d.models);
      const first = d.models.find((m) => m.available !== false && m.capabilities.chat) ?? d.models.find((m) => m.capabilities.chat);
      if (first) setModelId(first.id);
    });
    catalogApi.get().then((c) => setAssistants(c.assistants.map((a) => ({ id: a.id, name: a.name, systemPrompt: a.systemPrompt })))).catch(() => {});
    advancedApi.routerModes().then((d) => setRouterModes(d.modes)).catch(() => {});
    advancedApi.projects().then((d) => setProjects(d.projects)).catch(() => {});
    workspaceApi.customAssistants().then((d) => setCustomAssistants(d.assistants)).catch(() => {});
    workspaceApi.folders().then((d) => setFolders(d.folders)).catch(() => {});
    // Auto-locate from login IP for local weather (server-side only; do not show the place on-screen)
    locationApi
      .get(true)
      .then((r) => {
        setHasHomeLocation(Boolean(r.location));
      })
      .catch(() => {});
    try {
      const prefill = sessionStorage.getItem("libraix_prefill");
      if (prefill) {
        setInput(prefill);
        sessionStorage.removeItem("libraix_prefill");
      }
      const customId = sessionStorage.getItem("libraix_custom_assistant");
      if (customId) {
        setAssistantId(customId);
        sessionStorage.removeItem("libraix_custom_assistant");
      }
    } catch { /* ignore */ }

    // Run due automations once per day when chat opens
    workspaceApi
      .dueAutomations()
      .then((d) => {
        if (d.due?.[0]?.prompt) {
          setInput((prev) => prev || d.due[0].prompt);
          setError(`Automation ready: ${d.due[0].name} — tap Send to run.`);
        }
      })
      .catch(() => {});
  }, []);

  useEffect(() => {
    loadConversations().catch(console.error);
  }, [loadConversations, showArchived]);

  const activeAssistant =
    assistants.find((a) => a.id === assistantId) ??
    customAssistants.find((a) => a.id === assistantId);
  const systemPrompt = activeAssistant?.systemPrompt;

  const handleFileAttach = async (file: File) => {
    setError("");
    const isPdf = file.name.match(/\.pdf$/i) || file.type === "application/pdf";
    const isDocx = file.name.match(/\.docx$/i) || file.type.includes("wordprocessingml");
    const isRtf = file.name.match(/\.rtf$/i) || file.type.includes("rtf");
    const isText = file.name.match(/\.(txt|md|csv|json|log)$/i) || file.type.startsWith("text/");

    if (!isPdf && !isDocx && !isRtf && !isText) {
      setError("Supported files: PDF, DOCX, RTF, .txt, .md, .csv, .json (including contracts & legal PDFs)");
      return;
    }
    if (file.size > 12_000_000) {
      setError("File too large (max 12MB).");
      return;
    }

    setAttachLoading(true);
    try {
      if (isPdf || isDocx || isRtf || file.size > 200_000) {
        const doc = await toolsApi.parseFile(file);
        const kind = doc.documentKind === "legal" ? " · legal document" : "";
        const header = `--- ${doc.filename}${doc.pageCount ? ` (${doc.pageCount} pages)` : ""}${kind}${doc.truncated ? " [truncated]" : ""} ---`;
        const ask =
          doc.documentKind === "legal"
            ? "Please summarise key clauses, obligations, and risks. This is not legal advice.\n\n"
            : "";
        setInput((prev) => (prev ? `${prev}\n\n${header}\n${ask}${doc.text}` : `${header}\n${ask}${doc.text}`));
      } else {
        const text = await file.text();
        setInput((prev) => (prev ? `${prev}\n\n--- ${file.name} ---\n${text}` : `--- ${file.name} ---\n${text}`));
      }
    } catch (err) {
      const code = err instanceof Error ? err.message : "ATTACH_FAILED";
      const hint =
        code === "NO_TEXT_EXTRACTED_SCANNED_PDF"
          ? "This PDF looks scanned (no extractable text). Try a text-based PDF or DOCX."
          : code === "LEGACY_DOC_UNSUPPORTED"
            ? "Legacy .doc isn’t supported — save as .docx or PDF and try again."
            : "Could not read file";
      setError(friendlyError(code, hint));
    } finally {
      setAttachLoading(false);
    }
  };

  useEffect(() => {
    setUrlTools(detectUrls(input));
  }, [input]);

  useEffect(() => {
    // Only auto-scroll when user is near the bottom (ChatGPT-like)
    const el = chatEndRef.current;
    if (!el) return;
    const scroller = el.parentElement;
    if (!scroller) {
      el.scrollIntoView({ behavior: "smooth" });
      return;
    }
    const nearBottom = scroller.scrollHeight - scroller.scrollTop - scroller.clientHeight < 140;
    if (nearBottom || !streaming) {
      el.scrollIntoView({ behavior: streaming ? "auto" : "smooth" });
    }
  }, [messages.length, loading, streaming]);

  useEffect(() => {
    if (!input.trim() || routerMode !== "auto" || streaming || loading) {
      setRouterHint("");
      return;
    }
    const t = setTimeout(() => {
      advancedApi.routerPreview(input.slice(0, 200), routerMode, modelId)
        .then((r) => setRouterHint(`${r.displayName} · ${r.reason}`))
        .catch(() => setRouterHint(""));
    }, 800);
    return () => clearTimeout(t);
  }, [input, routerMode, modelId, streaming, loading]);

  const hydrateMessages = (list: ChatMessage[]) =>
    list.map((m) => {
      if (m.role !== "assistant") return m;
      let next = { ...m };
      const weather = extractWeatherCard(next.content);
      if (weather.weather) {
        next = { ...next, content: weather.text, weatherCard: weather.weather };
      }
      // Pull embedded/markdown images into imageUrl so they show full-size inline like ChatGPT
      if (!next.imageUrl) {
        const imgMatch = next.content.match(/!\[[^\]]*\]\((data:image\/[^)]+|https?:\/\/[^)\s]+)\)/);
        if (imgMatch?.[1]) {
          next = {
            ...next,
            imageUrl: imgMatch[1],
            content: next.content.replace(/!\[[^\]]*\]\((data:image\/[^)]+|https?:\/\/[^)\s]+)\)\s*/g, "").trim(),
          };
        }
      } else {
        next = {
          ...next,
          content: next.content.replace(/!\[[^\]]*\]\((data:image\/[^)]+|https?:\/\/[^)\s]+)\)\s*/g, "").trim(),
        };
      }
      return next;
    });

  const filteredConversations = useMemo(() => {
    let list = conversations;
    if (folderFilter) {
      list = list.filter((c) => (c.folderId ?? "") === folderFilter);
    }
    if (!searchQuery.trim()) return list;
    const q = searchQuery.toLowerCase();
    return list.filter((c) => c.title.toLowerCase().includes(q));
  }, [conversations, searchQuery, folderFilter]);

  const grouped = groupConversations(filteredConversations);

  const selectConversation = async (id: string) => {
    setActiveId(id);
    setSidebarOpen(false);
    const data = await chatApi.getConversation(id);
    setMessages(hydrateMessages(data.messages));
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
      setMessages(hydrateMessages(data.messages));
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
      setMessages(hydrateMessages(updated));
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
      setMessages(hydrateMessages(branched));
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

    // Capture before any local `assistantId` message UUID shadows the preset state
    const presetId = assistantId;
    const astrologyDeep = presetId === "astrology";
    const effectiveRouterMode = astrologyDeep ? "advanced" : routerMode;
    const effectiveTimeout = astrologyDeep ? 150_000 : 90_000;

    if (effectiveRouterMode !== "auto") {
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
    abortCtrlRef.current?.abort();
    abortCtrlRef.current = new AbortController();

    const turnLang = resolveLangForTurn(content);
    setSpeechLocale(turnLang.speechLocale);
    try {
      localStorage.setItem("libraix_speech_locale", turnLang.speechLocale);
    } catch { /* ignore */ }
    const preferredLanguagePayload =
      preferredLanguage !== "auto" ? preferredLanguage : turnLang.code;

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
          const modelName = result.imageModel ?? "flux";
          // Persist as markdown so reload restores the picture; UI shows full image via imageUrl (no click needed)
          const fullContent = `![Generated image](${result.url})\n\nHere's your image.`;
          const modelLabel = `Quick image · ${result.displayName} (${modelName}) via Libraix`;
          setMessages((prev) =>
            prev.map((m) =>
              m.id === assistantId
                ? {
                    ...m,
                    content: "Here's your image.",
                    modelLabel,
                    imageUrl: result.url,
                    imageGenerating: false,
                  }
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

      // Save user message in parallel — don't block first token
      const saveUser = resendOnly ? Promise.resolve() : chatApi.addMessage(convId, "user", content).catch(() => {});
      const history = (resendOnly ? messages : [...messages, userMsg])
        .filter((m) => m.content && !m.imageGenerating)
        .map((m) => ({ role: m.role, content: m.content }));

      const assistantId = crypto.randomUUID();
      setStreaming(true);
      setLoading(false);

      let fullContent = "";
      let modelLabel = "";
      let messageSources: ChatMessage["sources"];
      let weatherCard: ChatMessage["weatherCard"];
      let raf = 0;
      let abortedByUser = false;
      const flushUi = () => {
        setMessages((prev) =>
          prev.map((m) =>
            m.id === assistantId
              ? {
                  ...m,
                  content: fullContent || (weatherCard ? "" : "Thinking…"),
                  modelLabel: modelLabel || m.modelLabel,
                  sources: messageSources,
                  weatherCard: weatherCard ?? m.weatherCard,
                }
              : m
          )
        );
      };
      const scheduleUi = () => {
        if (raf) return;
        raf = requestAnimationFrame(() => {
          raf = 0;
          flushUi();
        });
      };
      setMessages((prev) => [...prev, { id: assistantId, role: "assistant", content: "Thinking…", createdAt: new Date().toISOString() }]);

      try {
        for await (const chunk of advancedApi.streamRespond(
          {
            message: content,
            modelId: effectiveRouterMode === "auto" ? undefined : modelId,
            routerMode: effectiveRouterMode,
            history,
            systemPrompt,
            projectId: activeProjectId ?? undefined,
            conversationId: convId,
            preferredLanguage: preferredLanguagePayload,
          },
          { signal: abortCtrlRef.current?.signal, timeoutMs: effectiveTimeout }
        )) {
          if (abortRef.current) {
            abortedByUser = true;
            break;
          }
          if (typeof chunk === "object" && chunk.meta) {
            if (chunk.meta.displayName && chunk.meta.provider) {
              modelLabel = `Generated using ${chunk.meta.displayName} (${chunk.meta.provider}) through Libraix`;
            }
            if (chunk.meta.sources?.length) messageSources = chunk.meta.sources;
            if (chunk.meta.weatherCard) weatherCard = chunk.meta.weatherCard;
            if (chunk.meta.imageUrl) {
              setMessages((prev) =>
                prev.map((m) => (m.id === assistantId ? { ...m, imageUrl: chunk.meta!.imageUrl } : m))
              );
            }
            scheduleUi();
            continue;
          }
          if (typeof chunk === "string") {
            fullContent = fullContent === "" ? chunk : fullContent + chunk;
            scheduleUi();
          }
        }
        if (raf) {
          cancelAnimationFrame(raf);
          raf = 0;
        }
        flushUi();
      } catch (streamErr) {
        const streamMsg = streamErr instanceof Error ? streamErr.message : "STREAM_FAILED";
        if (streamMsg === "ABORTED") {
          abortedByUser = true;
        } else if (streamMsg === "REQUEST_TIMED_OUT") {
          setError("Reply timed out. The server may be waking up — tap send again.");
        } else {
          console.warn("Stream failed, using non-stream fallback:", streamErr);
        }
      }

      if (abortedByUser) {
        if (fullContent && fullContent !== "Thinking…") {
          await saveUser;
          const toSave = weatherCard ? `${encodeWeatherMarker(weatherCard)}\n\n${fullContent}` : fullContent;
          await chatApi.addMessage(convId, "assistant", toSave).catch(() => {});
        }
        await refresh().catch(() => {});
        return;
      }

      if (!fullContent.trim()) {
        const result = await chatApi.respond({
          message: content,
          modelId: effectiveRouterMode === "auto" ? undefined : modelId,
          routerMode: effectiveRouterMode,
          history,
          systemPrompt,
          projectId: activeProjectId ?? undefined,
          conversationId: convId,
          preferredLanguage: preferredLanguagePayload,
        });
        fullContent = result.content;
        modelLabel = result.displayName
          ? `Generated using ${result.displayName} (${result.provider ?? "provider"}) through Libraix`
          : "";
        if (result.modelId) setModelId(result.modelId);
        weatherCard = result.weatherCard ?? weatherCard;
        setMessages((prev) =>
          prev.map((m) =>
            m.id === assistantId
              ? { ...m, content: fullContent, modelLabel, imageUrl: result.imageUrl, sources: result.sources, weatherCard }
              : m
          )
        );
      } else if (modelLabel || weatherCard) {
        flushUi();
      }

      await saveUser;
      if (fullContent && fullContent !== "Thinking…") {
        const toSave = weatherCard ? `${encodeWeatherMarker(weatherCard)}\n\n${fullContent}` : fullContent;
        await chatApi.addMessage(convId, "assistant", toSave);
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
    abortCtrlRef.current?.abort();
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

  const openLiveVision = async () => {
    if (!camera.open) await camera.openCamera("environment");
  };

  const askLiveVision = async (prompt?: string) => {
    if (!camera.open) {
      await camera.openCamera("environment");
      return;
    }
    const question =
      (prompt ?? input).trim() ||
      "What do you see? Identify the product or equipment and give me clear step-by-step instructions. If something looks wrong, tell me how to fix it safely.";
    const userMsg = `📷 Live Vision: ${question}`;
    setMessages((prev) => [
      ...prev,
      { id: crypto.randomUUID(), role: "user", content: userMsg, createdAt: new Date().toISOString() },
    ]);
    const assistantId2 = crypto.randomUUID();
    setMessages((prev) => [
      ...prev,
      {
        id: assistantId2,
        role: "assistant",
        content: "Looking through your camera…",
        createdAt: new Date().toISOString(),
      },
    ]);
    setLoading(true);
    setInput("");
    try {
      const result = await camera.askLive(question);
      if (!result) {
        setMessages((prev) =>
          prev.map((m) =>
            m.id === assistantId2
              ? { ...m, content: "Camera isn’t ready yet — wait for the live picture, then tap Guide me again." }
              : m
          )
        );
        return;
      }
      setMessages((prev) =>
        prev.map((m) =>
          m.id === assistantId2
            ? { ...m, content: result.reply, modelLabel: "Live Vision · GPT-4o" }
            : m
        )
      );
      // Speak guidance on phones so it feels like a live coach (user can Stop from Listen)
      void speechOut.speak(result.reply);
    } catch (e) {
      const msg = e instanceof Error ? e.message : "VISION_FAILED";
      setMessages((prev) =>
        prev.map((m) =>
          m.id === assistantId2 ? { ...m, content: `Could not analyse camera: ${msg}` } : m
        )
      );
    } finally {
      setLoading(false);
    }
  };

  const LIVE_VISION_CHIPS = [
    "What is this product / machine?",
    "Tell me step-by-step what to do",
    "Something’s wrong — help me fix it",
    "Read the labels and settings I can see",
    "What’s the next step from here?",
  ];

  return (
    <div className="app-shell">
      {showOnboarding && (
        <OnboardingModal
          assistants={assistants}
          onComplete={({ assistantId: aId, language }) => {
            setShowOnboarding(false);
            if (aId) setAssistantId(aId);
            if (language && language !== "auto") {
              setPreferredLanguage(language);
              const opt = SPEECH_LANGUAGE_OPTIONS.find((o) => o.code === language);
              if (opt) {
                setSpeechLocale(opt.speechLocale);
                try {
                  localStorage.setItem("libraix_reply_lang", language);
                  localStorage.setItem("libraix_speech_locale", opt.speechLocale);
                } catch { /* ignore */ }
              }
            }
          }}
        />
      )}
      {camera.open && (
        <div className="camera-modal">
          <div className="camera-backdrop" onClick={camera.closeCamera} />
          <div className="camera-box" role="dialog" aria-label="Live Vision Assist">
            <div className="camera-header">
              <span>📷 Live Vision Assist</span>
              <div className="camera-header-actions">
                <button type="button" className="btn btn-ghost btn-sm" onClick={() => void camera.flipCamera()} title="Flip camera">
                  Flip
                </button>
                <button type="button" className="btn btn-ghost btn-sm" onClick={camera.closeCamera}>
                  Done
                </button>
              </div>
            </div>
            <p className="camera-sub">
              Point at a product, machine, screen, or part. Libraix keeps watching this session — ask follow-ups without closing the camera.
            </p>
            {camera.error && <div className="error-banner" style={{ margin: 0 }}>{camera.error}</div>}
            <video
              ref={camera.attachStream}
              autoPlay
              playsInline
              muted
              className="camera-video"
            />
            <div className="camera-quick">
              {LIVE_VISION_CHIPS.map((chip) => (
                <button
                  key={chip}
                  type="button"
                  className="camera-chip"
                  disabled={camera.analysing || loading}
                  onClick={() => void askLiveVision(chip)}
                >
                  {chip}
                </button>
              ))}
            </div>
            <div className="camera-footer">
              <input
                className="input"
                placeholder="Ask about what you see…"
                value={input}
                onChange={(e) => setInput(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === "Enter") void askLiveVision();
                }}
              />
              <button
                type="button"
                className="btn btn-primary"
                onClick={() => void askLiveVision()}
                disabled={camera.analysing || loading}
              >
                {camera.analysing ? "Looking…" : "Guide me"}
              </button>
            </div>
          </div>
        </div>
      )}
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

          <div className="sidebar-nav-links">
            <Link to="/app/images" className="conv-item">🎨 Images</Link>
            <Link to="/app/library" className="conv-item">📚 Library</Link>
            <Link to="/app/search" className="conv-item">🔍 Search</Link>
            <Link to="/app/code" className="conv-item">⟨/⟩ Code</Link>
          </div>

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

          <div className="folder-row">
            <select
              className="model-select"
              style={{ flex: 1, fontSize: 12 }}
              value={folderFilter}
              onChange={(e) => setFolderFilter(e.target.value)}
              title="Filter by folder"
            >
              <option value="">All folders</option>
              {folders.map((f) => (
                <option key={f.id} value={f.id}>{f.name}</option>
              ))}
            </select>
            <button
              type="button"
              className="btn btn-ghost btn-sm"
              title="New folder"
              onClick={async () => {
                const name = window.prompt("Folder name");
                if (!name?.trim()) return;
                try {
                  const f = await workspaceApi.createFolder(name.trim());
                  setFolders((prev) => [...prev, f].sort((a, b) => a.name.localeCompare(b.name)));
                } catch (e) {
                  setError(friendlyError(e instanceof Error ? e.message : "", "Could not create folder"));
                }
              }}
            >
              +
            </button>
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
                    <button
                      type="button"
                      className="icon-btn conv-action-btn"
                      title="Move to folder"
                      onClick={async () => {
                        if (!folders.length) {
                          setError("Create a folder first (+ next to All folders).");
                          return;
                        }
                        const names = folders.map((f, i) => `${i + 1}. ${f.name}`).join("\n");
                        const pick = window.prompt(`Move to folder number (or 0 for none):\n${names}`, "1");
                        if (pick === null) return;
                        const n = Number(pick);
                        const folderId = n === 0 ? null : folders[n - 1]?.id ?? null;
                        try {
                          await workspaceApi.assignFolder(c.id, folderId);
                          setConversations((prev) =>
                            prev.map((x) => (x.id === c.id ? { ...x, folderId } : x))
                          );
                        } catch (e) {
                          setError(friendlyError(e instanceof Error ? e.message : "", "Could not move chat"));
                        }
                      }}
                    >
                      📁
                    </button>
                    <button type="button" className="icon-btn conv-action-btn" title="Rename" onClick={() => renameChat(c.id, c.title)}>✎</button>
                    {activeId === c.id && (
                      <>
                        <button type="button" className="icon-btn conv-action-btn" title="Export" onClick={() => exportChat(c.id)}>⤓</button>
                        <button
                          type="button"
                          className="icon-btn conv-action-btn"
                          title="Share link"
                          onClick={async () => {
                            try {
                              const r = await workspaceApi.shareChat(c.id);
                              await navigator.clipboard.writeText(r.url);
                              setError(`Share link copied: ${r.url}`);
                            } catch (e) {
                              setError(friendlyError(e instanceof Error ? e.message : "", "Could not share"));
                            }
                          }}
                        >
                          🔗
                        </button>
                      </>
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
              {models.filter((m) => m.capabilities.chat && m.available !== false).map((m) => (
                <option
                  key={m.id}
                  value={m.id}
                  title={[m.description, m.speedHint && `Best when you need: ${m.speedHint}`, m.costHint && `Cost: ${m.costHint}`].filter(Boolean).join(" · ")}
                >
                  {m.displayName}{m.speedHint ? ` · ${m.speedHint}` : ""}
                </option>
              ))}
            </select>
            {(assistants.length > 0 || customAssistants.length > 0) && (
              <select
                className="model-select"
                value={assistantId}
                onChange={(e) => {
                  const next = e.target.value;
                  setAssistantId(next);
                  // Astrology readings always run in Advanced depth/quality
                  if (next === "astrology") setRouterMode("advanced");
                }}
                title="AI assistant preset"
              >
                <option value="">General assistant</option>
                {assistants.map((a) => (
                  <option key={a.id} value={a.id}>
                    {ASSISTANT_UI[a.id]?.emoji ? `${ASSISTANT_UI[a.id].emoji} ` : ""}
                    {a.name}
                    {a.id === "astrology" ? " · Deep" : ""}
                  </option>
                ))}
                {customAssistants.map((a) => (
                  <option key={a.id} value={a.id}>
                    🧩 {a.name}
                  </option>
                ))}
              </select>
            )}
            <select
              className="model-select"
              value={preferredLanguage}
              title="Reply & voice language"
              onChange={(e) => {
                const v = e.target.value;
                setPreferredLanguage(v);
                try {
                  localStorage.setItem("libraix_reply_lang", v);
                } catch { /* ignore */ }
                if (v !== "auto") {
                  const opt = SPEECH_LANGUAGE_OPTIONS.find((o) => o.code === v);
                  if (opt) {
                    setSpeechLocale(opt.speechLocale);
                    try {
                      localStorage.setItem("libraix_speech_locale", opt.speechLocale);
                    } catch { /* ignore */ }
                  }
                }
              }}
            >
              <option value="auto">🌐 Auto language</option>
              {SPEECH_LANGUAGE_OPTIONS.map((o) => (
                <option key={o.code} value={o.code}>
                  {o.name}
                </option>
              ))}
            </select>
          </div>
          <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
            <button
              type="button"
              className="btn btn-ghost btn-sm"
              title="Toggle light / dark"
              onClick={() => setTheme(toggleTheme())}
            >
              {theme === "light" ? "☀" : "☾"}
            </button>
            {messages.some((m) => m.role === "assistant") && (
              <button type="button" className="btn btn-ghost btn-sm" onClick={regenerateLast} disabled={loading || streaming}>Regenerate</button>
            )}
            {user?.plan !== "free" && (
              <button
                type="button"
                className="btn btn-ghost btn-sm"
                onClick={() => setShowCompare((v) => !v)}
                title="Send one prompt to several models and compare answers side by side"
              >
                Compare
              </button>
            )}
            {user?.plan === "free" ? (
              <Link
                to="/pricing"
                className="btn btn-primary btn-sm"
                title="Pro: more messages, unlimited Live Voice, and all live models"
              >
                Go Pro — £9/mo
              </Link>
            ) : (
              <Link to="/billing" className="btn btn-ghost btn-sm" title="Manage billing">
                Billing
              </Link>
            )}
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
              <h2>
                {ASSISTANT_UI[assistantId]
                  ? `${ASSISTANT_UI[assistantId].emoji} ${ASSISTANT_UI[assistantId].title}`
                  : `Ask ${BRAND.name} anything`}
              </h2>
              <p>
                {ASSISTANT_UI[assistantId]?.blurb ?? (
                  <>
                    {BRAND.tagline} Type <strong>/i</strong> or tap 🎨 for images · 📷 Live Vision · 🔍 web search.
                  </>
                )}
              </p>
              <div className="suggestion-row">
                {(
                  ASSISTANT_UI[assistantId]?.suggestions ?? [
                    // Location stays server-side for weather; do not show city/area on the page.
                    hasHomeLocation ? "What's the weather near me?" : "What's the weather today?",
                    "Create an image of a sunset",
                    "Write an email",
                    "Explain a concept",
                  ]
                ).map((s) => (
                  <button key={s} className="suggestion-chip" onClick={() => sendMessage(s)}>{s}</button>
                ))}
              </div>
            </div>
          ) : (
            messages.map((m) => (
              <div key={m.id} className={`message ${m.role}`}>
                <div className="bubble">
                  {m.role === "assistant" ? (
                    <>
                      {m.weatherCard && <WeatherCard data={m.weatherCard} />}
                      {m.imageUrl && !m.imageGenerating && (
                        <ChatGeneratedImage src={m.imageUrl} alt="Generated image" />
                      )}
                      <MarkdownMessage
                        content={m.content}
                        streaming={streaming && m === messages[messages.length - 1] && m.role === "assistant" && !m.imageGenerating}
                        imageGenerating={m.imageGenerating}
                        suppressImages={Boolean(m.imageUrl)}
                      />
                    </>
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
                      <button
                        className={`msg-action ${speechOut.loading ? "msg-action-loading" : ""}`}
                        onClick={() => {
                          const lang = detectLanguage(m.content);
                          speechOut.setSpeechLocale(lang.speechLocale);
                          speechOut.toggle(m.content);
                        }}
                        title={speechOut.loading ? "Loading voice…" : speechOut.speaking ? "Stop" : "Read aloud (matches reply language)"}
                        disabled={speechOut.loading}
                      >
                        {speechOut.loading ? "⏳" : speechOut.speaking ? "■ Stop" : "🔊 Listen"}
                      </button>
                    )}
                    <button className="msg-action" onClick={() => copyMessage(m.content)}><IconCopy /> Copy</button>
                    {m.content.length > 280 && (
                      <button
                        className="msg-action"
                        onClick={() => {
                          setCanvasTitle("Canvas");
                          setCanvasContent(m.content);
                          setCanvasOpen(true);
                        }}
                      >
                        ✏ Canvas
                      </button>
                    )}
                  </div>
                )}
                {m.sources && m.sources.length > 0 && (
                  <div className="citation-cards">
                    <div className="citation-label">
                      {m.sources.some((s) => s.url)
                        ? "Sources — Wikipedia & web"
                        : "Sources from project files"}
                    </div>
                    {m.sources.map((s) => (
                      <div key={s.index} className="citation-card">
                        <strong>
                          [{s.index}]{" "}
                          {s.url ? (
                            <a href={s.url} target="_blank" rel="noopener noreferrer" className="citation-link">
                              {s.filename}
                            </a>
                          ) : (
                            s.filename
                          )}
                        </strong>
                        <p>{s.excerpt}</p>
                        {s.url && /wikipedia\.org/i.test(s.url) && (
                          <a href={s.url} target="_blank" rel="noopener noreferrer" className="citation-wiki">
                            Open on Wikipedia →
                          </a>
                        )}
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
          onCamera={() => void openLiveVision()}
          speechLocale={speechLocale}
          liveVoiceId={speechOut.voice}
          onLiveTranscript={appendLiveTranscript}
          onLiveUsageReported={() => {
            refresh().catch(() => {});
          }}
          voiceSecondsRemaining={usage?.remainingVoiceSeconds ?? null}
          voiceUnlimited={usage?.voiceUnlimited ?? usage?.plan !== "free"}
          placeholder={imageMode ? "Describe a quick image…" : `Ask ${BRAND.name}…`}
          extraAbove={
            <>
              {usage && (usage.limitReached || usage.voiceLimitReached || showUsageDetails || usage.remainingMessages <= 5) && (
                <div className={`usage-bar ${usage.limitReached || usage.voiceLimitReached ? "usage-limit" : ""}`}>
                  {usage.limitReached
                    ? `Daily message limit reached (${usage.messagesUsed}/${usage.messagesLimit}). `
                    : usage.remainingMessages <= 5
                      ? `${usage.remainingMessages} messages left today. `
                      : null}
                  {usage.plan === "free" && usage.voiceLimitReached && (
                    <span>Live Voice used up for today (5 min Free). </span>
                  )}
                  {(usage.limitReached || usage.voiceLimitReached) && (
                    <Link to="/pricing">Upgrade to Pro</Link>
                  )}
                  {showUsageDetails && !usage.limitReached && (
                    <span>
                      {usage.remainingMessages}/{usage.messagesLimit} messages
                      {usage.plan === "free" && !usage.voiceLimitReached
                        ? ` · Live Voice ${Math.max(0, Math.floor((usage.remainingVoiceSeconds ?? 0) / 60))}m left`
                        : ""}
                      {routerHint && routerMode === "auto" ? ` · ${routerHint}` : ""}
                    </span>
                  )}
                </div>
              )}
              {usage && !usage.limitReached && usage.remainingMessages > 5 && (
                <button
                  type="button"
                  className="usage-quiet-toggle"
                  onClick={() => setShowUsageDetails((v) => !v)}
                  aria-expanded={showUsageDetails}
                >
                  {showUsageDetails ? "Hide usage" : "Usage"}
                </button>
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

      <CanvasPanel
        open={canvasOpen}
        title={canvasTitle}
        content={canvasContent}
        onChange={setCanvasContent}
        onClose={() => setCanvasOpen(false)}
        onInsertToChat={(value) => {
          setInput(value);
          setCanvasOpen(false);
        }}
      />
    </div>
  );
}
