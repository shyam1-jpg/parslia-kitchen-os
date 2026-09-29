export type ToolName =
  | "list_files"
  | "search_code"
  | "read_file"
  | "create_file"
  | "edit_file"
  | "delete_file"
  | "run_terminal"
  | "run_tests"
  | "view_errors"
  | "git_diff"
  | "restore_changes"
  | "propose_changes";

export interface ToolCall {
  id: string;
  name: ToolName;
  arguments: Record<string, unknown>;
}

export interface ToolResult {
  toolCallId: string;
  name: ToolName;
  ok: boolean;
  output: string;
  requiresApproval?: boolean;
  approvalKind?: "terminal" | "delete" | "apply_changes";
  payload?: unknown;
}

export type FileChangeOp = "create" | "modify" | "delete";

export interface FileChange {
  path: string;
  op: FileChangeOp;
  before?: string;
  after?: string;
  reason?: string;
}

export interface ProposedChanges {
  summary: string;
  changes: FileChange[];
}

export interface ChatMessage {
  id: string;
  role: "user" | "assistant" | "system" | "tool";
  content: string;
  createdAt: string;
  pendingChanges?: ProposedChanges;
  status?: "thinking" | "awaiting_approval" | "done" | "error";
  meta?: Record<string, unknown>;
}

export interface ProjectAnalysis {
  root: string;
  name: string;
  summary: string;
  stack: string[];
  frameworks: string[];
  packageManagers: string[];
  entryPoints: string[];
  designHints: string[];
  dataHints: string[];
  hospitalitySignals: string[];
  keyFiles: Array<{ path: string; note: string }>;
  fileCount: number;
  analysedAt: string;
}

export interface AgentRunRequest {
  message: string;
  mode: "chat" | "build" | "edit_selection" | "analyse" | "test_fix";
  selection?: {
    path: string;
    text: string;
    startLine: number;
    endLine: number;
  };
  conversationId?: string;
}

export interface AgentEvent {
  type:
    | "status"
    | "message"
    | "tool"
    | "proposal"
    | "analysis"
    | "usage"
    | "error"
    | "done";
  payload: unknown;
}

export interface TokenUsage {
  promptTokens: number;
  completionTokens: number;
  totalTokens: number;
}

export interface SnapshotEntry {
  id: string;
  createdAt: string;
  label: string;
  files: Array<{ path: string; content: string | null }>;
}
