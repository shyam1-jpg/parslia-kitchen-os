import * as vscode from "vscode";
import * as path from "path";
import * as fs from "fs";
import { AgentController } from "../agent/agentLoop";
import { ensureApiKeyConfigured } from "../agent/openaiClient";
import { SnapshotStore } from "../project/snapshot";
import type { ExtToWebview, WebviewToExt } from "./messageTypes";

export class ChatViewProvider implements vscode.WebviewViewProvider {
  public static readonly viewType = "parslia.chatView";
  private view?: vscode.WebviewView;
  private agent: AgentController;
  private busy = false;

  constructor(
    private readonly context: vscode.ExtensionContext,
    private readonly snapshots: SnapshotStore
  ) {
    this.agent = new AgentController(context, snapshots, (event) => {
      this.post({ type: event.type as ExtToWebview["type"], payload: event.payload } as ExtToWebview);
    });
  }

  resolveWebviewView(
    webviewView: vscode.WebviewView,
    _context: vscode.WebviewViewResolveContext,
    _token: vscode.CancellationToken
  ): void {
    this.view = webviewView;
    webviewView.webview.options = {
      enableScripts: true,
      localResourceRoots: [
        vscode.Uri.file(path.join(this.context.extensionPath, "webview-ui", "dist")),
        vscode.Uri.file(path.join(this.context.extensionPath, "media"))
      ]
    };
    webviewView.webview.html = this.getHtml(webviewView.webview);
    webviewView.webview.onDidReceiveMessage(async (msg: WebviewToExt) => {
      await this.handleMessage(msg);
    });
    this.sendConfig();
  }

  reveal(): void {
    if (this.view) {
      this.view.show?.(true);
    } else {
      void vscode.commands.executeCommand("parslia.chatView.focus");
    }
  }

  async handleCommand(
    command:
      | "analyse"
      | "build"
      | "edit_selection"
      | "test_fix"
      | "undo"
      | "chat",
    message?: string
  ): Promise<void> {
    this.reveal();
    if (command === "undo") {
      await this.agent.undoLast();
      return;
    }
    if (this.busy) {
      void vscode.window.showInformationMessage("Parslia is already working on a request.");
      return;
    }

    const keyError = ensureApiKeyConfigured();
    if (keyError && command !== "analyse") {
      this.post({ type: "error", payload: { message: keyError } });
      void vscode.window.showErrorMessage(keyError);
      return;
    }

    let selection:
      | { path: string; text: string; startLine: number; endLine: number }
      | undefined;
    if (command === "edit_selection") {
      const editor = vscode.window.activeTextEditor;
      if (!editor || editor.selection.isEmpty) {
        void vscode.window.showWarningMessage("Select some code first.");
        return;
      }
      const doc = editor.document;
      const text = doc.getText(editor.selection);
      const rel = vscode.workspace.asRelativePath(doc.uri);
      selection = {
        path: rel,
        text,
        startLine: editor.selection.start.line + 1,
        endLine: editor.selection.end.line + 1
      };
    }

    let prompt = message || "";
    if (command === "build" && !prompt) {
      prompt =
        (await vscode.window.showInputBox({
          title: "Parslia: Build This Feature",
          prompt: "Describe the hospitality feature to build",
          placeHolder:
            "Create a stock-management page with products, quantities, low-stock alerts and supplier info"
        })) || "";
      if (!prompt) return;
    }
    if (command === "edit_selection" && !prompt) {
      prompt =
        (await vscode.window.showInputBox({
          title: "Parslia: Edit Selection",
          prompt: "How should this code change?",
          placeHolder: "Add allergen badges using the existing design components"
        })) || "";
      if (!prompt) return;
    }
    if (command === "test_fix") {
      prompt = prompt || "Run the project tests and fix any straightforward failures.";
    }
    if (command === "analyse") {
      this.busy = true;
      try {
        await this.agent.analyseAndCache();
      } finally {
        this.busy = false;
      }
      return;
    }

    const mode =
      command === "build"
        ? ("build" as const)
        : command === "edit_selection"
          ? ("edit_selection" as const)
          : command === "test_fix"
            ? ("test_fix" as const)
            : ("chat" as const);

    this.busy = true;
    try {
      await this.agent.run({
        message: prompt,
        mode,
        selection
      });
    } finally {
      this.busy = false;
    }
  }

