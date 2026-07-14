import { db } from "../db/schema.js";

export interface GeoLocation {
  city: string;
  region: string | null;
  country: string;
  latitude: number;
  longitude: number;
  timezone: string | null;
  source: "ip" | "browser" | "manual" | "saved";
  ip?: string;
  label: string;
}

function clientIp(req: { headers: Record<string, unknown>; ip?: string; socket?: { remoteAddress?: string } }): string | null {
  const xf = req.headers["x-forwarded-for"];
  if (typeof xf === "string" && xf.trim()) {
    return xf.split(",")[0]?.trim() || null;
  }
  if (Array.isArray(xf) && xf[0]) return String(xf[0]).split(",")[0]?.trim() || null;
  const realIp = req.headers["x-real-ip"];
  if (typeof realIp === "string" && realIp.trim()) return realIp.trim();
  const ip = req.ip || req.socket?.remoteAddress;
  if (!ip || ip === "::1" || ip === "127.0.0.1" || ip.startsWith("::ffff:127.")) return null;
  return ip.replace(/^::ffff:/, "");
}

async function lookupIpWhoIs(ip: string | null): Promise<GeoLocation | null> {
  const url = ip ? `https://ipwho.is/${encodeURIComponent(ip)}` : "https://ipwho.is/";
  const ctrl = new AbortController();
  const timer = setTimeout(() => ctrl.abort(), 6_000);
  try {
    const res = await fetch(url, { signal: ctrl.signal });
    if (!res.ok) return null;
    const data = (await res.json()) as {
      success?: boolean;
      city?: string;
      region?: string;
      country?: string;
      latitude?: number;
      longitude?: number;
      timezone?: { id?: string } | string;
      ip?: string;
    };
    if (data.success === false || !data.city || data.latitude == null || data.longitude == null) return null;
    const tz = typeof data.timezone === "string" ? data.timezone : data.timezone?.id ?? null;
    const country = data.country ?? "";
    const region = data.region ?? null;
    const label = [data.city, region, country].filter(Boolean).join(", ");
    return {
      city: data.city,
      region,
      country,
      latitude: data.latitude,
      longitude: data.longitude,
      timezone: tz,
      source: "ip",
      ip: data.ip ?? ip ?? undefined,
      label,
    };
  } catch {
    return null;
  } finally {
    clearTimeout(timer);
  }
}

export function getSavedLocation(userId: string): GeoLocation | null {
  const row = db
    .prepare(
      `SELECT home_city, home_region, home_country, home_lat, home_lon, home_timezone, location_source
       FROM user_preferences WHERE user_id = ?`
    )
    .get(userId) as
    | {
        home_city: string | null;
        home_region: string | null;
        home_country: string | null;
        home_lat: number | null;
        home_lon: number | null;
        home_timezone: string | null;
        location_source: string | null;
      }
    | undefined;

  if (!row?.home_city || row.home_lat == null || row.home_lon == null) return null;
  const label = [row.home_city, row.home_region, row.home_country].filter(Boolean).join(", ");
  return {
    city: row.home_city,
    region: row.home_region,
    country: row.home_country ?? "",
    latitude: row.home_lat,
    longitude: row.home_lon,
    timezone: row.home_timezone,
    source: (row.location_source as GeoLocation["source"]) || "saved",
    label,
  };
}

export function saveUserLocation(
  userId: string,
  loc: {
    city: string;
    region?: string | null;
    country?: string;
    latitude: number;
    longitude: number;
    timezone?: string | null;
    source: GeoLocation["source"];
  }
): GeoLocation {
  db.prepare("INSERT INTO user_preferences (user_id) VALUES (?) ON CONFLICT(user_id) DO NOTHING").run(userId);
  db.prepare(
    `UPDATE user_preferences SET
      home_city = ?, home_region = ?, home_country = ?, home_lat = ?, home_lon = ?,
      home_timezone = ?, location_source = ?, location_updated_at = datetime('now'), updated_at = datetime('now')
     WHERE user_id = ?`
  ).run(
    loc.city,
    loc.region ?? null,
    loc.country ?? null,
    loc.latitude,
    loc.longitude,
    loc.timezone ?? null,
    loc.source,
    userId
  );
  return getSavedLocation(userId)!;
}

/** Resolve location from request IP and optionally persist for the user. */
export async function resolveLocationFromRequest(
  userId: string,
  req: { headers: Record<string, unknown>; ip?: string; socket?: { remoteAddress?: string } },
  opts?: { forceRefresh?: boolean; save?: boolean }
): Promise<GeoLocation | null> {
  const saved = getSavedLocation(userId);
  if (saved && !opts?.forceRefresh && saved.source !== "ip") {
    // Manual/browser locations stay until user updates
    return saved;
  }

  const ip = clientIp(req);
  const fresh = await lookupIpWhoIs(ip);
  if (!fresh) return saved;

  if (opts?.save !== false) {
    return saveUserLocation(userId, { ...fresh, source: "ip" });
  }
  return fresh;
}

export function locationQueryLabel(loc: GeoLocation | null | undefined): string | null {
  if (!loc) return null;
  return loc.city || loc.label || null;
}
