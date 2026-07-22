import { calculateVedic, type VedicChart } from "natalengine";

const GEOCODE_URL = "https://geocoding-api.open-meteo.com/v1/search";

export interface BirthDetailsInput {
  name?: string;
  date: string; // YYYY-MM-DD
  time: string; // HH:mm (24h)
  place: string;
  latitude?: number;
  longitude?: number;
  timezone?: string;
}

export interface GeocodedPlace {
  name: string;
  country?: string;
  admin1?: string;
  latitude: number;
  longitude: number;
  timezone: string;
  label: string;
}

export interface ChartPlanetRow {
  id: string;
  name: string;
  short: string;
  degree: string;
  rashi: string;
  rashiWestern: string;
  nakshatra: string;
  pada: number;
  house: number | null;
  longitude: number;
}

export interface HoroscopeChartResult {
  name: string | null;
  birth: {
    date: string;
    time: string;
    place: string;
    latitude: number;
    longitude: number;
    timezone: string;
    utcOffsetHours: number;
  };
  system: string;
  note: string;
  ayanamsa: { value: number; formatted: string; system: string };
  lagna: { rashi: string; rashiWestern: string; degree: string; nakshatra: string; pada: number } | null;
  moonSign: { rashi: string; rashiWestern: string; nakshatra: string; pada: number; summary: string };
  sunSign: { rashi: string; rashiWestern: string; nakshatra: string; pada: number };
  currentDasha: { lord: string; startDate: string; endDate: string; years: number } | null;
  dashas: Array<{ lord: string; startDate: string; endDate: string; years: number }>;
  planets: ChartPlanetRow[];
  houses: Array<{
    number: number;
    sign: string;
    signWestern: string;
    symbol: string;
    planets: Array<{ id: string; name: string; short: string; degree: string; nakshatra: string }>;
  }>;
  /** Compact block for AI astrology readings */
  readingContext: string;
}

function asIsoDate(value: unknown): string {
  if (value instanceof Date) return value.toISOString();
  if (typeof value === "string") return value;
  if (value == null) return "";
  try {
    return new Date(value as string | number).toISOString();
  } catch {
    return String(value);
  }
}

const PLANET_META: Record<string, { name: string; short: string }> = {
  sun: { name: "Sun", short: "Su" },
  moon: { name: "Moon", short: "Mo" },
  mars: { name: "Mars", short: "Ma" },
  mercury: { name: "Mercury", short: "Me" },
  jupiter: { name: "Jupiter", short: "Ju" },
  venus: { name: "Venus", short: "Ve" },
  saturn: { name: "Saturn", short: "Sa" },
  rahu: { name: "Rahu", short: "Ra" },
  ketu: { name: "Ketu", short: "Ke" },
  ascendant: { name: "Lagna", short: "As" },
};

function parseTimeToDecimalHours(time: string): number {
  const m = /^(\d{1,2}):(\d{2})$/.exec(time.trim());
  if (!m) throw new Error("INVALID_BIRTH_TIME");
  const h = Number(m[1]);
  const min = Number(m[2]);
  if (h < 0 || h > 23 || min < 0 || min > 59) throw new Error("INVALID_BIRTH_TIME");
  return h + min / 60;
}

/** Local timezone offset (hours east of UTC) for a wall-clock birth time. */
export function utcOffsetHoursForLocal(timeZone: string, date: string, time: string): number {
  const [y, mo, d] = date.split("-").map(Number);
  const [hh, mm] = time.split(":").map(Number);
  const asUtcGuess = Date.UTC(y, mo - 1, d, hh, mm, 0);

  const offsetAt = (utcMs: number) => {
    const parts = new Intl.DateTimeFormat("en-US", {
      timeZone,
      hourCycle: "h23",
      year: "numeric",
      month: "2-digit",
      day: "2-digit",
      hour: "2-digit",
      minute: "2-digit",
      second: "2-digit",
    }).formatToParts(new Date(utcMs));
    const map = Object.fromEntries(parts.filter((p) => p.type !== "literal").map((p) => [p.type, p.value]));
    const asUTC = Date.UTC(
      Number(map.year),
      Number(map.month) - 1,
      Number(map.day),
      Number(map.hour === "24" ? "0" : map.hour),
      Number(map.minute),
      Number(map.second),
    );
    return (asUTC - utcMs) / 3_600_000;
  };

  let utcMs = asUtcGuess;
  for (let i = 0; i < 4; i++) {
    const off = offsetAt(utcMs);
    utcMs = asUtcGuess - off * 3_600_000;
  }
  return Math.round(offsetAt(utcMs) * 100) / 100;
}

