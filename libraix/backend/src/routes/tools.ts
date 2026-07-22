import { Router } from "express";
import { z } from "zod";
import { requireAuth } from "../middleware/auth.js";
import { isFeatureEnabled } from "../config/featureFlags.js";
import { findUserById, toSafeUser } from "../services/users.js";
import { parseDocument } from "../services/documents.js";
import { fetchPageContent } from "../services/fetchPage.js";
import { fetchYoutubeTranscript } from "../services/youtube.js";
import { runDeepResearch } from "../services/research.js";
import { resolveLiveSources } from "../services/liveSources.js";
import { searchWikipedia } from "../services/wikipedia.js";
import { searchWeb } from "../services/webSearch.js";
import { completeViaGateway } from "../providers/gateway.js";
import { getModelById } from "../config/models.js";
import {
  canSendMessage,
  canUseLiveVoice,
  getLiveVoiceAllowance,
  getUsage,
  recordMessageUsage,
  recordVoiceUsage,
} from "../services/usage.js";
import { createRealtimeCall, resolveRealtimeVoice, realtimeSafetyId } from "../services/realtime.js";
import { buildHoroscopeChart } from "../services/horoscopeChart.js";
import { db } from "../db/schema.js";

const router = Router();

router.use(requireAuth);

router.post("/parse-document", async (req, res) => {
  const schema = z.object({
    filename: z.string().max(255),
    mimeType: z.string(),
    contentBase64: z.string().max(20_000_000),
  });
  const parsed = schema.safeParse(req.body);
  if (!parsed.success) return res.status(400).json({ error: "INVALID_INPUT" });

  try {
    const doc = await parseDocument(parsed.data.filename, parsed.data.mimeType, parsed.data.contentBase64);
    res.json(doc);
  } catch (e) {
    const msg = e instanceof Error ? e.message : "PARSE_FAILED";
    const status =
      msg === "FILE_TOO_LARGE" ? 413 :
      msg === "FILE_TYPE_NOT_SUPPORTED" ||
      msg === "NO_TEXT_EXTRACTED" ||
      msg === "NO_TEXT_EXTRACTED_SCANNED_PDF" ||
      msg === "LEGACY_DOC_UNSUPPORTED"
        ? 400
        : 502;
    res.status(status).json({ error: msg });
  }
});

/** Fast sourced lookup — Wikipedia + web, SQLite-cached for repeat queries. */
router.post("/search", async (req, res) => {
  const schema = z.object({
    query: z.string().min(1).max(500),
    provider: z.enum(["all", "wikipedia", "web"]).optional().default("all"),
  });
  const parsed = schema.safeParse(req.body);
  if (!parsed.success) return res.status(400).json({ error: "INVALID_INPUT" });

  try {
    const q = parsed.data.query;
    if (parsed.data.provider === "wikipedia") {
      const wikipedia = await searchWikipedia(q, 6);
      return res.json({
        query: q,
        wikipedia,
        web: [],
        sources: wikipedia.map((r) => ({ ...r, kind: "wikipedia" as const })),
      });
    }
    if (parsed.data.provider === "web") {
      const web = await searchWeb(q);
      return res.json({
        query: q,
        wikipedia: [],
        web,
        sources: web.map((r) => ({ ...r, kind: "web" as const })),
      });
    }
    const live = await resolveLiveSources(q);
    res.json({
      query: q,
      wikipedia: live.wikipedia,
      web: live.web,
      sources: live.sources.map((s) => ({
        title: s.filename,
        url: s.url,
        snippet: s.excerpt,
        kind: s.kind,
      })),
    });
  } catch (e) {
    const msg = e instanceof Error ? e.message : "SEARCH_FAILED";
    res.status(502).json({ error: msg });
  }
});

