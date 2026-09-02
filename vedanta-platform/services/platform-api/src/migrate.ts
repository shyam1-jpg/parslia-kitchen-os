/**
 * Apply every migration, seed and import file once (recorded in schema_applied).
 * Understands ordinary SQL and pg_dump COPY ... FROM stdin blocks so the sheet
 * import loads on Render without a psql binary.
 */
import { readdirSync, readFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import pg from "pg";
import { clientConfig } from "./db.ts";

const here = dirname(fileURLToPath(import.meta.url));

function resolveDbDir(): string {
  const candidates = [
    process.env.VEDANTA_DB_DIR,
    join(here, "../../../db"),
    join(here, "../../../../vedanta-platform/db"),
    join(process.cwd(), "db"),
    join(process.cwd(), "vedanta-platform/db"),
  ].filter((p): p is string => !!p);
  for (const dir of candidates) {
    try { if (readdirSync(join(dir, "migrations")).some(f => f.endsWith(".sql"))) return dir; } catch { /* try next */ }
  }
  return candidates[1]!;
}

const dbDir = resolveDbDir();

function log(msg: string) {
  console.log(`[migrate] ${msg}`);
}

function sleep(ms: number) {
  return new Promise(r => setTimeout(r, ms));
}

async function connect(): Promise<pg.Client> {
  const cfg = clientConfig();
  let last: unknown;
  for (let i = 1; i <= 30; i++) {
    const c = new pg.Client(cfg);
    try {
      await c.connect();
      return c;
    } catch (e) {
      last = e;
      await c.end().catch(() => {});
      log(`waiting for database (attempt ${i}/30)`);
      await sleep(2000);
    }
  }
  throw last;
}

/** Decode one PostgreSQL COPY text-format field. */
export function decodeCopyField(raw: string): string | null {
  if (raw === "\\N") return null;
  let out = "";
  for (let i = 0; i < raw.length; i++) {
    const ch = raw[i];
    if (ch !== "\\") { out += ch; continue; }
    const n = raw[++i];
    if (n === undefined) { out += "\\"; break; }
    if (n === "N") { out += "N"; continue; } // shouldn't happen except mid-field
    if (n === "b") { out += "\b"; continue; }
    if (n === "f") { out += "\f"; continue; }
    if (n === "n") { out += "\n"; continue; }
    if (n === "r") { out += "\r"; continue; }
    if (n === "t") { out += "\t"; continue; }
    if (n === "v") { out += "\v"; continue; }
    if (n === "\\" || n === "'") { out += n; continue; }
    if (n >= "0" && n <= "7") {
      let oct = n;
      for (let k = 0; k < 2 && i + 1 < raw.length && raw[i + 1] >= "0" && raw[i + 1] <= "7"; k++) oct += raw[++i];
      out += String.fromCharCode(parseInt(oct, 8));
      continue;
    }
    if (n === "x" && i + 2 < raw.length) { out += String.fromCharCode(parseInt(raw.slice(i + 1, i + 3), 16)); i += 2; continue; }
    out += n;
  }
  return out;
}

export function stripPsqlMeta(sql: string): string {
  return sql
    .replace(/^\\restrict\s+\S+\s*$/gm, "")
    .replace(/^\\unrestrict\s+\S+\s*$/gm, "")
    .replace(/^\\connect\s+.*$/gm, "")
    .replace(/^SET\s+search_path\b.*$/gmi, "")
    .replace(/SELECT\s+pg_catalog\.set_config\('search_path',\s*'',\s*false\);/gi, "");
}

const COPY_HEAD = /COPY\s+([.\w]+)\s*(\([^)]+\))?\s+FROM\s+stdin;?[ \t]*\n/i;