  private async handleMessage(msg: WebviewToExt): Promise<void> {
    switch (msg.type) {
      case "ready":
        this.sendConfig();
        break;
      case "analyse":
        await this.handleCommand("analyse");
        break;
      case "chat":
        await this.handleCommand("chat", msg.payload.message);
        break;
      case "buildFeature":
        await this.handleCommand("build", msg.payload.message);
        break;
      case "runTestsFix":
        await this.handleCommand("test_fix");
        break;
      case "approveChanges":
        if (this.busy) return;
        this.busy = true;
        try {
          await this.agent.applyPendingProposal();
        } catch (err) {
          this.post({
            type: "error",
            payload: { message: err instanceof Error ? err.message : String(err) }
          });
        } finally {
          this.busy = false;
        }
        break;
      case "rejectChanges":
        this.agent.rejectPendingProposal();
        break;
      case "undo":
        await this.agent.undoLast();
        break;
      case "clearChat":
        this.agent.resetConversation();
        this.post({
          type: "message",
          payload: {
            role: "assistant",
            content: "Chat cleared. Ask me to analyse the project or build a hospitality feature.",
            status: "done",
            reset: true
          }
        });
        break;
    }
  }

  private sendConfig(): void {
    const cfg = vscode.workspace.getConfiguration("parslia");
    const hasApiKey = !ensureApiKeyConfigured();
    this.post({
      type: "config",
      payload: {
        hasApiKey,
        model: cfg.get<string>("model") || "gpt-4.1"
      }
    });
  }

  private post(message: ExtToWebview): void {
    void this.view?.webview.postMessage(message);
  }

