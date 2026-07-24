import { readApiError } from "./errors";

export interface ParsedDocument {
  filename: string;
  mimeType: string;
  text: string;
  charCount: number;
  truncated: boolean;
  pageCount?: number;
  documentKind?: "legal" | "general";
}

export interface SourceHit {
  title: string;
  url: string;
  snippet: string;
  kind?: "wikipedia" | "web";
}

export interface ResearchResult {
  summary: string;
  keyFindings: string[];
  sources: { title: string; url: string; snippet: string }[];
  methodology: string;
  confidence: string;
  disclaimer: string;
}

export interface HoroscopeChart {
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
  accuracy?: {
    score: number;
    label: string;
    notes: string[];
  };
  lagna: {
    rashi: string;
    rashiWestern: string;
    degree: string;
    nakshatra: string;
    nakshatraLord: string;
    nakshatraNumber?: number | null;
    pada: number;
    element: string;
    quality: string;
    ruler: string;
  } | null;
  moonSign: {
    rashi: string;
    rashiWestern: string;
    rashiNumber?: number | null;
    nakshatra: string;
    nakshatraLord: string;
    nakshatraNumber?: number | null;
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
    nakshatraNumber?: number | null;
    pada: number;
    element: string;
    quality: string;
  };
  currentDasha: { lord: string; startDate: string; endDate: string; years: number } | null;
  currentAntardasha?: {
    mahaLord: string;
    lord: string;
    startDate: string;
    endDate: string;
    years: number;
  } | null;
  currentPratyantardasha?: {
    mahaLord: string;
    antarLord: string;
    lord: string;
    startDate: string;
    endDate: string;
    years: number;
  } | null;
  antardashas?: Array<{
    mahaLord: string;
    lord: string;
    startDate: string;
    endDate: string;
    years: number;
  }>;
  pratyantardashas?: Array<{
    mahaLord: string;
    antarLord: string;
    lord: string;
    startDate: string;
    endDate: string;
    years: number;
  }>;
  dashas: Array<{ lord: string; startDate: string; endDate: string; years: number }>;
  planets: Array<{
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
    nakshatraDeity?: string | null;
    nakshatraSymbol?: string | null;
    pada: number;
    house: number | null;
    longitude: number;
    degreeInSign?: number;
    nakshatraProgress?: number;
    dignity: string;
    retrograde?: boolean;
    combust?: boolean;
    combustionOrb?: number | null;
  }>;
  planetDetails?: Array<{
    id: string;
    degreeInSign: number;
    nakshatraProgress: number;
    nakshatraDeity: string | null;
    nakshatraSymbol: string | null;
    retrograde: boolean;
    combust: boolean;
    combustionOrb: number | null;
    naturalFriends: string[];
    naturalEnemies: string[];
  }>;
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
  yogas: Array<{
    id: string;
    name: string;
    present: boolean;
    severity: "info" | "notable" | "caution";
    summary: string;
    detail: string;
  }>;
  aspects: Array<{
    planet1: string;
    planet2: string;
    aspect: string;
    symbol: string;
    orb: string;
    meaning: string;
    nature: string;
  }>;
  vedicDrishti?: Array<{
    from: string;
    to: string;
    houses: number;
    kind: string;
    summary: string;
  }>;
  navamsa?: {
    lagna: { rashi: string; rashiWestern: string; degree: string } | null;
    planets: Array<{
      id: string;
      name: string;
      short: string;
      rashi: string;
      rashiWestern: string;
      house: number | null;
      longitude: number;
      degree: string;
    }>;
    houses: Array<{
      number: number;
      sign: string;
      signWestern: string;
      planets: Array<{ id: string; short: string }>;
    }>;
    note: string;
  };
  gochara?: {
    asOf: string;
    transitMoon: {
      planet: string;
      rashi: string;
      rashiWestern: string;
      houseFromLagna: number | null;
      houseFromMoon: number | null;
      note: string;
    } | null;
    keyTransits: Array<{
      planet: string;
      rashi: string;
      rashiWestern: string;
      houseFromLagna: number | null;
      houseFromMoon: number | null;
      note: string;
    }>;
    sadeSati: {
      active: boolean;
      phase: "approaching" | "peak" | "leaving" | "none";
      summary: string;
    };
    note: string;
  };
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
  readingContext: string;
}

