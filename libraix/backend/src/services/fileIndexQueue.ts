import { v4 as uuid } from "uuid";
import { db } from "../db/schema.js";
import { parseDocument } from "./documents.js";
import { indexFileChunks } from "./documentSearch.js";

export type IndexJobStatus = "pending" | "processing" | "done" | "failed";

let processing = false;

export function enqueueFileIndex(
  fileId: string,
  projectId: string,
  filename: string,
  mimeType: string,
  contentBase64: string
): string {
  const id = uuid();
  db.prepare(
    `INSERT INTO file_index_jobs (id, file_id, project_id, filename, mime_type, content_base64, status)
     VALUES (?, ?, ?, ?, ?, ?, 'pending')`
  ).run(id, fileId, projectId, filename, mimeType, contentBase64);
  scheduleQueueDrain();
  return id;
}

export function getFileIndexStatus(fileId: string) {
  const row = db
    .prepare(
      `SELECT status, error, updated_at FROM file_index_jobs WHERE file_id = ? ORDER BY created_at DESC LIMIT 1`
    )
    .get(fileId) as { status: string; error: string | null; updated_at: string } | undefined;
  return row ?? null;
}

function scheduleQueueDrain() {
  if (processing) return;
  setImmediate(() => {
    drainQueue().catch((e) => console.error("file index queue error:", e));
  });
}

async function drainQueue() {
  if (processing) return;
  processing = true;
  try {
    while (true) {
      const job = db
        .prepare(
          `SELECT * FROM file_index_jobs WHERE status = 'pending' ORDER BY created_at ASC LIMIT 1`
        )
        .get() as
        | {
            id: string;
            file_id: string;
            project_id: string;
            filename: string;
            mime_type: string;
            content_base64: string;
          }
        | undefined;

      if (!job) break;

      db.prepare(
        `UPDATE file_index_jobs SET status = 'processing', updated_at = datetime('now') WHERE id = ?`
      ).run(job.id);
      db.prepare(`UPDATE project_files SET index_status = 'indexing' WHERE id = ?`).run(job.file_id);

      try {
        const parsed = await parseDocument(job.filename, job.mime_type, job.content_base64);
        db.prepare(`UPDATE project_files SET extracted_text = ?, index_status = 'ready' WHERE id = ?`).run(
          parsed.text,
          job.file_id
        );
        const chunkCount = await indexFileChunks(job.file_id, job.project_id, parsed.text);
        db.prepare(
          `UPDATE file_index_jobs SET status = 'done', chunk_count = ?, updated_at = datetime('now') WHERE id = ?`
        ).run(chunkCount, job.id);
        db.prepare(`UPDATE projects SET updated_at = datetime('now') WHERE id = ?`).run(job.project_id);
      } catch (e) {
        const msg = e instanceof Error ? e.message : "INDEX_FAILED";
        db.prepare(
          `UPDATE file_index_jobs SET status = 'failed', error = ?, updated_at = datetime('now') WHERE id = ?`
        ).run(msg.slice(0, 200), job.id);
        db.prepare(`UPDATE project_files SET index_status = 'failed', index_error = ? WHERE id = ?`).run(
          msg.slice(0, 200),
          job.file_id
        );
      }

      // Yield event loop between jobs
      await new Promise((r) => setImmediate(r));
    }
  } finally {
    processing = false;
    const pending = db.prepare(`SELECT 1 FROM file_index_jobs WHERE status = 'pending' LIMIT 1`).get();
    if (pending) scheduleQueueDrain();
  }
}

/** Resume any pending jobs after server restart. */
export function resumeFileIndexQueue() {
  const stuck = db
    .prepare(`UPDATE file_index_jobs SET status = 'pending' WHERE status = 'processing'`)
    .run();
  if (stuck.changes > 0) console.log(`Reset ${stuck.changes} stuck file index job(s)`);
  scheduleQueueDrain();
}
