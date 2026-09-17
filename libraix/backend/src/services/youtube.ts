import { YoutubeTranscript } from "youtube-transcript";
import { getCachedJson, setCachedJson } from "./sourceCache.js";

const MAX_TRANSCRIPT_CHARS = 50_000;
const FETCH_MS = 8_000;
const CACHE_TTL_SEC = 12 * 60 * 60;

export function extractYoutubeVideoId(url: string): string | null {
  try {
    const u = new URL(url);
    const host = u.hostname.replace(/^www\./, "").toLowerCase();
    if (host === "youtu.be") {
      const id = u.pathname.split("/").filter(Boolean)[0];
      return sanitizeVideoId(id);
    }
    if (host === "youtube.com" || host === "m.youtube.com" || host === "music.youtube.com") {
      if (u.searchParams.get("v")) return sanitizeVideoId(u.searchParams.get("v"));
      const nested = u.pathname.match(/^\/(shorts|embed|live|v)\/([^/?]+)/);
      if (nested) return sanitizeVideoId(nested[2]);
    }
  } catch {
    return null;
  }
  return null;
}

function sanitizeVideoId(id: string | null | undefined): string | null {
  if (!id) return null;
  const clean = id.trim();
  return /^[\w-]{11}$/.test(clean) ? clean : null;
}

async function fetchText(url: string, init: RequestInit = {}, ms = FETCH_MS): Promise<string> {
  const ctrl = new AbortController();
  const timer = setTimeout(() => ctrl.abort(), ms);
  try {
    const res = await fetch(url, {
      ...init,
      signal: ctrl.signal,
      headers: {
        "User-Agent": "Libraix/1.0 (+https://libraix.ai)",
        Accept: "text/plain, text/html, application/json, application/xml, */*",
        ...(init.headers ?? {}),
      },
    });
    if (!res.ok) throw new Error(`HTTP_${res.status}`);
    return await res.text();
  } finally {
    clearTimeout(timer);
  }
}

