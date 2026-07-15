import { randomBytes } from "node:crypto";
import { v4 as uuid } from "uuid";
import { db } from "../db/schema.js";
import { getConversation, getMessages } from "./conversations.js";

function now() {
  return new Date().toISOString();
}

/* ── Prompt library ─────────────────────────────────────────── */

export function listPrompts(userId: string) {
  return (
    db
      .prepare(
        `SELECT id, title, body, created_at as createdAt, updated_at as updatedAt
         FROM prompt_library WHERE user_id = ? ORDER BY updated_at DESC`
      )
      .all(userId) as Array<{ id: string; title: string; body: string; createdAt: string; updatedAt: string }>
  );
}

export function createPrompt(userId: string, title: string, body: string) {
  const id = uuid();
  db.prepare("INSERT INTO prompt_library (id, user_id, title, body) VALUES (?, ?, ?, ?)").run(
    id,
    userId,
    title.trim().slice(0, 120),
    body.trim().slice(0, 8000)
  );
  return listPrompts(userId).find((p) => p.id === id)!;
}

export function updatePrompt(userId: string, id: string, updates: { title?: string; body?: string }) {
  const row = db
    .prepare("SELECT id FROM prompt_library WHERE id = ? AND user_id = ?")
    .get(id, userId) as { id: string } | undefined;
  if (!row) return null;
  if (updates.title !== undefined) {
    db.prepare("UPDATE prompt_library SET title = ?, updated_at = datetime('now') WHERE id = ?").run(
      updates.title.trim().slice(0, 120),
      id
    );
  }
  if (updates.body !== undefined) {
    db.prepare("UPDATE prompt_library SET body = ?, updated_at = datetime('now') WHERE id = ?").run(
      updates.body.trim().slice(0, 8000),
      id
    );
  }
  return listPrompts(userId).find((p) => p.id === id) ?? null;
}

export function deletePrompt(userId: string, id: string) {
  return db.prepare("DELETE FROM prompt_library WHERE id = ? AND user_id = ?").run(id, userId).changes > 0;
}

/* ── Custom assistants ──────────────────────────────────────── */

export function listCustomAssistants(userId: string) {
  return (
    db
      .prepare(
        `SELECT id, name, description, system_prompt as systemPrompt,
                created_at as createdAt, updated_at as updatedAt
         FROM custom_assistants WHERE user_id = ? ORDER BY updated_at DESC`
      )
      .all(userId) as Array<{
      id: string;
      name: string;
      description: string;
      systemPrompt: string;
      createdAt: string;
      updatedAt: string;
    }>
  );
}

export function createCustomAssistant(
  userId: string,
  data: { name: string; description?: string; systemPrompt: string }
) {
  const id = uuid();
  db.prepare(
    "INSERT INTO custom_assistants (id, user_id, name, description, system_prompt) VALUES (?, ?, ?, ?, ?)"
  ).run(
    id,
    userId,
    data.name.trim().slice(0, 80),
    (data.description ?? "").trim().slice(0, 240),
    data.systemPrompt.trim().slice(0, 8000)
  );
  return listCustomAssistants(userId).find((a) => a.id === id)!;
}

export function updateCustomAssistant(
  userId: string,
  id: string,
  data: { name?: string; description?: string; systemPrompt?: string }
) {
  const row = db
    .prepare("SELECT id FROM custom_assistants WHERE id = ? AND user_id = ?")
    .get(id, userId);
  if (!row) return null;
  if (data.name !== undefined) {
    db.prepare("UPDATE custom_assistants SET name = ?, updated_at = datetime('now') WHERE id = ?").run(
      data.name.trim().slice(0, 80),
      id
    );
  }
  if (data.description !== undefined) {
    db.prepare(
      "UPDATE custom_assistants SET description = ?, updated_at = datetime('now') WHERE id = ?"
    ).run(data.description.trim().slice(0, 240), id);
  }
  if (data.systemPrompt !== undefined) {
    db.prepare(
      "UPDATE custom_assistants SET system_prompt = ?, updated_at = datetime('now') WHERE id = ?"
    ).run(data.systemPrompt.trim().slice(0, 8000), id);
  }
  return listCustomAssistants(userId).find((a) => a.id === id) ?? null;
}

