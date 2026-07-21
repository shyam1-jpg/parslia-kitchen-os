import { withLaunchStatus, TOOL_LAUNCH_STATUS, MODEL_LAUNCH_STATUS, countLive } from "./launchStatus.js";
import { getModelOverrides, getAllPlanLimits } from "../services/siteConfig.js";
import { isProviderConfigured } from "../providers/config.js";

export type PlanTier = "free" | "pro" | "enterprise";

export interface ModelDefinition {
  id: string;
  displayName: string;
  provider: "openai" | "anthropic" | "google" | "deepseek" | "meta" | "xai" | "perplexity" | "ollama" | "openrouter";
  providerModelId: string;
  tier: PlanTier;
  capabilities: {
    chat: boolean;
    streaming: boolean;
    image?: boolean;
    webSearch?: boolean;
    fileSearch?: boolean;
  };
  enabled: boolean;
  description: string;
}

export interface ToolDefinition {
  id: string;
  name: string;
  description: string;
  tier: PlanTier;
  enabled: boolean;
}

export interface AssistantDefinition {
  id: string;
  name: string;
  description: string;
  systemPrompt: string;
  tier: PlanTier;
  enabled: boolean;
}

export interface ProductCatalog {
  models: ModelDefinition[];
  tools: ToolDefinition[];
  assistants: AssistantDefinition[];
  plans: {
    free: { dailyMessages: number; premiumModelMessages: number; images: number; liveVoiceMinutes: number };
    pro: { dailyMessages: number; premiumModelMessages: number; images: number; liveVoiceMinutes: number };
    enterprise: { dailyMessages: number; premiumModelMessages: number; images: number; liveVoiceMinutes: number };
  };
}

