import * as cheerio from "cheerio";

export interface SearchResult {
  title: string;
  url: string;
  snippet: string;
}

const MAX_RESULTS = 6;

function searchApiKey(): string | null {
  return process.env.SERPER_API_KEY?.trim() || process.env.SEARCH_API_KEY?.trim() || null;
}

async function searchViaSerper(query: string): Promise<SearchResult[]> {
  const key = searchApiKey();
  if (!key) return [];

  const res = await fetch("https://google.serper.dev/search", {
    method: "POST",
    headers: { "X-API-KEY": key, "Content-Type": "application/json" },
    body: JSON.stringify({ q: query, num: MAX_RESULTS }),
  });
  if (!res.ok) return [];

  const data = (await res.json()) as {
    organic?: Array<{ title?: string; link?: string; snippet?: string }>;
  };
  return (data.organic ?? [])
    .filter((r) => r.link)
    .slice(0, MAX_RESULTS)
    .map((r) => ({
      title: r.title ?? r.link!,
      url: r.link!,
      snippet: r.snippet ?? "",
    }));
}

async function searchViaDuckDuckGo(query: string): Promise<SearchResult[]> {
  const res = await fetch(`https://html.duckduckgo.com/html/?q=${encodeURIComponent(query)}`, {
    headers: { "User-Agent": "Libraix/1.0 (+https://libraix.ai)" },
  });
  if (!res.ok) return [];

  const html = await res.text();
  const $ = cheerio.load(html);
  const results: SearchResult[] = [];

  $(".result").each((_i, el) => {
    if (results.length >= MAX_RESULTS) return false;
    const title = $(el).find(".result__a").first().text().trim();
    let href = $(el).find(".result__a").first().attr("href") ?? "";
    const snippet = $(el).find(".result__snippet").first().text().trim();
    if (href.startsWith("//duckduckgo.com/l/?uddg=")) {
      try {
        href = decodeURIComponent(href.split("uddg=")[1]?.split("&")[0] ?? href);
      } catch {
        /* keep original */
      }
    }
    if (title && href.startsWith("http")) {
      results.push({ title, url: href, snippet });
    }
  });

  return results;
}

export function isWebSearchConfigured(): boolean {
  return Boolean(searchApiKey());
}

export async function searchWeb(query: string): Promise<SearchResult[]> {
  const serper = await searchViaSerper(query);
  if (serper.length) return serper;
  return searchViaDuckDuckGo(query);
}

export function formatSearchContext(results: SearchResult[]): string {
  if (!results.length) {
    return "No live web results were retrieved. Answer from general knowledge and note that live search returned no results.";
  }
  const lines = results.map(
    (r, i) => `[${i + 1}] ${r.title}\nURL: ${r.url}\nSnippet: ${r.snippet}`
  );
  return `Live web search results (cite sources by number when used):\n\n${lines.join("\n\n")}`;
}