router.post("/analyse-link", async (req, res) => {
  const row = findUserById(req.session.userId!);
  if (!row) return res.status(401).json({ error: "UNAUTHENTICATED" });
  const user = toSafeUser(row);

  const schema = z.object({
    url: z.string().url(),
    question: z.string().max(4000).optional(),
  });
  const parsed = schema.safeParse(req.body);
  if (!parsed.success) return res.status(400).json({ error: "INVALID_INPUT" });

  const model = getModelById("libraix-fast") ?? getModelById("libraix-deepseek");
  if (!model) return res.status(503).json({ error: "MODEL_NOT_AVAILABLE" });
  if (!canSendMessage(user.id, user.plan, model.tier !== "free")) {
    return res.status(429).json({ error: "USAGE_LIMIT_REACHED" });
  }

  try {
    const page = await fetchPageContent(parsed.data.url);
    const prompt = parsed.data.question
      ? `Question: ${parsed.data.question}\n\nWebpage (${page.title} — ${page.url}):\n${page.text}`
      : `Summarise this webpage and highlight the key points.\n\n${page.title} — ${page.url}\n\n${page.text}`;

    const response = await completeViaGateway(model, {
      messages: [
        {
          role: "system",
          content: "You analyse web pages for Libraix users. Be accurate, cite the page, and use Markdown.",
        },
        { role: "user", content: prompt },
      ],
    });

    recordMessageUsage(user.id, model.tier !== "free", response.tokensUsed, response.estimatedCostCents);

    res.json({
      url: page.url,
      title: page.title,
      summary: response.content,
      truncated: page.truncated,
    });
  } catch (e) {
    const msg = e instanceof Error ? e.message : "ANALYSIS_FAILED";
    const status = ["INVALID_URL", "URL_NOT_ALLOWED", "NO_PAGE_TEXT"].includes(msg) ? 400 : 502;
    res.status(status).json({ error: msg });
  }
});

router.post("/youtube", async (req, res) => {
  const row = findUserById(req.session.userId!);
  if (!row) return res.status(401).json({ error: "UNAUTHENTICATED" });
  const user = toSafeUser(row);

  const schema = z.object({
    url: z.string().url(),
    question: z.string().max(4000).optional(),
  });
  const parsed = schema.safeParse(req.body);
  if (!parsed.success) return res.status(400).json({ error: "INVALID_INPUT" });

  const model = getModelById("libraix-fast") ?? getModelById("libraix-deepseek");
  if (!model) return res.status(503).json({ error: "MODEL_NOT_AVAILABLE" });
  if (!canSendMessage(user.id, user.plan, model.tier !== "free")) {
    return res.status(429).json({ error: "USAGE_LIMIT_REACHED" });
  }

  try {
    const transcript = await fetchYoutubeTranscript(parsed.data.url);
    const prompt = parsed.data.question
      ? `Question: ${parsed.data.question}\n\nYouTube transcript (video ${transcript.videoId}):\n${transcript.text}`
      : `Summarise this YouTube video in clear Markdown with key takeaways and timestamps where helpful.\n\nTranscript:\n${transcript.text}`;

    const response = await completeViaGateway(model, {
      messages: [
        { role: "system", content: "You summarise YouTube videos for Libraix users. Use bullet points and sections." },
        { role: "user", content: prompt },
      ],
    });

    recordMessageUsage(user.id, model.tier !== "free", response.tokensUsed, response.estimatedCostCents);

    res.json({
      videoId: transcript.videoId,
      url: parsed.data.url,
      summary: response.content,
      truncated: transcript.truncated,
    });
  } catch (e) {
    const msg = e instanceof Error ? e.message : "YOUTUBE_FAILED";
    const status = msg === "INVALID_YOUTUBE_URL" || msg === "NO_TRANSCRIPT" ? 400 : 502;
    res.status(status).json({ error: msg });
  }
});

router.post("/research", async (req, res) => {
  const row = findUserById(req.session.userId!);
  if (!row) return res.status(401).json({ error: "UNAUTHENTICATED" });
  const user = toSafeUser(row);

  if (!isFeatureEnabled("deep-research", user.plan) && user.plan === "free") {
    return res.status(403).json({ error: "FEATURE_REQUIRES_PRO" });
  }

  const schema = z.object({
    query: z.string().min(1).max(8000),
    depth: z.enum(["quick", "standard", "deep"]).default("standard"),
  });
  const parsed = schema.safeParse(req.body);
  if (!parsed.success) return res.status(400).json({ error: "INVALID_INPUT" });

  try {
    const result = await runDeepResearch(user, parsed.data);
    res.json(result);
  } catch (e) {
    const msg = e instanceof Error ? e.message : "FAILED";
    if (msg === "USAGE_LIMIT_REACHED") return res.status(429).json({ error: msg });
    res.status(502).json({ error: msg });
  }
});

