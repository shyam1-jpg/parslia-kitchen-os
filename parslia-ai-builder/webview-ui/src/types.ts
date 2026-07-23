export type FileChange = {
  path: string;
  op: "create" | "modify" | "delete";
  before?: string;
  after?: string;
  reason?: string;
};

export type ProposedChanges = {
  summary: string;
  changes: FileChange[];
};

export type UiMessage = {
  id: string;
  role: "user" | "assistant" | "system";
  content: string;
  status?: string;
  pendingChanges?: ProposedChanges;
};

export type ProjectAnalysis = {
  name: string;
  summary: string;
  stack: string[];
  hospitalitySignals: string[];
  fileCount: number;
};

declare global {
  function acquireVsCodeApi(): {
    postMessage: (msg: unknown) => void;
    getState: () => unknown;
    setState: (state: unknown) => void;
  };
}
