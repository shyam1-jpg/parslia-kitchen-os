import { isIP } from "node:net";
import { ConnectorError } from "./errors.ts";
import type { DietaryNeed } from "./types.ts";

const PATH = /^[A-Za-z_][A-Za-z0-9_]*(\.[A-Za-z_][A-Za-z0-9_]*)*$/;
const BLOCKED_HOSTS = new Set(["169.254.169.254", "metadata.google.internal", "0.0.0.0"]);
const SECRET_KEYS = new Set([
  "apikey",
  "accesstoken",
  "refreshtoken",
  "password",
  "secret",
  "token",
  "authorization",
]);

export function isRecord(value: unknown): value is Record<string, unknown> {
  return !!value && typeof value === "object" && !Array.isArray(value);
}

export function assertDotPath(path: string, label: string, allowRoot = false): string {
  if (allowRoot && path === ".") return ".";
  if (!PATH.test(path)) {
    throw new ConnectorError("validation", `${label} must be a field path such as items or data.bookings.`);
  }
  return path;
}

export function requiredPath(value: unknown, label: string, allowRoot = false): string {
  if (typeof value !== "string" || value.trim() === "") {
    throw new ConnectorError("validation", `${label} is required.`);
  }
  return assertDotPath(value.trim(), label, allowRoot);
}

export function getPath(value: unknown, path: string): unknown {
  if (path === "." || path === "") return value;
  let current = value;
  for (const part of path.split(".")) {
    if (current === null || typeof current !== "object") return undefined;
    current = (current as Record<string, unknown>)[part];
  }
  return current;
}

export function assertPublicBaseUrl(input: string, allowLoopback: boolean): string {
  return assertRemoteUrl(input, allowLoopback, "origin");
}

/** Token endpoints may include a path. They still cannot carry credentials or a query string. */
export function assertPublicUrl(input: string, allowLoopback: boolean): string {
  return assertRemoteUrl(input, allowLoopback, "path");
}

function assertRemoteUrl(input: string, allowLoopback: boolean, mode: "origin" | "path"): string {
  const label = mode === "origin" ? "Base URL" : "Token URL";
  let url: URL;
  try {
    url = new URL(input);
  } catch {
    throw new ConnectorError("validation", `${label} is not a valid URL.`);
  }
  if (url.username || url.password) {
    throw new ConnectorError("validation", `${label} must not contain a username or password.`);
  }
  if (url.search || url.hash) {
    throw new ConnectorError("validation", `${label} must not include a query or hash.`);
  }
  if (mode === "origin" && url.pathname !== "/" && url.pathname !== "") {
    throw new ConnectorError("validation", "Put the API path in the endpoint path, not the base URL.");
  }
  if (mode === "path" && (url.pathname.includes("..") || url.pathname.includes("//"))) {
    throw new ConnectorError("validation", "Token URL path is not allowed.");
  }
  const host = url.hostname.replace(/^\[|\]$/g, "").toLowerCase();
  if (BLOCKED_HOSTS.has(host)) {
    throw new ConnectorError("validation", "That host is not allowed.");
  }
  if (isIP(host) && !isPublicAddress(host) && !(allowLoopback && ["127.0.0.1", "::1"].includes(host))) {
    throw new ConnectorError("validation", "Non-public IP addresses are not allowed.");
  }
  const loopback = host === "localhost" || host === "127.0.0.1" || host === "::1";
  if (url.protocol === "http:") {
    if (!(allowLoopback && loopback)) {
      throw new ConnectorError("validation", `${label} must use HTTPS.`);
    }
  } else if (url.protocol !== "https:") {
    throw new ConnectorError("validation", `${label} must use HTTPS.`);
  }
  if (!allowLoopback && loopback) {
    throw new ConnectorError("validation", "Loopback addresses are not allowed.");
  }
  const path = url.pathname === "/" ? "" : url.pathname;
  return `${url.protocol}//${url.host}${path}`;
}

export function assertEndpointPath(path: string): string {
  if (
    !path.startsWith("/") ||
    path.startsWith("//") ||
    path.includes("..") ||
    path.includes("://") ||
    path.includes("?") ||
    path.includes("#") ||
    path.includes("\\") ||
    /\s/.test(path) ||
    path.length > 200
  ) {
    throw new ConnectorError("validation", "Endpoint path must start with / and stay on this host.");
  }
  return path;
}

export function buildUrl(baseUrl: string, path: string, query?: Record<string, string>): string {
  const url = new URL(path, baseUrl.endsWith("/") ? baseUrl : `${baseUrl}/`);
  if (url.origin !== new URL(baseUrl).origin) {
    throw new ConnectorError("validation", "Endpoint path left the configured host.");
  }
  if (query) {
    for (const [key, value] of Object.entries(query)) url.searchParams.set(key, value);
  }
  return url.toString();
}