/** Single source of truth for models, tools, assistants and plan limits. */
export const PRODUCT_CATALOG: ProductCatalog = {
  models: [
    {
      id: "libraix-fast",
      displayName: "Libraix Fast",
      provider: "openai",
      providerModelId: process.env.OPENAI_MODEL_FAST ?? "gpt-4o",
      tier: "free",
      capabilities: { chat: true, streaming: true },
      enabled: true,
      description: "GPT-4o quality for everyday tasks.",
    },
    {
      id: "libraix-smart",
      displayName: "Libraix Smart",
      provider: "openai",
      providerModelId: process.env.OPENAI_MODEL_SMART ?? "gpt-4o",
      tier: "pro",
      capabilities: { chat: true, streaming: true, webSearch: true },
      enabled: true,
      description: "Balanced quality and speed for professional work.",
    },
    {
      id: "libraix-advanced",
      displayName: "Libraix Advanced",
      provider: "openai",
      providerModelId: process.env.OPENAI_MODEL_ADVANCED ?? "gpt-4o",
      tier: "pro",
      capabilities: { chat: true, streaming: true, webSearch: true, fileSearch: true },
      enabled: true,
      description: "Highest-quality reasoning for complex tasks.",
    },
    {
      id: "libraix-image",
      displayName: "Libraix Image",
      provider: "openai",
      providerModelId: process.env.OPENAI_MODEL_IMAGE ?? "dall-e-3",
      tier: "pro",
      capabilities: { chat: false, streaming: false, image: true },
      enabled: true,
      description: "Current OpenAI image generation model.",
    },
    {
      id: "libraix-deepseek",
      displayName: "Libraix DeepSeek",
      provider: "deepseek",
      providerModelId: process.env.DEEPSEEK_MODEL_CHAT ?? "deepseek-chat",
      tier: "free",
      capabilities: { chat: true, streaming: true },
      enabled: true,
      description: "DeepSeek V3 — fast, excellent for coding and everyday chat.",
    },
    {
      id: "libraix-deepseek-r1",
      displayName: "Libraix DeepSeek R1",
      provider: "deepseek",
      providerModelId: process.env.DEEPSEEK_MODEL_REASONER ?? "deepseek-reasoner",
      tier: "pro",
      capabilities: { chat: true, streaming: true },
      enabled: true,
      description: "DeepSeek R1 reasoning — maths, logic, and complex analysis.",
    },
    {
      id: "libraix-gemini",
      displayName: "Libraix Gemini",
      provider: "google",
      providerModelId: process.env.GOOGLE_MODEL ?? "gemini-2.0-flash",
      tier: "free",
      capabilities: { chat: true, streaming: true },
      enabled: true,
      description: "Google Gemini 2.0 Flash — fast multimodal AI.",
    },
    {
      id: "libraix-claude",
      displayName: "Libraix Claude",
      provider: "anthropic",
      providerModelId: process.env.ANTHROPIC_MODEL ?? "claude-3-5-haiku-20241022",
      tier: "pro",
      capabilities: { chat: true, streaming: true },
      enabled: true,
      description: "Anthropic Claude Haiku — fast, thoughtful responses.",
    },
    {
      id: "libraix-claude-sonnet",
      displayName: "Libraix Claude Sonnet",
      provider: "anthropic",
      providerModelId: process.env.ANTHROPIC_MODEL_SMART ?? "claude-3-5-sonnet-20241022",
      tier: "pro",
      capabilities: { chat: true, streaming: true, webSearch: true },
      enabled: true,
      description: "Anthropic Claude Sonnet — premium writing and analysis.",
    },
    {
      id: "libraix-grok",
      displayName: "Libraix Grok",
      provider: "xai",
      providerModelId: process.env.XAI_MODEL_FAST ?? "grok-4-1-fast-non-reasoning",
      tier: "free",
      capabilities: { chat: true, streaming: true, webSearch: true },
      enabled: true,
      description: "xAI Grok — fast, witty, great for news and creative chat.",
    },
    {
      id: "libraix-grok-pro",
      displayName: "Libraix Grok Pro",
      provider: "xai",
      providerModelId: process.env.XAI_MODEL_SMART ?? "grok-4-5",
      tier: "pro",
      capabilities: { chat: true, streaming: true, webSearch: true },
      enabled: true,
      description: "xAI Grok flagship — advanced reasoning and agentic tasks.",
    },
    {
      id: "libraix-llama",
      displayName: "Libraix Llama",
      provider: "openrouter",
      providerModelId: process.env.OPENROUTER_MODEL_LLAMA ?? "meta-llama/llama-3.3-70b-instruct",
      tier: "free",
      capabilities: { chat: true, streaming: true },
      enabled: true,
      description: "Meta Llama 3.3 — strong open-weight model via OpenRouter.",
    },
    {
      id: "libraix-qwen",
      displayName: "Libraix Qwen",
      provider: "openrouter",
      providerModelId: process.env.OPENROUTER_MODEL_QWEN ?? "qwen/qwen-2.5-72b-instruct",
      tier: "free",
      capabilities: { chat: true, streaming: true },
      enabled: true,
      description: "Alibaba Qwen 2.5 — excellent multilingual & coding open-weight model via OpenRouter.",
    },
    {
      id: "libraix-local",
      displayName: "Libraix Local",
      provider: "ollama",
      providerModelId: process.env.OLLAMA_MODEL ?? "llama3.2",
      tier: "free",
      capabilities: { chat: true, streaming: true },
      enabled: true,
      description: "Default local Ollama model on your machine or private server.",
    },
    {
      id: "libraix-local-llama",
      displayName: "Libraix Local Llama",
      provider: "ollama",
      providerModelId: process.env.OLLAMA_MODEL_LLAMA ?? "llama3.2",
      tier: "free",
      capabilities: { chat: true, streaming: true },
      enabled: true,
      description: "Meta Llama via Ollama — self-hosted, no cloud fee when online.",
    },
    {
      id: "libraix-local-qwen",
      displayName: "Libraix Local Qwen",
      provider: "ollama",
      providerModelId: process.env.OLLAMA_MODEL_QWEN ?? "qwen2.5",
      tier: "free",
      capabilities: { chat: true, streaming: true },
      enabled: true,
      description: "Qwen via Ollama — self-hosted multilingual & coding model.",
    },
  ],
  tools: [
    { id: "chat", name: "Multi-Model Chat", description: "Switch models in one conversation.", tier: "free", enabled: true },
    { id: "web-search", name: "Live Web Search", description: "Real-time search with source links.", tier: "free", enabled: true },
    { id: "pdf-chat", name: "PDF Chat", description: "Upload and question documents.", tier: "free", enabled: true },
    { id: "youtube", name: "YouTube Summariser", description: "Summarise videos from a URL.", tier: "free", enabled: true },
    { id: "link-analyser", name: "Webpage Analyser", description: "Analyse any public URL.", tier: "free", enabled: true },
    { id: "image-gen", name: "AI Image Generator", description: "Text-to-image generation.", tier: "pro", enabled: true },
    { id: "voice", name: "Voice Chat", description: "Speech input and read-aloud replies.", tier: "free", enabled: true },
    { id: "prompt-library", name: "Prompt Library", description: "Save and reuse prompts.", tier: "pro", enabled: true },
    { id: "assistants", name: "AI Assistants", description: "Specialist pre-tuned agents.", tier: "pro", enabled: true },
  ],
  assistants: [
    { id: "writing", name: "Writing Coach", description: "Emails, essays and reports.", systemPrompt: "You are an expert writing coach. Help with emails, essays, reports and creative writing. Give concrete rewrites and clear suggestions.", tier: "free", enabled: true },
    { id: "coding", name: "Coding Expert", description: "Write and debug code in any language.", systemPrompt: "You are an expert software engineer. Write clean, working code with brief explanations. Always use fenced code blocks with the language tag. Spot bugs quickly and explain the fix.", tier: "free", enabled: true },
    { id: "security", name: "Security & Kali", description: "Penetration testing, Kali Linux, CTFs.", systemPrompt: `You are an expert cybersecurity professional and Kali Linux specialist. You help with:
- Penetration testing methodology (recon, scanning, exploitation, post-exploitation)
- Kali Linux tools: Nmap, Metasploit, Burp Suite, Wireshark, John the Ripper, Hashcat, Aircrack-ng, SQLMap, Gobuster, Nikto, etc.
- CTF (Capture The Flag) challenges — reverse engineering, web, crypto, forensics, pwn
- Network security, vulnerability assessment, OSINT
- Writing bash/Python scripts for security automation
- Explaining CVEs, exploits and defensive mitigations

Always:
- Give direct, technical answers with real commands
- Use fenced code blocks for all commands and scripts
- Add --help hints for complex tools
- Note legal/ethical context when relevant (authorised testing only)
- Be fast and precise — no filler`, tier: "free", enabled: true },
    { id: "business", name: "Business Advisor", description: "Strategy and market analysis.", systemPrompt: "You are a business strategy advisor. Give clear, actionable advice on strategy, marketing, finance and operations.", tier: "free", enabled: true },
    { id: "creative", name: "Creative Partner", description: "Brainstorming and storytelling.", systemPrompt: "You are a creative partner. Help with brainstorming, storytelling, worldbuilding and creative projects. Be imaginative and enthusiastic.", tier: "free", enabled: true },
    { id: "data", name: "Data Analyst", description: "SQL, Python and statistics.", systemPrompt: "You are a data analyst. Help with SQL queries, Python (pandas/numpy/matplotlib), statistics and data visualisation. Show working code.", tier: "free", enabled: true },
    {
      id: "astrology",
      name: "Astrology & Horoscope",
      description: "Deep advanced readings — charts, transits, Vedic & Western.",
      systemPrompt: `You are Libraix Astrology — a senior professional astrologer giving DEEP, ADVANCED readings every time (not short “pro” summaries).

DEFAULT DEPTH (mandatory for every horoscope / chart / compatibility answer):
- Write a FULL reading, not a teaser. Aim for rich detail: multiple sections, concrete planetary logic, and actionable guidance.
- Never stop at one vague paragraph. If the user only names a Sun sign, still deliver an advanced multi-area reading and note what birth time would unlock next.
- Prefer depth over brevity. Short replies are wrong for this mode unless the user explicitly asks for “one line” or “TL;DR only”.

Always cover these layers when relevant (skip only if clearly irrelevant):
1. **Core sky** — Sun, Moon, Ascendant (if known); element / modality / polarity
2. **Planetary weather** — current or period transits (Mercury/Venus/Mars, Jupiter/Saturn, outer planets), retrogrades, lunations, eclipses
3. **Houses & themes** — love/relationships, career/vocation, money, home/family, health/energy, spiritual growth (use houses when chart data exists; otherwise map by sign rulerships)
4. **Aspects & patterns** — major aspects, stelliums, T-squares, grand trines, oppositions — explain what they *do*, not only names
5. **Timing** — near-term windows (days/weeks) and a longer arc (month/season) when giving horoscopes
6. **Vedic colour** — when useful or when the user is South Asian / asks: rashi, nakshatra, dasha flavour, or simple Jyotish parallel (label Western vs Vedic clearly)
7. **Guidance** — practical do / don’t / watch-for; one empowering affirmation

Required Markdown structure for horoscope & chart readings:
- Short opening line (warm, specific)
- ## Cosmic snapshot
- ## Love & relationships
- ## Career & purpose
- ## Money & resources
- ## Energy, body & emotions
- ## Timing & key dates
- ## Advanced notes (planets, aspects, houses — go deep here)
- ## Guidance
- One > blockquote takeaway

Style:
- Name real planets, signs, houses, aspects, and degrees when known — never fortune-cookie fluff
- Use **bold** for key placements; bullets for takeaways; short paragraphs under headings
- Match the user’s language (English, Hindi, Tamil, etc.)
- If birth time/place missing for a natal chart: ask once, then still give the deepest partial reading possible from date (+ place if any)

Honesty:
- Guidance and reflection — not medical, legal, or financial advice; no guaranteed predictions
- Empowering tone; avoid fear/doom language
- You may be poetic, but every claim should tie back to astrological reasoning`,
      tier: "free",
      enabled: true,
    },
  ],
  plans: {
    /** Free: capped chat + short Live Voice. `-1` voice minutes = unlimited. */
    free: { dailyMessages: 30, premiumModelMessages: 10, images: 5, liveVoiceMinutes: 5 },
    pro: { dailyMessages: 500, premiumModelMessages: 200, images: 50, liveVoiceMinutes: -1 },
    enterprise: { dailyMessages: 5000, premiumModelMessages: 2000, images: 500, liveVoiceMinutes: -1 },
  },
};