export async function geocodeBirthPlace(place: string): Promise<GeocodedPlace> {
  const url = `${GEOCODE_URL}?name=${encodeURIComponent(place.trim())}&count=1&language=en`;
  const ctrl = new AbortController();
  const timer = setTimeout(() => ctrl.abort(), 8_000);
  try {
    const res = await fetch(url, { signal: ctrl.signal });
    if (!res.ok) throw new Error("GEOCODE_FAILED");
    const data = (await res.json()) as {
      results?: Array<{
        name: string;
        country?: string;
        admin1?: string;
        latitude: number;
        longitude: number;
        timezone?: string;
      }>;
    };
    const found = data.results?.[0];
    if (!found) throw new Error("PLACE_NOT_FOUND");
    const label = [found.name, found.admin1, found.country].filter(Boolean).join(", ");
    return {
      name: found.name,
      country: found.country,
      admin1: found.admin1,
      latitude: found.latitude,
      longitude: found.longitude,
      timezone: found.timezone || "UTC",
      label,
    };
  } finally {
    clearTimeout(timer);
  }
}

function planetHouseMap(chart: VedicChart): Record<string, number> {
  const map: Record<string, number> = {};
  if (!chart.houses) return map;
  for (const [num, house] of Object.entries(chart.houses)) {
    for (const p of house.planets) {
      map[p.name.toLowerCase()] = Number(num);
    }
  }
  return map;
}

function buildReadingContext(result: Omit<HoroscopeChartResult, "readingContext">): string {
  const lines: string[] = [
    "STRUCTURED VEDIC NATAL CHART (Lahiri / sidereal) — use these exact placements; do not invent different signs or degrees.",
    `Native: ${result.name || "Seeker"}`,
    `Birth: ${result.birth.date} ${result.birth.time} · ${result.birth.place}`,
    `Ayanamsa: ${result.ayanamsa.system} ${result.ayanamsa.formatted}`,
  ];
  if (result.lagna) {
    lines.push(
      `Lagna (Ascendant): ${result.lagna.rashi} (${result.lagna.rashiWestern}) ${result.lagna.degree} · ${result.lagna.nakshatra} pada ${result.lagna.pada}`,
    );
  }
  lines.push(
    `Moon: ${result.moonSign.rashi} (${result.moonSign.rashiWestern}) · ${result.moonSign.nakshatra} pada ${result.moonSign.pada}`,
  );
  lines.push(
    `Sun: ${result.sunSign.rashi} (${result.sunSign.rashiWestern}) · ${result.sunSign.nakshatra} pada ${result.sunSign.pada}`,
  );
  if (result.currentDasha) {
    lines.push(
      `Current Vimshottari Mahadasha: ${result.currentDasha.lord} (${result.currentDasha.startDate.slice(0, 10)} → ${result.currentDasha.endDate.slice(0, 10)})`,
    );
  }
  lines.push("Planets:");
  for (const p of result.planets) {
    if (p.id === "ascendant") continue;
    lines.push(
      `- ${p.name}: ${p.rashi} (${p.rashiWestern}) ${p.degree} · ${p.nakshatra} p${p.pada}${p.house ? ` · house ${p.house}` : ""}`,
    );
  }
  lines.push("Houses (whole-sign from Lagna):");
  for (const h of result.houses) {
    const plist = h.planets.map((p) => `${p.short} ${p.degree}`).join(", ") || "—";
    lines.push(`- H${h.number} ${h.sign}/${h.signWestern}: ${plist}`);
  }
  return lines.join("\n");
}

