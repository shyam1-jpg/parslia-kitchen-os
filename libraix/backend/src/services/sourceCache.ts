import { createHash } from "node:crypto";
import { db } from "../db/schema.js";
import type { SearchResult } from "./webSearch.js";

const DEFAULT_TTL_SEC = 6 * 60 * 60; // 6 hours
const WIKI_TTL_SEC = 24 * 60 * 60;

export function normalizeSourceQuery(query: string): string {
  return query.toLowerCase().replace(/\s+/g, " ").trim().slice(0, 500);
}

export function hashSourceQuery(query: string): string {
  return createHash("sha256").update(normalizeSourceQuery(query)).digest("hex");
}

export function ensureSourceCacheTable() {
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

export function getCachedSources(query: string, provider: string): SearchResult[] | null {
  ensureSourceCacheTable();
  const hash = hashSourceQuery(query);
  const row = db
    .prepare(
      `SELECT results_json FROM source_cache
       WHERE query_hash = ? AND provider = ? AND expires_at > datetime('now')`
    )
    .get(hash, provider) as { results_json: string } | undefined;
  if (!row) return null;
  try {
    const parsed = JSON.parse(row.results_json) as SearchResult[];
    return Array.isArray(parsed) ? parsed : null;
  } catch {
    return null;
  }
}

export function setCachedSources(
  query: string,
  provider: string,
  results: SearchResult[],
  ttlSec = DEFAULT_TTL_SEC
): void {
  ensureSourceCacheTable();
  const hash = hashSourceQuery(query);
  const expiresAt = new Date(Date.now() + ttlSec * 1000).toISOString();
  db.prepare(
    `INSERT INTO source_cache (query_hash, provider, query_text, results_json, expires_at)
     VALUES (?, ?, ?, ?, ?)
     ON CONFLICT(query_hash, provider) DO UPDATE SET
       results_json = excluded.results_json,
       query_text = excluded.query_text,
       expires_at = excluded.expires_at,
       created_at = datetime('now')`
  ).run(hash, provider, normalizeSourceQuery(query), JSON.stringify(results), expiresAt);
}

export function wikiCacheTtlSec() {
  return WIKI_TTL_SEC;
}

/** Drop expired rows opportunistically (cheap housekeeping). */
export function pruneExpiredSourceCache(): number {
  ensureSourceCacheTable();
  return db.prepare(`DELETE FROM source_cache WHERE expires_at <= datetime('now')`).run().changes;
}
