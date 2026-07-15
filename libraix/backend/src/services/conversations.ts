import { v4 as uuid } from "uuid";
import { db } from "../db/schema.js";

export interface Conversation {
  id: string;
  title: string;
  modelId: string;
  pinned: boolean;
  archived: boolean;
  projectId: string | null;
  folderId: string | null;
  createdAt: string;
  updatedAt: string;
}

export interface Message {
  id: string;
  role: "user" | "assistant";
  content: string;
  createdAt: string;
}

type ConversationRow = {
  id: string;
  title: string;
  model_id: string;
  pinned: number;
  archived: number;
  project_id: string | null;
  folder_id?: string | null;
  created_at: string;
  updated_at: string;
};

function mapConversation(r: ConversationRow): Conversation {
  return {
    id: r.id,
    title: r.title,
    modelId: r.model_id,
    pinned: r.pinned === 1,
    archived: r.archived === 1,
    projectId: r.project_id,
    folderId: r.folder_id ?? null,
    createdAt: r.created_at,
    updatedAt: r.updated_at,
  };
}

export function listConversations(userId: string, opts?: { archived?: boolean }): Conversation[] {
  const archived = opts?.archived ? 1 : 0;
  const rows = db
    .prepare(
      `SELECT * FROM conversations WHERE user_id = ? AND archived = ?
       ORDER BY pinned DESC, updated_at DESC`
    )
    .all(userId, archived) as ConversationRow[];

  return rows.map(mapConversation);
}

export function createConversation(
  userId: string,
  modelId: string,
  title = "New chat",
  projectId?: string | null
): Conversation {
  const id = uuid();
  db.prepare(
    "INSERT INTO conversations (id, user_id, title, model_id, project_id) VALUES (?, ?, ?, ?, ?)"
  ).run(id, userId, title, modelId, projectId ?? null);
  const row = db.prepare("SELECT * FROM conversations WHERE id = ?").get(id) as ConversationRow;
  return mapConversation(row);
}

export function getConversation(userId: string, conversationId: string): Conversation | undefined {
  const row = db
    .prepare("SELECT * FROM conversations WHERE id = ? AND user_id = ?")
    .get(conversationId, userId) as ConversationRow | undefined;
  if (!row) return undefined;
  return mapConversation(row);
}

export function addMessage(conversationId: string, role: "user" | "assistant", content: string): Message {
  const id = uuid();
  db.prepare("INSERT INTO messages (id, conversation_id, role, content) VALUES (?, ?, ?, ?)").run(
    id,
    conversationId,
    role,
    content
  );
  db.prepare("UPDATE conversations SET updated_at = datetime('now') WHERE id = ?").run(conversationId);
  const row = db.prepare("SELECT * FROM messages WHERE id = ?").get(id) as {
    id: string;
    role: string;
    content: string;
    created_at: string;
  };
  return { id: row.id, role: row.role as "user" | "assistant", content: row.content, createdAt: row.created_at };
}

export function getMessages(conversationId: string): Message[] {
  const rows = db
    .prepare("SELECT * FROM messages WHERE conversation_id = ? ORDER BY created_at ASC")
    .all(conversationId) as Array<{ id: string; role: string; content: string; created_at: string }>;
  return rows.map((r) => ({
    id: r.id,
    role: r.role as "user" | "assistant",
    content: r.content,
    createdAt: r.created_at,
  }));
}

export function deleteConversation(userId: string, conversationId: string): boolean {
  const result = db
    .prepare("DELETE FROM conversations WHERE id = ? AND user_id = ?")
    .run(conversationId, userId);
  return result.changes > 0;
}

export function updateConversationTitle(userId: string, conversationId: string, title: string): boolean {
  const result = db
    .prepare("UPDATE conversations SET title = ?, updated_at = datetime('now') WHERE id = ? AND user_id = ?")
    .run(title, conversationId, userId);
  return result.changes > 0;
}

export function updateConversationMeta(
  userId: string,
  conversationId: string,
  updates: { pinned?: boolean; archived?: boolean; projectId?: string | null; folderId?: string | null }
): boolean {
  const sets: string[] = [];
  const vals: unknown[] = [];
  if (updates.pinned !== undefined) {
    sets.push("pinned = ?");
    vals.push(updates.pinned ? 1 : 0);
  }
  if (updates.archived !== undefined) {
    sets.push("archived = ?");
    vals.push(updates.archived ? 1 : 0);
  }
  if (updates.projectId !== undefined) {
    sets.push("project_id = ?");
    vals.push(updates.projectId);
  }
  if (updates.folderId !== undefined) {
    sets.push("folder_id = ?");
    vals.push(updates.folderId);
  }
  if (!sets.length) return false;
  sets.push("updated_at = datetime('now')");
  vals.push(conversationId, userId);
  return db.prepare(`UPDATE conversations SET ${sets.join(", ")} WHERE id = ? AND user_id = ?`).run(...vals).changes > 0;
}

export function updateMessage(conversationId: string, messageId: string, content: string): boolean {
  const result = db
    .prepare("UPDATE messages SET content = ? WHERE id = ? AND conversation_id = ? AND role = 'user'")
    .run(content, messageId, conversationId);
  return result.changes > 0;
}

export function deleteMessagesAfter(conversationId: string, messageId: string): number {
  const anchor = db
    .prepare("SELECT created_at FROM messages WHERE id = ? AND conversation_id = ?")
    .get(messageId, conversationId) as { created_at: string } | undefined;
  if (!anchor) return 0;
  const result = db
    .prepare("DELETE FROM messages WHERE conversation_id = ? AND created_at > ?")
    .run(conversationId, anchor.created_at);
  return result.changes;
}

export function deleteMessagesFrom(conversationId: string, messageId: string): number {
  const anchor = db
    .prepare("SELECT created_at FROM messages WHERE id = ? AND conversation_id = ?")
    .get(messageId, conversationId) as { created_at: string } | undefined;
  if (!anchor) return 0;
  const result = db
    .prepare("DELETE FROM messages WHERE conversation_id = ? AND created_at >= ?")
    .run(conversationId, anchor.created_at);
  return result.changes;
}

export function branchConversation(
  userId: string,
  sourceConversationId: string,
  fromMessageId: string,
  modelId: string
): Conversation | undefined {
  const source = getConversation(userId, sourceConversationId);
  if (!source) return undefined;
  const anchor = db
    .prepare("SELECT created_at FROM messages WHERE id = ? AND conversation_id = ?")
    .get(fromMessageId, sourceConversationId) as { created_at: string } | undefined;
  if (!anchor) return undefined;

  const messages = db
    .prepare(
      "SELECT * FROM messages WHERE conversation_id = ? AND created_at <= ? ORDER BY created_at ASC"
    )
    .all(sourceConversationId, anchor.created_at) as Array<{
    role: string;
    content: string;
  }>;

  const title = `${source.title} (branch)`;
  const conv = createConversation(userId, modelId, title, source.projectId);
  for (const m of messages) {
    addMessage(conv.id, m.role as "user" | "assistant", m.content);
  }
  return getConversation(userId, conv.id);
}
