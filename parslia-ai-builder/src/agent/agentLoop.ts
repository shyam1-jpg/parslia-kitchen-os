import * as vscode from "vscode";
import { chatWithTools, type ChatCompletionMessage } from "./openaiClient";
import { SYSTEM_PROMPT, modeInstruction } from "./prompts";
import type {
  AgentEvent,
  AgentRunRequest,
  ProposedChanges,
  TokenUsage,
  ToolResult
} from "./types";
import { ToolRunner } from "../tools";
import { SnapshotStore, applyFileChanges } from "../project/snapshot";
import { analyseProject, formatAnalysisForPrompt } from "../project/analyser";

export type EventHandler = (event: AgentEvent) => void;

export class AgentController {
  private conversation: ChatCompletionMessage[] = [];
  private usageTotals: TokenUsage = { promptTokens: 0, completionTokens: 0, totalTokens: 0 };
  private pendingProposal: ProposedChanges | null = null;
  private analysisCache: string | null = null;

  constructor(
    private readonly context: vscode.ExtensionContext,
    private readonly snapshots: SnapshotStore,
    private readonly onEvent: EventHandler
  ) {}

  getUsage(): TokenUsage {
    return { ...this.usageTotals };
  }

  resetConversation(): void {
    this.conversation = [];
    this.pendingProposal = null;
  }

  async analyseAndCache(): Promise<void> {
    this.onEvent({ type: "status", payload: { message: "Analysing project…" } });
    const analysis = await analyseProject();
    this.analysisCache = formatAnalysisForPrompt(analysis);
    this.onEvent({ type: "analysis", payload: analysis });
    this.onEvent({
      type: "message",
      payload: {
        role: "assistant",
        content: analysis.summary,
        status: "done"
      }
    });
    this.onEvent({ type: "done", payload: { ok: true } });
  }

  async run(request: AgentRunRequest): Promise<void> {
    try {
      if (!this.analysisCache) {
        const analysis = await analyseProject();
        this.analysisCache = formatAnalysisForPrompt(analysis);
        this.onEvent({ type: "analysis", payload: analysis });
      }

      if (request.mode === "analyse") {
        await this.analyseAndCache();
        return;
      }

      this.onEvent({
        type: "message",
        payload: { role: "user", content: request.message, status: "done" }
      });
      this.onEvent({ type: "status", payload: { message: "Planning…" } });

      const userBits = [
        `Mode: ${request.mode}`,
        modeInstruction(request.mode),
        "",
        `User request:\n${request.message}`
      ];
      if (request.selection) {
        userBits.push(
          "",
          `Selected code in ${request.selection.path} (lines ${request.selection.startLine}-${request.selection.endLine}):`,
          "```",
          request.selection.text,
          "```"
        );
      }

      if (this.conversation.length === 0) {
        this.conversation.push({
          role: "system",
          content: `${SYSTEM_PROMPT}\n\nProject context:\n${this.analysisCache}`
        });
      }

      this.conversation.push({ role: "user", content: userBits.join("\n") });

      const maxRounds =
        vscode.workspace.getConfiguration("parslia").get<number>("maxToolRounds") || 12;
      const tools = new ToolRunner(this.snapshots, async (kind, detail) => {
        if (kind === "apply_changes") return false;
        const pick = await vscode.window.showWarningMessage(
          detail,
          { modal: true },
          "Allow",
          "Deny"
        );
        return pick === "Allow";
      });

      for (let round = 0; round < maxRounds; round++) {
        this.onEvent({
          type: "status",
          payload: { message: `Agent step ${round + 1}/${maxRounds}…` }
        });
        const response = await chatWithTools(this.conversation);
        this.usageTotals.promptTokens += response.usage.promptTokens;
        this.usageTotals.completionTokens += response.usage.completionTokens;
        this.usageTotals.totalTokens += response.usage.totalTokens;
        this.onEvent({ type: "usage", payload: this.usageTotals });

        if (!response.toolCalls.length) {
          const content = response.content || "Done.";
          this.conversation.push({ role: "assistant", content });
          this.onEvent({
            type: "message",
            payload: { role: "assistant", content, status: "done" }
          });
          this.onEvent({ type: "done", payload: { ok: true } });
          return;
        }

        this.conversation.push({
          role: "assistant",
          content: response.content || null,
          tool_calls: response.toolCalls.map((tc) => ({
            id: tc.id,
            type: "function" as const,
            function: {
              name: tc.name,
              arguments: JSON.stringify(tc.arguments || {})
            }
          }))
        });

        for (const call of response.toolCalls) {
          this.onEvent({
            type: "tool",
            payload: { name: call.name, arguments: call.arguments, status: "running" }
          });
          const result = await tools.run(call);
          await this.handleToolResult(result);
          this.conversation.push({
            role: "tool",
            tool_call_id: call.id,
            content: result.output
          });
          this.onEvent({
            type: "tool",
            payload: {
              name: call.name,
              ok: result.ok,
              output: result.output.slice(0, 1000),
              status: "done"
            }
          });

          if (result.name === "propose_changes" && result.payload) {
            this.pendingProposal = result.payload as ProposedChanges;
            this.onEvent({
              type: "proposal",
              payload: this.pendingProposal
            });
            this.onEvent({
              type: "message",
              payload: {
                role: "assistant",
                content: `${this.pendingProposal.summary}\n\nReview the visual diff and approve to apply ${this.pendingProposal.changes.length} file change(s).`,
                status: "awaiting_approval",
                pendingChanges: this.pendingProposal
              }
            });
            this.onEvent({ type: "done", payload: { ok: true, awaitingApproval: true } });
            return;
          }
        }
      }

      this.onEvent({
        type: "message",
        payload: {
          role: "assistant",
          content: "Stopped after reaching the maximum tool rounds. Approve pending diffs or send a follow-up.",
          status: "done"
        }
      });
      this.onEvent({ type: "done", payload: { ok: true } });
    } catch (err) {
      const message = err instanceof Error ? err.message : String(err);
      this.onEvent({ type: "error", payload: { message } });
      this.onEvent({
        type: "message",
        payload: { role: "assistant", content: `Error: ${message}`, status: "error" }
      });
      this.onEvent({ type: "done", payload: { ok: false } });
    }
  }

