import { ConnectorError } from "../errors.ts";
import type {
  ActionContext,
  BookingSettings,
  Connector,
  CoverDraft,
  HttpResult,
  RowIssue,
  Secret,
} from "../types.ts";
import {
  assertCredential,
  assertDate,
  assertEndpointPath,
  assertHeaderName,
  assertPublicBaseUrl,
  assertPublicUrl,
  buildUrl,
  dietaryFrom,
  getPath,
  isRecord,
  readCovers,
  rejectSecretsInSettings,
  requiredPath,
} from "../validate.ts";

const MAX_ROWS = 500;

export function parseBookingSettings(input: unknown, env: { allowLoopback: boolean }): BookingSettings {
  if (!isRecord(input)) throw new ConnectorError("validation", "Booking settings must be an object.");
  rejectSecretsInSettings(input);
  rejectSecretsInSettings(input.fieldMapping);
  rejectSecretsInSettings(input.auth);
  rejectSecretsInSettings(input.retry);
  const mapping = isRecord(input.fieldMapping) ? input.fieldMapping : {};
  const auth = isRecord(input.auth) ? input.auth : {};
  const retry = isRecord(input.retry) ? input.retry : {};
  const mode = auth.mode ?? "api_key";
  let parsedAuth: BookingSettings["auth"];
  if (mode === "api_key") {
    const scheme = auth.scheme ?? "bearer";
    if (scheme !== "raw" && scheme !== "bearer") {
      throw new ConnectorError("validation", "Auth scheme must be bearer or raw.");
    }
    parsedAuth = {
      mode: "api_key",
      headerName: assertHeaderName(typeof auth.headerName === "string" ? auth.headerName : "Authorization"),
      scheme,
    };
  } else if (mode === "oauth_refresh") {
    if (typeof auth.tokenUrl !== "string") throw new ConnectorError("validation", "OAuth token URL is required.");
    parsedAuth = { mode: "oauth_refresh", tokenUrl: assertPublicUrl(auth.tokenUrl, env.allowLoopback) };
  } else {
    throw new ConnectorError("validation", "Auth mode must be api_key or oauth_refresh.");
  }

  const timeoutMs = input.timeoutMs === undefined ? 8000 : input.timeoutMs;
  if (typeof timeoutMs !== "number" || !Number.isInteger(timeoutMs) || timeoutMs < 200 || timeoutMs > 30000) {
    throw new ConnectorError("validation", "Timeout must be between 200 and 30000 ms.");
  }
  const maxAttempts = retry.maxAttempts === undefined ? 3 : retry.maxAttempts;
  const baseDelayMs = retry.baseDelayMs === undefined ? 200 : retry.baseDelayMs;
  if (typeof maxAttempts !== "number" || !Number.isInteger(maxAttempts) || maxAttempts < 1 || maxAttempts > 4) {
    throw new ConnectorError("validation", "Retry attempts must be between 1 and 4.");
  }
  if (typeof baseDelayMs !== "number" || !Number.isInteger(baseDelayMs) || baseDelayMs < 0 || baseDelayMs > 2000) {
    throw new ConnectorError("validation", "Retry delay must be between 0 and 2000 ms.");
  }
  const dateQueryParam = input.dateQueryParam === undefined ? "date" : input.dateQueryParam;
  if (typeof dateQueryParam !== "string" || !/^[A-Za-z][A-Za-z0-9_]{0,30}$/.test(dateQueryParam)) {
    throw new ConnectorError("validation", "Date query parameter name is invalid.");
  }
  if (typeof input.baseUrl !== "string") throw new ConnectorError("validation", "Base URL is required.");
  if (typeof input.endpointPath !== "string") throw new ConnectorError("validation", "Endpoint path is required.");
  const statusPath = input.statusPath === undefined ? input.endpointPath : input.statusPath;
  if (typeof statusPath !== "string") throw new ConnectorError("validation", "Status path is invalid.");

  return {
    baseUrl: assertPublicBaseUrl(input.baseUrl, env.allowLoopback),
    endpointPath: assertEndpointPath(input.endpointPath),
    statusPath: assertEndpointPath(statusPath),
    dateQueryParam,
    timeoutMs,
    retry: { maxAttempts, baseDelayMs },
    auth: parsedAuth,
    fieldMapping: {
      items: requiredPath(mapping.items, "Items path", true),
      externalId: requiredPath(mapping.externalId, "External id path"),
      date: requiredPath(mapping.date, "Date path"),
      covers: requiredPath(mapping.covers, "Covers path"),
      dietary: requiredPath(mapping.dietary, "Dietary path"),
      service:
        mapping.service === undefined || mapping.service === ""
          ? undefined
          : requiredPath(mapping.service, "Service path"),
      label:
        mapping.label === undefined || mapping.label === "" ? undefined : requiredPath(mapping.label, "Label path"),
      dietaryLabel:
        mapping.dietaryLabel === undefined || mapping.dietaryLabel === ""
          ? "label"
          : requiredPath(mapping.dietaryLabel, "Dietary label path"),
      dietaryCount:
        mapping.dietaryCount === undefined || mapping.dietaryCount === ""
          ? "count"
          : requiredPath(mapping.dietaryCount, "Dietary count path"),
    },
  };
}

