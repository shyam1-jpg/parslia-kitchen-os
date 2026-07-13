import * as cheerio from "cheerio";
import { assertPublicHttpUrl } from "./urlGuard.js";

const MAX_PAGE_CHARS = 40_000;
const FETCH_TIMEOUT_MS = 15_000;

function stripHtml(html: string): string {
  const $ = cheerio.load(html);
  $("script, style, nav, footer, header, noscript, iframe").remove();
  const text = $("body").text() || $.root().text();
  return text.replace(/\s+/g, " ").trim();
}

export interface FetchedPage {
  url: string;
  title: string;
  text: string;
  truncated: boolean;
}

export async function fetchPageContent(rawUrl: string): Promise<FetchedPage> {
  const url = await assertPublicHttpUrl(rawUrl);
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), FETCH_TIMEOUT_MS);

  try {
    // Jina reader returns clean markdown/text for most public pages
    const jinaRes = await fetch(`https://r.jina.ai/${url.href}`, {
      signal: controller.signal,
      headers: { Accept: "text/plain", "User-Agent": "Libraix/1.0 (+https://libraix.ai)" },
    });
    if (jinaRes.ok) {
      const body = (await jinaRes.text()).trim();
      if (body.length > 200) {
        const truncated = body.length > MAX_PAGE_CHARS;
        return {
          url: url.href,
          title: url.hostname,
          text: truncated ? body.slice(0, MAX_PAGE_CHARS) + "\n\n[Page truncated]" : body,
          truncated,
        };
      }
    }

    const res = await fetch(url.href, {
      signal: controller.signal,
      headers: { "User-Agent": "Libraix/1.0 (+https://libraix.ai)", Accept: "text/html" },
      redirect: "follow",
    });
    if (!res.ok) throw new Error("PAGE_FETCH_FAILED");

    const html = await res.text();
    const $ = cheerio.load(html);
    const title = $("title").first().text().trim() || url.hostname;
    let text = stripHtml(html);
    const truncated = text.length > MAX_PAGE_CHARS;
    if (truncated) text = text.slice(0, MAX_PAGE_CHARS) + "\n\n[Page truncated]";

    if (!text) throw new Error("NO_PAGE_TEXT");
    return { url: url.href, title, text, truncated };
  } finally {
    clearTimeout(timer);
  }
}
