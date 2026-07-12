import { v4 as uuid } from "uuid";
import { db } from "../db/schema.js";

export interface Conversation {
  id: string;
  title: string;
  modelId: string;
  pinned: boolean;
  createdAt: string;
  updatedAt: string;
}

export interface Message {
  id: string;
  role: "user" | "assistant";
  content: string;
  createdAt: string;
}

export function listConversations(userId: string): Conversation[] {
  const rows = db
    .prepare("SELECT * FROM conversations WHERE user_id = ? ORDER BY updated_at DESC")
    .all(userId) as Array<{
    id: string;
    title: string;
    model_id: string;
    pinned: number;
    created_at: string;
    updated_at: string;
  }>;

  return rows.map((r) => ({
    id: r.id,
    title: r.title,
    modelId: r.model_id,
    pinned: r.pinned === 1,
    createdAt: r.created_at,
    updatedAt: r.updated_at,
  }));
}

export function createConversation(userId: string, modelId: string, title = "New chat"): Conversation {
  const id = uuid();
  db.prepare(
    "INSERT INTO conversations (id, user_id, title, model_id) VALUES (?, ?, ?, ?)"
  ).run(id, userId, title, modelId);
  const row = db.prepare("SELECT * FROM conversations WHERE id = ?").get(id) as {
    id: string;
    title: string;
    model_id: string;
    pinned: number;
    created_at: string;
    updated_at: string;
  };
  return {
    id: row.id,
    title: row.title,
    modelId: row.model_id,
    pinned: row.pinned === 1,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  };
}

export function getConversation(userId: string, conversationId: string): Conversation | undefined {
  const row = db
    .prepare("SELECT * FROM conversations WHERE id = ? AND user_id = ?")
    .get(conversationId, userId) as
    | { id: string; title: string; model_id: string; pinned: number; created_at: string; updated_at: string }
    | undefined;
  if (!row) return undefined;
  return {
    id: row.id,
    title: row.title,
    modelId: row.model_id,
    pinned: row.pinned === 1,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  };
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