async function applyCopy(client: pg.Client, table: string, cols: string, body: string) {
  const rows = body.split("\n").filter(line => line.length > 0 && line !== "\\.");
  if (!rows.length) return;
  const colList = cols.replace(/^\(|\)$/g, "").split(",").map(s => s.trim()).filter(Boolean);
  const parsed = rows.map(line => {
    const fields = line.split("\t").map(decodeCopyField);
    if (fields.length < colList.length) while (fields.length < colList.length) fields.push(null);
    else if (fields.length > colList.length) fields.length = colList.length;
    return fields;
  });
  const occupancy = /\broom_occupancy\b/i.test(table);
  const tmp = `_copy_${table.replace(/\W/g, "_")}_${Date.now()}`;
  await client.query(`CREATE TEMP TABLE ${tmp} (${colList.map(c => `${c} text`).join(", ")})`);
  const batch = 300;
  for (let i = 0; i < parsed.length; i += batch) {
    const chunk = parsed.slice(i, i + batch);
    const values: unknown[] = [];
    const tuples = chunk.map((fields, ri) =>
      `(${fields.map((_, ci) => `$${ri * colList.length + ci + 1}`).join(", ")})`);
    chunk.forEach(f => values.push(...f));
    await client.query(`INSERT INTO ${tmp} (${colList.join(", ")}) VALUES ${tuples.join(",")}`, values);
  }
  const bare = table.includes(".") ? table.split(".")[1] : table;
  const types = await client.query<{ attname: string; typ: string }>(`
    SELECT a.attname, format_type(a.atttypid, a.atttypmod) AS typ
    FROM pg_attribute a
    JOIN pg_class c ON c.oid = a.attrelid
    JOIN pg_namespace n ON n.oid = c.relnamespace
    WHERE c.relname = $1 AND n.nspname IN ('public', 'pg_temp') AND a.attnum > 0 AND NOT a.attisdropped
  `, [bare]);
  const typeMap = Object.fromEntries(types.rows.map(r => [r.attname, r.typ]));
  const fks = await client.query<{ col: string; ref_table: string; ref_col: string }>(`
    SELECT kcu.column_name AS col, ccu.table_name AS ref_table, ccu.column_name AS ref_col
    FROM information_schema.table_constraints tc
    JOIN information_schema.key_column_usage kcu
      ON tc.constraint_name = kcu.constraint_name AND tc.table_schema = kcu.table_schema
    JOIN information_schema.constraint_column_usage ccu
      ON ccu.constraint_name = tc.constraint_name AND ccu.table_schema = tc.table_schema
    WHERE tc.constraint_type = 'FOREIGN KEY' AND tc.table_name = $1
  `, [bare]);
  for (const fk of fks.rows) {
    if (!colList.includes(fk.col)) continue;
    await client.query(
      `UPDATE ${tmp} SET ${fk.col} = NULL WHERE ${fk.col} IS NOT NULL
       AND NOT EXISTS (SELECT 1 FROM ${fk.ref_table} r WHERE r.${fk.ref_col}::text = ${tmp}.${fk.col})`);
  }
  const selectList = colList.map(c => {
    const typ = typeMap[c];
    return typ ? `${tmp}.${c}::${typ}` : `${tmp}.${c}`;
  }).join(", ");
  const where = occupancy
    ? `WHERE EXISTS (SELECT 1 FROM room r WHERE r.id = ${tmp}.room_id::uuid)
       AND (${tmp}.group_id IS NULL OR EXISTS (SELECT 1 FROM booking_group g WHERE g.id = ${tmp}.group_id::uuid))
       AND (${tmp}.person_id IS NULL OR EXISTS (SELECT 1 FROM person p WHERE p.id = ${tmp}.person_id::uuid))`
    : "";
  const result = await client.query(
    `INSERT INTO ${table} (${colList.join(", ")}) SELECT ${selectList} FROM ${tmp} ${where} ON CONFLICT DO NOTHING`);
  await client.query(`DROP TABLE ${tmp}`);
  if (occupancy) log(`${table}: inserted ${result.rowCount ?? 0} of ${rows.length} occupancy rows`);
}

