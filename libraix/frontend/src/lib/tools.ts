import { readApiError } from "./errors";

export interface ParsedDocument {
  filename: string;
  mimeType: string;
  text: string;
  charCount: number;
  truncated: boolean;
  pageCount?: number;
}

export interface ResearchResult {
  summary: string;
  keyFindings: string[];
  sources: { title: string; url: string; snippet: string }[];
  methodology: string;
  confidence: string;
  disclaimer: string;
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
};

export function detectUrls(text: string): string[] {
  const matches = text.match(/https?:\/\/[^\s<>"']+/gi) ?? [];
  return [...new Set(matches.map((u) => u.replace(/[.,)]+$/, "")))];
}

export function isYoutubeUrl(url: string): boolean {
  return /youtu(\.be|be\.com)/i.test(url);
}
