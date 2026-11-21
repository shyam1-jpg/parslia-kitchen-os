import { randomUUID, createHash } from "node:crypto";
import { builtinConnectors, fieldsFor, presetById, systemPresets } from "./catalog.ts";
import { ConnectorError } from "./errors.ts";
import { requestJson } from "./http.ts";
import { assertActor, assertPermission, hasPermission } from "./permissions.ts";
import { MemoryStore, type ConnectionStore } from "./store.ts";
import type {
  ActionSafety,
  Actor,
  AuditEvent,
  ConnectionPublic,
  ConnectionRecord,
  Connector,
  ConnectorResult,
  CoverRow,
  HttpCall,
  Reading,
  Secret,
} from "./types.ts";
import { canonical, isRecord } from "./validate.ts";

const IDEMPOTENCY = /^[A-Za-z0-9_.:-]{8,80}$/;
const LOCATION = /^[A-Za-z0-9_.:-]{1,80}$/;

export interface ConnectedSystemsOptions {
  store?: ConnectionStore;
  fetchImpl?: typeof fetch;
  now?: () => Date;
  sleep?: (ms: number) => Promise<void>;
  random?: () => number;
  allowLoopback?: boolean;
  extraConnectors?: Connector[];
}

export interface ActivateInput {
  displayName: string;
  systemId?: string;
  connectorId?: string;
  locationId?: string | null;
  settings?: Record<string, unknown>;
  secret?: unknown;
}

export interface SyncResult {
  connectionId: string;
  date: string;
  created: number;
  updated: number;
  unchanged: number;
  issues: { index: number; message: string }[];
  upstreamAttempts: number;
  rows: CoverRow[];
  duplicate?: boolean;
}

export interface ConnectedSystemsSection {
  id: "connected-systems";
  title: "Connected systems";
  intro: string;
  canManage: boolean;
  systems: ReturnType<typeof systemCards>;
  connections: ConnectionPublic[];
}

interface Inflight {
  fingerprint: string;
  promise: Promise<Record<string, unknown>>;
}

export class ConnectedSystems {
  private readonly store: ConnectionStore;
  private readonly connectors: Map<string, Connector>;
  private readonly fetchImpl: typeof fetch;
  private readonly now: () => Date;
  private readonly sleep: (ms: number) => Promise<void>;
  private readonly random: () => number;
  private readonly allowLoopback: boolean;
  private readonly inflight = new Map<string, Inflight>();

  constructor(options: ConnectedSystemsOptions = {}) {
    this.store = options.store ?? new MemoryStore();
    this.fetchImpl = options.fetchImpl ?? fetch;
    this.now = options.now ?? (() => new Date());
    this.sleep = options.sleep ?? ((ms) => new Promise((resolve) => setTimeout(resolve, ms)));
    this.random = options.random ?? Math.random;
    this.allowLoopback = options.allowLoopback ?? false;
    this.connectors = new Map(builtinConnectors().map((connector) => [connector.id, connector]));
    for (const extra of options.extraConnectors ?? []) {
      if (this.connectors.has(extra.id)) {
        throw new ConnectorError("validation", `Cannot replace built-in connector ${extra.id}.`);
      }
      this.connectors.set(extra.id, extra);
    }
  }

  settingsSection(actor: Actor): ConnectedSystemsSection {
    assertActor(actor);
    assertPermission(actor, "integrations.view");
    return {
      id: "connected-systems",
      title: "Connected systems",
      intro:
        "Connect a booking system so this kitchen can read covers and dietary needs. Each company uses its own account. Keys are stored for that company only and are not shown again.",
      canManage: hasPermission(actor, "integrations.manage"),
      systems: systemCards(),
      connections: this.list(actor),
    };
  }

  list(actor: Actor): ConnectionPublic[] {
    assertActor(actor);
    assertPermission(actor, "integrations.view");
    return this.store.listConnections(actor.companyId).map(publicConnection);
  }

  get(actor: Actor, connectionId: string): ConnectionPublic {
    assertActor(actor);
    assertPermission(actor, "integrations.view");
    return publicConnection(this.requireConnection(actor.companyId, connectionId));
  }

