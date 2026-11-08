import pg from "pg";

const connectionString = process.env.DATABASE_URL ?? "postgres://vedanta:vedanta@localhost:5432/vedanta";

/** Render (and most hosted Postgres) require TLS. Local Docker does not. */
export function sslFor(url: string): pg.ClientConfig["ssl"] {
  const lower = url.toLowerCase();
  const force = process.env.PGSSL === "1" || process.env.PGSSLMODE === "require";
  const hosted = /render\.com|neon\.tech|amazonaws\.com|sslmode=require/.test(lower);
  if (force || hosted) return { rejectUnauthorized: false };
  return undefined;
}

export function clientConfig(url = connectionString): pg.ClientConfig {
  return { connectionString: url, ssl: sslFor(url) };
}

export const pool = new pg.Pool({ ...clientConfig(), max: 10 });
export type Q = pg.PoolClient;
export async function tx<T>(fn: (c: Q) => Promise<T>): Promise<T> {
  const c = await pool.connect();
  try { await c.query("BEGIN"); const r = await fn(c); await c.query("COMMIT"); return r; }
  catch (e) { await c.query("ROLLBACK"); throw e; } finally { c.release(); }
}
