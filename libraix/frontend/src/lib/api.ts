import { readApiError } from "./errors";

export interface User {
  id: string;
  email: string;
  displayName: string | null;
  plan: "free" | "pro" | "enterprise";
  emailVerified: boolean;
  billingStatus?: "active" | "past_due";
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
  available?: boolean;
  unavailableReason?: string;
  speedHint?: string;
  costHint?: string;
}

export interface DocumentSource {
  index: number;
  filename: string;
  excerpt: string;
  url?: string;
}

export type { WeatherCardData } from "./weather";
import type { WeatherCardData } from "./weather";

export interface Conversation {
  id: string;
  title: string;
  modelId: string;
  pinned: boolean;
  archived?: boolean;
  projectId?: string | null;
  createdAt: string;
  updatedAt: string;
}

export interface ChatMessage {
  id: string;
  role: "user" | "assistant";
  content: string;
  createdAt: string;
  modelLabel?: string;
  imageUrl?: string;
  imageGenerating?: boolean;
  sources?: DocumentSource[];
  weatherCard?: WeatherCardData;
}

export type LaunchStatus = "live" | "beta" | "coming_soon" | "disabled";

export interface Catalog {
  modelCount: number;
  toolCount: number;
  assistantCount: number;
  launchNote?: string;
  models: (ModelInfo & { launchStatus: LaunchStatus })[];
  tools: { id: string; name: string; description: string; tier: string; launchStatus: LaunchStatus }[];
  assistants: { id: string; name: string; description: string; systemPrompt: string; tier: string; launchStatus?: LaunchStatus }[];
  plans: Record<string, { dailyMessages: number; premiumModelMessages: number; images: number }>;
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
    api<{
      oauth: { google: boolean; apple: boolean; microsoft: boolean };
      stripe: boolean;
      email: boolean;
      providers: string[];
    }>("/api/auth/config"),
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
    api<{ ok: boolean; verifyUrl?: string; emailNote?: string; alreadyVerified?: boolean }>(
      "/api/auth/resend-verification",
      { method: "POST", body: "{}" }
    ),
  deleteAccount: () => api<{ ok: boolean }>("/api/auth/account", { method: "DELETE" }),
};

export const catalogApi = {
  get: () => api<Catalog>("/api/catalog"),
};

export interface BillingStatus {
  plan: string;
  billingStatus: "active" | "past_due";
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

export const locationApi = {
  get: (refresh = false) =>
    api<{ location: UserLocation | null; auto?: boolean; note?: string }>(
      `/api/location${refresh ? "?refresh=1" : ""}`
    ),
  save: (body: {
    city: string;
    region?: string | null;
    country?: string;
    latitude: number;
    longitude: number;
    timezone?: string | null;
    source?: "browser" | "manual";
  }) =>
    api<{ location: UserLocation }>("/api/location", {
      method: "POST",
      body: JSON.stringify(body),
    }),
};

export interface UserLocation {
  city: string;
  region: string | null;
  country: string;
  latitude: number;
  longitude: number;
  timezone: string | null;
  source: "ip" | "browser" | "manual" | "saved";
  label: string;
  ip?: string;
}

export const chatApi = {
  models: () => api<{ models: ModelInfo[] }>("/api/models"),
  respond: (body: {
    message: string;
    modelId?: string;
    routerMode?: string;
    history?: { role: "user" | "assistant"; content: string }[];
    systemPrompt?: string;
    projectId?: string;
    conversationId?: string;
  }) => api<{ content: string; modelId: string; displayName?: string; provider?: string; providerModelId?: string; tokensUsed?: number; router?: Record<string, unknown>; imageUrl?: string; type?: string; sources?: DocumentSource[]; weatherCard?: WeatherCardData }>("/api/ai/respond", {
    method: "POST",
    body: JSON.stringify(body),
  }),
  conversations: (archived = false) =>
    api<{ conversations: Conversation[] }>(`/api/conversations${archived ? "?archived=1" : ""}`),
  createConversation: (modelId: string, title?: string, projectId?: string | null) =>
    api<Conversation>("/api/conversations", {
      method: "POST",
      body: JSON.stringify({ modelId, title, projectId }),
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
  renameConversation: (id: string, title: string) =>
    api<{ ok: boolean; conversation?: Conversation }>(`/api/conversations/${id}`, {
      method: "PATCH",
      body: JSON.stringify({ title }),
    }),
  pinConversation: (id: string, pinned: boolean) =>
    api<{ ok: boolean; conversation?: Conversation }>(`/api/conversations/${id}`, {
      method: "PATCH",
      body: JSON.stringify({ pinned }),
    }),
  archiveConversation: (id: string, archived: boolean) =>
    api<{ ok: boolean; conversation?: Conversation }>(`/api/conversations/${id}`, {
      method: "PATCH",
      body: JSON.stringify({ archived }),
    }),
  setConversationProject: (id: string, projectId: string | null) =>
    api<{ ok: boolean; conversation?: Conversation }>(`/api/conversations/${id}`, {
      method: "PATCH",
      body: JSON.stringify({ projectId }),
    }),
  editMessage: (conversationId: string, messageId: string, content: string) =>
    api<{ ok: boolean; messages: ChatMessage[] }>(`/api/conversations/${conversationId}/messages/${messageId}`, {
      method: "PATCH",
      body: JSON.stringify({ content }),
    }),
  regenerateConversation: (id: string) =>
    api<{ ok: boolean; messages: ChatMessage[] }>(`/api/conversations/${id}/regenerate`, { method: "POST", body: "{}" }),
  branchConversation: (id: string, messageId: string, modelId?: string) =>
    api<{ conversation: Conversation; messages: ChatMessage[] }>(`/api/conversations/${id}/branch`, {
      method: "POST",
      body: JSON.stringify({ messageId, modelId }),
    }),
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
  generate: (body: { prompt: string; size?: string; quality?: string; speed?: "fast" | "quality" }) =>
    api<{ url: string; revisedPrompt?: string; modelId: string; displayName: string; provider: string; imageModel?: string; speed?: string }>(
      "/api/images/generate",
      { method: "POST", body: JSON.stringify(body) }
    ),
};
