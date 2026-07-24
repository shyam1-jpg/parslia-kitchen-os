import { calculateAstrology, calculateVedic, type VedicChart } from "natalengine";

const GEOCODE_URL = "https://geocoding-api.open-meteo.com/v1/search";

export interface BirthDetailsInput {
  name?: string;
  gender?: "female" | "male" | "other" | "unspecified";
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
  element: string;
  quality: string;
  ruler: string;
  nakshatra: string;
  nakshatraLord: string;
  pada: number;
  house: number | null;
  longitude: number;
  dignity: string;
}

export interface ChartYoga {
  id: string;
  name: string;
  present: boolean;
  severity: "info" | "notable" | "caution";
  summary: string;
  detail: string;
}

export interface ChartAspect {
  planet1: string;
  planet2: string;
  aspect: string;
  symbol: string;
  orb: string;
  meaning: string;
  nature: string;
}

export interface HoroscopeChartResult {
  name: string | null;
  gender: string;
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
  lagna: {
    rashi: string;
    rashiWestern: string;
    degree: string;
    nakshatra: string;
    nakshatraLord: string;
    pada: number;
    element: string;
    quality: string;
    ruler: string;
  } | null;
  moonSign: {
    rashi: string;
    rashiWestern: string;
    nakshatra: string;
    nakshatraLord: string;
    pada: number;
    summary: string;
    element: string;
    quality: string;
  };
  sunSign: {
    rashi: string;
    rashiWestern: string;
    nakshatra: string;
    nakshatraLord: string;
    pada: number;
    element: string;
    quality: string;
  };
  currentDasha: { lord: string; startDate: string; endDate: string; years: number } | null;
  dashas: Array<{ lord: string; startDate: string; endDate: string; years: number }>;
  planets: ChartPlanetRow[];
  houses: Array<{
    number: number;
    sign: string;
    signWestern: string;
    symbol: string;
    lord: string;
    meaning: string;
    planets: Array<{ id: string; name: string; short: string; degree: string; nakshatra: string }>;
  }>;
  houseLords: Array<{ house: number; sign: string; lord: string; lordHouse: number | null; meaning: string }>;
  yogas: ChartYoga[];
  aspects: ChartAspect[];
  balance: {
    elements: Record<string, number>;
    modalities: Record<string, number>;
    dominantElement: string | null;
    dominantModality: string | null;
  };
  western: {
    bigThree: string | null;
    rising: string | null;
    midheaven: string | null;
  };
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

const HOUSE_MEANINGS: Record<number, string> = {
  1: "Self, body, personality, vitality",
  2: "Wealth, speech, family, values",
  3: "Siblings, courage, skills, short travel",
  4: "Home, mother, emotions, property",
  5: "Children, creativity, romance, intellect",
  6: "Health, service, debts, competition",
  7: "Marriage, partnerships, public dealings",
  8: "Transformation, longevity, occult, inheritance",
  9: "Dharma, fortune, father, higher learning",
  10: "Career, status, authority, reputation",
  11: "Gains, networks, aspirations, income",
  12: "Loss, foreign lands, spirituality, solitude",
};

/** Own / exaltation / debilitation (simplified Vedic). */
const DIGNITY: Record<string, { own: string[]; exalt: string; debilitated: string }> = {
  sun: { own: ["Simha"], exalt: "Mesha", debilitated: "Tula" },
  moon: { own: ["Karka"], exalt: "Vrishabha", debilitated: "Vrishchika" },
  mars: { own: ["Mesha", "Vrishchika"], exalt: "Makara", debilitated: "Karka" },
  mercury: { own: ["Mithuna", "Kanya"], exalt: "Kanya", debilitated: "Meena" },
  jupiter: { own: ["Dhanu", "Meena"], exalt: "Karka", debilitated: "Makara" },
  venus: { own: ["Vrishabha", "Tula"], exalt: "Meena", debilitated: "Kanya" },
  saturn: { own: ["Makara", "Kumbha"], exalt: "Tula", debilitated: "Mesha" },
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

/** Historic Indian birth cities — never trust ambiguous Open-Meteo rank (Calcutta ZA). */
const PLACE_HARD_OVERRIDES: Record<string, GeocodedPlace> = {
  calcutta: {
    name: "Kolkata",
    country: "India",
    admin1: "West Bengal",
    latitude: 22.56263,
    longitude: 88.36304,
    timezone: "Asia/Kolkata",
    label: "Kolkata, West Bengal, India",
  },
  kolkatta: {
    name: "Kolkata",
    country: "India",
    admin1: "West Bengal",
    latitude: 22.56263,
    longitude: 88.36304,
    timezone: "Asia/Kolkata",
    label: "Kolkata, West Bengal, India",
  },
  kolkata: {
    name: "Kolkata",
    country: "India",
    admin1: "West Bengal",
    latitude: 22.56263,
    longitude: 88.36304,
    timezone: "Asia/Kolkata",
    label: "Kolkata, West Bengal, India",
  },
  bombay: {
    name: "Mumbai",
    country: "India",
    admin1: "Maharashtra",
    latitude: 19.07283,
    longitude: 72.88261,
    timezone: "Asia/Kolkata",
    label: "Mumbai, Maharashtra, India",
  },
  madras: {
    name: "Chennai",
    country: "India",
    admin1: "Tamil Nadu",
    latitude: 13.08784,
    longitude: 80.27847,
    timezone: "Asia/Kolkata",
    label: "Chennai, Tamil Nadu, India",
  },
  bangalore: {
    name: "Bengaluru",
    country: "India",
    admin1: "Karnataka",
    latitude: 12.97194,
    longitude: 77.59369,
    timezone: "Asia/Kolkata",
    label: "Bengaluru, Karnataka, India",
  },
};

function normalizePlaceToken(s: string): string {
  return s.trim().toLowerCase().replace(/\./g, "").replace(/\s+/g, " ");
}

export async function geocodeBirthPlace(place: string): Promise<GeocodedPlace> {
  const raw = place.trim();
  if (!raw) throw new Error("PLACE_REQUIRED");

  const cityKey = normalizePlaceToken(raw.split(",")[0] || raw);
  const hard = PLACE_HARD_OVERRIDES[cityKey];
  if (hard) {
    const lower = raw.toLowerCase();
    const forcedAway =
      /\bsouth africa\b|\bmpumalanga\b|\bunited states\b|\bohio\b/.test(lower) &&
      !/\bindia\b|\bwest bengal\b|\bmaharashtra\b|\btamil nadu\b|\bkarnataka\b/.test(lower);
    if (!forcedAway) return { ...hard };
  }

  // Prefer modern Indian name when aliasing, then original query.
  const aliasName = hard?.name;
  const queries = [aliasName ? `${aliasName}, India` : "", aliasName || "", raw, cityKey].filter(
    (v, i, arr) => !!v && arr.indexOf(v) === i,
  );

  let lastError: Error | null = null;
  for (const q of queries) {
    const url = `${GEOCODE_URL}?name=${encodeURIComponent(q)}&count=8&language=en`;
    const ctrl = new AbortController();
    const timer = setTimeout(() => ctrl.abort(), 8_000);
    try {
      const res = await fetch(url, { signal: ctrl.signal });
      if (!res.ok) {
        lastError = new Error("GEOCODE_FAILED");
        continue;
      }
      const data = (await res.json()) as {
        results?: Array<{
          name: string;
          country?: string;
          admin1?: string;
          latitude: number;
          longitude: number;
          timezone?: string;
          population?: number;
          country_code?: string;
          feature_code?: string;
        }>;
      };
      const hits = data.results ?? [];
      if (!hits.length) {
        lastError = new Error("PLACE_NOT_FOUND");
        continue;
      }
      // Prefer India + high population over tiny namesakes.
      const ranked = [...hits].sort((a, b) => {
        const score = (h: (typeof hits)[number]) => {
          let s = Math.log10((h.population ?? 0) + 10) * 10;
          if (h.country_code === "IN" || /india/i.test(h.country ?? "")) s += 50;
          if ((h.population ?? 0) > 1_000_000) s += 30;
          if ((h.population ?? 0) < 100_000) s -= 25;
          if (h.feature_code === "PPLA" || h.feature_code === "PPLC") s += 20;
          return s;
        };
        return score(b) - score(a);
      });
      const found = ranked[0]!;
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
    } catch (e) {
      lastError = e instanceof Error ? e : new Error("GEOCODE_FAILED");
    } finally {
      clearTimeout(timer);
    }
  }
  throw lastError ?? new Error("PLACE_NOT_FOUND");
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

function dignityFor(planetId: string, rashi: string): string {
  const d = DIGNITY[planetId];
  if (!d) return "Neutral";
  if (rashi === d.exalt) return "Exalted";
  if (rashi === d.debilitated) return "Debilitated";
  if (d.own.includes(rashi)) return "Own sign";
  return "Neutral";
}

function normalizeAngle(deg: number): number {
  let x = deg % 360;
  if (x < 0) x += 360;
  return x;
}

function isBetweenArc(lon: number, a: number, b: number): boolean {
  const x = normalizeAngle(lon);
  const start = normalizeAngle(a);
  const end = normalizeAngle(b);
  if (start <= end) return x >= start && x <= end;
  return x >= start || x <= end;
}

function detectYogas(
  planets: ChartPlanetRow[],
  houseOf: Record<string, number>,
): ChartYoga[] {
  const yogas: ChartYoga[] = [];
  const marsHouse = houseOf.mars;
  const moonHouse = houseOf.moon;
  const manglikHouses = new Set([1, 4, 7, 8, 12]);
  const manglikFromLagna = marsHouse != null && manglikHouses.has(marsHouse);
  const manglikFromMoon =
    marsHouse != null &&
    moonHouse != null &&
    manglikHouses.has(((marsHouse - moonHouse + 12) % 12) + 1);

  yogas.push({
    id: "manglik",
    name: "Manglik (Mangal Dosha)",
    present: manglikFromLagna || manglikFromMoon,
    severity: manglikFromLagna || manglikFromMoon ? "caution" : "info",
    summary: manglikFromLagna || manglikFromMoon
      ? `Mars in house ${marsHouse} — classic Manglik indicators present.`
      : "No classic Manglik from Lagna/Moon houses.",
    detail:
      "Checked Mars in houses 1, 4, 7, 8, 12 from Lagna and from Moon. Soften with chart context — cancellation yogas may apply.",
  });

  const rahu = planets.find((p) => p.id === "rahu");
  const ketu = planets.find((p) => p.id === "ketu");
  const others = planets.filter((p) => !["rahu", "ketu", "ascendant"].includes(p.id));
  let kaalSarp = false;
  if (rahu && ketu && others.length) {
    const allInRahuKetu = others.every((p) => isBetweenArc(p.longitude, rahu.longitude, ketu.longitude));
    const allInKetuRahu = others.every((p) => isBetweenArc(p.longitude, ketu.longitude, rahu.longitude));
    kaalSarp = allInRahuKetu || allInKetuRahu;
  }
  yogas.push({
    id: "kaalsarp",
    name: "Kaal Sarp pattern",
    present: kaalSarp,
    severity: kaalSarp ? "caution" : "info",
    summary: kaalSarp
      ? "All planets lie on one side of the Rahu–Ketu axis (Kaal Sarp-like pattern)."
      : "Planets are distributed on both sides of Rahu–Ketu — no full Kaal Sarp pattern.",
    detail: "A geometric screen only. Classical texts distinguish many Kaal Sarp types; use with full chart judgment.",
  });

  const sunH = houseOf.sun;
  const meH = houseOf.mercury;
  const budhaditya = sunH != null && meH != null && sunH === meH;
  yogas.push({
    id: "budhaditya",
    name: "Budhaditya Yoga",
    present: budhaditya,
    severity: "notable",
    summary: budhaditya
      ? `Sun and Mercury together in house ${sunH} — intellect and communication strength.`
      : "Sun and Mercury are not conjunct by whole-sign house.",
    detail: "Sun + Mercury in the same house supports learning, speech, and analytical skill.",
  });

  const juH = houseOf.jupiter;
  const gajaKesari =
    juH != null &&
    moonHouse != null &&
    [1, 4, 7, 10].includes(((juH - moonHouse + 12) % 12) + 1);
  yogas.push({
    id: "gajakesari",
    name: "Gaja Kesari Yoga",
    present: !!gajaKesari,
    severity: "notable",
    summary: gajaKesari
      ? "Jupiter in a kendra from the Moon — classic Gaja Kesari favour."
      : "Jupiter is not in a kendra from the Moon.",
    detail: "Moon–Jupiter kendra yoga is associated with wisdom, reputation, and steady growth.",
  });

  const chandraMangal = moonHouse != null && marsHouse != null && moonHouse === marsHouse;
  yogas.push({
    id: "chandramangal",
    name: "Chandra-Mangal Yoga",
    present: !!chandraMangal,
    severity: "notable",
    summary: chandraMangal
      ? `Moon and Mars together in house ${moonHouse} — drive + emotional force.`
      : "Moon and Mars are not conjunct by house.",
    detail: "Often linked with enterprise energy; results depend on house and dignity.",
  });

  const saH = houseOf.saturn;
  const sadeSatiHint =
    moonHouse != null &&
    saH != null &&
    [moonHouse, ((moonHouse + 10) % 12) + 1, ((moonHouse + 11) % 12) + 1, ((moonHouse) % 12) + 1].includes(saH);
  // Simpler natal note: Saturn near Moon sign houses 12,1,2 from Moon = Sade Sati zone in transit sense;
  // For natal we note if Saturn is in Moon's sign or adjacent houses from Moon.
  const satFromMoon = moonHouse != null && saH != null ? ((saH - moonHouse + 12) % 12) + 1 : null;
  const saturnMoonPressure = satFromMoon === 1 || satFromMoon === 12 || satFromMoon === 2;
  yogas.push({
    id: "saturn-moon",
    name: "Saturn–Moon pressure zone",
    present: !!saturnMoonPressure,
    severity: saturnMoonPressure ? "caution" : "info",
    summary: saturnMoonPressure
      ? `Saturn is ${satFromMoon === 1 ? "with" : satFromMoon === 12 ? "12th from" : "2nd from"} the Moon — emotional responsibility theme.`
      : "Saturn is not in the Moon’s immediate 12/1/2 house zone.",
    detail: "Natal hint only (not current Sade Sati transit). Useful for emotional endurance themes.",
  });

  void sadeSatiHint;
  return yogas;
}

function elementBalance(planets: ChartPlanetRow[]): HoroscopeChartResult["balance"] {
  const elements: Record<string, number> = { Fire: 0, Earth: 0, Air: 0, Water: 0 };
  const modalities: Record<string, number> = { Movable: 0, Fixed: 0, Dual: 0 };
  for (const p of planets) {
    if (p.id === "ascendant" || p.id === "rahu" || p.id === "ketu") continue;
    if (p.element && elements[p.element] != null) elements[p.element] += 1;
    const q =
      p.quality === "Cardinal" || p.quality === "Movable"
        ? "Movable"
        : p.quality === "Fixed"
          ? "Fixed"
          : p.quality === "Mutable" || p.quality === "Dual"
            ? "Dual"
            : null;
    if (q) modalities[q] += 1;
  }
  const dominantElement =
    Object.entries(elements).sort((a, b) => b[1] - a[1])[0]?.[1] > 0
      ? Object.entries(elements).sort((a, b) => b[1] - a[1])[0]![0]
      : null;
  const dominantModality =
    Object.entries(modalities).sort((a, b) => b[1] - a[1])[0]?.[1] > 0
      ? Object.entries(modalities).sort((a, b) => b[1] - a[1])[0]![0]
      : null;
  return { elements, modalities, dominantElement, dominantModality };
}

function buildReadingContext(result: Omit<HoroscopeChartResult, "readingContext">): string {
  const lines: string[] = [
    "STRUCTURED ADVANCED VEDIC NATAL CHART (Lahiri / sidereal) — use these exact placements; do not invent different signs or degrees.",
    `Native: ${result.name || "Seeker"}${result.gender && result.gender !== "unspecified" ? ` · ${result.gender}` : ""}`,
    `Birth: ${result.birth.date} ${result.birth.time} · ${result.birth.place} (${result.birth.timezone}, UTC${result.birth.utcOffsetHours >= 0 ? "+" : ""}${result.birth.utcOffsetHours})`,
    `Ayanamsa: ${result.ayanamsa.system} ${result.ayanamsa.formatted}`,
  ];
  if (result.lagna) {
    lines.push(
      `Lagna: ${result.lagna.rashi} (${result.lagna.rashiWestern}) ${result.lagna.degree} · ${result.lagna.nakshatra} (lord ${result.lagna.nakshatraLord}) pada ${result.lagna.pada} · ${result.lagna.element}/${result.lagna.quality} · ruled by ${result.lagna.ruler}`,
    );
  }
  lines.push(
    `Moon: ${result.moonSign.rashi} (${result.moonSign.rashiWestern}) · ${result.moonSign.nakshatra} (lord ${result.moonSign.nakshatraLord}) pada ${result.moonSign.pada}`,
  );
  lines.push(
    `Sun: ${result.sunSign.rashi} (${result.sunSign.rashiWestern}) · ${result.sunSign.nakshatra} (lord ${result.sunSign.nakshatraLord}) pada ${result.sunSign.pada}`,
  );
  if (result.currentDasha) {
    lines.push(
      `Current Vimshottari Mahadasha: ${result.currentDasha.lord} (${result.currentDasha.startDate.slice(0, 10)} → ${result.currentDasha.endDate.slice(0, 10)})`,
    );
  }
  if (result.balance.dominantElement) {
    lines.push(
      `Element balance: Fire ${result.balance.elements.Fire ?? 0}, Earth ${result.balance.elements.Earth ?? 0}, Air ${result.balance.elements.Air ?? 0}, Water ${result.balance.elements.Water ?? 0} (dominant ${result.balance.dominantElement}; modality ${result.balance.dominantModality ?? "—"})`,
    );
  }
  lines.push("Planets:");
  for (const p of result.planets) {
    if (p.id === "ascendant") continue;
    lines.push(
      `- ${p.name}: ${p.rashi} (${p.rashiWestern}) ${p.degree} · ${p.nakshatra} p${p.pada} lord ${p.nakshatraLord}${p.house ? ` · H${p.house}` : ""} · ${p.dignity}`,
    );
  }
  lines.push("Houses (whole-sign from Lagna):");
  for (const h of result.houses) {
    const plist = h.planets.map((p) => `${p.short} ${p.degree}`).join(", ") || "—";
    lines.push(`- H${h.number} ${h.sign}/${h.signWestern} (lord ${h.lord}): ${plist} — ${h.meaning}`);
  }
  if (result.yogas.length) {
    lines.push("Yoga / dosha screen:");
    for (const y of result.yogas) {
      lines.push(`- ${y.name}: ${y.present ? "PRESENT" : "not indicated"} — ${y.summary}`);
    }
  }
  if (result.aspects.length) {
    lines.push("Major Western aspects (tropical overlay, for colour):");
    for (const a of result.aspects.slice(0, 12)) {
      lines.push(`- ${a.planet1} ${a.symbol} ${a.planet2} (${a.aspect}, orb ${a.orb}) — ${a.meaning}`);
    }
  }
  if (result.western.bigThree) {
    lines.push(`Western big three (tropical): ${result.western.bigThree}`);
  }
  return lines.join("\n");
}

export async function buildHoroscopeChart(input: BirthDetailsInput): Promise<HoroscopeChartResult> {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(input.date)) throw new Error("INVALID_BIRTH_DATE");
  const birthHour = parseTimeToDecimalHours(input.time);

  let place: GeocodedPlace;
  if (input.latitude != null && input.longitude != null && input.timezone) {
    const cityKey = normalizePlaceToken((input.place || "").split(",")[0] || "");
    const hard = PLACE_HARD_OVERRIDES[cityKey];
    place = {
      name: hard?.name || input.place.trim() || "Birth place",
      country: hard?.country,
      admin1: hard?.admin1,
      latitude: input.latitude,
      longitude: input.longitude,
      timezone: input.timezone,
      label: hard?.label || input.place.trim() || "Birth place",
    };
  } else {
    if (!input.place.trim()) throw new Error("PLACE_REQUIRED");
    place = await geocodeBirthPlace(input.place);
  }

  const utcOffset = utcOffsetHoursForLocal(place.timezone, input.date, input.time);
  const raw = calculateVedic(input.date, birthHour, utcOffset, place.latitude, place.longitude);
  let westernRaw: ReturnType<typeof calculateAstrology> | null = null;
  try {
    westernRaw = calculateAstrology(input.date, birthHour, utcOffset, place.latitude, place.longitude);
  } catch {
    westernRaw = null;
  }

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
        element: pos.rashi.element,
        quality: pos.rashi.quality,
        ruler: pos.rashi.ruler,
        nakshatra: pos.nakshatra.name,
        nakshatraLord: pos.nakshatra.lord,
        pada: pos.nakshatra.pada,
        house: id === "ascendant" ? 1 : houseOf[id] ?? null,
        longitude: pos.longitude,
        dignity: dignityFor(id, pos.rashi.name),
      };
    });

  const houses = raw.houses
    ? Object.entries(raw.houses)
        .map(([num, h]) => ({
          number: Number(num),
          sign: h.sign.name,
          signWestern: h.sign.westernName,
          symbol: h.sign.symbol,
          lord: h.sign.ruler,
          meaning: HOUSE_MEANINGS[Number(num)] ?? "",
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

  const houseLords = houses.map((h) => {
    const lordId = Object.entries(PLANET_META).find(([, m]) => m.name === h.lord)?.[0];
    return {
      house: h.number,
      sign: h.sign,
      lord: h.lord,
      lordHouse: lordId ? houseOf[lordId] ?? null : null,
      meaning: h.meaning,
    };
  });

  const asc = raw.positions.ascendant;
  const sun = raw.positions.sun;
  const moon = raw.moonSign;
  const yogas = detectYogas(planets, houseOf);
  const balance = elementBalance(planets);

  const aspects: ChartAspect[] = Array.isArray((westernRaw as { aspects?: unknown })?.aspects)
    ? ((westernRaw as { aspects: Array<Record<string, unknown>> }).aspects ?? [])
        .filter((a) => a.nature === "major" || !a.nature)
        .slice(0, 16)
        .map((a) => ({
          planet1: String(a.planet1 ?? ""),
          planet2: String(a.planet2 ?? ""),
          aspect: String(a.aspect ?? ""),
          symbol: String(a.symbol ?? ""),
          orb: String(a.exactOrb ?? a.orb ?? ""),
          meaning: String(a.meaning ?? ""),
          nature: String(a.nature ?? "major"),
        }))
    : [];

  const western = {
    bigThree: typeof (westernRaw as { bigThree?: string })?.bigThree === "string"
      ? (westernRaw as { bigThree: string }).bigThree
      : null,
    rising:
      (westernRaw as { rising?: { sign?: { name?: string }; degree?: string } })?.rising?.sign?.name
        ? `${(westernRaw as { rising: { sign: { name: string }; degree?: string } }).rising.sign.name} ${(westernRaw as { rising: { degree?: string } }).rising.degree ?? ""}`.trim()
        : null,
    midheaven:
      (westernRaw as { midheaven?: { sign?: { name?: string }; degree?: string } })?.midheaven?.sign?.name
        ? `${(westernRaw as { midheaven: { sign: { name: string }; degree?: string } }).midheaven.sign.name} ${(westernRaw as { midheaven: { degree?: string } }).midheaven.degree ?? ""}`.trim()
        : null,
  };

  const base: Omit<HoroscopeChartResult, "readingContext"> = {
    name: input.name?.trim() || null,
    gender: input.gender ?? "unspecified",
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
          nakshatraLord: asc.nakshatra.lord,
          pada: asc.nakshatra.pada,
          element: asc.rashi.element,
          quality: asc.rashi.quality,
          ruler: asc.rashi.ruler,
        }
      : null,
    moonSign: {
      rashi: moon.rashi.name,
      rashiWestern: moon.rashi.westernName,
      nakshatra: moon.nakshatra.name,
      nakshatraLord: moon.nakshatra.lord,
      pada: moon.nakshatra.pada,
      summary: moon.summary,
      element: moon.rashi.element,
      quality: moon.rashi.quality,
    },
    sunSign: {
      rashi: sun.rashi.name,
      rashiWestern: sun.rashi.westernName,
      nakshatra: sun.nakshatra.name,
      nakshatraLord: sun.nakshatra.lord,
      pada: sun.nakshatra.pada,
      element: sun.rashi.element,
      quality: sun.rashi.quality,
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
    houseLords,
    yogas,
    aspects,
    balance,
    western,
  };

  return {
    ...base,
    readingContext: buildReadingContext(base),
  };
}
