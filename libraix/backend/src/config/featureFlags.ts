import { getFeatureFlagOverrides } from "../services/siteConfig.js";

export type FeatureFlagState = "disabled" | "internal" | "beta" | "enabled";

export interface FeatureFlag {
  id: string;
  name: string;
  description: string;
  state: FeatureFlagState;
  minPlan?: "free" | "pro" | "enterprise";
}

/** Backend-enforced feature flags. Never expose unfinished features via frontend visibility alone. */
export const FEATURE_FLAGS: FeatureFlag[] = [
  { id: "smart-router", name: "Smart Model Router", description: "Auto-select model by task", state: "enabled", minPlan: "free" },
  { id: "model-compare", name: "Model Comparison Lab", description: "Compare 2–4 models side by side", state: "beta", minPlan: "pro" },
  { id: "deep-research", name: "Deep Research", description: "Multi-step web research workspace", state: "beta", minPlan: "pro" },
  { id: "memory", name: "Personal Memory", description: "User-controlled memory system", state: "beta", minPlan: "free" },
  { id: "projects", name: "Projects", description: "Knowledge workspaces with files", state: "beta", minPlan: "free" },
  { id: "voice", name: "Voice Assistant", description: "Read-aloud and speech input", state: "beta", minPlan: "free" },
  { id: "image-studio", name: "Image Studio", description: "Creative image workspace", state: "beta", minPlan: "free" },
  { id: "code-sandbox", name: "Code Sandbox", description: "Isolated code execution", state: "disabled" },
  { id: "custom-agents", name: "Custom Agent Builder", description: "No-code agent creation", state: "internal" },
  { id: "multi-agent", name: "Multi-Agent Orchestration", description: "Agent delegation workflows", state: "disabled" },
  { id: "connectors", name: "App Connectors", description: "Google, GitHub, Slack integrations", state: "internal" },
  { id: "automations", name: "Automations", description: "Scheduled AI tasks", state: "disabled" },
  { id: "computer-use", name: "Computer Use", description: "Experimental browser agent", state: "disabled" },
  { id: "marketplace", name: "Marketplace", description: "Agent and template marketplace", state: "disabled" },
  { id: "developer-api", name: "Developer API", description: "Public Libraix API", state: "internal" },
  { id: "streaming", name: "Streaming Responses", description: "SSE token streaming", state: "enabled", minPlan: "free" },
];

const PLAN_ORDER = { free: 0, pro: 1, enterprise: 2 };

export function isFeatureEnabled(flagId: string, userPlan: "free" | "pro" | "enterprise" = "free"): boolean {
  const flag = FEATURE_FLAGS.find((f) => f.id === flagId);
  if (!flag) return false;
  const overrides = getFeatureFlagOverrides();
  const state = overrides[flagId] ?? flag.state;
  if (state === "disabled") return false;
  if (flag.minPlan && PLAN_ORDER[userPlan] < PLAN_ORDER[flag.minPlan]) return false;
  return state === "enabled" || state === "beta" || state === "internal";
}

export function getPublicFeatures(userPlan: "free" | "pro" | "enterprise") {
  return FEATURE_FLAGS.filter((f) => isFeatureEnabled(f.id, userPlan)).map(({ id, name, description, state }) => ({
    id,
    name,
    description,
    state: state === "internal" ? "coming_soon" : state,
  }));
}

export type RouterMode =
  | "auto"
  | "fast"
  | "balanced"
  | "advanced"
  | "deep-research"
  | "coding"
  | "creative"
  | "private"
  | "lowest-cost";

export const ROUTER_MODES: { id: RouterMode; label: string; description: string }[] = [
  { id: "auto", label: "Auto", description: "Libraix picks the best model for your task" },
  { id: "fast", label: "Fast", description: "Lowest latency, cost-efficient" },
  { id: "balanced", label: "Balanced", description: "Quality and speed balanced" },
  { id: "advanced", label: "Advanced", description: "Highest quality reasoning" },
  { id: "coding", label: "Coding", description: "Optimised for code tasks" },
  { id: "creative", label: "Creative", description: "Optimised for creative writing" },
  { id: "lowest-cost", label: "Lowest Cost", description: "Minimise credit usage" },
  { id: "deep-research", label: "Deep Research", description: "Multi-step research (Pro)" },
  { id: "private", label: "Private", description: "Temporary mode, limited retention" },
];
