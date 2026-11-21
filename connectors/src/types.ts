export type Role = "owner" | "manager" | "chef" | "staff";

export interface Actor {
  companyId: string;
  userId: string;
  role: Role;
  /** When set, replaces the role default. The host app must supply the signed-in user's real permissions. */
  permissions?: readonly string[];
}

export type ConnectionStatus = "connected" | "auth_expired" | "error" | "disconnected";

export type ActionSafety = "read" | "machine";

export interface FieldMapping {
  items: string;
  externalId: string;
  date: string;
  covers: string;
  dietary: string;
  service?: string;
  label?: string;
  dietaryLabel: string;
  dietaryCount: string;
}

export interface RetryPolicy {
  maxAttempts: number;
  baseDelayMs: number;
}

export type AuthSettings =
  | { mode: "api_key"; headerName: string; scheme: "raw" | "bearer" }
  | { mode: "oauth_refresh"; tokenUrl: string };

export interface BookingSettings {
  baseUrl: string;
  endpointPath: string;
  statusPath: string;
  dateQueryParam: string;
  timeoutMs: number;
  retry: RetryPolicy;
  auth: AuthSettings;
  fieldMapping: FieldMapping;
}

export type Secret =
  | { kind: "api_key"; apiKey: string }
  | { kind: "oauth"; accessToken: string; refreshToken: string; expiresAt: string | null };

export interface DietaryNeed {
  label: string;
  count?: number;
}

export interface CoverDraft {
  externalId: string;
  date: string;
  service: string;
  label: string;
  covers: number;
  dietaryNeeds: DietaryNeed[];
}

export interface CoverRow extends CoverDraft {
  companyId: string;
  connectionId: string;
  locationId: string | null;
  syncedAt: string;
}

export interface ReadingDraft {
  deviceId: string;
  celsius: number;
  recordedAt: string;
  note: string | null;
}

export interface Reading extends ReadingDraft {
  id: string;
  companyId: string;
  connectionId: string;
}

export interface RowIssue {
  index: number;
  message: string;
}

export interface ConnectionRecord {
  id: string;
  companyId: string;
  connectorId: string;
  systemId: string | null;
  displayName: string;
  locationId: string | null;
  status: ConnectionStatus;
  settings: Record<string, unknown>;
  lastCheckedAt: string | null;
  lastSyncAt: string | null;
  lastError: string | null;
  createdAt: string;
  updatedAt: string;
}

export type ConnectionPublic = ConnectionRecord;

export interface AuditEvent {
  at: string;
  companyId: string;
  actorId: string;
  action: string;
  connectionId: string | null;
  detail: string;
}

export interface CommandRecord {
  fingerprint: string;
  result: Record<string, unknown>;
  at: string;
}

export interface HttpCall {
  url: string;
  method: "GET" | "POST";
  headers?: Record<string, string>;
  body?: string;
  timeoutMs: number;
  retry: RetryPolicy;
  /** The runtime forces machine actions down to one attempt even if this says otherwise. */
  safety?: ActionSafety;
}

export interface HttpResult {
  status: number;
  body: unknown;
  attempts: number;
}

export interface ActionContext {
  companyId: string;
  connectionId: string;
  locationId: string | null;
  settings: unknown;
  secret: Secret | null;
  now: () => Date;
  allowCredentialRefresh: boolean;
  request: (call: HttpCall) => Promise<HttpResult>;
  saveSecret: (secret: Secret) => void;
}

export type ConnectorResult =
  | { kind: "covers"; rows: CoverDraft[]; issues: RowIssue[]; upstreamAttempts: number; date: string }
  | { kind: "reading"; reading: ReadingDraft }
  | { kind: "status"; status: ConnectionStatus; error: string | null };

export interface Connector {
  id: string;
  label: string;
  description: string;
  actions: Record<string, { permission: string; safety: ActionSafety }>;
  parseSettings(input: unknown, env: { allowLoopback: boolean }): unknown;
  parseSecret(settings: unknown, secret: unknown): Secret | null;
  secretMatches(settings: unknown, secret: Secret | null): boolean;
  checkStatus(ctx: ActionContext): Promise<{ status: ConnectionStatus; error: string | null }>;
  refreshAuth?(ctx: ActionContext): Promise<{ refreshed: boolean; detail: string }>;
  run(action: string, ctx: ActionContext, input: Record<string, unknown>): Promise<ConnectorResult>;
}