export function* copyBlocks(raw: string): Generator<{ table: string; cols: string; body: string }> {
  let sql = stripPsqlMeta(raw);
  const COPY_HEAD = /COPY\s+([.\w]+)\s*(\([^)]+\))?\s+FROM\s+stdin;?[ \t]*\n/i;
  while (sql.length) {
    const m = COPY_HEAD.exec(sql);
    if (!m || m.index === undefined) break;
    const afterHead = sql.slice(m.index + m[0].length);
    let body: string;
    let consumed: number;
    if (afterHead.startsWith("\\.")) { body = ""; consumed = 2; }
    else {
      const end = afterHead.indexOf("\n\\.");
      if (end < 0) break;
      body = afterHead.slice(0, end);
      consumed = end + 3;
    }
    yield { table: m[1], cols: m[2] ?? "", body };
    sql = afterHead.slice(consumed);
  }
}

async function pinRoomsToOccupancyDump(client: pg.Client) {
  let body = "";
  for (const path of listSql("import")) {
    for (const block of copyBlocks(readFileSync(path, "utf8"))) {
      if (/\broom_occupancy\b/i.test(block.table) && block.body) body = block.body;
    }
  }
  if (!body) return;
  const order: string[] = [];
  const seen = new Set<string>();
  for (const line of body.split("\n")) {
    if (!line || line === "\\.") continue;
    const id = line.split("\t")[2];
    if (id && id !== "\\N" && !seen.has(id)) { seen.add(id); order.push(id); }
  }
  const rooms = (await client.query(`
    SELECT id, number FROM room
    ORDER BY (number ~ '^[0-9]'),
      CASE WHEN number ~ '^[0-9]+$' THEN number::int ELSE substring(number FROM 2)::int END
  `)).rows;
  if (rooms.length !== order.length) {
    log(`room id pin skipped (${rooms.length} seed rooms, ${order.length} dump ids)`);
    return;
  }
  if (rooms.every((r, i) => r.id === order[i])) return;
  await client.query("BEGIN");
  try {
    for (let i = 0; i < rooms.length; i++) {
      await client.query(`UPDATE room SET id = $1 WHERE id = $2`, [order[i], rooms[i].id]);
    }
    await client.query("COMMIT");
    log(`pinned ${order.length} room ids so the sheet placements land on the board`);
  } catch (e) {
    await client.query("ROLLBACK");
    throw e;
  }
}

async function applySql(client: pg.Client, raw: string, file: string) {
  let sql = stripPsqlMeta(raw);
  let guard = 0;
  while (sql.length) {
    if (++guard > 10_000) throw new Error(`Parser loop in ${file}`);
    const m = COPY_HEAD.exec(sql);
    if (!m || m.index === undefined) {
      const rest = sql.trim();
      const actionable = rest.split("\n").some(l => l.trim() && !l.trim().startsWith("--"));
      if (actionable) await client.query(rest);
      break;
    }
    const before = sql.slice(0, m.index).trim();
    if (before) await client.query(before);
    await client.query("SET search_path TO public");
    const afterHead = sql.slice(m.index + m[0].length);
    // Empty tables are "COPY ... FROM stdin;\n\\." — no newline before the terminator.
    let body: string;
    let consumed: number;
    if (afterHead.startsWith("\\.")) {
      body = "";
      consumed = 2;
    } else {
      const end = afterHead.indexOf("\n\\.");
      if (end < 0) throw new Error(`Unterminated COPY in ${file}`);
      body = afterHead.slice(0, end);
      consumed = end + 3;
    }
    await applyCopy(client, m[1], m[2] ?? "", body);
    sql = afterHead.slice(consumed).replace(/^\n/, "");
  }
  await client.query("SET search_path TO public");
}

function listSql(subdir: string): string[] {
  const dir = join(dbDir, subdir);
  try {
    return readdirSync(dir).filter(f => f.endsWith(".sql")).sort().map(f => join(dir, f));
  } catch {
    return [];
  }
}

const STAFF_ADMINS: { email: string; name: string }[] = [
  { email: "dan@thevedanta.org", name: "Dan" },
  { email: "shannon@thevedanta.org", name: "Shannon" },
  { email: "losi@thevedanta.org", name: "Losi" },
  { email: "gram@thevedanta.org", name: "Gram" },
];