const LIVE_VISION_SYSTEM = `You are Libraix Live Vision — a hands-on visual guide like having an expert looking through the user's phone camera.

Your job with each frame:
1. Identify the product, machinery, equipment, labels, screens, parts, or environment you can actually see.
2. Read visible text, model numbers, warning labels, and UI elements when legible.
3. Give clear step-by-step instructions for what to do next (use numbered steps).
4. If something looks wrong (error lights, damage, misalignment, spills, wrong settings), say what you notice and how to fix or safely check it.
5. Ask at most one short clarifying question only when the next action depends on it.
6. Prefer safety first for power tools, electricity, chemicals, gas, and moving machinery.
7. Stay in the user's language. Be direct — no filler.
8. Remember prior turns in this live session; continue the same procedure instead of restarting from scratch unless the scene clearly changed.

Format: short identification → steps → (optional) what to show next on camera.`;

/**
 * POST /api/tools/vision
 * GPT-4o vision — snapshot or live_assist (equipment / product step-by-step coaching).
 */
router.post("/vision", async (req, res) => {
  const row = findUserById(req.session.userId!);
  if (!row) return res.status(401).json({ error: "UNAUTHENTICATED" });
  const user = toSafeUser(row);

  const schema = z.object({
    imageBase64: z.string().min(100).max(10_000_000),
    mimeType: z.string().default("image/jpeg"),
    question: z
      .string()
      .max(2000)
      .optional()
      .default("What do you see? Identify it and tell me step-by-step what to do."),
    mode: z.enum(["snapshot", "live_assist"]).optional().default("live_assist"),
    history: z
      .array(
        z.object({
          role: z.enum(["user", "assistant"]),
          text: z.string().max(4000),
        })
      )
      .max(12)
      .optional()
      .default([]),
  });
  const parsed = schema.safeParse(req.body);
  if (!parsed.success) return res.status(400).json({ error: "INVALID_INPUT" });

  const model = getModelById("libraix-smart") ?? getModelById("libraix-fast");
  if (!model) return res.status(503).json({ error: "MODEL_NOT_AVAILABLE" });
  if (!canSendMessage(user.id, user.plan, model.tier !== "free")) {
    return res.status(429).json({ error: "USAGE_LIMIT_REACHED" });
  }

  const apiKey = process.env.OPENAI_API_KEY?.trim() ?? "";
  if (!apiKey) return res.status(503).json({ error: "VISION_NOT_CONFIGURED" });

  const historyMsgs = parsed.data.history.slice(-8).map((h) => ({
    role: h.role as "user" | "assistant",
    content: h.text.slice(0, 2000),
  }));

  const userText =
    parsed.data.mode === "live_assist"
      ? `Live camera frame. ${parsed.data.question}`
      : parsed.data.question;

  try {
    const visionRes = await fetch("https://api.openai.com/v1/chat/completions", {
      method: "POST",
      headers: { Authorization: `Bearer ${apiKey}`, "Content-Type": "application/json" },
      body: JSON.stringify({
        model: process.env.OPENAI_VISION_MODEL?.trim() || "gpt-4o",
        max_tokens: parsed.data.mode === "live_assist" ? 1400 : 1024,
        messages: [
          ...(parsed.data.mode === "live_assist"
            ? [{ role: "system" as const, content: LIVE_VISION_SYSTEM }]
            : []),
          ...historyMsgs,
          {
            role: "user" as const,
            content: [
              {
                type: "image_url",
                image_url: {
                  url: `data:${parsed.data.mimeType};base64,${parsed.data.imageBase64}`,
                  detail: "high",
                },
              },
              { type: "text", text: userText },
            ],
          },
        ],
      }),
      signal: AbortSignal.timeout(45_000),
    });

    if (!visionRes.ok) {
      const err = await visionRes.text();
      return res.status(502).json({ error: "VISION_FAILED", detail: err.slice(0, 200) });
    }

    const data = (await visionRes.json()) as {
      choices?: { message?: { content?: string } }[];
      usage?: { total_tokens?: number };
    };
    const content = data.choices?.[0]?.message?.content ?? "";
    if (!content) return res.status(502).json({ error: "VISION_NO_RESPONSE" });

    recordMessageUsage(user.id, model.tier !== "free", data.usage?.total_tokens ?? 0, 0);
    res.json({ content, model: "gpt-4o", mode: parsed.data.mode });
  } catch (e) {
    const msg = e instanceof Error ? e.message : "VISION_FAILED";
    if (!res.headersSent) res.status(502).json({ error: msg });
  }
});