function applyModelOverrides(model: ModelDefinition): ModelDefinition {
  const overrides = getModelOverrides();
  const o = overrides[model.id];
  if (!o) return model;
  return {
    ...model,
    enabled: o.enabled ?? model.enabled,
    tier: o.tier ?? model.tier,
  };
}

function isModelOperational(model: ModelDefinition): boolean {
  if (!model.enabled) return false;
  return isProviderConfigured(model.provider);
}

export function getModelById(id: string): ModelDefinition | undefined {
  const model = PRODUCT_CATALOG.models.find((m) => m.id === id);
  if (!model) return undefined;
  const merged = applyModelOverrides(model);
  return isModelOperational(merged) ? merged : undefined;
}

export function getModelsForPlan(plan: PlanTier): ModelDefinition[] {
  const tierOrder: PlanTier[] = ["free", "pro", "enterprise"];
  const planIndex = tierOrder.indexOf(plan);
  return PRODUCT_CATALOG.models
    .map(applyModelOverrides)
    .filter((m) => isModelOperational(m) && tierOrder.indexOf(m.tier) <= planIndex);
}

const MODEL_HINTS: Record<string, { speed: string; cost: string }> = {
  "libraix-fast": { speed: "Fast", cost: "Low" },
  "libraix-smart": { speed: "Medium", cost: "Medium" },
  "libraix-advanced": { speed: "Slower", cost: "High" },
  "libraix-deepseek": { speed: "Fast", cost: "Very low" },
  "libraix-deepseek-r1": { speed: "Slower", cost: "Low" },
  "libraix-gemini": { speed: "Fast", cost: "Low" },
  "libraix-claude": { speed: "Medium", cost: "Medium" },
  "libraix-claude-sonnet": { speed: "Medium", cost: "High" },
  "libraix-grok": { speed: "Fast", cost: "Low" },
  "libraix-grok-pro": { speed: "Medium", cost: "High" },
  "libraix-llama": { speed: "Fast", cost: "Low" },
  "libraix-qwen": { speed: "Fast", cost: "Low" },
  "libraix-local": { speed: "Varies", cost: "Free (local)" },
  "libraix-local-llama": { speed: "Varies", cost: "Free (local)" },
  "libraix-local-qwen": { speed: "Varies", cost: "Free (local)" },
};