  async applyPendingProposal(): Promise<void> {
    if (!this.pendingProposal) {
      throw new Error("No pending changes to apply.");
    }
    const proposal = this.pendingProposal;
    this.onEvent({ type: "status", payload: { message: "Applying approved changes…" } });
    const result = await applyFileChanges(
      proposal.changes,
      this.snapshots,
      proposal.summary
    );
    this.pendingProposal = null;
    this.conversation.push({
      role: "user",
      content: `User approved and applied the proposed changes (snapshot ${result.snapshotId}).`
    });
    this.conversation.push({
      role: "assistant",
      content: `Applied ${result.applied} file change(s). Snapshot ${result.snapshotId} saved for undo. Suggest running tests if this touched app logic.`
    });
    this.onEvent({
      type: "message",
      payload: {
        role: "assistant",
        content: `Applied ${result.applied} file change(s). Snapshot: ${result.snapshotId}. Use “Parslia: Undo Last Applied Changes” to restore, or “Run tests & fix” to verify.`,
        status: "done"
      }
    });
    this.onEvent({ type: "done", payload: { ok: true } });
  }

  rejectPendingProposal(): void {
    if (!this.pendingProposal) return;
    this.conversation.push({
      role: "user",
      content: "User rejected the proposed changes. Acknowledge and wait for a revised request."
    });
    this.pendingProposal = null;
    this.onEvent({
      type: "message",
      payload: {
        role: "assistant",
        content: "Discarded the proposed changes. Tell me how you’d like to revise them.",
        status: "done"
      }
    });
  }

  async undoLast(): Promise<string> {
    const msg = await this.snapshots.restore();
    this.onEvent({
      type: "message",
      payload: { role: "assistant", content: msg, status: "done" }
    });
    return msg;
  }

  private async handleToolResult(result: ToolResult): Promise<void> {
    // Reserved for future side-effects (telemetry, audit log)
    void result;
  }
}