const TTS_VOICES = ["alloy", "echo", "fable", "onyx", "nova", "shimmer"] as const;
type TtsVoice = (typeof TTS_VOICES)[number];

function getUserTtsVoice(userId: string): TtsVoice {
  const row = db
    .prepare("SELECT tts_voice FROM user_preferences WHERE user_id = ?")
    .get(userId) as { tts_voice: string } | undefined;
  const v = row?.tts_voice ?? "nova";
  return (TTS_VOICES as readonly string[]).includes(v) ? (v as TtsVoice) : "nova";
}

/**
 * POST /api/tools/tts
 * Returns OpenAI TTS audio (mp3) streamed to the client.
 * Max ~4000 chars of plain text (markdown stripped server-side).
 */
router.post("/tts", async (req, res) => {
  const row = findUserById(req.session.userId!);
  if (!row) return res.status(401).json({ error: "UNAUTHENTICATED" });
  const user = toSafeUser(row);

  const schema = z.object({
    text: z.string().min(1).max(8000),
    voice: z.enum(TTS_VOICES).optional(),
  });
  const parsed = schema.safeParse(req.body);
  if (!parsed.success) return res.status(400).json({ error: "INVALID_INPUT" });

  const apiKey = process.env.OPENAI_API_KEY?.trim() ?? "";
  if (!apiKey) return res.status(503).json({ error: "TTS_NOT_CONFIGURED" });

  // Strip markdown so it reads naturally
  const plain = parsed.data.text
    .replace(/```[\s\S]*?```/g, "")       // code blocks
    .replace(/`[^`]+`/g, (m) => m.replace(/`/g, "")) // inline code
    .replace(/!\[.*?\]\(.*?\)/g, "")       // images
    .replace(/\[([^\]]+)\]\(.*?\)/g, "$1") // links → text
    .replace(/#{1,6}\s*/g, "")             // headings
    .replace(/[*_~]{1,3}([^*_~]+)[*_~]{1,3}/g, "$1") // bold/italic
    .replace(/^\s*[-*+>]\s+/gm, "")        // bullets/blockquote
    .replace(/\n{2,}/g, ". ")
    .replace(/\n/g, " ")
    .trim()
    .slice(0, 4096);

  const voice = parsed.data.voice ?? getUserTtsVoice(user.id);

  try {
    const ttsRes = await fetch("https://api.openai.com/v1/audio/speech", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${apiKey}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: process.env.OPENAI_TTS_MODEL?.trim() || "tts-1-hd",
        input: plain,
        voice,
        response_format: "mp3",
      }),
      signal: AbortSignal.timeout(45_000),
    });

    if (!ttsRes.ok) {
      const err = await ttsRes.text();
      return res.status(502).json({ error: "TTS_FAILED", detail: err.slice(0, 200) });
    }

    res.setHeader("Content-Type", "audio/mpeg");
    res.setHeader("Cache-Control", "no-store");
    // Stream audio bytes directly to the browser
    const reader = ttsRes.body!.getReader();
    const pump = async () => {
      while (true) {
        const { done, value } = await reader.read();
        if (done) break;
        res.write(value);
      }
      res.end();
    };
    await pump();
  } catch (e) {
    const msg = e instanceof Error ? e.message : "TTS_FAILED";
    if (!res.headersSent) res.status(502).json({ error: msg });
  }
});

/** GET /api/tools/tts/voices — return available voices + user's current preference */
router.get("/tts/voices", (req, res) => {
  const row = findUserById(req.session.userId!);
  if (!row) return res.status(401).json({ error: "UNAUTHENTICATED" });
  const voice = getUserTtsVoice(req.session.userId!);
  res.json({
    voices: [
      { id: "nova", label: "Nova", description: "Warm, friendly — great for explanations" },
      { id: "alloy", label: "Alloy", description: "Balanced, clear — good all-rounder" },
      { id: "shimmer", label: "Shimmer", description: "Soft, calm — relaxed tone" },
      { id: "echo", label: "Echo", description: "Confident, engaging" },
      { id: "fable", label: "Fable", description: "Expressive, storytelling feel" },
      { id: "onyx", label: "Onyx", description: "Deep, authoritative" },
    ],
    current: voice,
  });
});

