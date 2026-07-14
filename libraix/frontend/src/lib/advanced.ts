import type { ModelInfo, DocumentSource } from "./api";
import { readApiError } from "./errors";

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
    throw new Error(await readApiError(res));
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
  createProject: (name: string, description?: string, instructions?: string) =>
    api<Project>("/api/projects", { method: "POST", body: JSON.stringify({ name, description, instructions }) }),
  updateProject: (id: string, body: { name?: string; description?: string; instructions?: string }) =>
    api<{ ok: boolean }>(`/api/projects/${id}`, { method: "PATCH", body: JSON.stringify(body) }),
  getProject: (id: string) =>
    api<{ project: Project; files: Array<{ id: string; filename: string; mimeType: string | null; sizeBytes: number; chunkCount?: number; indexStatus?: string; indexError?: string | null }> }>(`/api/projects/${id}`),
  uploadProjectFile: async (projectId: string, file: File) => {
    const contentBase64 = await new Promise<string>((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = () => {
        const result = reader.result as string;
        resolve(result.split(",")[1] ?? "");
      };
      reader.onerror = () => reject(new Error("READ_FAILED"));
      reader.readAsDataURL(file);
    });
    return api<{ file: { id: string; filename: string; indexStatus?: string }; status: "indexing" | "ready"; jobId?: string; chunkCount?: number }>(
      `/api/projects/${projectId}/files`,
      {
        method: "POST",
        body: JSON.stringify({ filename: file.name, mimeType: file.type || "application/octet-stream", contentBase64 }),
      }
    );
  },
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
      systemPrompt?: string;
      projectId?: string;
    },
    options?: { signal?: AbortSignal; timeoutMs?: number }
  ): AsyncGenerator<string | { meta: { modelId: string; displayName: string; provider: string; providerModelId: string; imageUrl?: string; type?: string; sources?: DocumentSource[] } }> {
    const timeoutMs = options?.timeoutMs ?? 90_000;
    const ctrl = new AbortController();
    const onAbort = () => ctrl.abort();
    options?.signal?.addEventListener("abort", onAbort);
    const timer = setTimeout(() => ctrl.abort(), timeoutMs);
    try {
      const res = await fetch("/api/ai/stream", {
        method: "POST",
        credentials: "include",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
        signal: ctrl.signal,
      });
      if (!res.ok || !res.body) {
        throw new Error(await readApiError(res));
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
          let parsed: { delta?: string; error?: string; detail?: string; meta?: { modelId: string; displayName: string; provider: string; providerModelId: string; imageUrl?: string; type?: string; sources?: DocumentSource[] } };
          try {
            parsed = JSON.parse(payload);
          } catch {
            continue;
          }
          if (parsed.error) throw new Error(parsed.detail || parsed.error);
          else if (parsed.meta) yield { meta: parsed.meta };
          else if (parsed.delta) yield parsed.delta;
        }
      }
    } catch (e) {
      if (e instanceof DOMException && e.name === "AbortError") {
        throw new Error("REQUEST_TIMED_OUT");
      }
      throw e;
    } finally {
      clearTimeout(timer);
      options?.signal?.removeEventListener("abort", onAbort);
    }
  },
};

export function pickCompareModels(models: ModelInfo[], count = 2): string[] {
  return models.slice(0, count).map((m) => m.id);
}
