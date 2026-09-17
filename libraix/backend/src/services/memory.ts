import { v4 as uuid } from "uuid";
import { db } from "../db/schema.js";
import {
  cosineSimilarity,
  deserializeEmbedding,
  embedText,
  embeddingsAvailable,
  serializeEmbedding,
} from "./embeddings.js";

export interface Memory {
  id: string;
  category: string;
  content: string;
  projectId: string | null;
  expiresAt: string | null;
  createdAt: string;
  updatedAt: string;
}

export function listMemories(userId: string, projectId?: string): Memory[] {
  const rows = projectId
    ? db.prepare("SELECT * FROM memories WHERE user_id = ? AND (project_id = ? OR project_id IS NULL) ORDER BY updated_at DESC").all(userId, projectId)
    : db.prepare("SELECT * FROM memories WHERE user_id = ? ORDER BY updated_at DESC").all(userId);

  return (rows as Array<Record<string, unknown>>).map(rowToMemory);
}

export function createMemory(userId: string, category: string, content: string, projectId?: string, expiresAt?: string): Memory {
  const id = uuid();
  db.prepare(
    "INSERT INTO memories (id, user_id, category, content, project_id, expires_at) VALUES (?, ?, ?, ?, ?, ?)"
  ).run(id, userId, category, content, projectId ?? null, expiresAt ?? null);
  scheduleMemoryEmbedding(id, content);
  return rowToMemory(db.prepare("SELECT * FROM memories WHERE id = ?").get(id) as Record<string, unknown>);
}

export function updateMemory(userId: string, memoryId: string, content: string, category?: string): boolean {
  const result = db.prepare(
    "UPDATE memories SET content = ?, category = COALESCE(?, category), updated_at = datetime('now') WHERE id = ? AND user_id = ?"
  ).run(content, category ?? null, memoryId, userId);
  if (result.changes > 0) scheduleMemoryEmbedding(memoryId, content);
  return result.changes > 0;
}

export function deleteMemory(userId: string, memoryId: string): boolean {
  return db.prepare("DELETE FROM memories WHERE id = ? AND user_id = ?").run(memoryId, userId).changes > 0;
}

export function deleteAllMemories(userId: string): number {
  return db.prepare("DELETE FROM memories WHERE user_id = ?").run(userId).changes;
}

function categoryRank(category: string): number {
  if (category === "identity" || category.startsWith("auto:identity")) return 0;
  if (category === "preference" || category.startsWith("auto:preference")) return 1;
  if (category === "location" || category.startsWith("auto:location")) return 2;
  if (category === "work" || category.startsWith("auto:work")) return 3;
  if (category === "auto:thread") return 9;
  return 5;
}

function keywordScore(content: string, terms: string[]): number {
  const lower = content.toLowerCase();
  let score = 0;
  for (const term of terms) {
    if (term.length < 2) continue;
    if (lower.includes(term)) score += term.length;
  }
  return score;
}

/**
 * Build memory system context. When `query` is provided, rank by embeddings (if available)
 * plus keyword overlap; otherwise prefer durable identity/prefs.
 */
export async function getMemoryContext(
  userId: string,
  projectId?: string,
  query?: string,
  conversationId?: string
): Promise<string> {
  const prefs = db
    .prepare("SELECT memory_enabled, privacy_mode FROM user_preferences WHERE user_id = ?")
    .get(userId) as { memory_enabled: number; privacy_mode: string } | undefined;
  if (prefs && prefs.memory_enabled === 0) return "";
  if (prefs?.privacy_mode === "temporary") return "";

  const now = Date.now();
  const memories = listMemories(userId, projectId).filter((m) => {
    if (!m.expiresAt) return true;
    const exp = Date.parse(m.expiresAt);
    return Number.isNaN(exp) || exp > now;
  });
  if (!memories.length) return "";

  let selected = memories;

  const durable = memories
    .filter((m) => categoryRank(m.category) <= 3)
    .sort((a, b) => categoryRank(a.category) - categoryRank(b.category));
  const threadKey = conversationId ? `Conversation focus (${conversationId.slice(0, 8)})` : null;
  const thread = threadKey ? memories.filter((m) => m.content.startsWith(threadKey) || (m.category === "auto:thread" && m.content.includes(conversationId!.slice(0, 8)))) : [];

  if (query?.trim()) {
    const terms = query
      .toLowerCase()
      .split(/\W+/)
      .filter((t) => t.length > 2)
      .slice(0, 12);

    let queryVec: number[] | null = null;
    if (embeddingsAvailable()) {
      queryVec = await embedText(query);
    }

    const rows = db
      .prepare(
        projectId
          ? "SELECT id, embedding FROM memories WHERE user_id = ? AND (project_id = ? OR project_id IS NULL)"
          : "SELECT id, embedding FROM memories WHERE user_id = ?"
      )
      .all(...(projectId ? [userId, projectId] : [userId])) as Array<{ id: string; embedding: string | null }>;
    const embById = new Map(rows.map((r) => [r.id, deserializeEmbedding(r.embedding)]));

    const ranked = [...memories]
      .map((m) => {
        const kw = terms.length ? keywordScore(m.content, terms) : 0;
        const emb = embById.get(m.id);
        const sem = queryVec && emb ? cosineSimilarity(queryVec, emb) * 100 : 0;
        const durableBoost = 20 - categoryRank(m.category);
        return { m, score: sem + kw + durableBoost };
      })
      .sort((a, b) => b.score - a.score)
      .map((x) => x.m);

    const pinnedIds = new Set([...durable.slice(0, 8), ...thread].map((m) => m.id));
    selected = [...durable.slice(0, 8), ...thread, ...ranked.filter((m) => !pinnedIds.has(m.id))].slice(0, 20);
  } else {
    selected = [...durable, ...thread, ...memories.filter((m) => categoryRank(m.category) > 3 && !thread.some((t) => t.id === m.id))]
      .filter((m, i, arr) => arr.findIndex((x) => x.id === m.id) === i)
      .slice(0, 20);
  }

  return (
    "User memory (use to personalize replies; do not invent facts beyond this):\n" +
    selected.map((m) => `- [${m.category}] ${m.content}`).join("\n")
  );
}