/** PATCH /api/tools/tts/voice — save the user's preferred TTS voice */
router.patch("/tts/voice", (req, res) => {
  const row = findUserById(req.session.userId!);
  if (!row) return res.status(401).json({ error: "UNAUTHENTICATED" });
  const schema = z.object({ voice: z.enum(TTS_VOICES) });
  const parsed = schema.safeParse(req.body);
  if (!parsed.success) return res.status(400).json({ error: "INVALID_INPUT" });

  db.prepare(
    `INSERT INTO user_preferences (user_id, tts_voice) VALUES (?, ?)
     ON CONFLICT(user_id) DO UPDATE SET tts_voice = ?, updated_at = datetime('now')`
  ).run(req.session.userId!, parsed.data.voice, parsed.data.voice);

  res.json({ voice: parsed.data.voice });
});

/**
 * POST /api/tools/stt
 * Whisper transcription for phones (iOS Safari) where Web Speech API is unavailable.
 * Body: { audioBase64, mimeType?, language? }
 */
router.post("/stt", async (req, res) => {
  const row = findUserById(req.session.userId!);
  if (!row) return res.status(401).json({ error: "UNAUTHENTICATED" });

  const schema = z.object({
    audioBase64: z.string().min(8).max(12_000_000),
    mimeType: z.string().max(80).optional(),
    language: z.string().max(16).optional(),
  });
  const parsed = schema.safeParse(req.body);
  if (!parsed.success) return res.status(400).json({ error: "INVALID_INPUT" });

  const apiKey = process.env.OPENAI_API_KEY?.trim() ?? "";
  if (!apiKey) return res.status(503).json({ error: "STT_NOT_CONFIGURED" });

  const mime = (parsed.data.mimeType || "audio/webm").split(";")[0].trim();
  const ext =
    mime.includes("mp4") || mime.includes("m4a") ? "m4a" :
    mime.includes("ogg") ? "ogg" :
    mime.includes("wav") ? "wav" :
    mime.includes("mpeg") || mime.includes("mp3") ? "mp3" :
    "webm";

  try {
    const bytes = Buffer.from(parsed.data.audioBase64, "base64");
    if (bytes.length < 200) return res.status(400).json({ error: "AUDIO_TOO_SHORT" });
    if (bytes.length > 8_000_000) return res.status(413).json({ error: "AUDIO_TOO_LARGE" });

    const form = new FormData();
    const fileBytes = new Uint8Array(bytes.buffer, bytes.byteOffset, bytes.byteLength);
    form.append("file", new Blob([fileBytes], { type: mime }), `speech.${ext}`);
    form.append("model", process.env.OPENAI_STT_MODEL?.trim() || "whisper-1");
    if (parsed.data.language) {
      // Whisper wants ISO-639-1 (en, hi, ta…) — strip region
      const lang = parsed.data.language.split("-")[0].toLowerCase();
      if (/^[a-z]{2}$/.test(lang)) form.append("language", lang);
    }

    const sttRes = await fetch("https://api.openai.com/v1/audio/transcriptions", {
      method: "POST",
      headers: { Authorization: `Bearer ${apiKey}` },
      body: form,
      signal: AbortSignal.timeout(60_000),
    });

    if (!sttRes.ok) {
      const err = await sttRes.text().catch(() => "");
      return res.status(502).json({ error: "STT_FAILED", detail: err.slice(0, 200) });
    }

    const data = (await sttRes.json()) as { text?: string };
    const text = (data.text ?? "").trim();
    res.json({ text });
  } catch (e) {
    const msg = e instanceof Error ? e.message : "STT_FAILED";
    res.status(502).json({ error: msg });
  }
});

/**
 * POST /api/tools/realtime/session
 * Browser sends WebRTC SDP offer; we authenticate with OpenAI and return SDP answer.
 * Free plan: Live Voice capped (default 5 min/day). Pro/Enterprise: unlimited.
 */
