import { YoutubeTranscript } from "youtube-transcript";

const MAX_TRANSCRIPT_CHARS = 50_000;

export function extractYoutubeVideoId(url: string): string | null {
  try {
    const u = new URL(url);
    if (u.hostname.includes("youtu.be")) return u.pathname.slice(1).split("/")[0] || null;
    if (u.hostname.includes("youtube.com")) {
      if (u.pathname === "/watch") return u.searchParams.get("v");
      const shorts = u.pathname.match(/^\/(shorts|embed)\/([^/?]+)/);
      if (shorts) return shorts[2];
    }
  } catch {
    return null;
  }
  return null;
}

export async function fetchYoutubeTranscript(url: string): Promise<{ videoId: string; text: string; truncated: boolean }> {
  const videoId = extractYoutubeVideoId(url);
  if (!videoId) throw new Error("INVALID_YOUTUBE_URL");

  const segments = await YoutubeTranscript.fetchTranscript(videoId);
  let text = segments.map((s) => s.text).join(" ").replace(/\s+/g, " ").trim();
  if (!text) throw new Error("NO_TRANSCRIPT");

  const truncated = text.length > MAX_TRANSCRIPT_CHARS;
  if (truncated) text = text.slice(0, MAX_TRANSCRIPT_CHARS) + "\n\n[Transcript truncated]";

  return { videoId, text, truncated };
}
