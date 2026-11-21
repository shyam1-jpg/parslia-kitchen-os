import { ConnectorError } from "./errors.ts";
import type { AuditEvent, CommandRecord, ConnectionRecord, CoverRow, Reading, Secret } from "./types.ts";
import { canonical } from "./validate.ts";

export interface ConnectionPatch {
  displayName?: string;
  locationId?: string | null;
  status?: ConnectionRecord["status"];
  settings?: Record<string, unknown>;
  lastCheckedAt?: string | null;
  lastSyncAt?: string | null;
  lastError?: string | null;
  updatedAt?: string;
}

export interface ConnectionStore {
  createConnection(record: ConnectionRecord, secret: Secret | null): void;
  updateConnection(companyId: string, id: string, patch: ConnectionPatch): ConnectionRecord | null;
  getConnection(companyId: string, id: string): ConnectionRecord | null;
  listConnections(companyId: string): ConnectionRecord[];
  deleteConnection(companyId: string, id: string): boolean;
  putSecret(companyId: string, id: string, secret: Secret | null): void;
  getSecret(companyId: string, id: string): Secret | null;
  upsertCovers(companyId: string, rows: CoverRow[]): { created: number; updated: number; unchanged: number };
  listCovers(companyId: string, connectionId: string, date?: string): CoverRow[];
  getCommand(companyId: string, connectionId: string, action: string, key: string): CommandRecord | null;
  putCommand(companyId: string, connectionId: string, action: string, key: string, record: CommandRecord): void;
  addReading(companyId: string, reading: Reading): void;
  listReadings(companyId: string, connectionId: string): Reading[];
  addAudit(event: AuditEvent): void;
  listAudit(companyId: string): AuditEvent[];
}

const AUDIT_LIMIT = 200;

/**
 * Process-local store. Company id is part of every key, so one company cannot
 * list or read another company's connections, secrets, covers, or readings.
 * This is the test and single-process adapter, not a multi-node database.
 */
export class MemoryStore implements ConnectionStore {
  private readonly connections = new Map<string, Map<string, ConnectionRecord>>();
  private readonly secrets = new Map<string, Secret>();
  private readonly covers = new Map<string, Map<string, CoverRow>>();
  private readonly commands = new Map<string, Map<string, CommandRecord>>();
  private readonly readings = new Map<string, Reading[]>();
  private readonly audits = new Map<string, AuditEvent[]>();

  connectionCount(): number {
    let total = 0;
    for (const bucket of this.connections.values()) total += bucket.size;
    return total;
  }

  createConnection(record: ConnectionRecord, secret: Secret | null): void {
    const bucket = this.connectionBucket(record.companyId);
    bucket.set(record.id, record);
    if (secret) this.secrets.set(secretKey(record.companyId, record.id), secret);
  }

  updateConnection(companyId: string, id: string, patch: ConnectionPatch): ConnectionRecord | null {
    const current = this.getConnection(companyId, id);
    if (!current) return null;
    const next: ConnectionRecord = { ...current, ...patch, id: current.id, companyId: current.companyId, connectorId: current.connectorId };
    this.connectionBucket(companyId).set(id, next);
    return next;
  }

  getConnection(companyId: string, id: string): ConnectionRecord | null {
    return this.connections.get(companyId)?.get(id) ?? null;
  }

  listConnections(companyId: string): ConnectionRecord[] {
    return [...(this.connections.get(companyId)?.values() ?? [])].sort((a, b) => a.displayName.localeCompare(b.displayName));
  }

  deleteConnection(companyId: string, id: string): boolean {
    const bucket = this.connections.get(companyId);
    if (!bucket?.delete(id)) return false;
    this.secrets.delete(secretKey(companyId, id));
    const covers = this.covers.get(companyId);
    if (covers) {
      for (const key of covers.keys()) {
        if (key.startsWith(`${id}\0`)) covers.delete(key);
      }
    }
    const commands = this.commands.get(companyId);
    if (commands) {
      for (const key of commands.keys()) {
        if (key.startsWith(`${id}\0`)) commands.delete(key);
      }
    }
    const readings = this.readings.get(companyId);
    if (readings) this.readings.set(companyId, readings.filter((reading) => reading.connectionId !== id));
    return true;
  }

