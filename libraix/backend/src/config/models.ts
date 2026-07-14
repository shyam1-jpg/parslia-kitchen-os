import { withLaunchStatus, TOOL_LAUNCH_STATUS, MODEL_LAUNCH_STATUS, countLive } from "./launchStatus.js";
import { getModelOverrides, getAllPlanLimits } from "../services/siteConfig.js";
import { isProviderConfigured } from "../providers/config.js";

export type PlanTier = "free" | "pro" | "enterprise";

export interface ModelDefinition {
  id: string;
  displayName: string;
  provider: "openai" | "anthropic" | "google" | "deepseek" | "meta" | "xai" | "perplexity" | "ollama";
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
    free: { dailyMessages: number; premiumModelMessages: number; images: number };
    pro: { dailyMessages: number; premiumModelMessages: number; images: number };
    enterprise: { dailyMessages: number; premiumModelMessages: number; images: number };
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
      id: "libraix-local",
      displayName: "Libraix Local",
      provider: "ollama",
      providerModelId: process.env.OLLAMA_MODEL ?? "llama3.2",
      tier: "free",
      capabilities: { chat: true, streaming: true },
      enabled: true,
      description: "Run models locally via Ollama on your machine or server.",
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
  ],
  plans: {
    free: { dailyMessages: 30, premiumModelMessages: 10, images: 5 },
    pro: { dailyMessages: 500, premiumModelMessages: 200, images: 50 },
    enterprise: { dailyMessages: 5000, premiumModelMessages: 2000, images: 500 },
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

const PROVIDER_KEY_LABEL: Record<string, string> = {
  openai: "OPENAI_API_KEY",
  deepseek: "DEEPSEEK_API_KEY",
  google: "GOOGLE_API_KEY",
  anthropic: "ANTHROPIC_API_KEY",
  xai: "XAI_API_KEY",
  ollama: "OLLAMA_BASE_URL",
};

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
  "libraix-local": { speed: "Varies", cost: "Free (local)" },
};

/** All models for a plan (including those needing API keys), for UI display. */
export function listDisplayModelsForPlan(plan: PlanTier) {
  const tierOrder: PlanTier[] = ["free", "pro", "enterprise"];
  const planIndex = tierOrder.indexOf(plan);
  return PRODUCT_CATALOG.models
    .map(applyModelOverrides)
    .filter((m) => m.enabled && tierOrder.indexOf(m.tier) <= planIndex)
    .map((m) => {
      const available = isModelOperational(m);
      const { providerModelId: _, ...rest } = m;
      return {
        ...rest,
        available,
        speedHint: MODEL_HINTS[m.id]?.speed,
        costHint: MODEL_HINTS[m.id]?.cost,
        unavailableReason: available
          ? undefined
          : `Add ${PROVIDER_KEY_LABEL[m.provider] ?? m.provider + " API key"} on Render`,
      };
    });
}

export function getPublicCatalog() {
  const models = withLaunchStatus(
    PRODUCT_CATALOG.models
      .map(applyModelOverrides)
      .filter((m) => m.enabled)
      .map((m) => {
        const { providerModelId: _, ...rest } = m;
        return { ...rest, available: isModelOperational(m) };
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
