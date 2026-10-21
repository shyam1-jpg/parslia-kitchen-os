import { bookingPmsConnector } from "./connectors/bookingPms.ts";
import { manualTemperatureConnector } from "./connectors/manualTemperature.ts";
import { vedantaSettings, vedantaSetupHelp } from "./connectors/vedanta.ts";
import type { Connector } from "./types.ts";

export interface SettingsField {
  key: string;
  label: string;
  input: "text" | "secret" | "url" | "path" | "select" | "mapping";
  required: boolean;
  value: string | null;
  help: string;
  secret: boolean;
  options?: { value: string; label: string }[];
}

export interface SystemPreset {
  systemId: string;
  connectorId: string;
  label: string;
  summary: string;
  setupHelp: string;
  settings: Record<string, unknown>;
  secret: "api_key" | "oauth" | "none";
}

const genericMapping = {
  items: "items",
  externalId: "id",
  date: "date",
  covers: "covers",
  dietary: "dietary",
  service: "service",
  label: "label",
  dietaryLabel: "label",
  dietaryCount: "count",
};

export const systemPresets: SystemPreset[] = [
  {
    systemId: "vedanta-os",
    connectorId: "booking-pms",
    label: "Vedanta OS",
    summary: "Retreat booking admin. Reads covers and dietary needs with a per-system key.",
    setupHelp: vedantaSetupHelp,
    settings: vedantaSettings,
    secret: "api_key",
  },
  {
    systemId: "generic-booking",
    connectorId: "booking-pms",
    label: "Other booking / PMS",
    summary: "Any booking system that can return JSON covers and dietary needs for a date.",
    setupHelp:
      "Enter the base URL, the path that returns one day's covers, and the field names in that JSON. Paste that system's API key. The key is stored for this company only.",
    settings: {
      baseUrl: "",
      endpointPath: "/covers",
      dateQueryParam: "date",
      timeoutMs: 8000,
      retry: { maxAttempts: 3, baseDelayMs: 200 },
      auth: { mode: "api_key", headerName: "Authorization", scheme: "bearer" },
      fieldMapping: genericMapping,
    },
    secret: "api_key",
  },
  {
    systemId: "booking-oauth",
    connectorId: "booking-pms",
    label: "Booking system (OAuth refresh)",
    summary: "Same cover read, for a system that issues an access token and a refresh token.",
    setupHelp:
      "Enter the token URL and the read path. Paste the access token and refresh token. A sync refreshes the access token when it is expired or rejected. Machine commands are not part of this connector.",
    settings: {
      baseUrl: "",
      endpointPath: "/covers",
      dateQueryParam: "date",
      timeoutMs: 8000,
      retry: { maxAttempts: 3, baseDelayMs: 200 },
      auth: { mode: "oauth_refresh", tokenUrl: "" },
      fieldMapping: genericMapping,
    },
    secret: "oauth",
  },
  {
    systemId: "manual-temperature",
    connectorId: "manual-temperature",
    label: "Manual temperature",
    summary: "Type a temperature once. The same idempotency key will not log it twice.",
    setupHelp:
      "Matches the manual entry path on Smart Devices. Bluetooth pairing and Wi-Fi manufacturer accounts stay on that page; this connector does not call a sensor and does not retry a reading.",
    settings: { unit: "C" },
    secret: "none",
  },
];

export function builtinConnectors(): Connector[] {
  return [bookingPmsConnector, manualTemperatureConnector];
}

export function presetById(systemId: string | undefined): SystemPreset | undefined {
  if (!systemId) return undefined;
  return systemPresets.find((preset) => preset.systemId === systemId);
}

export function fieldsFor(preset: SystemPreset): SettingsField[] {
  if (preset.secret === "none") {
    return [
      {
        key: "unit",
        label: "Unit",
        input: "text",
        required: true,
        value: "C",
        help: "Celsius, the same unit Smart Devices already uses.",
        secret: false,
      },
    ];
  }
  const settings = preset.settings;
  const auth = (settings.auth ?? {}) as Record<string, unknown>;
  const fields: SettingsField[] = [
    {
      key: "baseUrl",
      label: "Base URL",
      input: "url",
      required: true,
      value: typeof settings.baseUrl === "string" ? settings.baseUrl : "",
      help: "Origin only, HTTPS. Each company uses its own account.",
      secret: false,
    },
    {
      key: "endpointPath",
      label: "Endpoint path",
      input: "path",
      required: true,
      value: typeof settings.endpointPath === "string" ? settings.endpointPath : "",
      help: "Path that returns covers for the date query parameter.",
      secret: false,
    },
    {
      key: "dateQueryParam",
      label: "Date query parameter",
      input: "text",
      required: true,
      value: typeof settings.dateQueryParam === "string" ? settings.dateQueryParam : "date",
      help: "Added to the request as YYYY-MM-DD.",
      secret: false,
    },
    {
      key: "fieldMapping",
      label: "Field mapping",
      input: "mapping",
      required: true,
      value: JSON.stringify(settings.fieldMapping ?? {}),
      help: "Where to find the row list, id, date, covers, and dietary needs.",
      secret: false,
    },
  ];
  if (preset.secret === "api_key") {
    fields.push(
      {
        key: "auth.headerName",
        label: "Auth header",
        input: "text",
        required: true,
        value: typeof auth.headerName === "string" ? auth.headerName : "Authorization",
        help: "Header that carries this company's key.",
        secret: false,
      },
      {
        key: "auth.scheme",
        label: "Auth scheme",
        input: "select",
        required: true,
        value: typeof auth.scheme === "string" ? auth.scheme : "bearer",
        help: "Bearer adds the Bearer prefix. Raw sends the key as the header value.",
        secret: false,
        options: [
          { value: "bearer", label: "Bearer token" },
          { value: "raw", label: "Raw header value" },
        ],
      },
      {
        key: "secret.apiKey",
        label: "API key",
        input: "secret",
        required: true,
        value: null,
        help: "Shown once by the other system. Stored for this company only and not displayed again.",
        secret: true,
      },
    );
  } else {
    fields.push(
      {
        key: "auth.tokenUrl",
        label: "Token URL",
        input: "url",
        required: true,
        value: typeof auth.tokenUrl === "string" ? auth.tokenUrl : "",
        help: "Refresh-token endpoint for this company's account.",
        secret: false,
      },
      {
        key: "secret.accessToken",
        label: "Access token",
        input: "secret",
        required: true,
        value: null,
        help: "Stored for this company only.",
        secret: true,
      },
      {
        key: "secret.refreshToken",
        label: "Refresh token",
        input: "secret",
        required: true,
        value: null,
        help: "Used to refresh the access token. Not shown again.",
        secret: true,
      },
    );
  }
  return fields;
}
