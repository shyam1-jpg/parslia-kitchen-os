import { v4 as uuid } from "uuid";
import { db } from "../db/schema.js";
import {
  cosineSimilarity,
  deserializeEmbedding,
  embedTexts,
  embeddingsAvailable,
  serializeEmbedding,
} from "./embeddings.js";

export interface DocumentChunk {
  id: string;
  fileId: string;
  projectId: string;
  chunkIndex: number;
  content: string;
}

export interface DocumentSource {
  index: number;
  fileId?: string;
  filename: string;
  excerpt: string;
  url?: string;
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

/** Index chunks and attach embeddings when OPENAI_API_KEY is present. */
export async function indexFileChunks(fileId: string, projectId: string, text: string): Promise<number> {
  db.prepare("DELETE FROM document_chunks WHERE file_id = ?").run(fileId);
  const chunks = chunkText(text);
  if (!chunks.length) return 0;

  const vectors = embeddingsAvailable() ? await embedTexts(chunks) : chunks.map(() => null);
  const insert = db.prepare(
    "INSERT INTO document_chunks (id, file_id, project_id, chunk_index, content, embedding) VALUES (?, ?, ?, ?, ?, ?)"
  );
  chunks.forEach((content, chunkIndex) => {
    const vec = vectors[chunkIndex];
    insert.run(uuid(), fileId, projectId, chunkIndex, content, vec ? serializeEmbedding(vec) : null);
  });
  return chunks.length;
}

function scoreChunkKeyword(content: string, terms: string[]): number {
  const lower = content.toLowerCase();
  let score = 0;
  for (const term of terms) {
    if (term.length < 2) continue;
    const matches = lower.split(term).length - 1;
    score += matches * term.length;
  }
  return score;
}

export async function searchProjectChunks(
  projectId: string,
  query: string,
  limit = 5
): Promise<Array<DocumentChunk & { filename: string; score: number }>> {
  const terms = query
    .toLowerCase()
    .split(/\W+/)
    .filter((t) => t.length > 2)
    .slice(0, 12);

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
    embedding: string | null;
    filename: string;
  }>;

  if (!rows.length) return [];

  let queryVec: number[] | null = null;
  if (embeddingsAvailable() && query.trim()) {
    const [vec] = await embedTexts([query]);
    queryVec = vec;
  }

  const scored = rows.map((r) => {
    const keyword = terms.length ? scoreChunkKeyword(r.content, terms) : 0;
    const emb = deserializeEmbedding(r.embedding);
    const semantic = queryVec && emb ? cosineSimilarity(queryVec, emb) : 0;
    // Hybrid: blend semantic (0–1 → ~0–100) with keyword term score
    const score = semantic * 100 + keyword;
    return {
      id: r.id,
      fileId: r.file_id,
      projectId: r.project_id,
      chunkIndex: r.chunk_index,
      content: r.content,
      filename: r.filename,
      score,
    };
  });

  return scored
    .filter((r) => r.score > 0)
    .sort((a, b) => b.score - a.score)
    .slice(0, limit);
}

export async function buildDocumentContext(
  projectId: string,
  query: string
): Promise<{ context: string; sources: DocumentSource[] }> {
  const hits = await searchProjectChunks(projectId, query, 6);
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