export function assertDate(value: unknown): string {
  if (typeof value !== "string" || !/^\d{4}-\d{2}-\d{2}$/.test(value)) {
    throw new ConnectorError("validation", "Date must be YYYY-MM-DD.");
  }
  const [year, month, day] = value.split("-").map(Number);
  const date = new Date(Date.UTC(year!, month! - 1, day));
  if (date.getUTCFullYear() !== year || date.getUTCMonth() !== month! - 1 || date.getUTCDate() !== day) {
    throw new ConnectorError("validation", "Date is not a real calendar day.");
  }
  return value;
}

export function rejectSecretsInSettings(value: unknown): void {
  if (!isRecord(value)) return;
  for (const key of Object.keys(value)) {
    const normalised = key.toLowerCase().replace(/[-_]/g, "");
    if (SECRET_KEYS.has(normalised)) {
      throw new ConnectorError(
        "validation",
        "Put credentials in the secret field. Settings are shown in the connection list.",
      );
    }
  }
}

export function assertHeaderName(name: string): string {
  if (!/^[A-Za-z0-9-]{1,40}$/.test(name)) {
    throw new ConnectorError("validation", "Auth header name is invalid.");
  }
  return name;
}

export function assertCredential(value: unknown, label: string): string {
  if (typeof value !== "string") {
    throw new ConnectorError("validation", `${label} is required.`);
  }
  const trimmed = value.trim();
  if (trimmed.length < 8 || trimmed.length > 500) {
    throw new ConnectorError("validation", `${label} must be between 8 and 500 characters.`);
  }
  if (/[\r\n]/.test(trimmed)) {
    throw new ConnectorError("validation", `${label} cannot contain line breaks.`);
  }
  return trimmed;
}

export function canonical(value: unknown): string {
  if (Array.isArray(value)) return `[${value.map((item) => canonical(item)).join(",")}]`;
  if (isRecord(value)) {
    return `{${Object.keys(value)
      .sort()
      .map((key) => `${JSON.stringify(key)}:${canonical(value[key])}`)
      .join(",")}}`;
  }
  return JSON.stringify(value) ?? "null";
}

export function redact(text: string): string {
  return text.replace(/[A-Za-z0-9_\-~+/]{20,}/g, "[redacted]").slice(0, 180);
}

export function dietaryFrom(
  value: unknown,
  labelPath: string,
  countPath: string,
): { needs: DietaryNeed[]; issue?: string } {
  if (value == null || value === "") return { needs: [] };
  if (typeof value === "string") return { needs: splitNotes(value) };
  if (typeof value === "number" && Number.isFinite(value)) return { needs: [{ label: String(value) }] };
  if (!Array.isArray(value)) return { needs: [], issue: "Dietary field was not text or a list." };
  const needs: DietaryNeed[] = [];
  for (const item of value) {
    if (needs.length >= 20) return { needs, issue: "Dietary list was truncated at 20." };
    if (typeof item === "string" && item.trim()) {
      needs.push({ label: item.trim().slice(0, 80) });
      continue;
    }
    if (!isRecord(item)) continue;
    const label = getPath(item, labelPath);
    if (typeof label !== "string" || !label.trim()) continue;
    const need: DietaryNeed = { label: label.trim().slice(0, 80) };
    const count = getPath(item, countPath);
    if (typeof count === "number" && Number.isInteger(count) && count > 0 && count <= 10000) need.count = count;
    needs.push(need);
  }
  return { needs };
}

function splitNotes(text: string): DietaryNeed[] {
  return text
    .split(/[,;\n]/)
    .map((part) => part.trim())
    .filter(Boolean)
    .slice(0, 20)
    .map((part) => {
      const match = /^(\d+)\s+(.+)$/.exec(part);
      if (!match) return { label: part.slice(0, 80) };
      const count = Number(match[1]);
      if (!Number.isInteger(count) || count <= 0 || count > 10000) return { label: part.slice(0, 80) };
      return { label: match[2].trim().slice(0, 80), count };
    });
}

export function readCovers(value: unknown): number | null {
  const number = typeof value === "number" ? value : typeof value === "string" && value.trim() !== "" ? Number(value) : Number.NaN;
  if (!Number.isInteger(number) || number < 0 || number > 100000) return null;
  return number;
}

export function safeTarget(url: string): string {
  try {
    const parsed = new URL(url);
    return `${parsed.origin}${parsed.pathname}`;
  } catch {
    return "the other system";
  }
}


/** Literal-IP guard only. Production transport must also pin checked DNS answers. */
export function isPublicAddress(address: string): boolean {
  if (isIP(address) === 4) {
    const [a, b] = address.split(".").map(Number);
    return !(a === 0 || a === 10 || a === 127 || a >= 224 ||
      (a === 100 && b >= 64 && b <= 127) || (a === 169 && b === 254) ||
      (a === 172 && b >= 16 && b <= 31) || (a === 192 && (b === 0 || b === 168)) ||
      (a === 198 && (b === 18 || b === 19 || b === 51)) || (a === 203 && b === 0));
  }
  // Conservative global-unicast IPv6 policy; deny mapped/translation/tunnel ranges.
  return isIP(address) === 6 && /^[23]/.test(address) &&
    !/^2001:(?:0*:|db8:|[012][0-9a-f]:)/i.test(address) && !/^2002:/i.test(address);
}