export interface AshtakootMatch {
  system: "Ashtakoot";
  maxScore: number;
  totalScore: number;
  percentage: number;
  band: "excellent" | "very-good" | "good" | "acceptable" | "challenging";
  verdict: string;
  recommended: boolean;
  kootas: Array<{
    id: string;
    name: string;
    score: number;
    maxScore: number;
    personA: string;
    personB: string;
    summary: string;
    detail: string;
    ok: boolean;
  }>;
  doshas: Array<{
    id: string;
    name: string;
    active: boolean;
    cancelled: boolean;
    reason: string;
  }>;
  manglik: {
    personA: boolean;
    personB: boolean;
    status: "none" | "both" | "one-sided";
    note: string;
  };
  people: {
    a: { name: string; nakshatra: string; pada: number; rashi: string; rashiWestern: string };
    b: { name: string; nakshatra: string; pada: number; rashi: string; rashiWestern: string };
  };
  readingContext: string;
  accuracyNote: string;
}

export interface AdvancedMatchLayer {
  navamsa: {
    lagnaA: string | null;
    lagnaB: string | null;
    sameNavamsaLagna: boolean;
    venusHouseA: number | null;
    venusHouseB: number | null;
    note: string;
  };
  seventhHouse: {
    signA: string | null;
    signB: string | null;
    lordA: string | null;
    lordB: string | null;
    planetsA: string[];
    planetsB: string[];
    note: string;
  };
  dashaOverlap: {
    mahaA: string | null;
    mahaB: string | null;
    antarA: string | null;
    antarB: string | null;
    note: string;
  };
  readingContext: string;
}

export interface HoroscopeMatchResult {
  match: AshtakootMatch;
  advanced?: AdvancedMatchLayer;
  personA: HoroscopeChart;
  personB: HoroscopeChart;
}

type BirthBody = {
  name?: string;
  gender?: "female" | "male" | "other" | "unspecified";
  date: string;
  time: string;
  place: string;
  latitude?: number;
  longitude?: number;
  timezone?: string;
};

/** Hard overrides so historic names never geocode to the wrong country (e.g. Calcutta ZA). */
const BIRTH_PLACE_OVERRIDES: Record<
  string,
  { place: string; latitude: number; longitude: number; timezone: string }
> = {
  calcutta: {
    place: "Kolkata, West Bengal, India",
    latitude: 22.56263,
    longitude: 88.36304,
    timezone: "Asia/Kolkata",
  },
  kolkatta: {
    place: "Kolkata, West Bengal, India",
    latitude: 22.56263,
    longitude: 88.36304,
    timezone: "Asia/Kolkata",
  },
  kolkata: {
    place: "Kolkata, West Bengal, India",
    latitude: 22.56263,
    longitude: 88.36304,
    timezone: "Asia/Kolkata",
  },
  bombay: {
    place: "Mumbai, Maharashtra, India",
    latitude: 19.07283,
    longitude: 72.88261,
    timezone: "Asia/Kolkata",
  },
  mumbai: {
    place: "Mumbai, Maharashtra, India",
    latitude: 19.07283,
    longitude: 72.88261,
    timezone: "Asia/Kolkata",
  },
  madras: {
    place: "Chennai, Tamil Nadu, India",
    latitude: 13.08784,
    longitude: 80.27847,
    timezone: "Asia/Kolkata",
  },
  chennai: {
    place: "Chennai, Tamil Nadu, India",
    latitude: 13.08784,
    longitude: 80.27847,
    timezone: "Asia/Kolkata",
  },
  bangalore: {
    place: "Bengaluru, Karnataka, India",
    latitude: 12.97194,
    longitude: 77.59369,
    timezone: "Asia/Kolkata",
  },
  bengaluru: {
    place: "Bengaluru, Karnataka, India",
    latitude: 12.97194,
    longitude: 77.59369,
    timezone: "Asia/Kolkata",
  },
  delhi: {
    place: "New Delhi, Delhi, India",
    latitude: 28.6139,
    longitude: 77.209,
    timezone: "Asia/Kolkata",
  },
  "new delhi": {
    place: "New Delhi, Delhi, India",
    latitude: 28.6139,
    longitude: 77.209,
    timezone: "Asia/Kolkata",
  },
};

