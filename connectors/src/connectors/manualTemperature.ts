import { ConnectorError } from "../errors.ts";
import type { ActionContext, Connector, ReadingDraft } from "../types.ts";
import { isRecord, rejectSecretsInSettings } from "../validate.ts";

const DEVICE_ID = /^[A-Za-z0-9_.:-]{1,80}$/;

/**
 * Manual temperature entry, matching the live Smart Devices "manual" connection
 * type. Bluetooth pairing and Wi-Fi manufacturer clouds stay outside this
 * connector: the live app already treats those as device-local or not set up.
 * Recording is a machine command: one attempt, and a repeated idempotency key
 * does not write a second reading.
 */
export function parseTemperatureSettings(input: unknown): { unit: "C" } {
  if (input === undefined || input === null) return { unit: "C" };
  if (!isRecord(input)) throw new ConnectorError("validation", "Temperature settings must be an object.");
  rejectSecretsInSettings(input);
  if (input.unit !== undefined && input.unit !== "C") {
    throw new ConnectorError("validation", "Temperature unit must be C.");
  }
  return { unit: "C" };
}

export const manualTemperatureConnector: Connector = {
  id: "manual-temperature",
  label: "Manual temperature",
  description: "Records one manual fridge, freezer, or probe reading. Does not call a sensor and does not retry.",
  actions: {
    status: { permission: "integrations.view", safety: "read" },
    recordReading: { permission: "temperatures.edit", safety: "machine" },
  },
  parseSettings(input) {
    return parseTemperatureSettings(input);
  },
  parseSecret(_settings, secret) {
    if (secret != null && !(isRecord(secret) && Object.keys(secret).length === 0)) {
      throw new ConnectorError("validation", "Manual temperature entry does not use a remote credential.");
    }
    return null;
  },
  secretMatches(_settings, secret) {
    return secret === null;
  },
  checkStatus() {
    return Promise.resolve({ status: "connected", error: null });
  },
  refreshAuth() {
    return Promise.resolve({
      refreshed: false,
      detail: "Manual temperature entry has no remote session to refresh.",
    });
  },
  run(action, ctx, input) {
    if (action !== "recordReading") throw new ConnectorError("validation", "Unknown temperature action.");
    const reading = parseReading(ctx, input);
    return Promise.resolve({ kind: "reading", reading });
  },
};

function parseReading(ctx: ActionContext, input: Record<string, unknown>): ReadingDraft {
  if (typeof input.deviceId !== "string" || !DEVICE_ID.test(input.deviceId)) {
    throw new ConnectorError("validation", "Device id is invalid.");
  }
  if (typeof input.celsius !== "number" || !Number.isFinite(input.celsius) || input.celsius < -40 || input.celsius > 120) {
    throw new ConnectorError("validation", "Temperature must be between -40 and 120 °C.");
  }
  let recordedAt = ctx.now().toISOString();
  if (input.recordedAt !== undefined) {
    if (typeof input.recordedAt !== "string" || Number.isNaN(Date.parse(input.recordedAt))) {
      throw new ConnectorError("validation", "recordedAt must be an ISO date.");
    }
    recordedAt = new Date(input.recordedAt).toISOString();
  }
  let note: string | null = null;
  if (input.note !== undefined && input.note !== null) {
    if (typeof input.note !== "string" || input.note.length > 200) {
      throw new ConnectorError("validation", "Note must be 200 characters or fewer.");
    }
    note = input.note;
  }
  return {
    deviceId: input.deviceId,
    celsius: Math.round(input.celsius * 10) / 10,
    recordedAt,
    note,
  };
}
