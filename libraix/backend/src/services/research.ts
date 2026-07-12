import { completeViaGateway } from "../providers/gateway.js";
import { getModelById } from "../config/models.js";
import { canSendMessage, recordMessageUsage } from "./usage.js";
import type { SafeUser } from "./users.js";

export interface ResearchRequest {
  query: string;
  depth: "quick" | "standard" | "deep";
}

export interface ResearchResult {
  summary: string;
  keyFindings: string[];
  sources: { title: string; url: string; snippet: string }[];
  methodology: string;
  confidence: "high" | "medium" | "low";
  disclaimer: string;
}

export async function runDeepResearch(user: SafeUser, req: ResearchRequest): Promise<ResearchResult> {
  const model = getModelById("libraix-advanced") ?? getModelById("libraix-smart");
  if (!model) throw new Error("MODEL_NOT_AVAILABLE");

  if (!canSendMessage(user.id, user.plan, model.tier !== "free")) {
    throw new Error("USAGE_LIMIT_REACHED");
  }

  const depthInstructions = {
    quick: "Provide a brief research summary in 3-5 key points.",
    standard: "Provide a structured research report with summary, key findings, and suggested sources.",
    deep: "Provide a comprehensive research report with executive summary, detailed findings, conflicting viewpoints, and bibliography.",
  };

  const response = await completeViaGateway(model, {
    messages: [
      {
        role: "system",
        content: `You are a research assistant. ${depthInstructions[req.depth]} Clearly distinguish sourced facts from interpretation. Include a methodology note and confidence level. Format sources as JSON array at end: [{"title":"","url":"","snippet":""}]`,
      },
      { role: "user", content: req.query },
    ],
  });

  recordMessageUsage(user.id, model.tier !== "free", response.tokensUsed, response.estimatedCostCents);

  const sourcesMatch = response.content.match(/\[[\s\S]*?\{[\s\S]*?\}[\s\S]*?\]/);
  let sources: ResearchResult["sources"] = [];
  if (sourcesMatch) {
    try {
      sources = JSON.parse(sourcesMatch[0]);
    } catch {
      sources = [{ title: "Research synthesis", url: "", snippet: "AI-generated summary — verify independently" }];
    }
  }

  const mainContent = sourcesMatch ? response.content.replace(sourcesMatch[0], "").trim() : response.content;
  const findings = mainContent.split("\n").filter((l) => l.trim().startsWith("-") || l.trim().match(/^\d+\./)).slice(0, 10);

  return {
    summary: mainContent.slice(0, 2000),
    keyFindings: findings.length ? findings : [mainContent.slice(0, 500)],
    sources,
    methodology: `${req.depth} research using ${model.displayName}. Web search integration pending.`,
    confidence: req.depth === "deep" ? "medium" : "low",
    disclaimer: "Research results may contain inaccuracies. Verify critical facts independently before acting.",
  };
}
