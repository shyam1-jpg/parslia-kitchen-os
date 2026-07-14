import Database from "better-sqlite3";
import path from "node:path";
import fs from "node:fs";

const dbPath = process.env.DATABASE_PATH ?? "./data/libraix.db";
fs.mkdirSync(path.dirname(dbPath), { recursive: true });

export const db = new Database(dbPath);
db.pragma("journal_mode = WAL");
db.pragma("foreign_keys = ON");

export function initDb() {
  db.exec(`
    CREATE TABLE IF NOT EXISTS users (
      id TEXT PRIMARY KEY,
      email TEXT NOT NULL UNIQUE,
      password_hash TEXT,
      display_name TEXT,
      plan TEXT NOT NULL DEFAULT 'free',
      email_verified INTEGER NOT NULL DEFAULT 0,
      created_at TEXT NOT NULL DEFAULT (datetime('now')),
      updated_at TEXT NOT NULL DEFAULT (datetime('now'))
    );

    CREATE TABLE IF NOT EXISTS auth_identities (
      id TEXT PRIMARY KEY,
      user_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
      provider TEXT NOT NULL,
      provider_user_id TEXT NOT NULL,
      created_at TEXT NOT NULL DEFAULT (datetime('now')),
      UNIQUE(provider, provider_user_id)
    );

    CREATE TABLE IF NOT EXISTS sessions (
      sid TEXT PRIMARY KEY,
      sess TEXT NOT NULL,
      expire INTEGER NOT NULL
    );

    CREATE TABLE IF NOT EXISTS conversations (
      id TEXT PRIMARY KEY,
      user_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
      title TEXT NOT NULL DEFAULT 'New chat',
      model_id TEXT NOT NULL,
      pinned INTEGER NOT NULL DEFAULT 0,
      created_at TEXT NOT NULL DEFAULT (datetime('now')),
      updated_at TEXT NOT NULL DEFAULT (datetime('now'))
    );

    CREATE TABLE IF NOT EXISTS messages (
      id TEXT PRIMARY KEY,
      conversation_id TEXT NOT NULL REFERENCES conversations(id) ON DELETE CASCADE,
      role TEXT NOT NULL,
      content TEXT NOT NULL,
      created_at TEXT NOT NULL DEFAULT (datetime('now'))
    );

    CREATE TABLE IF NOT EXISTS usage_daily (
      user_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
      date TEXT NOT NULL,
      messages_used INTEGER NOT NULL DEFAULT 0,
      premium_used INTEGER NOT NULL DEFAULT 0,
      images_used INTEGER NOT NULL DEFAULT 0,
      tokens_used INTEGER NOT NULL DEFAULT 0,
      estimated_cost_cents INTEGER NOT NULL DEFAULT 0,
      PRIMARY KEY (user_id, date)
    );

    CREATE INDEX IF NOT EXISTS idx_conversations_user ON conversations(user_id);
    CREATE INDEX IF NOT EXISTS idx_messages_conversation ON messages(conversation_id);

    CREATE TABLE IF NOT EXISTS projects (
      id TEXT PRIMARY KEY,
      user_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
      name TEXT NOT NULL,
      description TEXT,
      instructions TEXT,
      created_at TEXT NOT NULL DEFAULT (datetime('now')),
      updated_at TEXT NOT NULL DEFAULT (datetime('now'))
    );

    CREATE TABLE IF NOT EXISTS project_files (
      id TEXT PRIMARY KEY,
      project_id TEXT NOT NULL REFERENCES projects(id) ON DELETE CASCADE,
      filename TEXT NOT NULL,
      mime_type TEXT,
      size_bytes INTEGER NOT NULL DEFAULT 0,
      storage_path TEXT,
      created_at TEXT NOT NULL DEFAULT (datetime('now'))
    );

    CREATE TABLE IF NOT EXISTS memories (
      id TEXT PRIMARY KEY,
      user_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
      category TEXT NOT NULL DEFAULT 'general',
      content TEXT NOT NULL,
      project_id TEXT REFERENCES projects(id) ON DELETE CASCADE,
      expires_at TEXT,
      created_at TEXT NOT NULL DEFAULT (datetime('now')),
      updated_at TEXT NOT NULL DEFAULT (datetime('now'))
    );

    CREATE TABLE IF NOT EXISTS user_preferences (
      user_id TEXT PRIMARY KEY REFERENCES users(id) ON DELETE CASCADE,
      memory_enabled INTEGER NOT NULL DEFAULT 1,
      privacy_mode TEXT NOT NULL DEFAULT 'standard',
      router_mode TEXT NOT NULL DEFAULT 'auto',
      updated_at TEXT NOT NULL DEFAULT (datetime('now'))
    );

    CREATE INDEX IF NOT EXISTS idx_projects_user ON projects(user_id);
    CREATE INDEX IF NOT EXISTS idx_memories_user ON memories(user_id);

    CREATE TABLE IF NOT EXISTS password_reset_tokens (
      token TEXT PRIMARY KEY,
      user_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
      expires_at TEXT NOT NULL,
      created_at TEXT NOT NULL DEFAULT (datetime('now'))
    );

    CREATE TABLE IF NOT EXISTS email_verification_tokens (
      token TEXT PRIMARY KEY,
      user_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
      expires_at TEXT NOT NULL,
      created_at TEXT NOT NULL DEFAULT (datetime('now'))
    );
  `);

  migrateUsersStripeColumns();
  migrateUsersAdminColumns();
  migrateConversationsV2();
  migrateDocumentIntelligence();
  migrateUsersBillingColumns();
  migrateUserLocationColumns();
  migrateSourceCache();
  seedDefaultSiteConfig();
}