  putSecret(companyId: string, id: string, secret: Secret | null): void {
    const key = secretKey(companyId, id);
    if (!secret) this.secrets.delete(key);
    else this.secrets.set(key, secret);
  }

  getSecret(companyId: string, id: string): Secret | null {
    return this.secrets.get(secretKey(companyId, id)) ?? null;
  }

  upsertCovers(companyId: string, rows: CoverRow[]): { created: number; updated: number; unchanged: number } {
    const bucket = this.coverBucket(companyId);
    let created = 0;
    let updated = 0;
    let unchanged = 0;
    for (const row of rows) {
      if (row.companyId !== companyId) {
        throw new ConnectorError("forbidden", "Cover row company does not match.");
      }
      const key = `${row.connectionId}\0${row.date}\0${row.service}\0${row.externalId}`;
      const previous = bucket.get(key);
      if (!previous) {
        bucket.set(key, row);
        created += 1;
        continue;
      }
      if (
        previous.covers === row.covers &&
        previous.label === row.label &&
        previous.locationId === row.locationId &&
        canonical(previous.dietaryNeeds) === canonical(row.dietaryNeeds)
      ) {
        unchanged += 1;
        continue;
      }
      bucket.set(key, row);
      updated += 1;
    }
    return { created, updated, unchanged };
  }

  listCovers(companyId: string, connectionId: string, date?: string): CoverRow[] {
    return [...(this.covers.get(companyId)?.values() ?? [])]
      .filter((row) => row.connectionId === connectionId && (date === undefined || row.date === date))
      .sort((a, b) => a.service.localeCompare(b.service) || a.label.localeCompare(b.label));
  }

  getCommand(companyId: string, connectionId: string, action: string, key: string): CommandRecord | null {
    return this.commands.get(companyId)?.get(commandKey(connectionId, action, key)) ?? null;
  }

  putCommand(companyId: string, connectionId: string, action: string, key: string, record: CommandRecord): void {
    const bucket = this.commands.get(companyId) ?? new Map<string, CommandRecord>();
    bucket.set(commandKey(connectionId, action, key), record);
    this.commands.set(companyId, bucket);
  }

  addReading(companyId: string, reading: Reading): void {
    if (reading.companyId !== companyId) {
      throw new ConnectorError("forbidden", "Reading company does not match.");
    }
    const bucket = this.readings.get(companyId) ?? [];
    bucket.push(reading);
    this.readings.set(companyId, bucket);
  }

  listReadings(companyId: string, connectionId: string): Reading[] {
    return (this.readings.get(companyId) ?? []).filter((reading) => reading.connectionId === connectionId);
  }

  addAudit(event: AuditEvent): void {
    const bucket = this.audits.get(event.companyId) ?? [];
    bucket.push(event);
    if (bucket.length > AUDIT_LIMIT) bucket.splice(0, bucket.length - AUDIT_LIMIT);
    this.audits.set(event.companyId, bucket);
  }

  listAudit(companyId: string): AuditEvent[] {
    return [...(this.audits.get(companyId) ?? [])];
  }

  private connectionBucket(companyId: string): Map<string, ConnectionRecord> {
    const existing = this.connections.get(companyId);
    if (existing) return existing;
    const created = new Map<string, ConnectionRecord>();
    this.connections.set(companyId, created);
    return created;
  }

  private coverBucket(companyId: string): Map<string, CoverRow> {
    const existing = this.covers.get(companyId);
    if (existing) return existing;
    const created = new Map<string, CoverRow>();
    this.covers.set(companyId, created);
    return created;
  }
}

function secretKey(companyId: string, connectionId: string): string {
  return `${companyId}\0${connectionId}`;
}

function commandKey(connectionId: string, action: string, key: string): string {
  return `${connectionId}\0${action}\0${key}`;
}