async function ensureAdmin(client: pg.Client, email: string, name: string) {
  const addr = email.trim().toLowerCase();
  if (!addr.includes("@")) return;
  log(`ensuring system owner ${addr}`);
  await client.query(`
    INSERT INTO app_user (tenant_id, email, display_name, status)
    SELECT t.id, $1, $2, 'ACTIVE' FROM tenant t LIMIT 1
    ON CONFLICT (tenant_id, email) DO UPDATE SET display_name = EXCLUDED.display_name, status = 'ACTIVE'
  `, [addr, name.trim() || addr.split("@")[0]]);
  await client.query(`
    INSERT INTO membership (tenant_id, user_id, property_id, role_id, department_id)
    SELECT t.id, u.id, p.id, r.id, d.id
    FROM tenant t
    JOIN app_user u ON u.tenant_id = t.id AND lower(u.email) = $1
    JOIN property p ON p.tenant_id = t.id
    JOIN role r ON r.tenant_id = t.id AND r.code = 'SYSTEM_OWNER'
    LEFT JOIN department d ON d.property_id = p.id AND d.code = 'MGMT'
    WHERE NOT EXISTS (
      SELECT 1 FROM membership m WHERE m.user_id = u.id AND m.property_id = p.id AND m.role_id = r.id
    )
  `, [addr]);
}

async function bootstrapOwner(client: pg.Client) {
  for (const a of STAFF_ADMINS) await ensureAdmin(client, a.email, a.name);
  const extra = (process.env.BOOTSTRAP_OWNER_EMAIL ?? "").trim().toLowerCase();
  if (extra) await ensureAdmin(client, extra, process.env.BOOTSTRAP_OWNER_NAME?.trim() || extra.split("@")[0]);
  const more = (process.env.BOOTSTRAP_ADMIN_EMAILS ?? "").split(",").map(s => s.trim()).filter(Boolean);
  for (const email of more) await ensureAdmin(client, email, email.split("@")[0]);
}

export async function migrate(): Promise<void> {
  const files = [...listSql("migrations"), ...listSql("seed"), ...listSql("import")];
  if (!files.length) throw new Error(`No SQL files under ${dbDir}`);
  const client = await connect();
  try {
    await client.query(`SET search_path TO public`);
    await client.query(`CREATE TABLE IF NOT EXISTS public.schema_applied (file text PRIMARY KEY, at timestamptz DEFAULT now())`);
    for (const path of files) {
      const name = path.split("/").pop()!;
      if (path.includes("/import/")) await pinRoomsToOccupancyDump(client);
      const done = await client.query(`SELECT 1 FROM schema_applied WHERE file = $1`, [name]);
      if (done.rowCount) { log(`skip ${name} (already applied)`); continue; }
      log(`applying ${name}`);
      const sql = readFileSync(path, "utf8");
      await applySql(client, sql, name);
      await client.query(`INSERT INTO schema_applied (file) VALUES ($1)`, [name]);
      log(`${name} ok`);
    }
    await pinRoomsToOccupancyDump(client);
    const occ = (await client.query(`SELECT count(*)::int AS n FROM room_occupancy`)).rows[0]?.n ?? 0;
    if (occ === 0) {
      log("occupancy empty — reloading placements after room id pin");
      for (const path of listSql("import")) {
        for (const block of copyBlocks(readFileSync(path, "utf8"))) {
          if (/\broom_occupancy\b/i.test(block.table) && block.body) {
            await applyCopy(client, block.table, block.cols, block.body);
          }
        }
      }
    }
    await bootstrapOwner(client);
    log("done");
  } finally {
    await client.end();
  }
}

const launchedDirectly = process.argv[1] && fileURLToPath(import.meta.url) === process.argv[1];
if (launchedDirectly) {
  migrate().catch(err => {
    console.error("[migrate] failed:", err);
    process.exit(1);
  });
}
