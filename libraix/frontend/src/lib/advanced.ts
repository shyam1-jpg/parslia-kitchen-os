import type { ModelInfo } from "./api";

export interface RouterMode {
  id: string;
  label: string;
  description: string;
}

export interface RouterPreview {
  modelId: string;
  displayName: string;
  mode: string;
  reason: string;
  estimatedSpeed: string;
  estimatedCredits: number;
  enabledTools: string[];
  wasAutoSelected: boolean;
}

export interface Project {
  id: string;
  name: string;
  description: string | null;
  instructions: string | null;
  fileCount: number;
  createdAt: string;
  updatedAt: string;
}

export interface Memory {
  id: string;
  category: string;
  content: string;
  projectId: string | null;
  expiresAt: string | null;
  createdAt: string;
  updatedAt: string;
}

export interface CompareResult {
  prompt: string;
  results: Array<{
    modelId: string;
    displayName: string;
    content: string;
    responseTimeMs: number;
    estimatedCostCents: number;
    tokensUsed: number;
    error?: string;
  }>;
  judgeSummary?: string;
}

async function api<T>(path: string, options?: RequestInit): Promise<T> {
  const res = await fetch(path, {
    ...options,
    credentials: "include",
    headers: { "Content-Type": "application/json", ...(options?.headers ?? {}) },
  });
  if (!res.ok) {
    const body = await res.json().catch(() => ({}));
    throw new Error((body as { error?: string }).error ?? `HTTP ${res.status}`);
  }
  return res.json() as Promise<T>;
}

export const advancedApi = {
  routerModes: () => api<{ modes: RouterMode[] }>("/api/router/modes"),
  routerPreview: (message: string, mode: string, modelId?: string) =>
    api<RouterPreview>("/api/router/preview", {
      method: "POST",
      body: JSON.stringify({ message, mode, modelId }),
    }),
  projects: () => api<{ projects: Project[] }>("/api/projects"),
  createProject: (name: string, description?: string) =>
    api<Project>("/api/projects", { method: "POST", body: JSON.stringify({ name, description }) }),
  memories: () => api<{ memories: Memory[] }>("/api/memory"),
  createMemory: (category: string, content: string) =>
    api<Memory>("/api/memory", { method: "POST", body: JSON.stringify({ category, content }) }),
  deleteMemory: (id: string) => api<{ ok: boolean }>(`/api/memory/${id}`, { method: "DELETE" }),
  deleteAllMemories: () => api<{ deleted: number }>("/api/memory", { method: "DELETE" }),
  memoryPreferences: () =>
    api<{ memoryEnabled: boolean; privacyMode: string; routerMode: string }>("/api/memory/preferences"),
  updateMemoryPreferences: (body: { memoryEnabled?: boolean; privacyMode?: string; routerMode?: string }) =>
    api<{ memoryEnabled: boolean; privacyMode: string; routerMode: string }>("/api/memory/preferences", {
      method: "PATCH",
      body: JSON.stringify(body),
    }),
  compare: (message: string, modelIds: string[]) =>
    api<CompareResult>("/api/ai/compare", {
      method: "POST",
      body: JSON.stringify({ message, modelIds }),
    }),
  streamRespond: async function* (
    body: {
      message: string;
      modelId?: string;
      routerMode?: string;
      history?: { role: "user" | "assistant"; content: string }[];
    },
    onError?: (err: string) => void
  ) {
    const res = await fetch("/api/ai/stream", {
      method: "POST",
      credentials: "include",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(body),
    });
    if (!res.ok || !res.body) {
      onError?.(`HTTP ${res.status}`);
      return;
    }
    const reader = res.body.getReader();
    const decoder = new TextDecoder();
    let buffer = "";
    while (true) {
      const { done, value } = await reader.read();
      if (done) break;
      buffer += decoder.decode(value, { stream: true });
      const lines = buffer.split("\n");
      buffer = lines.pop() ?? "";
      for (const line of lines) {
        if (!line.startsWith("data: ")) continue;
        const payload = line.slice(6).trim();
        if (payload === "[DONE]") return;
        try {
          const parsed = JSON.parse(payload) as { delta?: string; error?: string };
          if (parsed.error) onError?.(parsed.error);
          else if (parsed.delta) yield parsed.delta;
        } catch { /* skip */ }
      }
    }
  },
};

export function pickCompareModels(models: ModelInfo[], count = 2): string[] {
  return models.slice(0, count).map((m) => m.id);
}