function decodeCaptionXml(xml: string): string {
  const parts: string[] = [];
  const re = /<text[^>]*>([\s\S]*?)<\/text>/gi;
  let m: RegExpExecArray | null;
  while ((m = re.exec(xml))) {
    parts.push(
      m[1]
        .replace(/<[^>]+>/g, " ")
        .replace(/&amp;/g, "&")
        .replace(/&lt;/g, "<")
        .replace(/&gt;/g, ">")
        .replace(/&quot;/g, '"')
        .replace(/&#39;/g, "'")
        .replace(/&#(\d+);/g, (_, n) => String.fromCharCode(Number(n)))
    );
  }
  return parts.join(" ").replace(/\s+/g, " ").trim();
}

function decodeVtt(vtt: string): string {
  return vtt
    .replace(/WEBVTT[\s\S]*?\n/, "")
    .replace(/\d{2}:\d{2}:\d{2}\.\d{3}\s+-->\s+\d{2}:\d{2}:\d{2}\.\d{3}.*\n/g, "")
    .replace(/<[^>]+>/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

function clipTranscript(text: string): { text: string; truncated: boolean } {
  const truncated = text.length > MAX_TRANSCRIPT_CHARS;
  return {
    text: truncated ? text.slice(0, MAX_TRANSCRIPT_CHARS) + "\n\n[Transcript truncated]" : text,
    truncated,
  };
}

async function fetchViaPackage(videoId: string): Promise<string> {
  const segments = await YoutubeTranscript.fetchTranscript(videoId);
  return segments.map((s) => s.text).join(" ").replace(/\s+/g, " ").trim();
}

async function fetchViaTimedText(videoId: string): Promise<string> {
  const listXml = await fetchText(`https://www.youtube.com/api/timedtext?type=list&v=${videoId}`);
  const langs = [...listXml.matchAll(/lang_code="([^"]+)"/g)].map((m) => m[1]);
  const preferred = langs.find((l) => l.toLowerCase().startsWith("en")) ?? langs[0];
  if (!preferred) throw new Error("NO_CAPTION_TRACK");
  const xml = await fetchText(
    `https://www.youtube.com/api/timedtext?v=${videoId}&lang=${encodeURIComponent(preferred)}`
  );
  const text = decodeCaptionXml(xml);
  if (!text) throw new Error("EMPTY_CAPTIONS");
  return text;
}

async function fetchViaInnertube(videoId: string): Promise<string> {
  const ctrl = new AbortController();
  const timer = setTimeout(() => ctrl.abort(), FETCH_MS);
  try {
    const res = await fetch("https://www.youtube.com/youtubei/v1/player?prettyPrint=false", {
      method: "POST",
      signal: ctrl.signal,
      headers: {
        "Content-Type": "application/json",
        "User-Agent": "Libraix/1.0 (+https://libraix.ai)",
      },
      body: JSON.stringify({
        context: {
          client: {
            clientName: "WEB",
            clientVersion: "2.20240101.00.00",
            hl: "en",
          },
        },
        videoId,
      }),
    });
    if (!res.ok) throw new Error(`HTTP_${res.status}`);
    const data = (await res.json()) as {
      captions?: {
        playerCaptionsTracklistRenderer?: {
          captionTracks?: Array<{ baseUrl?: string; languageCode?: string }>;
        };
      };
      playabilityStatus?: { status?: string; reason?: string };
    };
    const status = data.playabilityStatus?.status;
    if (status === "LOGIN_REQUIRED") throw new Error("YOUTUBE_PRIVATE");
    if (status === "UNPLAYABLE" || status === "ERROR") throw new Error("YOUTUBE_UNAVAILABLE");
    const tracks = data.captions?.playerCaptionsTracklistRenderer?.captionTracks ?? [];
    const track =
      tracks.find((t) => (t.languageCode ?? "").toLowerCase().startsWith("en")) ?? tracks[0];
    if (!track?.baseUrl) throw new Error("NO_CAPTION_TRACK");
    const xml = await fetchText(track.baseUrl);
    const text = decodeCaptionXml(xml) || decodeVtt(xml);
    if (!text) throw new Error("EMPTY_CAPTIONS");
    return text;
  } finally {
    clearTimeout(timer);
  }
}

async function fetchViaJina(videoId: string): Promise<string> {
  const body = await fetchText(`https://r.jina.ai/http://www.youtube.com/watch?v=${videoId}`, {}, 12_000);
  const cleaned = body.replace(/\s+/g, " ").trim();
  if (cleaned.length < 400) throw new Error("JINA_TOO_SHORT");
  return cleaned.slice(0, MAX_TRANSCRIPT_CHARS);
}

export async function fetchYoutubeTranscript(
  url: string
): Promise<{ videoId: string; text: string; truncated: boolean; source: string }> {
  const videoId = extractYoutubeVideoId(url);
  if (!videoId) throw new Error("INVALID_YOUTUBE_URL");

  const cached = getCachedJson<{ text: string; truncated: boolean; source: string }>(videoId, "youtube");
  if (cached?.text) {
    return { videoId, ...cached };
  }

  const attempts: Array<{ source: string; run: () => Promise<string> }> = [
    { source: "captions", run: () => fetchViaPackage(videoId) },
    { source: "timedtext", run: () => fetchViaTimedText(videoId) },
    { source: "player", run: () => fetchViaInnertube(videoId) },
    { source: "reader", run: () => fetchViaJina(videoId) },
  ];

  let lastError = "NO_TRANSCRIPT";
  for (const attempt of attempts) {
    try {
      const raw = await attempt.run();
      if (!raw || raw.length < 40) continue;
      const clipped = clipTranscript(raw);
      setCachedJson(videoId, "youtube", { ...clipped, source: attempt.source }, CACHE_TTL_SEC);
      return { videoId, ...clipped, source: attempt.source };
    } catch (e) {
      const msg = e instanceof Error ? e.message : "YOUTUBE_FAILED";
      if (msg === "YOUTUBE_PRIVATE" || msg === "YOUTUBE_UNAVAILABLE") lastError = msg;
      else if (lastError === "NO_TRANSCRIPT") lastError = "NO_TRANSCRIPT";
    }
  }

  throw new Error(lastError);
}
