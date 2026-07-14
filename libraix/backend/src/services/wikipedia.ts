import type { SearchResult } from "./webSearch.js";
import { getCachedSources, setCachedSources, wikiCacheTtlSec } from "./sourceCache.js";

const WIKI_API = "https://en.wikipedia.org/w/api.php";
const WIKI_SUMMARY = "https://en.wikipedia.org/api/rest_v1/page/summary";
const UA = "Libraix/1.0 (https://libraix.ai; research assistant)";

async function fetchWiki(url: string, ms = 8_000): Promise<Response | null> {
  try {
    return await fetch(url, {
      headers: { "User-Agent": UA, Accept: "application/json" },
      signal: AbortSignal.timeout(ms),
    });
  } catch {
    return null;
  }
}

export function wantsWikipedia(query: string): boolean {
  return /\b(wikipedia|wiki)\b/i.test(query) || /\b(who is|what is|history of|biography of)\b/i.test(query);
}

/** OpenSearch + REST summary — free, fast, linkable citations. */
export async function searchWikipedia(query: string, limit = 4): Promise<SearchResult[]> {
  const q = query.replace(/\b(wikipedia|wiki|according to)\b/gi, "").replace(/\s+/g, " ").trim();
  if (q.length < 2) return [];

  const cached = getCachedSources(q, "wikipedia");
  if (cached) return cached.slice(0, limit);

  const searchUrl =
    `${WIKI_API}?action=opensearch&search=${encodeURIComponent(q)}` +
    `&limit=${limit}&namespace=0&format=json&origin=*`;

  const res = await fetchWiki(searchUrl);
  if (!res?.ok) return [];

  const data = (await res.json()) as [string, string[], string[], string[]];
  const titles = data[1] ?? [];
  const descs = data[2] ?? [];
  const urls = data[3] ?? [];

  const results: SearchResult[] = [];
  for (let i = 0; i < titles.length; i++) {
    const title = titles[i];
    const url = urls[i];
    if (!title || !url) continue;
    let snippet = descs[i] ?? "";
    if (!snippet || snippet.length < 40) {
      const summary = await fetchWikiSummary(title);
      if (summary?.extract) snippet = summary.extract.slice(0, 320);
    }
    results.push({
      title: `Wikipedia: ${title}`,
      url,
      snippet: snippet || `Wikipedia article: ${title}`,
    });
  }

  if (results.length) setCachedSources(q, "wikipedia", results, wikiCacheTtlSec());
  return results;
}

export async function fetchWikiSummary(title: string): Promise<{ title: string; extract: string; url: string } | null> {
  const res = await fetchWiki(`${WIKI_SUMMARY}/${encodeURIComponent(title.replace(/ /g, "_"))}`);
  if (!res?.ok) return null;
  const data = (await res.json()) as {
    title?: string;
    extract?: string;
    content_urls?: { desktop?: { page?: string } };
  };
  if (!data.extract) return null;
  return {
    title: data.title ?? title,
    extract: data.extract,
    url: data.content_urls?.desktop?.page ?? `https://en.wikipedia.org/wiki/${encodeURIComponent(title.replace(/ /g, "_"))}`,
  };
}

export function formatWikipediaContext(results: SearchResult[]): string {
  if (!results.length) return "";
  const lines = results.map(
    (r, i) => `[W${i + 1}] ${r.title}\nURL: ${r.url}\nSnippet: ${r.snippet}`
  );
  return (
    `Wikipedia sources (prefer these for encyclopedic facts; include the Wikipedia URL so readers can open the article):\n\n` +
    lines.join("\n\n")
  );
}
