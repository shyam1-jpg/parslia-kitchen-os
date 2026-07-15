import { v4 as uuid } from "uuid";
import { db } from "../db/schema.js";
import { parseDocument } from "./documents.js";
import { enqueueFileIndex } from "./fileIndexQueue.js";
import { buildDocumentContext, indexFileChunks, type DocumentSource } from "./documentSearch.js";

export interface Project {
  id: string;
  name: string;
  description: string | null;
  instructions: string | null;
  fileCount: number;
  createdAt: string;
  updatedAt: string;
}

export interface ProjectFile {
  id: string;
  filename: string;
  mimeType: string | null;
  sizeBytes: number;
  chunkCount?: number;
  indexStatus?: string;
  indexError?: string | null;
  createdAt: string;
}

export function listProjects(userId: string): Project[] {
  const rows = db.prepare(`
    SELECT p.*, COUNT(f.id) as file_count
    FROM projects p
    LEFT JOIN project_files f ON f.project_id = p.id
    WHERE p.user_id = ?
    GROUP BY p.id
    ORDER BY p.updated_at DESC
  `).all(userId) as Array<Record<string, unknown>>;

  return rows.map((r) => ({
    id: r.id as string,
    name: r.name as string,
    description: (r.description as string) ?? null,
    instructions: (r.instructions as string) ?? null,
    fileCount: Number(r.file_count),
    createdAt: r.created_at as string,
    updatedAt: r.updated_at as string,
  }));
}

export function createProject(userId: string, name: string, description?: string, instructions?: string): Project {
  const id = uuid();
  db.prepare("INSERT INTO projects (id, user_id, name, description, instructions) VALUES (?, ?, ?, ?, ?)")
    .run(id, userId, name, description ?? null, instructions ?? null);
  return listProjects(userId).find((p) => p.id === id)!;
}

export function getProject(userId: string, projectId: string): Project | undefined {
  return listProjects(userId).find((p) => p.id === projectId);
}

export function updateProject(userId: string, projectId: string, updates: { name?: string; description?: string; instructions?: string }): boolean {
  const sets: string[] = [];
  const vals: unknown[] = [];
  if (updates.name) { sets.push("name = ?"); vals.push(updates.name); }
  if (updates.description !== undefined) { sets.push("description = ?"); vals.push(updates.description); }
  if (updates.instructions !== undefined) { sets.push("instructions = ?"); vals.push(updates.instructions); }
  if (!sets.length) return false;
  sets.push("updated_at = datetime('now')");
  vals.push(projectId, userId);
  return db.prepare(`UPDATE projects SET ${sets.join(", ")} WHERE id = ? AND user_id = ?`).run(...vals).changes > 0;
}

export function deleteProject(userId: string, projectId: string): boolean {
  return db.prepare("DELETE FROM projects WHERE id = ? AND user_id = ?").run(projectId, userId).changes > 0;
}

export function listProjectFiles(projectId: string): ProjectFile[] {
  const rows = db
    .prepare(
      `SELECT f.*, (SELECT COUNT(*) FROM document_chunks c WHERE c.file_id = f.id) as chunk_count
       FROM project_files f WHERE f.project_id = ? ORDER BY f.created_at DESC`
    )
    .all(projectId) as Array<Record<string, unknown>>;
  return rows.map((r) => ({
    id: r.id as string,
    filename: r.filename as string,
    mimeType: (r.mime_type as string) ?? null,
    sizeBytes: r.size_bytes as number,
    chunkCount: Number(r.chunk_count ?? 0),
    indexStatus: (r.index_status as string) ?? "ready",
    indexError: (r.index_error as string) ?? null,
    createdAt: r.created_at as string,
  }));
}

export function registerProjectFile(
  projectId: string,
  filename: string,
  mimeType: string,
  sizeBytes: number,
  indexStatus = "ready"
): ProjectFile {
  const id = uuid();
  db.prepare(
    "INSERT INTO project_files (id, project_id, filename, mime_type, size_bytes, index_status) VALUES (?, ?, ?, ?, ?, ?)"
  ).run(id, projectId, filename, mimeType, sizeBytes, indexStatus);
  db.prepare("UPDATE projects SET updated_at = datetime('now') WHERE id = ?").run(projectId);
  return listProjectFiles(projectId).find((f) => f.id === id)!;
}

export function enqueueProjectFileIndex(
  projectId: string,
  filename: string,
  mimeType: string,
  contentBase64: string
): { file: ProjectFile; jobId: string; status: "indexing" } {
  const buffer = Buffer.from(contentBase64, "base64");
  const file = registerProjectFile(projectId, filename, mimeType, buffer.length, "pending");
  const jobId = enqueueFileIndex(file.id, projectId, filename, mimeType, contentBase64);
  return { file: listProjectFiles(projectId).find((f) => f.id === file.id)!, jobId, status: "indexing" };
}

/** @deprecated synchronous path — prefer enqueueProjectFileIndex */
export async function uploadProjectFileContent(
  projectId: string,
  filename: string,
  mimeType: string,
  contentBase64: string
): Promise<{ file: ProjectFile; chunkCount: number; charCount: number }> {
  const buffer = Buffer.from(contentBase64, "base64");
  const parsed = await parseDocument(filename, mimeType, contentBase64);
  const file = registerProjectFile(projectId, filename, mimeType, buffer.length);
  db.prepare("UPDATE project_files SET extracted_text = ? WHERE id = ?").run(parsed.text, file.id);
  const chunkCount = await indexFileChunks(file.id, projectId, parsed.text);
  return {
    file: listProjectFiles(projectId).find((f) => f.id === file.id)!,
    chunkCount,
    charCount: parsed.charCount,
  };
}

export function getProjectContext(userId: string, projectId: string): string {
  const project = getProject(userId, projectId);
  if (!project) return "";
  const files = listProjectFiles(projectId);
  let ctx = `Project: ${project.name}\n`;
  if (project.instructions) ctx += `Instructions: ${project.instructions}\n`;
  if (files.length) ctx += `Indexed files: ${files.map((f) => f.filename).join(", ")}\n`;
  return ctx;
}

export async function getProjectDocumentContext(
  userId: string,
  projectId: string,
  query: string
): Promise<{ context: string; sources: DocumentSource[] }> {
  const project = getProject(userId, projectId);
  if (!project) return { context: "", sources: [] };
  const base = getProjectContext(userId, projectId);
  const { context: docCtx, sources } = await buildDocumentContext(projectId, query);
  const context = [base, docCtx].filter(Boolean).join("\n\n");
  return { context, sources };
}