export function parseBookingSecret(settings: BookingSettings, secret: unknown): Secret {
  if (!isRecord(secret)) throw new ConnectorError("validation", "Credential is required.");
  if (settings.auth.mode === "api_key") {
    return { kind: "api_key", apiKey: assertCredential(secret.apiKey, "API key") };
  }
  const expiresAt = secret.expiresAt;
  if (expiresAt !== undefined && expiresAt !== null && typeof expiresAt !== "string") {
    throw new ConnectorError("validation", "Token expiry must be an ISO date.");
  }
  return {
    kind: "oauth",
    accessToken: assertCredential(secret.accessToken, "Access token"),
    refreshToken: assertCredential(secret.refreshToken, "Refresh token"),
    expiresAt: typeof expiresAt === "string" ? expiresAt : null,
  };
}

export function bookingSecretMatches(settings: BookingSettings, secret: Secret | null): boolean {
  if (!secret) return false;
  return settings.auth.mode === "api_key" ? secret.kind === "api_key" : secret.kind === "oauth";
}

function settingsOf(ctx: ActionContext): BookingSettings {
  return ctx.settings as BookingSettings;
}

function headersFor(settings: BookingSettings, secret: Secret): Record<string, string> {
  if (settings.auth.mode === "api_key") {
    if (secret.kind !== "api_key") throw new ConnectorError("auth", "Reconnect with an API key.");
    const value = settings.auth.scheme === "bearer" ? `Bearer ${secret.apiKey}` : secret.apiKey;
    return { accept: "application/json", [settings.auth.headerName]: value };
  }
  if (secret.kind !== "oauth") throw new ConnectorError("auth", "Reconnect with an OAuth token.");
  return { accept: "application/json", authorization: `Bearer ${secret.accessToken}` };
}

function tokenExpired(secret: Extract<Secret, { kind: "oauth" }>, now: Date): boolean {
  if (!secret.expiresAt) return false;
  const expiry = Date.parse(secret.expiresAt);
  if (Number.isNaN(expiry)) return false;
  return expiry - 30_000 <= now.getTime();
}

async function refreshOauth(ctx: ActionContext, settings: BookingSettings, secret: Extract<Secret, { kind: "oauth" }>): Promise<Secret> {
  if (settings.auth.mode !== "oauth_refresh") {
    throw new ConnectorError("validation", "This connection does not use OAuth refresh.");
  }
  if (!ctx.allowCredentialRefresh) {
    throw new ConnectorError("auth", "The saved token needs a manager to reconnect.");
  }
  const body = new URLSearchParams({ grant_type: "refresh_token", refresh_token: secret.refreshToken });
  let response: HttpResult;
  try {
    response = await ctx.request({
      url: settings.auth.tokenUrl,
      method: "POST",
      headers: { accept: "application/json", "content-type": "application/x-www-form-urlencoded" },
      body: body.toString(),
      timeoutMs: settings.timeoutMs,
      retry: { maxAttempts: 1, baseDelayMs: 0 },
      safety: "read",
    });
  } catch (error) {
    if (error instanceof ConnectorError && error.code === "auth") {
      throw new ConnectorError("auth", "The refresh token was rejected. Reconnect the booking system.");
    }
    throw error;
  }
  if (!isRecord(response.body) || typeof response.body.access_token !== "string") {
    throw new ConnectorError("refresh_failed", "The token response did not include a new access token.");
  }
  const refreshToken =
    typeof response.body.refresh_token === "string" ? response.body.refresh_token : secret.refreshToken;
  let expiresAt: string | null = secret.expiresAt;
  if (typeof response.body.expires_in === "number" && Number.isFinite(response.body.expires_in)) {
    expiresAt = new Date(ctx.now().getTime() + response.body.expires_in * 1000).toISOString();
  }
  const next = parseBookingSecret(settings, {
    accessToken: response.body.access_token,
    refreshToken,
    expiresAt,
  });
  ctx.saveSecret(next);
  return next;
}

async function authorisedGet(
  ctx: ActionContext,
  path: string,
  date: string,
): Promise<{ response: HttpResult; secret: Secret }> {
  const settings = settingsOf(ctx);
  if (!ctx.secret || !bookingSecretMatches(settings, ctx.secret)) {
    throw new ConnectorError("auth", "This connection has no usable credential. Reconnect it.");
  }
  let secret = ctx.secret;
  if (secret.kind === "oauth" && settings.auth.mode === "oauth_refresh" && tokenExpired(secret, ctx.now())) {
    secret = await refreshOauth(ctx, settings, secret);
  }
  const url = buildUrl(settings.baseUrl, path, { [settings.dateQueryParam]: date });
  try {
    const response = await ctx.request({
      url,
      method: "GET",
      headers: headersFor(settings, secret),
      timeoutMs: settings.timeoutMs,
      retry: settings.retry,
      safety: "read",
    });
    return { response, secret };
  } catch (error) {
    if (
      error instanceof ConnectorError &&
      error.code === "auth" &&
      secret.kind === "oauth" &&
      settings.auth.mode === "oauth_refresh" &&
      ctx.allowCredentialRefresh
    ) {
      const refreshed = await refreshOauth(ctx, settings, secret);
      const response = await ctx.request({
        url,
        method: "GET",
        headers: headersFor(settings, refreshed),
        timeoutMs: settings.timeoutMs,
        retry: settings.retry,
        safety: "read",
      });
      return { response, secret: refreshed };
    }
    throw error;
  }
}