  private getHtml(webview: vscode.Webview): string {
    const distDir = path.join(this.context.extensionPath, "webview-ui", "dist");
    const indexPath = path.join(distDir, "index.html");
    if (fs.existsSync(indexPath)) {
      let html = fs.readFileSync(indexPath, "utf8");
      html = html.replace(/(href|src)="([^"]+)"/g, (_m, attr, assetPath) => {
        if (assetPath.startsWith("http") || assetPath.startsWith("data:")) {
          return `${attr}="${assetPath}"`;
        }
        const onDisk = vscode.Uri.file(path.join(distDir, assetPath.replace(/^\//, "")));
        return `${attr}="${webview.asWebviewUri(onDisk)}"`;
      });
      html = html.replace(
        /<(script|link)([^>]*) (src|href)="([^"]+)"/g,
        (full) => full
      );
      // CSP
      const csp = [
        `default-src 'none'`,
        `style-src ${webview.cspSource} 'unsafe-inline'`,
        `script-src ${webview.cspSource}`,
        `img-src ${webview.cspSource} data:`,
        `font-src ${webview.cspSource}`
      ].join("; ");
      if (!html.includes("Content-Security-Policy")) {
        html = html.replace(
          "<head>",
          `<head><meta http-equiv="Content-Security-Policy" content="${csp}">`
        );
      }
      return html;
    }

    // Fallback UI if webview bundle is missing
    const nonce = String(Date.now());
    return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8" />
  <meta http-equiv="Content-Security-Policy" content="default-src 'none'; style-src 'unsafe-inline'; script-src 'nonce-${nonce}';">
  <meta name="viewport" content="width=device-width, initial-scale=1.0" />
  <title>Parslia AI Builder</title>
  <style>
    :root { color-scheme: light dark; --bg:#0f1f1a; --panel:#17352c; --ink:#e8f0ec; --muted:#9bb5aa; --accent:#c4a35a; --ok:#3d9a6a; --danger:#c45c5c; }
    body { margin:0; font:13px/1.45 "Segoe UI", system-ui, sans-serif; background:linear-gradient(165deg,#0f1f1a,#1a3329 50%,#10241d); color:var(--ink); }
    header { padding:14px 14px 8px; border-bottom:1px solid #2a4a3d; }
    header h1 { margin:0; font-size:15px; letter-spacing:.02em; }
    header p { margin:4px 0 0; color:var(--muted); font-size:12px; }
    #log { height: calc(100vh - 150px); overflow:auto; padding:12px; }
    .msg { margin:0 0 10px; padding:10px 12px; border-radius:10px; background:rgba(255,255,255,.04); border:1px solid rgba(255,255,255,.06); white-space:pre-wrap; }
    .msg.user { border-color:rgba(196,163,90,.35); }
    .msg.assistant { border-color:rgba(61,154,106,.35); }
    .toolbar { display:flex; gap:6px; padding:8px 12px; flex-wrap:wrap; }
    button, textarea { font:inherit; }
    button { background:var(--panel); color:var(--ink); border:1px solid #3a5d4d; border-radius:8px; padding:6px 10px; cursor:pointer; }
    button.primary { background:var(--accent); color:#1a1508; border-color:transparent; font-weight:600; }
    form { display:flex; gap:8px; padding:0 12px 12px; }
    textarea { flex:1; min-height:54px; resize:vertical; border-radius:10px; border:1px solid #3a5d4d; background:#0c1814; color:var(--ink); padding:8px 10px; }
    .diff { font-family: ui-monospace, SFMono-Regular, Menlo, Consolas, monospace; font-size:11px; }
    .actions { display:flex; gap:8px; margin-top:8px; }
  </style>
</head>
<body>
  <header>
    <h1>Parslia AI Builder</h1>
    <p>Hospitality coding agent — analyse, chat, build, review diffs, fix tests.</p>
  </header>
  <div class="toolbar">
    <button id="analyse">Analyse project</button>
    <button id="tests">Run tests & fix</button>
    <button id="undo">Undo</button>
    <button id="clear">Clear</button>
  </div>
  <div id="log"></div>
  <form id="form">
    <textarea id="input" placeholder="Create a menu-planning page with allergen automation…"></textarea>
    <button class="primary" type="submit">Send</button>
  </form>
  <script nonce="${nonce}">
    const vscode = acquireVsCodeApi();
    const log = document.getElementById('log');
    function add(role, text, extra) {
      const el = document.createElement('div');
      el.className = 'msg ' + role;
      el.textContent = text;
      if (extra) el.appendChild(extra);
      log.appendChild(el);
      log.scrollTop = log.scrollHeight;
    }
    window.addEventListener('message', (e) => {
      const msg = e.data;
      if (msg.type === 'message') add(msg.payload.role || 'assistant', msg.payload.content || '');
      if (msg.type === 'status') add('system', msg.payload.message || '');
      if (msg.type === 'error') add('assistant', 'Error: ' + msg.payload.message);
      if (msg.type === 'proposal') {
        const wrap = document.createElement('div');
        const pre = document.createElement('pre');
        pre.className = 'diff';
        pre.textContent = (msg.payload.changes || []).map(c => c.op.toUpperCase() + ' ' + c.path).join('\\n');
        const actions = document.createElement('div');
        actions.className = 'actions';
        const ok = document.createElement('button'); ok.textContent = 'Approve & apply'; ok.className='primary';
        ok.onclick = () => vscode.postMessage({ type: 'approveChanges' });
        const no = document.createElement('button'); no.textContent = 'Reject';
        no.onclick = () => vscode.postMessage({ type: 'rejectChanges' });
        actions.append(ok, no); wrap.append(pre, actions);
        add('assistant', msg.payload.summary || 'Proposed changes', wrap);
      }
      if (msg.type === 'analysis') add('assistant', 'Project analysed: ' + (msg.payload.summary || ''));
    });
    document.getElementById('form').addEventListener('submit', (ev) => {
      ev.preventDefault();
      const input = document.getElementById('input');
      const message = input.value.trim();
      if (!message) return;
      vscode.postMessage({ type: 'buildFeature', payload: { message } });
      input.value = '';
    });
    document.getElementById('analyse').onclick = () => vscode.postMessage({ type: 'analyse' });
    document.getElementById('tests').onclick = () => vscode.postMessage({ type: 'runTestsFix' });
    document.getElementById('undo').onclick = () => vscode.postMessage({ type: 'undo' });
    document.getElementById('clear').onclick = () => vscode.postMessage({ type: 'clearChat' });
    vscode.postMessage({ type: 'ready' });
  </script>
</body>
</html>`;
  }
}
