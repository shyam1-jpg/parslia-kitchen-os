import * as vscode from "vscode";
import { ChatViewProvider } from "./webview/ChatViewProvider";
import { SnapshotStore } from "./project/snapshot";

export function activate(context: vscode.ExtensionContext): void {
  const snapshots = new SnapshotStore(context);
  const provider = new ChatViewProvider(context, snapshots);

  context.subscriptions.push(
    vscode.window.registerWebviewViewProvider(ChatViewProvider.viewType, provider, {
      webviewOptions: { retainContextWhenHidden: true }
    })
  );

  context.subscriptions.push(
    vscode.commands.registerCommand("parslia.openChat", () => provider.reveal()),
    vscode.commands.registerCommand("parslia.analyseProject", () =>
      provider.handleCommand("analyse")
    ),
    vscode.commands.registerCommand("parslia.buildFeature", () =>
      provider.handleCommand("build")
    ),
    vscode.commands.registerCommand("parslia.editSelection", () =>
      provider.handleCommand("edit_selection")
    ),
    vscode.commands.registerCommand("parslia.runTestsAndFix", () =>
      provider.handleCommand("test_fix")
    ),
    vscode.commands.registerCommand("parslia.undoLastChanges", () =>
      provider.handleCommand("undo")
    )
  );
}

export function deactivate(): void {
  // no-op
}