function migrateSourceCache() {
  db.exec(`
    CREATE TABLE IF NOT EXISTS source_cache (
      query_hash TEXT NOT NULL,
      provider TEXT NOT NULL,
      query_text TEXT NOT NULL,
      results_json TEXT NOT NULL,
      expires_at TEXT NOT NULL,
      created_at TEXT NOT NULL DEFAULT (datetime('now')),
      PRIMARY KEY (query_hash, provider)
    );
    CREATE INDEX IF NOT EXISTS idx_source_cache_expires ON source_cache(expires_at);
  `);
}

function migrateConversationsV2() {
  const cols = db.prepare("PRAGMA table_info(conversations)").all() as { name: string }[];
  const names = new Set(cols.map((c) => c.name));
  if (!names.has("archived")) {
    db.exec("ALTER TABLE conversations ADD COLUMN archived INTEGER NOT NULL DEFAULT 0");
  }
  if (!names.has("project_id")) {
    db.exec("ALTER TABLE conversations ADD COLUMN project_id TEXT REFERENCES projects(id) ON DELETE SET NULL");
  }
}

function migrateDocumentIntelligence() {
  const fileCols = db.prepare("PRAGMA table_info(project_files)").all() as { name: string }[];
  const fileNames = new Set(fileCols.map((c) => c.name));
  if (!fileNames.has("extracted_text")) {
    db.exec("ALTER TABLE project_files ADD COLUMN extracted_text TEXT");
  }
  if (!fileNames.has("index_status")) {
    db.exec("ALTER TABLE project_files ADD COLUMN index_status TEXT NOT NULL DEFAULT 'ready'");
  }
  if (!fileNames.has("index_error")) {
    db.exec("ALTER TABLE project_files ADD COLUMN index_error TEXT");
  }
  db.exec(`
    CREATE TABLE IF NOT EXISTS document_chunks (
      id TEXT PRIMARY KEY,
      file_id TEXT NOT NULL REFERENCES project_files(id) ON DELETE CASCADE,
      project_id TEXT NOT NULL REFERENCES projects(id) ON DELETE CASCADE,
      chunk_index INTEGER NOT NULL,
      content TEXT NOT NULL
    );
    CREATE INDEX IF NOT EXISTS idx_document_chunks_project ON document_chunks(project_id);
    CREATE INDEX IF NOT EXISTS idx_document_chunks_file ON document_chunks(file_id);

    CREATE TABLE IF NOT EXISTS file_index_jobs (
      id TEXT PRIMARY KEY,
      file_id TEXT NOT NULL REFERENCES project_files(id) ON DELETE CASCADE,
      project_id TEXT NOT NULL REFERENCES projects(id) ON DELETE CASCADE,
      filename TEXT NOT NULL,
      mime_type TEXT,
      content_base64 TEXT NOT NULL,
      status TEXT NOT NULL DEFAULT 'pending',
      error TEXT,
      chunk_count INTEGER,
      created_at TEXT NOT NULL DEFAULT (datetime('now')),
      updated_at TEXT NOT NULL DEFAULT (datetime('now'))
    );
    CREATE INDEX IF NOT EXISTS idx_file_index_jobs_status ON file_index_jobs(status);
  `);
}

function migrateUsersBillingColumns() {
  const cols = db.prepare("PRAGMA table_info(users)").all() as { name: string }[];
  const names = new Set(cols.map((c) => c.name));
  if (!names.has("billing_status")) {
    db.exec("ALTER TABLE users ADD COLUMN billing_status TEXT NOT NULL DEFAULT 'active'");
  }
}

