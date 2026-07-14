import { completeViaGateway } from "../providers/gateway.js";
import { getModelById } from "../config/models.js";
import { canSendMessage, recordMessageUsage } from "./usage.js";
import { searchWeb, formatSearchContext, isWebSearchConfigured } from "./webSearch.js";
import { resolveLiveSources } from "./liveSources.js";
import { searchWikipedia } from "./wikipedia.js";
import { fetchPageContent } from "./fetchPage.js";
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
  const model = getModelById("libraix-advanced") ?? getModelById("libraix-smart") ?? getModelById("libraix-fast");
  if (!model) throw new Error("MODEL_NOT_AVAILABLE");

  if (!canSendMessage(user.id, user.plan, model.tier !== "free")) {
    throw new Error("USAGE_LIMIT_REACHED");
  }

  const [wikiHits, webHits] = await Promise.all([searchWikipedia(req.query, 4), searchWeb(req.query)]);
  const searchResults = [
    ...wikiHits,
    ...webHits.filter((w) => !wikiHits.some((h) => h.url === w.url)),
  ];
  let pageContext = "";
  if (req.depth !== "quick" && searchResults.length) {
    const top = searchResults.slice(0, req.depth === "deep" ? 3 : 2);
    const chunks: string[] = [];
    for (const hit of top) {
      try {
        const page = await fetchPageContent(hit.url);
        chunks.push(`### ${page.title}\n${page.url}\n${page.text.slice(0, 6000)}`);
      } catch {
        chunks.push(`### ${hit.title}\n${hit.url}\n${hit.snippet}`);
      }
    }
    pageContext = chunks.join("\n\n");
  }

  const depthInstructions = {
    quick: "Provide a brief research summary in 3-5 key points.",
    standard: "Provide a structured research report with summary, key findings, and cited sources.",
    deep: "Provide a comprehensive research report with executive summary, detailed findings, and bibliography.",
  };

  const searchBlock = formatSearchContext(searchResults);
  const userContent = [
    `Research query: ${req.query}`,
    searchBlock,
    pageContext ? `Fetched page excerpts:\n${pageContext}` : "",
  ]
    .filter(Boolean)
    .join("\n\n");

  const response = await completeViaGateway(model, {
    messages: [
      {
        role: "system",
        content: `You are a research assistant. ${depthInstructions[req.depth]} Use the live search results and page excerpts when provided. Cite sources by title and URL. End with a JSON array of sources: [{"title":"","url":"","snippet":""}]`,
      },
      { role: "user", content: userContent },
    ],
  });

  recordMessageUsage(user.id, model.tier !== "free", response.tokensUsed, response.estimatedCostCents);

  const sourcesMatch = response.content.match(/\[[\s\S]*?\{[\s\S]*?\}[\s\S]*?\]/);
  let sources: ResearchResult["sources"] = searchResults.map((r) => ({
    title: r.title,
    url: r.url,
    snippet: r.snippet,
  }));
  if (sourcesMatch) {
    try {
      const parsed = JSON.parse(sourcesMatch[0]) as ResearchResult["sources"];
      if (parsed.length) sources = parsed;
    } catch {
      /* keep search results */
    }
  }

  const mainContent = sourcesMatch ? response.content.replace(sourcesMatch[0], "").trim() : response.content;
  const findings = mainContent.split("\n").filter((l) => l.trim().startsWith("-") || l.trim().match(/^\d+\./)).slice(0, 10);

  const usedLiveSearch = searchResults.length > 0;
  return {
    summary: mainContent.slice(0, 4000),
    keyFindings: findings.length ? findings : [mainContent.slice(0, 500)],
    sources,
    methodology: usedLiveSearch
      ? `${req.depth} research using ${model.displayName} with live web search${isWebSearchConfigured() ? " (Serper)" : " (DuckDuckGo fallback)"}${pageContext ? " and page fetching" : ""}.`
      : `${req.depth} research using ${model.displayName}. Live search returned no results — synthesis from model knowledge.`,
    confidence: usedLiveSearch ? (req.depth === "deep" ? "medium" : "low") : "low",
    disclaimer: "Research results may contain inaccuracies. Verify critical facts independently before acting.",
  };
}

/** Inject web search context for chat when router mode is deep-research. */
export async function buildWebSearchContext(query: string): Promise<string | null> {
  const bundle = await buildWebSearchBundle(query);
  return bundle.context;
}

export async function buildWebSearchBundle(
  query: string
): Promise<{ context: string | null; sources: { index: number; filename: string; excerpt: string; url: string }[] }> {
  const live = await resolveLiveSources(query);
  return {
    context: live.context,
    sources: live.sources.map(({ index, filename, excerpt, url }) => ({ index, filename, excerpt, url })),
  };
}
