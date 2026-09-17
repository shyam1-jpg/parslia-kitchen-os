/**
 * Isolated SQLite checks for per-message model metadata, share snapshots, and sticky prefs.
 * Run: DATABASE_PATH=/tmp/libraix-verify.db npx tsx scripts/verify-chat-upgrades.ts
 */
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import assert from "node:assert/strict";

const tmp = path.join(os.tmpdir(), `libraix-verify-${Date.now()}.db`);
process.env.DATABASE_PATH = tmp;

const { initDb } = await import("../src/db/schema.js");
initDb();

const { createConversation, addMessage, getMessages, updateMessage, deleteMessagesAfter, getMessage } = await import(
  "../src/services/conversations.js"
);
const { createShareLink, getSharedChat } = await import("../src/services/workspaceExtras.js");
const { updateUserPreferences, getUserPreferences, createMemory, getMemoryContext } = await import(
  "../src/services/memory.js"
);
const { db } = await import("../src/db/schema.js");

db.prepare(
  "INSERT INTO users (id, email, password_hash, display_name, plan) VALUES (?, ?, ?, ?, ?)"
).run("user-1", "verify@libraix.ai", "x", "Verify", "free");

const conv = createConversation("user-1", "libraix-fast", "Mixed models", null);
addMessage(conv.id, "user", "Hello");
addMessage(conv.id, "assistant", "Hi from Fast", {
  modelId: "libraix-fast",
  modelLabel: "Generated using Libraix Fast (openai) through Libraix",
});
addMessage(conv.id, "user", "Now use Smart");
addMessage(conv.id, "assistant", "Hi from Smart", {
  modelId: "libraix-smart",
  modelLabel: "Generated using Libraix Smart (openai) through Libraix",
});

const messages = getMessages(conv.id);
assert.equal(messages.filter((m) => m.role === "assistant").length, 2);
assert.equal(messages[1].modelId, "libraix-fast");
assert.equal(messages[3].modelId, "libraix-smart");
assert.match(messages[3].modelLabel ?? "", /Libraix Smart/);

const lastAssistant = messages[3];
const edited = updateMessage(conv.id, lastAssistant.id, "Edited Smart reply");
assert.equal(edited, true);
assert.equal(getMessage(conv.id, lastAssistant.id)?.content, "Edited Smart reply");
assert.equal(getMessages(conv.id).length, 4, "editing an assistant reply must not drop later turns");

const userMsg = messages[2];
updateMessage(conv.id, userMsg.id, "Now use Smart (edited)");
deleteMessagesAfter(conv.id, userMsg.id);
assert.equal(getMessages(conv.id).length, 3, "editing a user turn drops later assistant replies");

addMessage(conv.id, "assistant", "Regenerated", {
  modelId: "libraix-advanced",
  modelLabel: "Generated using Libraix Advanced (openai) through Libraix",
});

const share = createShareLink("user-1", conv.id);
assert.ok(share?.token);
addMessage(conv.id, "user", "SECRET later turn that must not leak");
const shared = getSharedChat(share!.token);
assert.ok(shared);
assert.equal(shared!.messages.some((m) => m.content.includes("SECRET")), false);
assert.ok(shared!.messages.some((m) => (m.modelLabel ?? "").includes("Libraix Advanced")));

updateUserPreferences("user-1", { lastProjectId: "proj-1", lastConversationId: conv.id, lastModelId: "libraix-advanced" });
const prefs = getUserPreferences("user-1");
assert.equal(prefs.lastConversationId, conv.id);
assert.equal(prefs.lastModelId, "libraix-advanced");

createMemory("user-1", "identity", "User's name is Ada", undefined);
createMemory("user-1", "auto:thread", `Conversation focus (${conv.id.slice(0, 8)}): mixed models`, undefined);
const ctx = await getMemoryContext("user-1", undefined, "what is my name?", conv.id);
assert.match(ctx, /Ada/);
assert.match(ctx, /mixed models/);

fs.unlinkSync(tmp);
try {
  fs.unlinkSync(`${tmp}-wal`);
  fs.unlinkSync(`${tmp}-shm`);
} catch {
  /* ignore */
}

console.log("verify-chat-upgrades: ok");