export function deleteCustomAssistant(userId: string, id: string) {
  return db.prepare("DELETE FROM custom_assistants WHERE id = ? AND user_id = ?").run(id, userId).changes > 0;
}

/* ── Share links ────────────────────────────────────────────── */

export function createShareLink(userId: string, conversationId: string) {
  const conv = getConversation(userId, conversationId);
  if (!conv) return null;
  const existing = db
    .prepare("SELECT token FROM shared_chats WHERE conversation_id = ? AND user_id = ?")
    .get(conversationId, userId) as { token: string } | undefined;
  if (existing) return { token: existing.token, conversationId };
  const id = uuid();
  const token = randomBytes(18).toString("base64url");
  db.prepare(
    "INSERT INTO shared_chats (id, token, conversation_id, user_id) VALUES (?, ?, ?, ?)"
  ).run(id, token, conversationId, userId);
  return { token, conversationId };
}

export function getSharedChat(token: string) {
  const row = db
    .prepare(
      `SELECT sc.token, sc.conversation_id as conversationId, sc.user_id as userId, c.title
       FROM shared_chats sc
       JOIN conversations c ON c.id = sc.conversation_id
       WHERE sc.token = ?`
    )
    .get(token) as { token: string; conversationId: string; userId: string; title: string } | undefined;
  if (!row) return null;
  return {
    token: row.token,
    title: row.title,
    messages: getMessages(row.conversationId).map((m) => ({
      role: m.role,
      content: m.content,
      createdAt: m.createdAt,
    })),
  };
}

export function revokeShareLink(userId: string, conversationId: string) {
  return (
    db
      .prepare("DELETE FROM shared_chats WHERE conversation_id = ? AND user_id = ?")
      .run(conversationId, userId).changes > 0
  );
}

/* ── Folders ────────────────────────────────────────────────── */

export function listFolders(userId: string) {
  return (
    db
      .prepare(
        `SELECT id, name, created_at as createdAt FROM chat_folders
         WHERE user_id = ? ORDER BY name COLLATE NOCASE ASC`
      )
      .all(userId) as Array<{ id: string; name: string; createdAt: string }>
  );
}

export function createFolder(userId: string, name: string) {
  const id = uuid();
  const clean = name.trim().slice(0, 60) || "Folder";
  db.prepare("INSERT INTO chat_folders (id, user_id, name) VALUES (?, ?, ?)").run(id, userId, clean);
  return { id, name: clean, createdAt: now() };
}

export function deleteFolder(userId: string, id: string) {
  db.prepare("UPDATE conversations SET folder_id = NULL WHERE folder_id = ? AND user_id = ?").run(id, userId);
  return db.prepare("DELETE FROM chat_folders WHERE id = ? AND user_id = ?").run(id, userId).changes > 0;
}

export function setConversationFolder(userId: string, conversationId: string, folderId: string | null) {
  if (folderId) {
    const ok = db
      .prepare("SELECT id FROM chat_folders WHERE id = ? AND user_id = ?")
      .get(folderId, userId);
    if (!ok) return false;
  }
  return (
    db
      .prepare(
        "UPDATE conversations SET folder_id = ?, updated_at = datetime('now') WHERE id = ? AND user_id = ?"
      )
      .run(folderId, conversationId, userId).changes > 0
  );
}

/* ── Automations ────────────────────────────────────────────── */

export function listAutomations(userId: string) {
  return (
    db
      .prepare(
        `SELECT id, name, prompt, schedule, enabled, last_run_at as lastRunAt,
                created_at as createdAt, updated_at as updatedAt
         FROM automations WHERE user_id = ? ORDER BY updated_at DESC`
      )
      .all(userId) as Array<{
      id: string;
      name: string;
      prompt: string;
      schedule: string;
      enabled: number;
      lastRunAt: string | null;
      createdAt: string;
      updatedAt: string;
    }>
  ).map((r) => ({ ...r, enabled: r.enabled === 1 }));
}

export function createAutomation(
  userId: string,
  data: { name: string; prompt: string; schedule?: string }
) {
  const id = uuid();
  const schedule = ["daily", "weekly", "weekday"].includes(data.schedule ?? "")
    ? (data.schedule as string)
    : "daily";
  db.prepare(
    "INSERT INTO automations (id, user_id, name, prompt, schedule) VALUES (?, ?, ?, ?, ?)"
  ).run(id, userId, data.name.trim().slice(0, 80), data.prompt.trim().slice(0, 4000), schedule);
  return listAutomations(userId).find((a) => a.id === id)!;
}

