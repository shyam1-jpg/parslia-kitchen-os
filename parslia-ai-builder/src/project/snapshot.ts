import * as vscode from "vscode";
import type { FileChange, SnapshotEntry } from "../agent/types";
import { deleteTextFile, pathExists, readTextFile, writeTextFile } from "./workspace";

const SNAPSHOTS_KEY = "parslia.snapshots";

export class SnapshotStore {
  constructor(private readonly context: vscode.ExtensionContext) {}

  getAll(): SnapshotEntry[] {
    return this.context.workspaceState.get<SnapshotEntry[]>(SNAPSHOTS_KEY, []);
  }

  async createFromChanges(label: string, changes: FileChange[]): Promise<SnapshotEntry> {
    const files: SnapshotEntry["files"] = [];
    for (const change of changes) {
      if (await pathExists(change.path)) {
        files.push({ path: change.path, content: await readTextFile(change.path) });
      } else {
        files.push({ path: change.path, content: null });
      }
    }
    const entry: SnapshotEntry = {
      id: `snap_${Date.now()}`,
      createdAt: new Date().toISOString(),
      label,
      files
    };
    const all = [entry, ...this.getAll()].slice(0, 20);
    await this.context.workspaceState.update(SNAPSHOTS_KEY, all);
    return entry;
  }

  async restore(snapshotId?: string): Promise<string> {
    const all = this.getAll();
    const snap = snapshotId ? all.find((s) => s.id === snapshotId) : all[0];
    if (!snap) {
      throw new Error("No Parslia snapshot found to restore.");
    }
    for (const file of snap.files) {
      if (file.content === null) {
        if (await pathExists(file.path)) {
          await deleteTextFile(file.path);
        }
      } else {
        await writeTextFile(file.path, file.content);
      }
    }
    return `Restored snapshot ${snap.id} (${snap.label}) covering ${snap.files.length} file(s).`;
  }
}

export async function applyFileChanges(
  changes: FileChange[],
  snapshots: SnapshotStore,
  label: string
): Promise<{ applied: number; snapshotId: string }> {
  const snapshot = await snapshots.createFromChanges(label, changes);
  for (const change of changes) {
    if (change.op === "delete") {
      if (await pathExists(change.path)) {
        await deleteTextFile(change.path);
      }
    } else {
      await writeTextFile(change.path, change.after ?? "");
    }
  }
  return { applied: changes.length, snapshotId: snapshot.id };
}
