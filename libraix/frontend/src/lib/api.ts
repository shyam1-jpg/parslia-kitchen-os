import { readApiError } from "./errors";

export interface User {
  id: string;
  email: string;
  displayName: string | null;
  plan: "free" | "pro" | "enterprise";
  emailVerified: boolean;
}

export interface Usage {
  plan: string;
  messagesUsed: number;
  messagesLimit: number;
  premiumUsed: number;
  premiumLimit: number;
  imagesUsed: number;
  imagesLimit: number;
  remainingMessages: number;
  limitReached: boolean;
}

export interface ModelInfo {
  id: string;
  displayName: string;
  provider: string;
  tier: string;
  capabilities: Record<string, boolean>;
  enabled: boolean;
  description: string;
}

export type LaunchStatus = "live" | "beta" | "coming_soon" | "disabled";

export interface Catalog {
  modelCount: number;
  toolCount: number;
  assistantCount: number;
  launchNote?: string;
  models: (ModelInfo & { launchStatus: LaunchStatus })[];
  tools: { id: string; name: string; description: string; tier: string; launchStatus: LaunchStatus }[];
  assistants: { id: string; name: string; description: string; tier: string; launchStatus?: LaunchStatus }[];
  plans: Record<string, { dailyMessages: number; premiumModelMessages: number; images: number }>;
}

export interface Conversation {
  id: string;
  title: string;
  modelId: string;
  pinned: boolean;
  createdAt: string;
  updatedAt: string;
}

export interface ChatMessage {
  id: string;
  role: "user" | "assistant";
  content: string;
  createdAt: string;
  modelLabel?: string;
}
async function api<T>(path: string, options?: RequestInit): Promise<T> {
  const res = await fetch(path, {
    ...options,
    credentials: "include",
    headers: {
      "Content-Type": "application/json",
      ...(options?.headers ?? {}),
    },
  });
  if (!res.ok) {
    throw new Error(await readApiError(res));
  }
  return res.json() as Promise<T>;
}

export const authApi = {
  config: () =>
    api<{ oauth: { google: boolean; apple: boolean; microsoft: boolean }; stripe: boolean; email: boolean }>(
      "/api/auth/config"
    ),
  me: () => api<{ user: User; usage: Usage }>("/api/auth/me"),
  login: (email: string, password: string) =>
    api<{ user: User; usage: Usage }>("/api/auth/login", {
      method: "POST",
      body: JSON.stringify({ email, password }),
    }),
  signup: (email: string, password: string, displayName?: string) =>
    api<{ user: User; usage: Usage }>("/api/auth/signup", {
      method: "POST",
      body: JSON.stringify({ email, password, displayName }),
    }),
  logout: () => api<{ ok: boolean }>("/api/auth/logout", { method: "POST" }),
  forgotPassword: (email: string) =>
    api<{ message: string; resetUrl?: string }>("/api/auth/forgot-password", {
      method: "POST",
      body: JSON.stringify({ email }),
    }),
  resetPassword: (token: string, password: string) =>
    api<{ ok: boolean }>("/api/auth/reset-password", {
      method: "POST",
      body: JSON.stringify({ token, password }),
    }),
  verifyEmail: (token: string) =>
    api<{ ok: boolean }>("/api/auth/verify-email", { method: "POST", body: JSON.stringify({ token }) }),
  resendVerification: () =>
    api<{ ok: boolean }>("/api/auth/resend-verification", { method: "POST", body: "{}" }),
  deleteAccount: () => api<{ ok: boolean }>("/api/auth/account", { method: "DELETE" }),
};

export const catalogApi = {
  get: () => api<Catalog>("/api/catalog"),
};

export interface BillingStatus {
  plan: string;
  stripeConfigured: boolean;
  hasStripeCustomer: boolean;
  canManageBilling: boolean;
}

export const billingApi = {
  status: () => api<BillingStatus>("/api/billing/status"),
  checkout: (plan: "pro" | "enterprise") =>
    api<{ url?: string | null; devMode?: boolean; message?: string }>("/api/billing/stripe/checkout", {
      method: "POST",
      body: JSON.stringify({ plan }),
    }),
  portal: () =>
    api<{ url: string }>("/api/billing/stripe/portal", { method: "POST", body: "{}" }),
};

export const chatApi = {
  models: () => api<{ models: ModelInfo[] }>("/api/models"),
  respond: (body: {
    message: string;
    modelId?: string;
    routerMode?: string;
    history?: { role: "user" | "assistant"; content: string }[];
    systemPrompt?: string;
    projectId?: string;
  }) => api<{ content: string; modelId: string; displayName?: string; provider?: string; providerModelId?: string; tokensUsed?: number; router?: Record<string, unknown> }>("/api/ai/respond", {
    method: "POST",
    body: JSON.stringify(body),
  }),
  conversations: () => api<{ conversations: Conversation[] }>("/api/conversations"),
  createConversation: (modelId: string, title?: string) =>
    api<Conversation>("/api/conversations", {
      method: "POST",
      body: JSON.stringify({ modelId, title }),
    }),
  getConversation: (id: string) =>
    api<{ conversation: Conversation; messages: ChatMessage[] }>(`/api/conversations/${id}`),
  addMessage: (conversationId: string, role: "user" | "assistant", content: string) =>
    api<ChatMessage>(`/api/conversations/${conversationId}/messages`, {
      method: "POST",
      body: JSON.stringify({ role, content }),
    }),
  deleteConversation: (id: string) =>
    api<{ ok: boolean }>(`/api/conversations/${id}`, { method: "DELETE" }),
  exportConversation: (id: string) =>
    api<{ conversation: Conversation; messages: ChatMessage[]; exportedAt: string }>(
      `/api/conversations/${id}/export`
    ),
};

export const imageApi = {
  usage: () =>
    api<{ imagesUsed: number; imagesLimit: number; remainingImages: number; canGenerate: boolean }>(
      "/api/images/usage"
    ),
  generate: (body: { prompt: string; size?: string; quality?: string }) =>
    api<{ url: string; revisedPrompt?: string; modelId: string; displayName: string; provider: string }>(
      "/api/images/generate",
      { method: "POST", body: JSON.stringify(body) }
    ),
};