export async function buildHoroscopeChart(input: BirthDetailsInput): Promise<HoroscopeChartResult> {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(input.date)) throw new Error("INVALID_BIRTH_DATE");
  const birthHour = parseTimeToDecimalHours(input.time);

  let place: GeocodedPlace;
  if (input.latitude != null && input.longitude != null && input.timezone) {
    place = {
      name: input.place.trim() || "Birth place",
      latitude: input.latitude,
      longitude: input.longitude,
      timezone: input.timezone,
      label: input.place.trim() || "Birth place",
    };
  } else {
    if (!input.place.trim()) throw new Error("PLACE_REQUIRED");
    place = await geocodeBirthPlace(input.place);
  }

  const utcOffset = utcOffsetHoursForLocal(place.timezone, input.date, input.time);
  const raw = calculateVedic(input.date, birthHour, utcOffset, place.latitude, place.longitude);
  const houseOf = planetHouseMap(raw);

  const planets: ChartPlanetRow[] = Object.entries(PLANET_META)
    .filter(([id]) => raw.positions[id])
    .map(([id, meta]) => {
      const pos = raw.positions[id]!;
      return {
        id,
        name: meta.name,
        short: meta.short,
        degree: pos.degree,
        rashi: pos.rashi.name,
        rashiWestern: pos.rashi.westernName,
        nakshatra: pos.nakshatra.name,
        pada: pos.nakshatra.pada,
        house: id === "ascendant" ? 1 : houseOf[id] ?? null,
        longitude: pos.longitude,
      };
    });

  const houses = raw.houses
    ? Object.entries(raw.houses)
        .map(([num, h]) => ({
          number: Number(num),
          sign: h.sign.name,
          signWestern: h.sign.westernName,
          symbol: h.sign.symbol,
          planets: h.planets.map((p) => {
            const id = p.name.toLowerCase();
            const meta = PLANET_META[id] ?? { name: p.name, short: p.name.slice(0, 2) };
            return {
              id,
              name: meta.name,
              short: meta.short,
              degree: p.degree,
              nakshatra: p.nakshatra,
            };
          }),
        }))
        .sort((a, b) => a.number - b.number)
    : [];

  const asc = raw.positions.ascendant;
  const sun = raw.positions.sun;
  const moon = raw.moonSign;

  const base = {
    name: input.name?.trim() || null,
    birth: {
      date: input.date,
      time: input.time,
      place: place.label,
      latitude: place.latitude,
      longitude: place.longitude,
      timezone: place.timezone,
      utcOffsetHours: utcOffset,
    },
    system: raw.system,
    note: raw.note,
    ayanamsa: {
      value: raw.ayanamsa.value,
      formatted: raw.ayanamsa.formatted,
      system: raw.ayanamsa.system,
    },
    lagna: asc
      ? {
          rashi: asc.rashi.name,
          rashiWestern: asc.rashi.westernName,
          degree: asc.degree,
          nakshatra: asc.nakshatra.name,
          pada: asc.nakshatra.pada,
        }
      : null,
    moonSign: {
      rashi: moon.rashi.name,
      rashiWestern: moon.rashi.westernName,
      nakshatra: moon.nakshatra.name,
      pada: moon.nakshatra.pada,
      summary: moon.summary,
    },
    sunSign: {
      rashi: sun.rashi.name,
      rashiWestern: sun.rashi.westernName,
      nakshatra: sun.nakshatra.name,
      pada: sun.nakshatra.pada,
    },
    currentDasha: raw.dasha.current
      ? {
          lord: raw.dasha.current.lord,
          startDate: asIsoDate(raw.dasha.current.startDate),
          endDate: asIsoDate(raw.dasha.current.endDate),
          years: raw.dasha.current.years,
        }
      : null,
    dashas: (raw.dasha.dashas ?? []).slice(0, 9).map((d) => ({
      lord: d.lord,
      startDate: asIsoDate(d.startDate),
      endDate: asIsoDate(d.endDate),
      years: d.years,
    })),
    planets,
    houses,
  };

  return {
    ...base,
    readingContext: buildReadingContext(base),
  };
}