function migrateUserLocationColumns() {
  const cols = db.prepare("PRAGMA table_info(user_preferences)").all() as { name: string }[];
  const names = new Set(cols.map((c) => c.name));
  if (!names.has("home_city")) db.exec("ALTER TABLE user_preferences ADD COLUMN home_city TEXT");
  if (!names.has("home_region")) db.exec("ALTER TABLE user_preferences ADD COLUMN home_region TEXT");
  if (!names.has("home_country")) db.exec("ALTER TABLE user_preferences ADD COLUMN home_country TEXT");
  if (!names.has("home_lat")) db.exec("ALTER TABLE user_preferences ADD COLUMN home_lat REAL");
  if (!names.has("home_lon")) db.exec("ALTER TABLE user_preferences ADD COLUMN home_lon REAL");
  if (!names.has("home_timezone")) db.exec("ALTER TABLE user_preferences ADD COLUMN home_timezone TEXT");
  if (!names.has("location_source")) db.exec("ALTER TABLE user_preferences ADD COLUMN location_source TEXT");
  if (!names.has("location_updated_at")) db.exec("ALTER TABLE user_preferences ADD COLUMN location_updated_at TEXT");
  if (!names.has("tts_voice")) db.exec("ALTER TABLE user_preferences ADD COLUMN tts_voice TEXT NOT NULL DEFAULT 'nova'");
}

function migrateUsersAdminColumns() {
  const cols = db.prepare("PRAGMA table_info(users)").all() as { name: string }[];
  const names = new Set(cols.map((c) => c.name));
  if (!names.has("role")) db.exec("ALTER TABLE users ADD COLUMN role TEXT NOT NULL DEFAULT 'user'");
  if (!names.has("suspended")) db.exec("ALTER TABLE users ADD COLUMN suspended INTEGER NOT NULL DEFAULT 0");
  if (!names.has("totp_secret")) db.exec("ALTER TABLE users ADD COLUMN totp_secret TEXT");
  if (!names.has("totp_enabled")) db.exec("ALTER TABLE users ADD COLUMN totp_enabled INTEGER NOT NULL DEFAULT 0");

  db.exec(`
    CREATE TABLE IF NOT EXISTS site_config (
      key TEXT PRIMARY KEY,
      value TEXT NOT NULL,
      updated_by TEXT,
      updated_at TEXT NOT NULL DEFAULT (datetime('now'))
    );
    CREATE TABLE IF NOT EXISTS admin_audit_logs (
      id TEXT PRIMARY KEY,
      admin_user_id TEXT NOT NULL,
      action TEXT NOT NULL,
      target TEXT NOT NULL,
      details TEXT,
      ip_address TEXT,
      created_at TEXT NOT NULL DEFAULT (datetime('now'))
    );
    CREATE TABLE IF NOT EXISTS system_errors (
      id TEXT PRIMARY KEY,
      source TEXT NOT NULL,
      message TEXT NOT NULL,
      details TEXT,
      created_at TEXT NOT NULL DEFAULT (datetime('now'))
    );
    CREATE TABLE IF NOT EXISTS support_requests (
      id TEXT PRIMARY KEY,
      user_id TEXT,
      email TEXT,
      subject TEXT NOT NULL,
      body TEXT NOT NULL,
      status TEXT NOT NULL DEFAULT 'open',
      created_at TEXT NOT NULL DEFAULT (datetime('now')),
      updated_at TEXT NOT NULL DEFAULT (datetime('now'))
    );
    CREATE TABLE IF NOT EXISTS privacy_requests (
      id TEXT PRIMARY KEY,
      user_id TEXT,
      email TEXT NOT NULL,
      request_type TEXT NOT NULL,
      status TEXT NOT NULL DEFAULT 'pending',
      created_at TEXT NOT NULL DEFAULT (datetime('now')),
      updated_at TEXT NOT NULL DEFAULT (datetime('now'))
    );
  `);
}

function seedDefaultSiteConfig() {
  const row = db.prepare("SELECT key FROM site_config LIMIT 1").get();
  if (row) return;
  const defaults = {
    pricing: { proMonthlyGbp: 9, enterpriseMonthlyGbp: 29 },
    maintenance: { enabled: false, message: "" },
    announcement: { active: false, message: "" },
  };
  for (const [key, value] of Object.entries(defaults)) {
    db.prepare("INSERT INTO site_config (key, value) VALUES (?, ?)").run(key, JSON.stringify(value));
  }
}

function migrateUsersStripeColumns() {
  const cols = db.prepare("PRAGMA table_info(users)").all() as { name: string }[];
  const names = new Set(cols.map((c) => c.name));
  if (!names.has("stripe_customer_id")) {
    db.exec("ALTER TABLE users ADD COLUMN stripe_customer_id TEXT");
  }
  if (!names.has("stripe_subscription_id")) {
    db.exec("ALTER TABLE users ADD COLUMN stripe_subscription_id TEXT");
  }
}
