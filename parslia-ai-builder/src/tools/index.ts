import { spawn } from "child_process";
import * as fs from "fs/promises";
import * as path from "path";
import { existsSync } from "fs";
import * as vscode from "vscode";
import type { FileChange, ProposedChanges, ToolCall, ToolName, ToolResult } from "../agent/types";
import { SnapshotStore } from "../project/snapshot";
import {
  deleteTextFile,
  getWorkspaceRoot,
  pathExists,
  readTextFile,
  resolveWorkspacePath,
  toRelPath,
  walkFiles,
  writeTextFile
} from "../project/workspace";

function asString(value: unknown, fallback = ""): string {
  return typeof value === "string" ? value : fallback;
}

function asNumber(value: unknown, fallback: number): number {
  return typeof value === "number" && Number.isFinite(value) ? value : fallback;
}

async function runCommand(
  command: string,
  cwd?: string
): Promise<{ code: number; stdout: string; stderr: string }> {
  const root = getWorkspaceRoot();
  const workdir = cwd ? resolveWorkspacePath(cwd) : root;
  return new Promise((resolve) => {
    const child = spawn(command, {
      cwd: workdir,
      shell: true,
      env: process.env
    });
    let stdout = "";
    let stderr = "";
    child.stdout.on("data", (d) => {
      stdout += d.toString();
    });
    child.stderr.on("data", (d) => {
      stderr += d.toString();
    });
    child.on("close", (code) => {
      resolve({ code: code ?? 1, stdout: stdout.slice(0, 20000), stderr: stderr.slice(0, 20000) });
    });
    child.on("error", (err) => {
      resolve({ code: 1, stdout: "", stderr: err.message });
    });
  });
}

function isDangerousCommand(command: string): boolean {
  const c = command.toLowerCase();
  return (
    /\brm\s+-rf\b/.test(c) ||
    /\bsudo\b/.test(c) ||
    /\bmkfs\b/.test(c) ||
    /\bdd\s+if=/.test(c) ||
    /\bshutdown\b/.test(c) ||
    /\breboot\b/.test(c) ||
    /\bgit\s+push\s+--force\b/.test(c) ||
    /\bcurl\b.*\|\s*(ba)?sh\b/.test(c)
  );
}

async function detectTestCommand(): Promise<string> {
  const cfg = vscode.workspace.getConfiguration("parslia").get<string>("testCommand") || "";
  if (cfg.trim()) return cfg.trim();
  const root = getWorkspaceRoot();
  if (existsSync(path.join(root, "package.json"))) {
    try {
      const pkg = JSON.parse(await fs.readFile(path.join(root, "package.json"), "utf8"));
      if (pkg.scripts?.test) return "npm test --silent";
      if (pkg.scripts?.["test:unit"]) return "npm run test:unit --silent";
    } catch {
      /* ignore */
    }
  }
  if (existsSync(path.join(root, "libraix/frontend/package.json"))) {
    return "npm test --prefix libraix/frontend --silent";
  }
  if (existsSync(path.join(root, "pytest.ini")) || existsSync(path.join(root, "pyproject.toml"))) {
    return "pytest -q";
  }
  return "npm test --silent";
}

export class ToolRunner {
  constructor(
    private readonly snapshots: SnapshotStore,
    private readonly askApproval: (kind: string, detail: string) => Promise<boolean>
  ) {}

  async run(call: ToolCall): Promise<ToolResult> {
    try {
      switch (call.name as ToolName) {
        case "list_files":
          return await this.listFiles(call);
        case "search_code":
          return await this.searchCode(call);
        case "read_file":
          return await this.readFile(call);
        case "create_file":
          return await this.createFile(call);
        case "edit_file":
          return await this.editFile(call);
        case "delete_file":
          return await this.deleteFile(call);
        case "run_terminal":
          return await this.runTerminal(call);
        case "run_tests":
          return await this.runTests(call);
        case "view_errors":
          return await this.viewErrors(call);
        case "git_diff":
          return await this.gitDiff(call);
        case "restore_changes":
          return await this.restoreChanges(call);
        case "propose_changes":
          return await this.proposeChanges(call);
        default:
          return {
            toolCallId: call.id,
            name: call.name,
            ok: false,
            output: `Unknown tool: ${call.name}`
          };
      }
    } catch (err) {
      return {
        toolCallId: call.id,
        name: call.name,
        ok: false,
        output: err instanceof Error ? err.message : String(err)
      };
    }
  }

