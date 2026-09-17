import * as cheerio from "cheerio";
import { assertPublicHttpUrl } from "./urlGuard.js";
import { getCachedJson, setCachedJson } from "./sourceCache.js";

const MAX_PAGE_CHARS = 40_000;
const JINA_TIMEOUT_MS = 8_000;
const DIRECT_TIMEOUT_MS = 10_000;
const CACHE_TTL_SEC = 6 * 60 * 60;

function stripHtml(html: string): { title: string; text: string } {
  const $ = cheerio.load(html);
  $("script, style, nav, footer, header, noscript, iframe, svg, form, aside").remove();
  const title =
    $("meta[property='og:title']").attr("content")?.trim() ||
    $("title").first().text().trim() ||
    "";
  const article =
    $("article").text() ||
    $("[role='main']").text() ||
    $("main").text() ||
    $("body").text() ||
    $.root().text();
  return { title, text: article.replace(/\s+/g, " ").trim() };
}

async function fetchWithTimeout(url: string, init: RequestInit, ms: number): Promise<Response> {
  const ctrl = new AbortController();
  const timer = setTimeout(() => ctrl.abort(), ms);
  try {
    return await fetch(url, { ...init, signal: ctrl.signal });
  } catch (e) {
    if (e instanceof Error && (e.name === "AbortError" || e.message.includes("abort"))) {
      throw new Error("PAGE_TIMEOUT");
    }
    throw new Error("PAGE_FETCH_FAILED");
  } finally {
    clearTimeout(timer);
  }
}

export interface FetchedPage {
  url: string;
  title: string;
  text: string;
  truncated: boolean;
}

function clipPage(url: string, title: string, body: string): FetchedPage {
  const truncated = body.length > MAX_PAGE_CHARS;
  return {
    url,
    title: title || new URL(url).hostname,
    text: truncated ? body.slice(0, MAX_PAGE_CHARS) + "\n\n[Page truncated]" : body,
    truncated,
  };
}

async function fetchViaJina(url: string): Promise<FetchedPage | null> {
  try {
    const res = await fetchWithTimeout(
      `https://r.jina.ai/${url}`,
      {
        headers: { Accept: "text/plain", "User-Agent": "Libraix/1.0 (+https://libraix.ai)" },
      },
      JINA_TIMEOUT_MS
    );
    if (!res.ok) return null;
    const body = (await res.text()).trim();
    if (body.length < 200) return null;
    return clipPage(url, new URL(url).hostname, body);
  } catch {
    return null;
  }
}

async function fetchViaDirect(url: string): Promise<FetchedPage> {
  const res = await fetchWithTimeout(
    url,
    {
      headers: { "User-Agent": "Libraix/1.0 (+https://libraix.ai)", Accept: "text/html,application/xhtml+xml" },
      redirect: "follow",
    },
    DIRECT_TIMEOUT_MS
  );
  if (res.status === 403 || res.status === 401) throw new Error("PAGE_BLOCKED");
  if (!res.ok) throw new Error("PAGE_FETCH_FAILED");
  const html = await res.text();
  const extracted = stripHtml(html);
  if (!extracted.text) throw new Error("NO_PAGE_TEXT");
  return clipPage(url, extracted.title, extracted.text);
}

export async function fetchPageContent(rawUrl: string): Promise<FetchedPage> {
  const url = await assertPublicHttpUrl(rawUrl);
  const cached = getCachedJson<FetchedPage>(url.href, "page");
  if (cached?.text) return cached;

  // Independent timeouts: Jina and direct fetch run in parallel so a slow reader cannot starve the fallback.
  const jinaP = fetchViaJina(url.href);
  const directP = fetchViaDirect(url.href).then(
    (page) => page,
    (err: unknown) => err as Error
  );

  const jina = await jinaP;
  if (jina && jina.text.length > 200) {
    setCachedJson(url.href, "page", jina, CACHE_TTL_SEC);
    return jina;
  }

  const direct = await directP;
  if (direct instanceof Error) {
    if (jina?.text) return jina;
    throw new Error(direct.message === "PAGE_TIMEOUT" || direct.message === "PAGE_BLOCKED" || direct.message === "NO_PAGE_TEXT" ? direct.message : "PAGE_FETCH_FAILED");
  }
  setCachedJson(url.href, "page", direct, CACHE_TTL_SEC);
  return direct;
}
