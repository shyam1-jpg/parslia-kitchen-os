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
    pada: number;
    house: number | null;
    longitude: number;
    dignity: string;
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

  horoscopeChart: (body: {
    name?: string;
    gender?: "female" | "male" | "other" | "unspecified";
    date: string;
    time: string;
    place: string;
    latitude?: number;
    longitude?: number;
    timezone?: string;
  }) =>
    api<HoroscopeChart>("/api/tools/horoscope-chart", {
      method: "POST",
      body: JSON.stringify(body),
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
