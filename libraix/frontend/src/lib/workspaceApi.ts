import { readApiError } from "./errors";

async function api<T>(path: string, options?: RequestInit): Promise<T> {
  const res = await fetch(path, {
    ...options,
    credentials: "include",
    headers: {
      "Content-Type": "application/json",
      ...(options?.headers ?? {}),
    },
  });
  if (!res.ok) throw new Error(await readApiError(res));
  return res.json() as Promise<T>;
}

export interface PromptItem {
  id: string;
  title: string;
  body: string;
  createdAt: string;
  updatedAt: string;
}

export interface CustomAssistant {
  id: string;
  name: string;
  description: string;
  systemPrompt: string;
  createdAt: string;
  updatedAt: string;
}

export interface ChatFolder {
  id: string;
  name: string;
  createdAt: string;
}

export interface AutomationItem {
  id: string;
  name: string;
  prompt: string;
  schedule: string;
  enabled: boolean;
  lastRunAt: string | null;
  createdAt: string;
  updatedAt: string;
}

export interface ConnectorItem {
  id: string;
  name: string;
  description: string;
  status: "connected" | "disconnected" | "pending";
  updatedAt: string | null;
}

export const workspaceApi = {
  prompts: () => api<{ prompts: PromptItem[] }>("/api/workspace/prompts"),
  createPrompt: (title: string, body: string) =>
    api<PromptItem>("/api/workspace/prompts", { method: "POST", body: JSON.stringify({ title, body }) }),
  deletePrompt: (id: string) => api<{ ok: boolean }>(`/api/workspace/prompts/${id}`, { method: "DELETE" }),

  customAssistants: () => api<{ assistants: CustomAssistant[] }>("/api/workspace/assistants"),
  createAssistant: (data: { name: string; description?: string; systemPrompt: string }) =>
    api<CustomAssistant>("/api/workspace/assistants", { method: "POST", body: JSON.stringify(data) }),
  deleteAssistant: (id: string) =>
    api<{ ok: boolean }>(`/api/workspace/assistants/${id}`, { method: "DELETE" }),

  shareChat: (conversationId: string) =>
    api<{ token: string; url: string }>("/api/workspace/share", {
      method: "POST",
      body: JSON.stringify({ conversationId }),
    }),
  getShared: (token: string) =>
    api<{ title: string; messages: { role: string; content: string; createdAt: string }[] }>(
      `/api/workspace/share/${token}`
    ),

  folders: () => api<{ folders: ChatFolder[] }>("/api/workspace/folders"),
  createFolder: (name: string) =>
    api<ChatFolder>("/api/workspace/folders", { method: "POST", body: JSON.stringify({ name }) }),
  deleteFolder: (id: string) => api<{ ok: boolean }>(`/api/workspace/folders/${id}`, { method: "DELETE" }),
  assignFolder: (conversationId: string, folderId: string | null) =>
    api<{ ok: boolean }>("/api/workspace/folders/assign", {
      method: "POST",
      body: JSON.stringify({ conversationId, folderId }),
    }),

  automations: () => api<{ automations: AutomationItem[] }>("/api/workspace/automations"),
  createAutomation: (data: { name: string; prompt: string; schedule?: string }) =>
    api<AutomationItem>("/api/workspace/automations", { method: "POST", body: JSON.stringify(data) }),
  updateAutomation: (id: string, data: Partial<{ name: string; prompt: string; schedule: string; enabled: boolean }>) =>
    api<AutomationItem>(`/api/workspace/automations/${id}`, { method: "PATCH", body: JSON.stringify(data) }),
  deleteAutomation: (id: string) =>
    api<{ ok: boolean }>(`/api/workspace/automations/${id}`, { method: "DELETE" }),
  dueAutomations: () =>
    api<{ due: AutomationItem[] }>("/api/workspace/automations/due", { method: "POST", body: "{}" }),

  connectors: () => api<{ connectors: ConnectorItem[]; note?: string }>("/api/workspace/connectors"),
  connect: (provider: string) =>
    api<{ connector: ConnectorItem; hint?: string }>(`/api/workspace/connectors/${provider}/connect`, {
      method: "POST",
      body: "{}",
    }),
  disconnect: (provider: string) =>
    api<{ connector: ConnectorItem }>(`/api/workspace/connectors/${provider}/disconnect`, {
      method: "POST",
      body: "{}",
    }),
};