  private async listFiles(call: ToolCall): Promise<ToolResult> {
    const rel = asString(call.arguments.path, ".");
    const maxDepth = asNumber(call.arguments.maxDepth, 3);
    const glob = asString(call.arguments.glob, "");
    const files = await walkFiles(rel, {
      maxDepth,
      globExt: glob || undefined,
      limit: 300
    });
    return {
      toolCallId: call.id,
      name: "list_files",
      ok: true,
      output: files.length ? files.join("\n") : "(empty)"
    };
  }

  private async searchCode(call: ToolCall): Promise<ToolResult> {
    const query = asString(call.arguments.query);
    if (!query) {
      return { toolCallId: call.id, name: "search_code", ok: false, output: "query is required" };
    }
    const searchPath = asString(call.arguments.path, ".");
    const glob = asString(call.arguments.glob, "");
    const maxResults = asNumber(call.arguments.maxResults, 40);
    const abs = resolveWorkspacePath(searchPath);
    const rgArgs = ["--line-number", "--with-filename", "--no-heading", "--color", "never", "-m", String(maxResults)];
    if (glob) rgArgs.push("--glob", glob);
    rgArgs.push(query, abs);

    const rg = await runCommand(`rg ${rgArgs.map((a) => JSON.stringify(a)).join(" ")}`);
    if (rg.code === 0 || rg.stdout.trim()) {
      return {
        toolCallId: call.id,
        name: "search_code",
        ok: true,
        output: rg.stdout.trim() || "(no matches)"
      };
    }

    // Fallback: naive walk + includes
    const files = await walkFiles(searchPath, { maxDepth: 5, limit: 250 });
    const hits: string[] = [];
    const re = (() => {
      try {
        return new RegExp(query, "i");
      } catch {
        return null;
      }
    })();
    for (const file of files) {
      if (hits.length >= maxResults) break;
      if (!/\.(ts|tsx|js|jsx|py|md|json|css|html|sql|yml|yaml)$/i.test(file)) continue;
      try {
        const text = await readTextFile(file);
        const lines = text.split(/\r?\n/);
        lines.forEach((line, idx) => {
          if (hits.length >= maxResults) return;
          const match = re ? re.test(line) : line.toLowerCase().includes(query.toLowerCase());
          if (match) hits.push(`${file}:${idx + 1}:${line.slice(0, 240)}`);
        });
      } catch {
        /* skip */
      }
    }
    return {
      toolCallId: call.id,
      name: "search_code",
      ok: true,
      output: hits.length ? hits.join("\n") : "(no matches)"
    };
  }

  private async readFile(call: ToolCall): Promise<ToolResult> {
    const rel = asString(call.arguments.path);
    const startLine = asNumber(call.arguments.startLine, 0);
    const endLine = asNumber(call.arguments.endLine, 0);
    const text = await readTextFile(rel);
    if (startLine > 0) {
      const lines = text.split(/\r?\n/);
      const start = Math.max(1, startLine);
      const end = endLine > 0 ? Math.min(lines.length, endLine) : Math.min(lines.length, start + 200);
      const slice = lines.slice(start - 1, end).map((l, i) => `${start + i}|${l}`);
      return {
        toolCallId: call.id,
        name: "read_file",
        ok: true,
        output: slice.join("\n")
      };
    }
    const truncated = text.length > 30000 ? text.slice(0, 30000) + "\n\n[truncated]" : text;
    return { toolCallId: call.id, name: "read_file", ok: true, output: truncated };
  }