/** Resolve historic city names to India coords so production never maps Calcutta → South Africa. */
export function resolveBirthPlace(place: string): Pick<BirthBody, "place" | "latitude" | "longitude" | "timezone"> {
  const raw = place.trim();
  const city = raw.split(",")[0]?.trim().toLowerCase().replace(/\./g, "") ?? "";
  const override = BIRTH_PLACE_OVERRIDES[city];
  if (override) {
    // If user already typed another country explicitly, keep their text but still force India coords
    // only when they did not clearly ask for a non-India Calcutta.
    const lower = raw.toLowerCase();
    const forcedAway =
      /\bsouth africa\b|\bmpumalanga\b|\busa\b|\bunited states\b|\bohio\b|\bsuriname\b|\bbelize\b/.test(lower) &&
      !/\bindia\b|\bwest bengal\b/.test(lower);
    if (!forcedAway) return { ...override };
  }
  return { place: raw };
}

function withResolvedPlace(body: BirthBody): BirthBody {
  const resolved = resolveBirthPlace(body.place);
  return {
    ...body,
    place: resolved.place,
    latitude: body.latitude ?? resolved.latitude,
    longitude: body.longitude ?? resolved.longitude,
    timezone: body.timezone ?? resolved.timezone,
  };
}

async function api<T>(path: string, options?: RequestInit): Promise<T> {
  const res = await fetch(path, {
    ...options,
    credentials: "include",
    headers: { "Content-Type": "application/json", ...(options?.headers ?? {}) },
  });
  if (!res.ok) throw new Error(await readApiError(res));
  return res.json() as Promise<T>;
}

function fileToBase64(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => {
      const result = reader.result as string;
      resolve(result.split(",")[1] ?? "");
    };
    reader.onerror = () => reject(new Error("FILE_READ_FAILED"));
    reader.readAsDataURL(file);
  });
}

export const toolsApi = {
  parseDocument: (filename: string, mimeType: string, contentBase64: string) =>
    api<ParsedDocument>("/api/tools/parse-document", {
      method: "POST",
      body: JSON.stringify({ filename, mimeType, contentBase64 }),
    }),

  parseFile: async (file: File) => {
    const contentBase64 = await fileToBase64(file);
    return toolsApi.parseDocument(file.name, file.type || "application/octet-stream", contentBase64);
  },

  analyseLink: (url: string, question?: string) =>
    api<{ url: string; title: string; summary: string; truncated: boolean }>("/api/tools/analyse-link", {
      method: "POST",
      body: JSON.stringify({ url, question }),
    }),

  youtube: (url: string, question?: string) =>
    api<{ videoId: string; url: string; summary: string; truncated: boolean }>("/api/tools/youtube", {
      method: "POST",
      body: JSON.stringify({ url, question }),
    }),

  research: (query: string, depth: "quick" | "standard" | "deep" = "standard") =>
    api<ResearchResult>("/api/tools/research", {
      method: "POST",
      body: JSON.stringify({ query, depth }),
    }),

  horoscopeChart: (body: BirthBody) =>
    api<HoroscopeChart>("/api/tools/horoscope-chart", {
      method: "POST",
      body: JSON.stringify(withResolvedPlace(body)),
    }),

  horoscopeMatch: (body: { personA: BirthBody; personB: BirthBody }) =>
    api<HoroscopeMatchResult>("/api/tools/horoscope-match", {
      method: "POST",
      body: JSON.stringify({
        personA: withResolvedPlace(body.personA),
        personB: withResolvedPlace(body.personB),
      }),
    }),

  search: (query: string, provider: "all" | "wikipedia" | "web" = "all") =>
    api<{
      query: string;
      wikipedia: SourceHit[];
      web: SourceHit[];
      sources: SourceHit[];
    }>("/api/tools/search", {
      method: "POST",
      body: JSON.stringify({ query, provider }),
    }),
};

export function detectUrls(text: string): string[] {
  const matches = text.match(/https?:\/\/[^\s<>"']+/gi) ?? [];
  return [...new Set(matches.map((u) => u.replace(/[.,)]+$/, "")))];
}

export function isYoutubeUrl(url: string): boolean {
  return /youtu(\.be|be\.com)/i.test(url);
}