  async activate(actor: Actor, input: ActivateInput): Promise<ConnectionPublic> {
    assertActor(actor);
    assertPermission(actor, "integrations.manage");
    const preset = presetById(input.systemId);
    if (input.systemId && !preset && !input.connectorId) {
      throw new ConnectorError("validation", "Unknown system.");
    }
    const connectorId = input.connectorId ?? preset?.connectorId;
    if (!connectorId) throw new ConnectorError("validation", "Choose a system to connect.");
    if (preset && input.connectorId && input.connectorId !== preset.connectorId) {
      throw new ConnectorError("validation", "That system does not use the chosen connector.");
    }
    const connector = this.connector(connectorId);
    const merged = mergeSettings(preset?.settings ?? {}, input.settings);
    const settings = asRecord(connector.parseSettings(merged, { allowLoopback: this.allowLoopback }));
    const secret = connector.parseSecret(settings, input.secret);
    const nowIso = this.now().toISOString();
    const record: ConnectionRecord = {
      id: `con_${randomUUID()}`,
      companyId: actor.companyId,
      connectorId,
      systemId: preset?.systemId ?? null,
      displayName: assertDisplayName(input.displayName),
      locationId: assertLocation(input.locationId),
      status: "disconnected",
      settings,
      lastCheckedAt: null,
      lastSyncAt: null,
      lastError: null,
      createdAt: nowIso,
      updatedAt: nowIso,
    };
    this.store.createConnection(record, secret);
    const checked = await this.applyStatus(actor, record, hasPermission(actor, "integrations.manage"));
    this.audit(actor, "connect", record.id, `status=${checked.status}`);
    return checked;
  }

  async updateSettings(actor: Actor, connectionId: string, patch: Record<string, unknown>): Promise<ConnectionPublic> {
    assertActor(actor);
    assertPermission(actor, "integrations.manage");
    const current = this.requireConnection(actor.companyId, connectionId);
    const connector = this.connector(current.connectorId);
    const settings = asRecord(
      connector.parseSettings(mergeSettings(current.settings, patch), { allowLoopback: this.allowLoopback }),
    );
    const secret = this.store.getSecret(actor.companyId, connectionId);
    const updated = this.store.updateConnection(actor.companyId, connectionId, {
      settings,
      updatedAt: this.now().toISOString(),
    });
    if (!updated) throw new ConnectorError("not_found", "Connection not found.");
    if (!connector.secretMatches(settings, secret)) {
      return this.saveStatus(updated, "auth_expired", "Reconnect with a credential for the new auth mode.");
    }
    return this.applyStatus(actor, updated, true);
  }

  async reconnect(actor: Actor, connectionId: string, secretInput: unknown): Promise<ConnectionPublic> {
    assertActor(actor);
    assertPermission(actor, "integrations.manage");
    const current = this.requireConnection(actor.companyId, connectionId);
    const connector = this.connector(current.connectorId);
    const secret = connector.parseSecret(current.settings, secretInput);
    this.store.putSecret(actor.companyId, connectionId, secret);
    const checked = await this.applyStatus(actor, current, true);
    this.audit(actor, "reconnect", connectionId, `status=${checked.status}`);
    return checked;
  }

  async refresh(actor: Actor, connectionId: string): Promise<{ connection: ConnectionPublic; refreshed: boolean; detail: string }> {
    assertActor(actor);
    assertPermission(actor, "integrations.manage");
    const current = this.requireConnection(actor.companyId, connectionId);
    const connector = this.connector(current.connectorId);
    const ctx = this.context(actor, current, "read", true);
    let refreshed = false;
    let detail = "Status checked.";
    if (connector.refreshAuth) {
      const outcome = await connector.refreshAuth(ctx);
      refreshed = outcome.refreshed;
      detail = outcome.detail;
    }
    const connection = await this.applyStatus(actor, this.requireConnection(actor.companyId, connectionId), true);
    this.audit(actor, "refresh", connectionId, detail);
    return { connection, refreshed, detail };
  }

