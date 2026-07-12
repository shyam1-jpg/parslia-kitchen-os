import { v4 as uuid } from "uuid";
import { db } from "../db/schema.js";

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
  return rowToMemory(db.prepare("SELECT * FROM memories WHERE id = ?").get(id) as Record<string, unknown>);
}

export function updateMemory(userId: string, memoryId: string, content: string, category?: string): boolean {
  const result = db.prepare(
    "UPDATE memories SET content = ?, category = COALESCE(?, category), updated_at = datetime('now') WHERE id = ? AND user_id = ?"
  ).run(content, category ?? null, memoryId, userId);
  return result.changes > 0;
}

export function deleteMemory(userId: string, memoryId: string): boolean {
  return db.prepare("DELETE FROM memories WHERE id = ? AND user_id = ?").run(memoryId, userId).changes > 0;
}

export function deleteAllMemories(userId: string): number {
  return db.prepare("DELETE FROM memories WHERE user_id = ?").run(userId).changes;
}

export function getMemoryContext(userId: string, projectId?: string): string {
  const prefs = db.prepare("SELECT memory_enabled FROM user_preferences WHERE user_id = ?").get(userId) as
    | { memory_enabled: number }
    | undefined;
  if (prefs && prefs.memory_enabled === 0) return "";

  const memories = listMemories(userId, projectId).slice(0, 20);
  if (!memories.length) return "";
  return "User memory:\n" + memories.map((m) => `- [${m.category}] ${m.content}`).join("\n");
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
  };
}

export function updateUserPreferences(userId: string, updates: { memoryEnabled?: boolean; privacyMode?: string; routerMode?: string }) {
  if (updates.memoryEnabled !== undefined) {
    db.prepare("INSERT INTO user_preferences (user_id, memory_enabled) VALUES (?, ?) ON CONFLICT(user_id) DO UPDATE SET memory_enabled = ?, updated_at = datetime('now')")
      .run(userId, updates.memoryEnabled ? 1 : 0, updates.memoryEnabled ? 1 : 0);
  }
  if (updates.privacyMode) {
    db.prepare("INSERT INTO user_preferences (user_id, privacy_mode) VALUES (?, ?) ON CONFLICT(user_id) DO UPDATE SET privacy_mode = ?, updated_at = datetime('now')")
      .run(userId, updates.privacyMode, updates.privacyMode);
  }
  if (updates.routerMode) {
    db.prepare("INSERT INTO user_preferences (user_id, router_mode) VALUES (?, ?) ON CONFLICT(user_id) DO UPDATE SET router_mode = ?, updated_at = datetime('now')")
      .run(userId, updates.routerMode, updates.routerMode);
  }
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