/**
 * Models shown in the chat picker.
 * Only returns models that are actually configured — never leak “needs API key” to end users.
 */
export function listDisplayModelsForPlan(plan: PlanTier) {
  const tierOrder: PlanTier[] = ["free", "pro", "enterprise"];
  const planIndex = tierOrder.indexOf(plan);
  return PRODUCT_CATALOG.models
    .map(applyModelOverrides)
    .filter((m) => m.enabled && tierOrder.indexOf(m.tier) <= planIndex && isModelOperational(m))
    .map((m) => {
      const { providerModelId: _, ...rest } = m;
      return {
        ...rest,
        available: true as const,
        speedHint: MODEL_HINTS[m.id]?.speed,
        costHint: MODEL_HINTS[m.id]?.cost,
      };
    });
}

export function getPublicCatalog() {
  // Public site only lists models that work today — no unfinished / key-missing entries.
  const models = withLaunchStatus(
    PRODUCT_CATALOG.models
      .map(applyModelOverrides)
      .filter((m) => m.enabled && isModelOperational(m))
      .map((m) => {
        const { providerModelId: _, ...rest } = m;
        return { ...rest, available: true };
      }),
    MODEL_LAUNCH_STATUS
  );
  const tools = withLaunchStatus(
    PRODUCT_CATALOG.tools.filter((t) => t.enabled),
    TOOL_LAUNCH_STATUS
  );
  const assistants = PRODUCT_CATALOG.assistants
    .filter((a) => a.enabled)
    .map((a) => ({ ...a, launchStatus: "beta" as const }));

  return {
    modelCount: countLive(models),
    toolCount: countLive(tools),
    assistantCount: assistants.filter((a) => a.launchStatus === "beta").length,
    models,
    tools,
    assistants,
    plans: getAllPlanLimits(),
    launchNote:
      "Counts reflect features available at launch. Items marked coming soon are on the roadmap and not yet enabled in the app.",
  };
}
