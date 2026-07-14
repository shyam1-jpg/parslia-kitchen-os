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
import { canSendMessage, recordMessageUsage } from "../services/usage.js";

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

export default router;
