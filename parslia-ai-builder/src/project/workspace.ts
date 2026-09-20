import * as vscode from "vscode";
import * as path from "path";
import * as fs from "fs/promises";
import { existsSync } from "fs";

export function getWorkspaceRoot(): string {
  const folder = vscode.workspace.workspaceFolders?.[0];
  if (!folder) {
    throw new Error("Open a folder/workspace before using Parslia AI Builder.");
  }
  return folder.uri.fsPath;
}

export function resolveWorkspacePath(relPath: string): string {
  const root = getWorkspaceRoot();
  const cleaned = (relPath || ".").replace(/\\/g, "/");
  const abs = path.resolve(root, cleaned);
  const rel = path.relative(root, abs);
  if (rel.startsWith("..") || path.isAbsolute(rel)) {
    throw new Error(`Path escapes workspace: ${relPath}`);
  }
  return abs;
}

export function toRelPath(absPath: string): string {
  return path.relative(getWorkspaceRoot(), absPath).replace(/\\/g, "/");
}

export async function pathExists(relPath: string): Promise<boolean> {
  try {
    await fs.access(resolveWorkspacePath(relPath));
    return true;
  } catch {
    return false;
  }
}

export async function readTextFile(relPath: string): Promise<string> {
  return fs.readFile(resolveWorkspacePath(relPath), "utf8");
}

export async function writeTextFile(relPath: string, content: string): Promise<void> {
  const abs = resolveWorkspacePath(relPath);
  await fs.mkdir(path.dirname(abs), { recursive: true });
  await fs.writeFile(abs, content, "utf8");
}

export async function deleteTextFile(relPath: string): Promise<void> {
  await fs.unlink(resolveWorkspacePath(relPath));
}

export function shouldIgnore(name: string): boolean {
  return [
    "node_modules",
    ".git",
    "dist",
    "out",
    "build",
    ".next",
    "coverage",
    ".venv",
    "venv",
    "__pycache__",
    ".turbo",
    ".cache"
  ].includes(name);
}

export async function walkFiles(
  relDir: string,
  options: { maxDepth?: number; globExt?: string; limit?: number } = {}
): Promise<string[]> {
  const maxDepth = options.maxDepth ?? 4;
  const limit = options.limit ?? 400;
  const rootAbs = resolveWorkspacePath(relDir);
  const results: string[] = [];

  async function walk(abs: string, depth: number) {
    if (results.length >= limit || depth > maxDepth) return;
    let entries;
    try {
      entries = await fs.readdir(abs, { withFileTypes: true });
    } catch {
      return;
    }
    for (const entry of entries) {
      if (results.length >= limit) break;
      if (shouldIgnore(entry.name)) continue;
      const child = path.join(abs, entry.name);
      if (entry.isDirectory()) {
        await walk(child, depth + 1);
      } else if (entry.isFile()) {
        if (options.globExt) {
          const pattern = options.globExt;
          if (pattern.startsWith("*.") && !entry.name.endsWith(pattern.slice(1))) continue;
          if (!pattern.startsWith("*.") && !entry.name.includes(pattern.replace(/\*/g, ""))) continue;
        }
        results.push(toRelPath(child));
      }
    }
  }

  if (!existsSync(rootAbs)) return [];
  await walk(rootAbs, 0);
  return results;
}
