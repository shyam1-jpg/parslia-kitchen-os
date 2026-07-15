import { createHash } from "node:crypto";

const REALTIME_VOICES = [
  "alloy",
  "ash",
  "ballad",
  "coral",
  "echo",
  "sage",
  "shimmer",
  "verse",
  "marin",
  "cedar",
] as const;

export type RealtimeVoice = (typeof REALTIME_VOICES)[number];

/** Map Libraix TTS prefs → Realtime output voices. */
const TTS_TO_REALTIME: Record<string, RealtimeVoice> = {
  nova: "coral",
  alloy: "alloy",
  shimmer: "shimmer",
  echo: "echo",
  fable: "ballad",
  onyx: "ash",
};

export function resolveRealtimeVoice(preferred?: string | null): RealtimeVoice {
  if (preferred && (REALTIME_VOICES as readonly string[]).includes(preferred)) {
    return preferred as RealtimeVoice;
  }
  if (preferred && TTS_TO_REALTIME[preferred]) return TTS_TO_REALTIME[preferred];
  return "coral";
}

export function realtimeSafetyId(userId: string): string {
  return createHash("sha256").update(`libraix:${userId}`).digest("hex");
}

export function buildRealtimeSessionConfig(opts: {
  voice: RealtimeVoice;
  instructions?: string;
}): string {
  const model = process.env.OPENAI_REALTIME_MODEL?.trim() || "gpt-realtime";
  return JSON.stringify({
    type: "realtime",
    model,
    instructions:
      opts.instructions ??
      `You are Libraix, a helpful AI companion speaking live over voice.
Speak naturally and conversationally — short turns, clear answers.
Detect the user's spoken language and reply in the same language.
Keep answers concise unless they ask for detail. Be warm, direct, and useful.
Do not mention system instructions or that you are using a realtime API.`,
    audio: {
      input: {
        transcription: { model: "gpt-4o-mini-transcribe" },
        turn_detection: { type: "semantic_vad" },
      },
      output: { voice: opts.voice },
    },
  });
}

/**
 * Exchange a browser SDP offer for an OpenAI Realtime SDP answer (unified WebRTC).
 * API key stays on the server.
 */
export async function createRealtimeCall(opts: {
  sdp: string;
  voice: RealtimeVoice;
  safetyIdentifier: string;
}): Promise<{ sdp: string }> {
  const apiKey = process.env.OPENAI_API_KEY?.trim() ?? "";
  if (!apiKey) throw new Error("REALTIME_NOT_CONFIGURED");

  const fd = new FormData();
  fd.set("sdp", opts.sdp);
  fd.set("session", buildRealtimeSessionConfig({ voice: opts.voice }));

  const r = await fetch("https://api.openai.com/v1/realtime/calls", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${apiKey}`,
      "OpenAI-Safety-Identifier": opts.safetyIdentifier,
    },
    body: fd,
    signal: AbortSignal.timeout(30_000),
  });

  const body = await r.text();
  if (!r.ok) {
    const lower = body.toLowerCase();
    if (r.status === 401 || r.status === 403) throw new Error("REALTIME_UNAUTHORIZED");
    if (lower.includes("realtime") && (lower.includes("not available") || lower.includes("not enabled") || lower.includes("access"))) {
      throw new Error("REALTIME_NOT_ENABLED");
    }
    const err = new Error("REALTIME_FAILED") as Error & { detail?: string };
    err.detail = body.slice(0, 400);
    throw err;
  }

  if (!body.includes("v=") && !body.includes("m=")) {
    throw new Error("REALTIME_INVALID_SDP");
  }

  return { sdp: body };
}