  async disconnect(actor: Actor, connectionId: string): Promise<{ removed: true }> {
    assertActor(actor);
    assertPermission(actor, "integrations.manage");
    if (!this.store.deleteConnection(actor.companyId, connectionId)) {
      throw new ConnectorError("not_found", "Connection not found.");
    }
    this.audit(actor, "disconnect", connectionId, "Credential and imported rows removed.");
    return { removed: true };
  }

  async status(actor: Actor, connectionId: string): Promise<ConnectionPublic> {
    assertActor(actor);
    assertPermission(actor, "integrations.view");
    const current = this.requireConnection(actor.companyId, connectionId);
    return this.applyStatus(actor, current, hasPermission(actor, "integrations.manage"));
  }

  async syncCovers(
    actor: Actor,
    connectionId: string,
    input: { date: string; idempotencyKey?: string },
  ): Promise<SyncResult> {
    const result = await this.execute(actor, connectionId, "syncCovers", input);
    return result as unknown as SyncResult;
  }

  async recordReading(
    actor: Actor,
    connectionId: string,
    input: { deviceId: string; celsius: number; recordedAt?: string; note?: string; idempotencyKey: string },
  ): Promise<Reading & { duplicate?: boolean }> {
    const result = await this.execute(actor, connectionId, "recordReading", input);
    return result as unknown as Reading & { duplicate?: boolean };
  }

  listCovers(actor: Actor, connectionId: string, date?: string): CoverRow[] {
    assertActor(actor);
    assertPermission(actor, "kitchen_ops.view");
    this.requireConnection(actor.companyId, connectionId);
    return this.store.listCovers(actor.companyId, connectionId, date);
  }

  listReadings(actor: Actor, connectionId: string): Reading[] {
    assertActor(actor);
    assertPermission(actor, "temperatures.view");
    this.requireConnection(actor.companyId, connectionId);
    return this.store.listReadings(actor.companyId, connectionId);
  }

  listAudit(actor: Actor): AuditEvent[] {
    assertActor(actor);
    assertPermission(actor, "integrations.view");
    return this.store.listAudit(actor.companyId);
  }

  async execute(actor: Actor, connectionId: string, action: string, input: unknown): Promise<Record<string, unknown>> {
    assertActor(actor);
    if (!isRecord(input) && input !== undefined) {
      throw new ConnectorError("validation", "Action input must be an object.");
    }
    const payloadInput = { ...(input ?? {}) };
    const current = this.requireConnection(actor.companyId, connectionId);
    const connector = this.connector(current.connectorId);
    const spec = connector.actions[action];
    if (!spec) throw new ConnectorError("validation", "Unknown action.");
    assertPermission(actor, spec.permission);
    if (action === "status") {
      const connection = await this.applyStatus(actor, current, hasPermission(actor, "integrations.manage"));
      return { ...connection };
    }

    const idempotencyKey = payloadInput.idempotencyKey;
    delete payloadInput.idempotencyKey;
    if (spec.safety === "machine" && typeof idempotencyKey !== "string") {
      throw new ConnectorError("validation", "Machine commands need an idempotency key so they are not sent twice.");
    }
    if (idempotencyKey !== undefined && (typeof idempotencyKey !== "string" || !IDEMPOTENCY.test(idempotencyKey))) {
      throw new ConnectorError("validation", "Idempotency key must be 8 to 80 letters, numbers, or . _ : -.");
    }
    const fingerprint = createHash("sha256").update(action).update("\0").update(canonical(payloadInput)).digest("hex");
    if (typeof idempotencyKey === "string") {
      return this.once(actor, current, connector, action, spec.safety, idempotencyKey, fingerprint, payloadInput);
    }
    return this.dispatch(actor, current, connector, action, spec.safety, payloadInput);
  }

