import { searchWeb, formatSearchContext, type SearchResult } from "./webSearch.js";
import { formatWikipediaContext, searchWikipedia, wantsWikipedia } from "./wikipedia.js";
import { pruneExpiredSourceCache } from "./sourceCache.js";

export type LiveSource = {
  index: number;
  filename: string;
  excerpt: string;
  url: string;
  kind: "wikipedia" | "web";
};

/** When chat should pull live Wikipedia / web sources (not only deep-research mode). */
export function wantsLiveSources(message: string, routerMode?: string): boolean {
  if (routerMode === "deep-research") return true;
  if (wantsWikipedia(message)) return true;
  if (/\b(source|sources|citation|cite|according to|look up|fact.?check|verify)\b/i.test(message)) {
    return true;
  }
  if (/\b(who is|what is|what are|when did|where is|history of|biography)\b/i.test(message)) {
    return true;
  }
  if (/\b(research|latest|news about|tell me about)\b/i.test(message) && message.length > 18) {
    return true;
  }
  return false;
}

/**
 * Fast parallel Wikipedia + web search with SQLite/memory TTL via providers.
 * Wikipedia first so encyclopedic answers get clickable wiki links.
 */
export async function resolveLiveSources(query: string): Promise<{
  context: string | null;
  sources: LiveSource[];
  wikipedia: SearchResult[];
  web: SearchResult[];
}> {
  if (Math.random() < 0.05) pruneExpiredSourceCache();

  const preferWiki = wantsWikipedia(query);
  const [wikipedia, web] = await Promise.all([
    searchWikipedia(query, preferWiki ? 5 : 3),
    searchWeb(query),
  ]);

  const parts: string[] = [];
  if (wikipedia.length) parts.push(formatWikipediaContext(wikipedia));
  if (web.length) parts.push(formatSearchContext(web));

  const sources: LiveSource[] = [];
  let index = 1;
  for (const r of wikipedia) {
    sources.push({
      index: index++,
      filename: r.title,
      excerpt: r.snippet.slice(0, 280),
      url: r.url,
      kind: "wikipedia",
    });
  }
  for (const r of web) {
    // Avoid duplicate Wikipedia URLs from general web search
    if (sources.some((s) => s.url === r.url)) continue;
    sources.push({
      index: index++,
      filename: r.title,
      excerpt: r.snippet.slice(0, 280),
      url: r.url,
      kind: "web",
    });
  }

  if (!parts.length) return { context: null, sources: [], wikipedia, web };

  const guidance =
    "Use the live sources below. When you rely on a Wikipedia article, mention it and include its URL so the user can open it. Cite other sources by title/URL when used.";

  return {
    context: `${guidance}\n\n${parts.join("\n\n")}`,
    sources,
    wikipedia,
    web,
  };
}