router.post("/realtime/session", async (req, res) => {
  const row = findUserById(req.session.userId!);
  if (!row) return res.status(401).json({ error: "UNAUTHENTICATED" });
  const user = toSafeUser(row);

  const schema = z.object({
    sdp: z.string().min(20).max(200_000),
    voice: z.string().max(32).optional(),
  });
  const parsed = schema.safeParse(req.body);
  if (!parsed.success) return res.status(400).json({ error: "INVALID_INPUT" });

  const usage = getUsage(user.id, user.plan);
  if (usage.limitReached) {
    return res.status(429).json({
      error: "USAGE_LIMIT_REACHED",
      hint: `Free plan is limited to ${usage.messagesLimit} messages/day. Upgrade for more.`,
    });
  }
  if (!canUseLiveVoice(user.id, user.plan)) {
    return res.status(429).json({
      error: "VOICE_LIMIT_REACHED",
      hint:
        user.plan === "free"
          ? "Free Live Voice is limited to 5 minutes/day. Upgrade to Pro for unlimited Live Voice."
          : "Daily Live Voice limit reached. Try again tomorrow.",
    });
  }

  const allowance = getLiveVoiceAllowance(user.id, user.plan);
  if (allowance.maxSessionSeconds < 15) {
    return res.status(429).json({
      error: "VOICE_LIMIT_REACHED",
      hint: "Less than 15 seconds of Live Voice left today. Upgrade to Pro for unlimited voice.",
    });
  }

  const apiKey = process.env.OPENAI_API_KEY?.trim() ?? "";
  if (!apiKey) return res.status(503).json({ error: "REALTIME_NOT_CONFIGURED" });

  const voice = resolveRealtimeVoice(parsed.data.voice ?? getUserTtsVoice(user.id));

  try {
    const { sdp } = await createRealtimeCall({
      sdp: parsed.data.sdp,
      voice,
      safetyIdentifier: realtimeSafetyId(user.id),
    });
    res.json({
      sdp,
      maxSessionSeconds: allowance.maxSessionSeconds,
      remainingVoiceSeconds: allowance.remainingVoiceSeconds,
      voiceUnlimited: allowance.voiceUnlimited,
      plan: user.plan,
    });
  } catch (e) {
    const msg = e instanceof Error ? e.message : "REALTIME_FAILED";
    const detail = e && typeof e === "object" && "detail" in e ? String((e as { detail?: string }).detail ?? "") : "";
    if (msg === "REALTIME_NOT_CONFIGURED") return res.status(503).json({ error: msg });
    if (msg === "REALTIME_NOT_ENABLED" || msg === "REALTIME_UNAUTHORIZED") {
      return res.status(503).json({
        error: msg,
        hint: "Live Voice needs OpenAI Realtime access on your API key. Chat + TTS still work without it.",
      });
    }
    res.status(502).json({ error: msg, detail: detail.slice(0, 300) || undefined });
  }
});

/** POST /api/tools/realtime/usage — report how long a Live Voice session ran */
router.post("/realtime/usage", (req, res) => {
  const row = findUserById(req.session.userId!);
  if (!row) return res.status(401).json({ error: "UNAUTHENTICATED" });
  const user = toSafeUser(row);

  const schema = z.object({
    seconds: z.number().min(0).max(7200),
  });
  const parsed = schema.safeParse(req.body);
  if (!parsed.success) return res.status(400).json({ error: "INVALID_INPUT" });

  recordVoiceUsage(user.id, parsed.data.seconds);
  res.json({ ok: true, usage: getUsage(user.id, user.plan) });
});

/**
 * POST /api/tools/horoscope-chart
 * Birth details → Vedic (Lahiri) natal chart with houses, nakshatras, dasha.
 */
router.post("/horoscope-chart", async (req, res) => {
  const schema = z.object({
    name: z.string().max(120).optional(),
    gender: z.enum(["female", "male", "other", "unspecified"]).optional(),
    date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
    time: z.string().regex(/^\d{1,2}:\d{2}$/),
    place: z.string().min(1).max(200),
    latitude: z.number().min(-90).max(90).optional(),
    longitude: z.number().min(-180).max(180).optional(),
    timezone: z.string().max(80).optional(),
  });
  const parsed = schema.safeParse(req.body);
  if (!parsed.success) return res.status(400).json({ error: "INVALID_INPUT" });

  try {
    const chart = await buildHoroscopeChart(parsed.data);
    res.json(chart);
  } catch (e) {
    const msg = e instanceof Error ? e.message : "CHART_FAILED";
    const status =
      msg === "PLACE_NOT_FOUND" ||
      msg === "PLACE_REQUIRED" ||
      msg === "INVALID_BIRTH_DATE" ||
      msg === "INVALID_BIRTH_TIME"
        ? 400
        : 502;
    res.status(status).json({ error: msg });
  }
});

export default router;