  private async once(
    actor: Actor,
    connection: ConnectionRecord,
    connector: Connector,
    action: string,
    safety: ActionSafety,
    idempotencyKey: string,
    fingerprint: string,
    input: Record<string, unknown>,
  ): Promise<Record<string, unknown>> {
    const existing = this.store.getCommand(actor.companyId, connection.id, action, idempotencyKey);
    if (existing) {
      if (existing.fingerprint !== fingerprint) {
        throw new ConnectorError("conflict", "That idempotency key was already used for a different request.");
      }
      return { ...existing.result, duplicate: true };
    }
    const slot = `${actor.companyId}\0${connection.id}\0${action}\0${idempotencyKey}`;
    const pending = this.inflight.get(slot);
    if (pending) {
      if (pending.fingerprint !== fingerprint) {
        throw new ConnectorError("conflict", "That idempotency key was already used for a different request.");
      }
      const result = await pending.promise;
      return { ...result, duplicate: true };
    }
    let rejectInflight: (error: unknown) => void = () => undefined;
    let resolveInflight: (result: Record<string, unknown>) => void = () => undefined;
    const promise = new Promise<Record<string, unknown>>((resolve, reject) => {
      resolveInflight = resolve;
      rejectInflight = reject;
    });
    this.inflight.set(slot, { fingerprint, promise });
    promise.catch(() => undefined);
    try {
      const result = await this.dispatch(actor, connection, connector, action, safety, input);
      this.store.putCommand(actor.companyId, connection.id, action, idempotencyKey, {
        fingerprint,
        result,
        at: this.now().toISOString(),
      });
      resolveInflight(result);
      return result;
    } catch (error) {
      rejectInflight(error);
      throw error;
    } finally {
      this.inflight.delete(slot);
    }
  }

  private async dispatch(
    actor: Actor,
    connection: ConnectionRecord,
    connector: Connector,
    action: string,
    safety: ActionSafety,
    input: Record<string, unknown>,
  ): Promise<Record<string, unknown>> {
    const ctx = this.context(actor, connection, safety, safety === "read");
    try {
      const outcome = await connector.run(action, ctx, input);
      return this.persist(actor, connection, outcome);
    } catch (error) {
      if (error instanceof ConnectorError && error.code !== "validation" && error.code !== "forbidden" && error.code !== "conflict") {
        this.markFailure(connection, error);
      }
      throw error;
    }
  }

  private persist(actor: Actor, connection: ConnectionRecord, outcome: ConnectorResult): Record<string, unknown> {
    if (outcome.kind === "covers") {
      const syncedAt = this.now().toISOString();
      const rows: CoverRow[] = outcome.rows.map((row) => ({
        ...row,
        companyId: actor.companyId,
        connectionId: connection.id,
        locationId: connection.locationId,
        syncedAt,
      }));
      const applied = this.store.upsertCovers(actor.companyId, rows);
      this.store.updateConnection(actor.companyId, connection.id, {
        status: "connected",
        lastError: null,
        lastSyncAt: syncedAt,
        lastCheckedAt: syncedAt,
        updatedAt: syncedAt,
      });
      this.audit(actor, "syncCovers", connection.id, `date=${outcome.date} created=${applied.created}`);
      return {
        connectionId: connection.id,
        date: outcome.date,
        ...applied,
        issues: outcome.issues,
        upstreamAttempts: outcome.upstreamAttempts,
        rows,
      };
    }
    if (outcome.kind === "reading") {
      const reading: Reading = {
        ...outcome.reading,
        id: `rdg_${randomUUID()}`,
        companyId: actor.companyId,
        connectionId: connection.id,
      };
      this.store.addReading(actor.companyId, reading);
      this.audit(actor, "recordReading", connection.id, `device=${reading.deviceId}`);
      return { ...reading };
    }
    const saved = this.saveStatus(connection, outcome.status, outcome.error);
    return { ...saved };
  }

  private async applyStatus(actor: Actor, connection: ConnectionRecord, allowRefresh: boolean): Promise<ConnectionPublic> {
    const connector = this.connector(connection.connectorId);
    const ctx = this.context(actor, connection, "read", allowRefresh);
    try {
      const result = await connector.checkStatus(ctx);
      return this.saveStatus(connection, result.status, result.error);
    } catch (error) {
      if (error instanceof ConnectorError && error.code !== "validation") {
        const status = error.code === "auth" || error.code === "refresh_failed" ? "auth_expired" : "error";
        return this.saveStatus(connection, status, error.message);
      }
      throw error;
    }
  }