  private async createFile(call: ToolCall): Promise<ToolResult> {
    const rel = asString(call.arguments.path);
    const content = asString(call.arguments.content);
    if (await pathExists(rel)) {
      return {
        toolCallId: call.id,
        name: "create_file",
        ok: false,
        output: `File already exists: ${rel}. Use edit_file or propose_changes.`
      };
    }
    await this.snapshots.createFromChanges(`create ${rel}`, [
      { path: rel, op: "create", after: content }
    ]);
    await writeTextFile(rel, content);
    return { toolCallId: call.id, name: "create_file", ok: true, output: `Created ${rel}` };
  }

  private async editFile(call: ToolCall): Promise<ToolResult> {
    const rel = asString(call.arguments.path);
    const replaceAllContent =
      typeof call.arguments.replaceAllContent === "string" ? call.arguments.replaceAllContent : undefined;
    const oldString = asString(call.arguments.oldString);
    const newString = asString(call.arguments.newString);
    const before = await readTextFile(rel);
    let after = before;
    if (typeof replaceAllContent === "string") {
      after = replaceAllContent;
    } else if (oldString) {
      if (!before.includes(oldString)) {
        return {
          toolCallId: call.id,
          name: "edit_file",
          ok: false,
          output: `oldString not found in ${rel}`
        };
      }
      after = before.replace(oldString, newString);
    } else {
      return {
        toolCallId: call.id,
        name: "edit_file",
        ok: false,
        output: "Provide oldString/newString or replaceAllContent"
      };
    }
    await this.snapshots.createFromChanges(`edit ${rel}`, [
      { path: rel, op: "modify", before, after }
    ]);
    await writeTextFile(rel, after);
    return { toolCallId: call.id, name: "edit_file", ok: true, output: `Updated ${rel}` };
  }

  private async deleteFile(call: ToolCall): Promise<ToolResult> {
    const rel = asString(call.arguments.path);
    const approved = await this.askApproval("delete", `Delete file ${rel}?`);
    if (!approved) {
      return {
        toolCallId: call.id,
        name: "delete_file",
        ok: false,
        requiresApproval: true,
        approvalKind: "delete",
        output: "User denied file deletion."
      };
    }
    const before = (await pathExists(rel)) ? await readTextFile(rel) : undefined;
    await this.snapshots.createFromChanges(`delete ${rel}`, [
      { path: rel, op: "delete", before }
    ]);
    if (await pathExists(rel)) await deleteTextFile(rel);
    return { toolCallId: call.id, name: "delete_file", ok: true, output: `Deleted ${rel}` };
  }

  private async runTerminal(call: ToolCall): Promise<ToolResult> {
    const command = asString(call.arguments.command);
    const cwd = asString(call.arguments.cwd, "");
    if (!command) {
      return { toolCallId: call.id, name: "run_terminal", ok: false, output: "command is required" };
    }
    if (isDangerousCommand(command)) {
      return {
        toolCallId: call.id,
        name: "run_terminal",
        ok: false,
        output: `Blocked dangerous command: ${command}`
      };
    }
    const requireApproval = vscode.workspace
      .getConfiguration("parslia")
      .get<boolean>("requireApprovalForTerminal", true);
    if (requireApproval) {
      const approved = await this.askApproval("terminal", `Run terminal command?\n\n${command}`);
      if (!approved) {
        return {
          toolCallId: call.id,
          name: "run_terminal",
          ok: false,
          requiresApproval: true,
          approvalKind: "terminal",
          output: "User denied terminal command."
        };
      }
    }
    const result = await runCommand(command, cwd || undefined);
    return {
      toolCallId: call.id,
      name: "run_terminal",
      ok: result.code === 0,
      output: `exit ${result.code}\n${result.stdout}\n${result.stderr}`.trim()
    };
  }

