import { withLaunchStatus, TOOL_LAUNCH_STATUS, MODEL_LAUNCH_STATUS, countLive } from "./launchStatus.js";
import { getModelOverrides, getAllPlanLimits } from "../services/siteConfig.js";
import { isProviderConfigured } from "../providers/config.js";

export type PlanTier = "free" | "pro" | "enterprise";

export interface ModelDefinition {
  id: string;
  displayName: string;
  provider: "openai" | "anthropic" | "google" | "deepseek" | "meta" | "xai" | "perplexity";
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
  ],
  tools: [
    { id: "chat", name: "Multi-Model Chat", description: "Switch models in one conversation.", tier: "free", enabled: true },
    { id: "web-search", name: "Live Web Search", description: "Real-time search with source links.", tier: "free", enabled: true },
    { id: "pdf-chat", name: "PDF Chat", description: "Upload and question documents.", tier: "free", enabled: true },
    { id: "youtube", name: "YouTube Summariser", description: "Summarise videos from a URL.", tier: "free", enabled: true },
    { id: "link-analyser", name: "Webpage Analyser", description: "Analyse any public URL.", tier: "free", enabled: true },
    { id: "image-gen", name: "AI Image Generator", description: "Text-to-image generation.", tier: "pro", enabled: true },
    { id: "voice", name: "Voice Chat", description: "Hands-free voice conversations.", tier: "pro", enabled: false },
    { id: "prompt-library", name: "Prompt Library", description: "Save and reuse prompts.", tier: "pro", enabled: true },
    { id: "assistants", name: "AI Assistants", description: "Specialist pre-tuned agents.", tier: "pro", enabled: true },
  ],
  assistants: [
    { id: "writing", name: "Writing Coach", description: "Emails, essays and reports.", systemPrompt: "You are an expert writing coach.", tier: "pro", enabled: true },
    { id: "coding", name: "Coding Expert", description: "Write and debug code.", systemPrompt: "You are an expert software engineer.", tier: "pro", enabled: true },
    { id: "business", name: "Business Advisor", description: "Strategy and market analysis.", systemPrompt: "You are a business strategy advisor.", tier: "pro", enabled: true },
    { id: "creative", name: "Creative Partner", description: "Brainstorming and storytelling.", systemPrompt: "You are a creative partner.", tier: "pro", enabled: true },
    { id: "data", name: "Data Analyst", description: "SQL, Python and statistics.", systemPrompt: "You are a data analyst.", tier: "pro", enabled: true },
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

export function getPublicCatalog() {
  const models = withLaunchStatus(
    PRODUCT_CATALOG.models
      .map(applyModelOverrides)
      .filter(isModelOperational)
      .map(({ providerModelId: _, ...rest }) => rest),
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