  private saveStatus(connection: ConnectionRecord, status: ConnectionRecord["status"], error: string | null): ConnectionPublic {
    const updated = this.store.updateConnection(connection.companyId, connection.id, {
      status,
      lastError: error,
      lastCheckedAt: this.now().toISOString(),
      updatedAt: this.now().toISOString(),
    });
    if (!updated) throw new ConnectorError("not_found", "Connection not found.");
    return publicConnection(updated);
  }

  private markFailure(connection: ConnectionRecord, error: ConnectorError): void {
    const status = error.code === "auth" || error.code === "refresh_failed" ? "auth_expired" : "error";
    this.store.updateConnection(connection.companyId, connection.id, {
      status,
      lastError: error.message,
      lastCheckedAt: this.now().toISOString(),
      updatedAt: this.now().toISOString(),
    });
  }

  private context(actor: Actor, connection: ConnectionRecord, safety: ActionSafety, allowCredentialRefresh: boolean) {
    const connector = this.connector(connection.connectorId);
    const settings = connector.parseSettings(connection.settings, { allowLoopback: this.allowLoopback });
    const secret = this.store.getSecret(actor.companyId, connection.id);
    return {
      companyId: actor.companyId,
      connectionId: connection.id,
      locationId: connection.locationId,
      settings,
      secret,
      now: this.now,
      allowCredentialRefresh,
      saveSecret: (next: Secret) => {
        this.store.putSecret(actor.companyId, connection.id, next);
      },
      request: (call: HttpCall) =>
        requestJson(call, {
          fetchImpl: this.fetchImpl,
          sleep: this.sleep,
          random: this.random,
          safety,
        }),
    };
  }

  private connector(id: string): Connector {
    const connector = this.connectors.get(id);
    if (!connector) throw new ConnectorError("validation", "Unknown connector.");
    return connector;
  }

  private requireConnection(companyId: string, connectionId: string): ConnectionRecord {
    const connection = this.store.getConnection(companyId, connectionId);
    if (!connection || connection.companyId !== companyId) {
      throw new ConnectorError("not_found", "Connection not found.");
    }
    return connection;
  }

  private audit(actor: Actor, action: string, connectionId: string | null, detail: string): void {
    this.store.addAudit({
      at: this.now().toISOString(),
      companyId: actor.companyId,
      actorId: actor.userId,
      action,
      connectionId,
      detail: detail.slice(0, 200),
    });
  }
}

function systemCards() {
  return systemPresets.map((preset) => ({
    systemId: preset.systemId,
    connectorId: preset.connectorId,
    label: preset.label,
    summary: preset.summary,
    setupHelp: preset.setupHelp,
    fields: fieldsFor(preset),
  }));
}

function publicConnection(record: ConnectionRecord): ConnectionPublic {
  return { ...record, settings: { ...record.settings } };
}

function asRecord(value: unknown): Record<string, unknown> {
  if (!isRecord(value)) throw new ConnectorError("validation", "Settings must be an object.");
  return value;
}

function mergeSettings(base: Record<string, unknown>, patch?: Record<string, unknown>): Record<string, unknown> {
  if (!patch) return { ...base };
  return {
    ...base,
    ...patch,
    fieldMapping: {
      ...(isRecord(base.fieldMapping) ? base.fieldMapping : {}),
      ...(isRecord(patch.fieldMapping) ? patch.fieldMapping : {}),
    },
    retry: {
      ...(isRecord(base.retry) ? base.retry : {}),
      ...(isRecord(patch.retry) ? patch.retry : {}),
    },
    auth: patch.auth ?? base.auth,
  };
}

function assertDisplayName(value: string): string {
  if (typeof value !== "string") throw new ConnectorError("validation", "Name the connection.");
  const name = value.trim();
  if (name.length < 1 || name.length > 80 || /[\u0000-\u001f]/.test(name)) {
    throw new ConnectorError("validation", "Connection name must be 1 to 80 characters.");
  }
  return name;
}

function assertLocation(value: string | null | undefined): string | null {
  if (value === undefined || value === null || value === "") return null;
  if (!LOCATION.test(value)) throw new ConnectorError("validation", "Location id is invalid.");
  return value;
}