export function mapCoverRows(body: unknown, settings: BookingSettings, requestedDate: string): { rows: CoverDraft[]; issues: RowIssue[] } {
  const mapping = settings.fieldMapping;
  const source = getPath(body, mapping.items);
  if (!Array.isArray(source)) {
    throw new ConnectorError(
      "upstream",
      `Field mapping "${mapping.items}" did not return a list. Change the items path to match the response.`,
    );
  }
  const issues: RowIssue[] = [];
  const rows: CoverDraft[] = [];
  const limited = source.slice(0, MAX_ROWS);
  if (source.length > MAX_ROWS) {
    issues.push({ index: MAX_ROWS, message: `Only the first ${MAX_ROWS} rows were imported.` });
  }
  limited.forEach((item, index) => {
    if (!isRecord(item)) {
      issues.push({ index, message: "Row was not an object." });
      return;
    }
    const idValue = getPath(item, mapping.externalId);
    const externalId = typeof idValue === "string" || typeof idValue === "number" ? String(idValue).trim() : "";
    if (!externalId || externalId.length > 80) {
      issues.push({ index, message: "Row has no usable external id." });
      return;
    }
    const rawDate = getPath(item, mapping.date);
    let date = requestedDate;
    if (rawDate !== undefined && rawDate !== null && rawDate !== "") {
      if (typeof rawDate !== "string" || !/^\d{4}-\d{2}-\d{2}$/.test(rawDate)) {
        issues.push({ index, message: "Row date was not YYYY-MM-DD." });
        return;
      }
      if (rawDate !== requestedDate) {
        issues.push({ index, message: `Row date ${rawDate} does not match the requested service date.` });
        return;
      }
      date = rawDate;
    }
    const covers = readCovers(getPath(item, mapping.covers));
    if (covers === null) {
      issues.push({ index, message: "Row covers must be a whole number from 0 to 100000." });
      return;
    }
    const dietary = dietaryFrom(
      getPath(item, mapping.dietary),
      mapping.dietaryLabel,
      mapping.dietaryCount,
    );
    if (dietary.issue) issues.push({ index, message: dietary.issue });
    const serviceValue = mapping.service ? getPath(item, mapping.service) : undefined;
    const service = typeof serviceValue === "string" && serviceValue.trim() ? serviceValue.trim().slice(0, 40) : "all-day";
    const labelValue = mapping.label ? getPath(item, mapping.label) : undefined;
    const label = typeof labelValue === "string" ? labelValue.trim().slice(0, 120) : "";
    rows.push({ externalId, date, service, label, covers, dietaryNeeds: dietary.needs });
  });
  return { rows, issues };
}

async function readDay(ctx: ActionContext, path: string, date: string): Promise<HttpResult> {
  const { response } = await authorisedGet(ctx, path, date);
  return response;
}

export const bookingPmsConnector: Connector = {
  id: "booking-pms",
  label: "Booking / PMS",
  description: "Reads covers and dietary needs from a booking system using that company's own URL, key, path, and field mapping.",
  actions: {
    status: { permission: "integrations.view", safety: "read" },
    syncCovers: { permission: "kitchen_ops.edit", safety: "read" },
  },
  parseSettings: parseBookingSettings,
  parseSecret(settings, secret) {
    return parseBookingSecret(settings as BookingSettings, secret);
  },
  secretMatches(settings, secret) {
    return bookingSecretMatches(settings as BookingSettings, secret);
  },
  async checkStatus(ctx) {
    const settings = settingsOf(ctx);
    await readDay(ctx, settings.statusPath, ctx.now().toISOString().slice(0, 10));
    return { status: "connected", error: null };
  },
  async refreshAuth(ctx) {
    const settings = settingsOf(ctx);
    if (settings.auth.mode !== "oauth_refresh" || ctx.secret?.kind !== "oauth") {
      return {
        refreshed: false,
        detail: "API keys are not refreshed. The connection was checked again. Paste a new key to reconnect.",
      };
    }
    await refreshOauth(ctx, settings, ctx.secret);
    return { refreshed: true, detail: "Access token refreshed." };
  },
  async run(action, ctx, input) {
    if (action !== "syncCovers") throw new ConnectorError("validation", "Unknown booking action.");
    const date = assertDate(input.date);
    const settings = settingsOf(ctx);
    const response = await readDay(ctx, settings.endpointPath, date);
    const mapped = mapCoverRows(response.body, settings, date);
    return { kind: "covers", ...mapped, upstreamAttempts: response.attempts, date };
  },
};
