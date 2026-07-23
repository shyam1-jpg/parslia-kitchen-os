export type ExtToWebview =
  | { type: "ready"; payload?: unknown }
  | { type: "status"; payload: { message: string } }
  | { type: "message"; payload: Record<string, unknown> }
  | { type: "tool"; payload: Record<string, unknown> }
  | { type: "proposal"; payload: unknown }
  | { type: "analysis"; payload: unknown }
  | { type: "usage"; payload: unknown }
  | { type: "error"; payload: { message: string } }
  | { type: "done"; payload: unknown }
  | { type: "config"; payload: { hasApiKey: boolean; model: string } };

export type WebviewToExt =
  | { type: "ready" }
  | { type: "chat"; payload: { message: string; mode?: string } }
  | { type: "analyse" }
  | { type: "buildFeature"; payload: { message: string } }
  | { type: "runTestsFix" }
  | { type: "approveChanges" }
  | { type: "rejectChanges" }
  | { type: "undo" }
  | { type: "clearChat" };
