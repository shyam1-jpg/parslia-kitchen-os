import { getModelById, getModelsForPlan, type ModelDefinition, type PlanTier } from "../config/models.js";
import type { RouterMode } from "../config/featureFlags.js";

export interface RouterInput {
  message: string;
  mode: RouterMode;
  userPlan: PlanTier;
  manualModelId?: string;
  needsCode?: boolean;
  needsResearch?: boolean;
  privacyMode?: boolean;
}

export interface RouterResult {
  modelId: string;
  displayName: string;
  mode: RouterMode;
  reason: string;
  estimatedSpeed: "fast" | "medium" | "slow";
  estimatedCredits: number;
  enabledTools: string[];
  wasAutoSelected: boolean;
}

function scoreModel(model: ModelDefinition, mode: RouterMode, input: RouterInput): number {
  let score = 0;
  if (mode === "fast" || mode === "lowest-cost") {
    if (model.id === "libraix-fast") score += 100;
    if (model.tier === "free") score += 50;
  }
  if (mode === "balanced" || mode === "auto") {
    if (model.id === "libraix-smart") score += 100;
    if (model.id === "libraix-fast") score += 60;
  }
  if (mode === "advanced" || mode === "deep-research") {
    if (model.id === "libraix-advanced") score += 100;
  }
  if (mode === "coding" && model.capabilities.chat) {
    if (model.id === "libraix-advanced") score += 80;
    if (model.id === "libraix-smart") score += 60;
  }
  if (mode === "creative" && model.id === "libraix-smart") score += 80;
  if (input.needsCode && model.id === "libraix-advanced") score += 40;
  if (input.needsResearch && model.capabilities.webSearch) score += 50;
  if (mode === "private" && model.tier === "free") score += 30;
  return score;
}

function detectNeeds(message: string) {
  const lower = message.toLowerCase();
  return {
    needsCode: /\b(code|python|javascript|sql|debug|function|api)\b/.test(lower),
    needsResearch: /\b(research|compare|analyze|sources|citation|market|competitor)\b/.test(lower),
  };
}

export function routeModel(input: RouterInput): RouterResult {
  const available = getModelsForPlan(input.userPlan).filter((m) => m.capabilities.chat);

  if (input.manualModelId && input.mode !== "auto") {
    const manual = getModelById(input.manualModelId);
    if (manual && available.some((m) => m.id === manual.id)) {
      return buildResult(manual, input.mode, "User selected model", false);
    }
  }

  const detected = detectNeeds(input.message);
  const needs = { ...detected, ...input };
  const mode = input.mode === "auto" ? inferAutoMode(needs) : input.mode;

  let best = available[0];
  let bestScore = -1;
  for (const model of available) {
    const s = scoreModel(model, mode, { ...input, ...needs });
    if (s > bestScore) {
      bestScore = s;
      best = model;
    }
  }

  if (!best) throw new Error("NO_MODEL_AVAILABLE");

  const reason = input.mode === "auto"
    ? `Auto-selected for ${mode} task${needs.needsCode ? " (code detected)" : ""}${needs.needsResearch ? " (research detected)" : ""}`
    : `Selected for ${mode} mode`;

  return buildResult(best, mode, reason, true);
}

function inferAutoMode(input: RouterInput & { needsCode: boolean; needsResearch: boolean }): RouterMode {
  if (input.needsResearch) return "deep-research";
  if (input.needsCode) return "coding";
  if (input.message.length > 2000) return "advanced";
  return "balanced";
}

function buildResult(model: ModelDefinition, mode: RouterMode, reason: string, wasAutoSelected: boolean): RouterResult {
  const tools: string[] = [];
  if (model.capabilities.webSearch) tools.push("web-search");
  if (model.capabilities.fileSearch) tools.push("file-search");

  return {
    modelId: model.id,
    displayName: model.displayName,
    mode,
    reason,
    estimatedSpeed: model.id === "libraix-fast" ? "fast" : model.id === "libraix-advanced" ? "slow" : "medium",
    estimatedCredits: model.tier === "free" ? 1 : model.id === "libraix-advanced" ? 5 : 3,
    enabledTools: tools,
    wasAutoSelected,
  };
}
