import {
  createMemory,
  deleteMemory,
  getUserPreferences,
  listMemories,
  updateMemory,
} from "./memory.js";
import { isFeatureEnabled } from "../config/featureFlags.js";
import type { PlanTier } from "../config/models.js";

const MAX_AUTO_MEMORIES = 40;
const MAX_FACT_LEN = 180;

function normalize(text: string): string {
  return text.toLowerCase().replace(/\s+/g, " ").trim();
}

function isDuplicate(existing: string[], content: string): boolean {
  const n = normalize(content);
  return existing.some((e) => {
    const m = normalize(e);
    return m === n || m.includes(n) || n.includes(m);
  });
}

/** Extract durable personal facts from a user message with fast heuristics (no extra LLM call). */
export function extractFactsFromUserMessage(message: string): Array<{ category: string; content: string }> {
  const text = message.replace(/\s+/g, " ").trim();
  if (text.length < 8 || text.length > 2000) return [];

  const facts: Array<{ category: string; content: string }> = [];
  const push = (category: string, content: string) => {
    const clean = content.replace(/[?.!,;]+$/g, "").trim().slice(0, MAX_FACT_LEN);
    if (clean.length < 4) return;
    if (isDuplicate(facts.map((f) => f.content), clean)) return;
    facts.push({ category, content: clean });
  };

  const patterns: Array<{ re: RegExp; category: string; format: (m: RegExpMatchArray) => string }> = [
    // Keep name/place captures case-sensitive so "/i" does not let "and I…" become part of a name
    {
      re: /\b(?:[Mm]y name is|[Ii](?:'m| am) called|[Cc]all me)\s+([A-Za-z][\w'-]{0,30}(?:\s+[A-Z][\w'-]{0,30}){0,2})\b/,
      category: "identity",
      format: (m) => {
        const name = m[1].trim().replace(/^\w/, (c) => c.toUpperCase());
        return `User's name is ${name}`;
      },
    },
    {
      re: /\b[Ii](?:'m| am)\s+(?:a|an)\s+([a-z][\w /-]{2,60}?)(?=[,.;!?]|\s+(?:and|but|who|that|with|in|from|at)\b|$)/,
      category: "identity",
      format: (m) => `User is a ${m[1].trim()}`,
    },
    {
      re: /\b[Ii] (?:live|work) in\s+([A-Z][\w.'-]{1,40}(?:\s+[A-Z][\w.'-]{1,40}){0,3})/,
      category: "location",
      format: (m) => `User lives/works in ${m[1].trim()}`,
    },
    {
      re: /\b[Ii](?:'m| am) from\s+([A-Z][\w.'-]{1,40}(?:\s+[A-Z][\w.'-]{1,40}){0,3})/,
      category: "location",
      format: (m) => `User is from ${m[1].trim()}`,
    },
    {
      re: /\b(?:[Ii] |and )work (?:at|for|with)\s+([A-Za-z0-9][\w.&'-]{1,60})/,
      category: "work",
      format: (m) => `User works at/with ${m[1].trim()}`,
    },
    { re: /\b[Ii] prefer\s+(.{4,80}?)(?=[,.;!?]|$)/, category: "preference", format: (m) => `User prefers ${m[1].trim()}` },
    { re: /\b[Ii] (?:like|love|enjoy)\s+(.{4,80}?)(?=[,.;!?]|\s+and [Ii]\b|$)/, category: "preference", format: (m) => `User likes ${m[1].trim()}` },
    { re: /\b[Ii] (?:don't|do not|hate) (?:like )?(.{4,80}?)(?=[,.;!?]|$)/, category: "preference", format: (m) => `User dislikes ${m[1].trim()}` },
    { re: /\b[Rr]emember (?:that |this[: ]?)(.{6,120}?)(?=[.!?]|$)/, category: "note", format: (m) => m[1].trim() },
    { re: /\b[Ff]or (?:future|later|next time)[,:]?\s+(.{6,120}?)(?=[.!?]|$)/, category: "note", format: (m) => m[1].trim() },
    { re: /\b[Mm]y (?:company|business|shop|restaurant|brand) is\s+(.{2,60}?)(?=[,.;!?]|$)/, category: "work", format: (m) => `User's business is ${m[1].trim()}` },
    { re: /\b[Ii] (?:speak|write in)\s+([A-Za-z][\w\s,]{2,40}?)(?=[,.;!?]|$)/, category: "preference", format: (m) => `User's language preference: ${m[1].trim()}` },
  ];

  for (const p of patterns) {
    const m = text.match(p.re);
    if (m) push(p.category, p.format(m));
  }

  return facts.slice(0, 3);
}

function looksWorthLearning(userMessage: string): boolean {
  return /\b(i |i'm|i am|my |remember|prefer|live|work|from |call me|name is)\b/i.test(userMessage);
}

/**
 * After a chat turn: store durable facts for future conversations.
 * Fire-and-forget friendly — never throw to the caller.
 */
export function learnFromConversationTurn(opts: {
  userId: string;
  userPlan: PlanTier;
  userMessage: string;
  assistantContent: string;
  projectId?: string;
  conversationId?: string;
}): { saved: number } {
  try {
    if (!isFeatureEnabled("memory", opts.userPlan)) return { saved: 0 };
    const prefs = getUserPreferences(opts.userId);
    if (!prefs.memoryEnabled) return { saved: 0 };
    if (prefs.privacyMode === "temporary") return { saved: 0 };

    let saved = 0;
    const existing = listMemories(opts.userId, opts.projectId);
    const existingTexts = existing.map((m) => m.content);

    if (looksWorthLearning(opts.userMessage)) {
      const facts = extractFactsFromUserMessage(opts.userMessage);
      for (const fact of facts) {
        if (isDuplicate(existingTexts, fact.content)) continue;
        createMemory(opts.userId, `auto:${fact.category}`, fact.content, opts.projectId);
        existingTexts.push(fact.content);
        saved += 1;
      }
    }

    // Keep one rolling summary memory per recent conversation for continuity
    if (opts.conversationId && opts.assistantContent.trim().length > 40) {
      const topic = summarizeTurn(opts.userMessage, opts.assistantContent);
      if (topic) {
        const key = `Conversation focus (${opts.conversationId.slice(0, 8)})`;
        const summaryContent = `${key}: ${topic}`;
        const prior = existing.find((m) => m.content.startsWith(key) || m.category === "auto:thread");
        if (prior) {
          updateMemory(opts.userId, prior.id, summaryContent, "auto:thread");
          saved += 1;
        } else if (!isDuplicate(existingTexts, summaryContent)) {
          createMemory(opts.userId, "auto:thread", summaryContent, opts.projectId);
          saved += 1;
        }
      }
    }

    // Cap auto memories so the table does not grow forever
    pruneAutoMemories(opts.userId);

    return { saved };
  } catch (e) {
    console.warn("memory learn failed:", e instanceof Error ? e.message : e);
    return { saved: 0 };
  }
}

function summarizeTurn(userMessage: string, assistantContent: string): string | null {
  const u = userMessage.replace(/\s+/g, " ").trim().slice(0, 90);
  if (u.length < 12) return null;
  // Skip pure weather/one-shot look-ups from becoming long-term identity memory
  if (/^\s*(what('?s| is) the )?weather\b/i.test(u) && !/\b(i |my |prefer|remember)\b/i.test(u)) {
    return null;
  }
  const a = assistantContent.replace(/\s+/g, " ").trim().slice(0, 70);
  return `${u}${a ? ` → ${a}` : ""}`.slice(0, MAX_FACT_LEN);
}

function pruneAutoMemories(userId: string) {
  const autos = listMemories(userId).filter((m) => m.category.startsWith("auto:"));
  if (autos.length <= MAX_AUTO_MEMORIES) return;
  // listMemories is newest-first; drop oldest extras
  const oldest = [...autos].reverse().slice(0, autos.length - MAX_AUTO_MEMORIES);
  for (const m of oldest) {
    deleteMemory(userId, m.id);
  }
}
