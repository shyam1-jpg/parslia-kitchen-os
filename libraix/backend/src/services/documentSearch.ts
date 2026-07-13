import { v4 as uuid } from "uuid";
import { db } from "../db/schema.js";

export interface DocumentChunk {
  id: string;
  fileId: string;
  projectId: string;
  chunkIndex: number;
  content: string;
}

export interface DocumentSource {
  index: number;
  fileId: string;
  filename: string;
  excerpt: string;
}

const CHUNK_SIZE = 1500;
const CHUNK_OVERLAP = 200;

export function chunkText(text: string): string[] {
  const normalized = text.replace(/\r\n/g, "\n").trim();
  if (!normalized) return [];
  const chunks: string[] = [];
  let start = 0;
  while (start < normalized.length) {
    const end = Math.min(start + CHUNK_SIZE, normalized.length);
    chunks.push(normalized.slice(start, end));
    if (end >= normalized.length) break;
    start = Math.max(0, end - CHUNK_OVERLAP);
  }
  return chunks;
}

export function indexFileChunks(fileId: string, projectId: string, text: string): number {
  db.prepare("DELETE FROM document_chunks WHERE file_id = ?").run(fileId);
  const chunks = chunkText(text);
  const insert = db.prepare(
    "INSERT INTO document_chunks (id, file_id, project_id, chunk_index, content) VALUES (?, ?, ?, ?, ?)"
  );
  chunks.forEach((content, chunkIndex) => {
    insert.run(uuid(), fileId, projectId, chunkIndex, content);
  });
  return chunks.length;
}

function scoreChunk(content: string, terms: string[]): number {
  const lower = content.toLowerCase();
  let score = 0;
  for (const term of terms) {
    if (term.length < 2) continue;
    const matches = lower.split(term).length - 1;
    score += matches * term.length;
  }
  return score;
}

export function searchProjectChunks(
  projectId: string,
  query: string,
  limit = 5
): Array<DocumentChunk & { filename: string; score: number }> {
  const terms = query
    .toLowerCase()
    .split(/\W+/)
    .filter((t) => t.length > 2)
    .slice(0, 12);
  if (!terms.length) return [];

  const rows = db
    .prepare(
      `SELECT c.*, f.filename FROM document_chunks c
       JOIN project_files f ON f.id = c.file_id
       WHERE c.project_id = ?`
    )
    .all(projectId) as Array<{
    id: string;
    file_id: string;
    project_id: string;
    chunk_index: number;
    content: string;
    filename: string;
  }>;

  return rows
    .map((r) => ({
      id: r.id,
      fileId: r.file_id,
      projectId: r.project_id,
      chunkIndex: r.chunk_index,
      content: r.content,
      filename: r.filename,
      score: scoreChunk(r.content, terms),
    }))
    .filter((r) => r.score > 0)
    .sort((a, b) => b.score - a.score)
    .slice(0, limit);
}

export function buildDocumentContext(
  projectId: string,
  query: string
): { context: string; sources: DocumentSource[] } {
  const hits = searchProjectChunks(projectId, query, 6);
  if (!hits.length) return { context: "", sources: [] };

  const sources: DocumentSource[] = hits.map((h, i) => ({
    index: i + 1,
    fileId: h.fileId,
    filename: h.filename,
    excerpt: h.content.slice(0, 280).replace(/\n/g, " "),
  }));

  const context =
    "Relevant excerpts from project files (cite as [1], [2], etc. when used):\n\n" +
    hits.map((h, i) => `[${i + 1}] ${h.filename}:\n${h.content}`).join("\n\n");

  return { context, sources };
}

export function deleteFileChunks(fileId: string): void {
  db.prepare("DELETE FROM document_chunks WHERE file_id = ?").run(fileId);
}