  private async runTests(call: ToolCall): Promise<ToolResult> {
    const override = asString(call.arguments.command);
    const command = override || (await detectTestCommand());
    const requireApproval = vscode.workspace
      .getConfiguration("parslia")
      .get<boolean>("requireApprovalForTerminal", true);
    if (requireApproval) {
      const approved = await this.askApproval("terminal", `Run tests?\n\n${command}`);
      if (!approved) {
        return {
          toolCallId: call.id,
          name: "run_tests",
          ok: false,
          requiresApproval: true,
          approvalKind: "terminal",
          output: "User denied test run."
        };
      }
    }
    const result = await runCommand(command);
    return {
      toolCallId: call.id,
      name: "run_tests",
      ok: result.code === 0,
      output: `command: ${command}\nexit ${result.code}\n${result.stdout}\n${result.stderr}`.trim()
    };
  }

  private async viewErrors(call: ToolCall): Promise<ToolResult> {
    const command = asString(call.arguments.command) || "npm run build --silent";
    const requireApproval = vscode.workspace
      .getConfiguration("parslia")
      .get<boolean>("requireApprovalForTerminal", true);
    if (requireApproval) {
      const approved = await this.askApproval("terminal", `Collect errors with:\n\n${command}`);
      if (!approved) {
        return {
          toolCallId: call.id,
          name: "view_errors",
          ok: false,
          requiresApproval: true,
          approvalKind: "terminal",
          output: "User denied error collection command."
        };
      }
    }
    const result = await runCommand(command);
    const diagnostics = vscode.languages.getDiagnostics();
    const diagLines: string[] = [];
    for (const [uri, diags] of diagnostics) {
      for (const d of diags.slice(0, 20)) {
        if (d.severity === vscode.DiagnosticSeverity.Error) {
          diagLines.push(`${toRelPath(uri.fsPath)}:${d.range.start.line + 1} ${d.message}`);
        }
      }
      if (diagLines.length >= 40) break;
    }
    return {
      toolCallId: call.id,
      name: "view_errors",
      ok: true,
      output: [
        `command: ${command} (exit ${result.code})`,
        result.stderr || result.stdout || "(no command output)",
        "",
        "editor diagnostics:",
        diagLines.length ? diagLines.join("\n") : "(none)"
      ].join("\n")
    };
  }

  private async gitDiff(call: ToolCall): Promise<ToolResult> {
    const staged = Boolean(call.arguments.staged);
    const status = await runCommand("git status --short");
    const diff = await runCommand(staged ? "git diff --staged" : "git diff");
    return {
      toolCallId: call.id,
      name: "git_diff",
      ok: true,
      output: `STATUS\n${status.stdout || "(clean)"}\n\nDIFF\n${diff.stdout || "(no diff)"}`
    };
  }

  private async restoreChanges(call: ToolCall): Promise<ToolResult> {
    const snapshotId = asString(call.arguments.snapshotId) || undefined;
    const msg = await this.snapshots.restore(snapshotId);
    return { toolCallId: call.id, name: "restore_changes", ok: true, output: msg };
  }

  private async proposeChanges(call: ToolCall): Promise<ToolResult> {
    const summary = asString(call.arguments.summary, "Proposed changes");
    const rawChanges = Array.isArray(call.arguments.changes) ? call.arguments.changes : [];
    const changes: FileChange[] = [];
    for (const raw of rawChanges as Array<Record<string, unknown>>) {
      const filePath = asString(raw.path);
      const op = asString(raw.op, "modify") as FileChange["op"];
      const content = typeof raw.content === "string" ? raw.content : undefined;
      const reason = asString(raw.reason);
      if (!filePath) continue;
      let before: string | undefined;
      if (await pathExists(filePath)) {
        before = await readTextFile(filePath);
      }
      if (op === "delete") {
        changes.push({ path: filePath, op, before, reason });
      } else if (op === "create") {
        changes.push({ path: filePath, op, after: content ?? "", reason });
      } else {
        changes.push({ path: filePath, op: "modify", before, after: content ?? before ?? "", reason });
      }
    }
    const proposal: ProposedChanges = { summary, changes };
    return {
      toolCallId: call.id,
      name: "propose_changes",
      ok: true,
      requiresApproval: true,
      approvalKind: "apply_changes",
      output: `Proposed ${changes.length} file change(s): ${summary}`,
      payload: proposal
    };
  }
}
