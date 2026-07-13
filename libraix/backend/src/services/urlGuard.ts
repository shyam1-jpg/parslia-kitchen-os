import { lookup } from "node:dns/promises";
import net from "node:net";

const BLOCKED_HOSTS = new Set(["localhost", "127.0.0.1", "0.0.0.0", "::1"]);

function isPrivateIp(ip: string): boolean {
  if (net.isIPv4(ip)) {
    const parts = ip.split(".").map(Number);
    if (parts[0] === 10) return true;
    if (parts[0] === 127) return true;
    if (parts[0] === 169 && parts[1] === 254) return true;
    if (parts[0] === 172 && parts[1] >= 16 && parts[1] <= 31) return true;
    if (parts[0] === 192 && parts[1] === 168) return true;
    return false;
  }
  if (ip.startsWith("fc") || ip.startsWith("fd") || ip === "::1") return true;
  return false;
}

/** Validate a public HTTP(S) URL and block SSRF to private networks. */
export async function assertPublicHttpUrl(raw: string): Promise<URL> {
  let url: URL;
  try {
    url = new URL(raw);
  } catch {
    throw new Error("INVALID_URL");
  }
  if (!["http:", "https:"].includes(url.protocol)) throw new Error("INVALID_URL");
  const host = url.hostname.toLowerCase();
  if (BLOCKED_HOSTS.has(host) || host.endsWith(".local")) throw new Error("URL_NOT_ALLOWED");

  if (net.isIP(host)) {
    if (isPrivateIp(host)) throw new Error("URL_NOT_ALLOWED");
    return url;
  }

  try {
    const records = await lookup(host, { all: true });
    for (const r of records) {
      if (isPrivateIp(r.address)) throw new Error("URL_NOT_ALLOWED");
    }
  } catch (e) {
    if (e instanceof Error && e.message === "URL_NOT_ALLOWED") throw e;
    throw new Error("URL_UNREACHABLE");
  }
  return url;
}