export function getUserPreferences(userId: string) {
  let row = db.prepare("SELECT * FROM user_preferences WHERE user_id = ?").get(userId) as Record<string, unknown> | undefined;
  if (!row) {
    db.prepare("INSERT INTO user_preferences (user_id) VALUES (?)").run(userId);
    row = db.prepare("SELECT * FROM user_preferences WHERE user_id = ?").get(userId) as Record<string, unknown>;
  }
  return {
    memoryEnabled: row!.memory_enabled === 1,
    privacyMode: row!.privacy_mode as string,
    routerMode: row!.router_mode as string,
    lastProjectId: (row!.last_project_id as string | null) ?? null,
    lastConversationId: (row!.last_conversation_id as string | null) ?? null,
    lastModelId: (row!.last_model_id as string | null) ?? null,
  };
}

export function updateUserPreferences(
  userId: string,
  updates: {
    memoryEnabled?: boolean;
    privacyMode?: string;
    routerMode?: string;
    lastProjectId?: string | null;
    lastConversationId?: string | null;
    lastModelId?: string | null;
  }
) {
  db.prepare("INSERT INTO user_preferences (user_id) VALUES (?) ON CONFLICT(user_id) DO NOTHING").run(userId);
  if (updates.memoryEnabled !== undefined) {
    db.prepare("UPDATE user_preferences SET memory_enabled = ?, updated_at = datetime('now') WHERE user_id = ?")
      .run(updates.memoryEnabled ? 1 : 0, userId);
  }
  if (updates.privacyMode) {
    db.prepare("UPDATE user_preferences SET privacy_mode = ?, updated_at = datetime('now') WHERE user_id = ?")
      .run(updates.privacyMode, userId);
  }
  if (updates.routerMode) {
    db.prepare("UPDATE user_preferences SET router_mode = ?, updated_at = datetime('now') WHERE user_id = ?")
      .run(updates.routerMode, userId);
  }
  if (updates.lastProjectId !== undefined) {
    db.prepare("UPDATE user_preferences SET last_project_id = ?, updated_at = datetime('now') WHERE user_id = ?")
      .run(updates.lastProjectId, userId);
  }
  if (updates.lastConversationId !== undefined) {
    db.prepare("UPDATE user_preferences SET last_conversation_id = ?, updated_at = datetime('now') WHERE user_id = ?")
      .run(updates.lastConversationId, userId);
  }
  if (updates.lastModelId !== undefined) {
    db.prepare("UPDATE user_preferences SET last_model_id = ?, updated_at = datetime('now') WHERE user_id = ?")
      .run(updates.lastModelId, userId);
  }
}

function scheduleMemoryEmbedding(memoryId: string, content: string) {
  if (!embeddingsAvailable()) return;
  setImmediate(() => {
    void (async () => {
      try {
        const vec = await embedText(content);
        if (!vec) return;
        db.prepare("UPDATE memories SET embedding = ? WHERE id = ?").run(serializeEmbedding(vec), memoryId);
      } catch (e) {
        console.warn("memory embed failed:", e instanceof Error ? e.message : e);
      }
    })();
  });
}

function rowToMemory(row: Record<string, unknown>): Memory {
  return {
    id: row.id as string,
    category: row.category as string,
    content: row.content as string,
    projectId: (row.project_id as string) ?? null,
    expiresAt: (row.expires_at as string) ?? null,
    createdAt: row.created_at as string,
    updatedAt: row.updated_at as string,
  };
}