export function updateAutomation(
  userId: string,
  id: string,
  data: { name?: string; prompt?: string; schedule?: string; enabled?: boolean }
) {
  const row = db.prepare("SELECT id FROM automations WHERE id = ? AND user_id = ?").get(id, userId);
  if (!row) return null;
  if (data.name !== undefined) {
    db.prepare("UPDATE automations SET name = ?, updated_at = datetime('now') WHERE id = ?").run(
      data.name.trim().slice(0, 80),
      id
    );
  }
  if (data.prompt !== undefined) {
    db.prepare("UPDATE automations SET prompt = ?, updated_at = datetime('now') WHERE id = ?").run(
      data.prompt.trim().slice(0, 4000),
      id
    );
  }
  if (data.schedule !== undefined) {
    db.prepare("UPDATE automations SET schedule = ?, updated_at = datetime('now') WHERE id = ?").run(
      data.schedule,
      id
    );
  }
  if (data.enabled !== undefined) {
    db.prepare("UPDATE automations SET enabled = ?, updated_at = datetime('now') WHERE id = ?").run(
      data.enabled ? 1 : 0,
      id
    );
  }
  return listAutomations(userId).find((a) => a.id === id) ?? null;
}

export function deleteAutomation(userId: string, id: string) {
  return db.prepare("DELETE FROM automations WHERE id = ? AND user_id = ?").run(id, userId).changes > 0;
}

/** Mark due automations as run and return their prompts (executed client/orchestrator later). */
export function claimDueAutomations(userId: string) {
  const all = listAutomations(userId).filter((a) => a.enabled);
  const due: typeof all = [];
  const day = new Date().toISOString().slice(0, 10);
  for (const a of all) {
    const last = a.lastRunAt?.slice(0, 10);
    if (last === day) continue;
    if (a.schedule === "weekly") {
      const dow = new Date().getUTCDay();
      if (dow !== 1) continue; // Mondays
    }
    if (a.schedule === "weekday") {
      const dow = new Date().getUTCDay();
      if (dow === 0 || dow === 6) continue;
    }
    due.push(a);
    db.prepare("UPDATE automations SET last_run_at = datetime('now') WHERE id = ?").run(a.id);
  }
  return due;
}

/* ── Connectors ─────────────────────────────────────────────── */

const CONNECTOR_CATALOG = [
  { id: "google-drive", name: "Google Drive", description: "Open docs from Drive in chat" },
  { id: "gmail", name: "Gmail", description: "Draft and summarise email" },
  { id: "google-calendar", name: "Google Calendar", description: "Check upcoming events" },
  { id: "github", name: "GitHub", description: "Repo context for coding chats" },
] as const;

export function listConnectors(userId: string) {
  const rows = db
    .prepare(
      `SELECT provider, status, meta_json as metaJson, updated_at as updatedAt
       FROM connectors WHERE user_id = ?`
    )
    .all(userId) as Array<{ provider: string; status: string; metaJson: string; updatedAt: string }>;
  const byProvider = new Map(rows.map((r) => [r.provider, r]));
  return CONNECTOR_CATALOG.map((c) => {
    const row = byProvider.get(c.id);
    return {
      id: c.id,
      name: c.name,
      description: c.description,
      status: (row?.status as "connected" | "disconnected" | "pending") ?? "disconnected",
      updatedAt: row?.updatedAt ?? null,
    };
  });
}

export function setConnectorStatus(
  userId: string,
  provider: string,
  status: "connected" | "disconnected" | "pending"
) {
  if (!CONNECTOR_CATALOG.some((c) => c.id === provider)) return null;
  const existing = db
    .prepare("SELECT id FROM connectors WHERE user_id = ? AND provider = ?")
    .get(userId, provider) as { id: string } | undefined;
  if (existing) {
    db.prepare(
      "UPDATE connectors SET status = ?, updated_at = datetime('now') WHERE id = ?"
    ).run(status, existing.id);
  } else {
    db.prepare(
      "INSERT INTO connectors (id, user_id, provider, status) VALUES (?, ?, ?, ?)"
    ).run(uuid(), userId, provider, status);
  }
  return listConnectors(userId).find((c) => c.id === provider) ?? null;
}
