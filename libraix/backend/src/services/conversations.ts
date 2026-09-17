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
  modelId?: string | null;
  modelLabel?: string | null;
}

export interface MessageMeta {
  modelId?: string | null;
  modelLabel?: string | null;
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

type MessageRow = {
  id: string;
  role: string;
  content: string;
  created_at: string;
  model_id?: string | null;
  model_label?: string | null;
};

function mapMessage(r: MessageRow): Message {
  return {
    id: r.id,
    role: r.role as "user" | "assistant",
    content: r.content,
    createdAt: r.created_at,
    modelId: r.model_id ?? null,
    modelLabel: r.model_label ?? null,
  };
}

export function getMessage(conversationId: string, messageId: string): Message | undefined {
  const row = db
    .prepare("SELECT * FROM messages WHERE id = ? AND conversation_id = ?")
    .get(messageId, conversationId) as MessageRow | undefined;
  return row ? mapMessage(row) : undefined;
}

export function addMessage(
  conversationId: string,
  role: "user" | "assistant",
  content: string,
  meta?: MessageMeta
): Message {
  const id = uuid();
  const modelId = meta?.modelId ?? null;
  const modelLabel = meta?.modelLabel ?? null;
  db.prepare(
    "INSERT INTO messages (id, conversation_id, role, content, model_id, model_label) VALUES (?, ?, ?, ?, ?, ?)"
  ).run(id, conversationId, role, content, modelId, modelLabel);
  if (role === "assistant" && modelId) {
    db.prepare("UPDATE conversations SET model_id = ?, updated_at = datetime('now') WHERE id = ?").run(
      modelId,
      conversationId
    );
  } else {
    db.prepare("UPDATE conversations SET updated_at = datetime('now') WHERE id = ?").run(conversationId);
  }
  const row = db.prepare("SELECT * FROM messages WHERE id = ?").get(id) as MessageRow;
  return mapMessage(row);
}

export function getMessages(conversationId: string): Message[] {
  const rows = db
    .prepare("SELECT * FROM messages WHERE conversation_id = ? ORDER BY created_at ASC")
    .all(conversationId) as MessageRow[];
  return rows.map(mapMessage);
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

export function updateMessage(
  conversationId: string,
  messageId: string,
  content: string,
  role?: "user" | "assistant"
): boolean {
  const sql = role
    ? "UPDATE messages SET content = ? WHERE id = ? AND conversation_id = ? AND role = ?"
    : "UPDATE messages SET content = ? WHERE id = ? AND conversation_id = ?";
  const result = role
    ? db.prepare(sql).run(content, messageId, conversationId, role)
    : db.prepare(sql).run(content, messageId, conversationId);
  if (result.changes > 0) {
    db.prepare("UPDATE conversations SET updated_at = datetime('now') WHERE id = ?").run(conversationId);
  }
  return result.changes > 0;
}

export function updateConversationModel(userId: string, conversationId: string, modelId: string): boolean {
  const result = db
    .prepare("UPDATE conversations SET model_id = ?, updated_at = datetime('now') WHERE id = ? AND user_id = ?")
    .run(modelId, conversationId, userId);
  return result.changes > 0;
}

export function deleteMessagesAfter(conversationId: string, messageId: string): number {
  const result = db
    .prepare(
      `DELETE FROM messages WHERE conversation_id = ? AND rowid > (
         SELECT rowid FROM messages WHERE id = ? AND conversation_id = ?
       )`
    )
    .run(conversationId, messageId, conversationId);
  return result.changes;
}

export function deleteMessagesFrom(conversationId: string, messageId: string): number {
  const result = db
    .prepare(
      `DELETE FROM messages WHERE conversation_id = ? AND rowid >= (
         SELECT rowid FROM messages WHERE id = ? AND conversation_id = ?
       )`
    )
    .run(conversationId, messageId, conversationId);
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
  const exists = db
    .prepare("SELECT id FROM messages WHERE id = ? AND conversation_id = ?")
    .get(fromMessageId, sourceConversationId) as { id: string } | undefined;
  if (!exists) return undefined;

  const messages = db
    .prepare(
      "SELECT * FROM messages WHERE conversation_id = ? AND rowid <= (SELECT rowid FROM messages WHERE id = ? AND conversation_id = ?) ORDER BY rowid ASC"
    )
    .all(sourceConversationId, fromMessageId, sourceConversationId) as MessageRow[];

  const title = `${source.title} (branch)`;
  const conv = createConversation(userId, modelId, title, source.projectId);
  for (const m of messages) {
    addMessage(conv.id, m.role as "user" | "assistant", m.content, {
      modelId: m.model_id,
      modelLabel: m.model_label,
    });
  }
  return getConversation(userId, conv.id);
}
