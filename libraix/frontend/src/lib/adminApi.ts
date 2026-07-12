export interface AdminUser {
  id: string;
  email: string;
  displayName: string | null;
  role: string;
  totpEnabled: boolean;
}

async function adminFetch<T>(path: string, options?: RequestInit): Promise<T> {
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

export const adminApi = {
  login: async (email: string, password: string, totpCode?: string) => {
    const res = await fetch("/api/admin/login", {
      method: "POST",
      credentials: "include",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ email, password, totpCode }),
    });
    const body = await res.json().catch(() => ({})) as { admin?: AdminUser; error?: string; totpRequired?: boolean };
    if (res.status === 403 && body.totpRequired) {
      throw new Error("ADMIN_2FA_REQUIRED");
    }
    if (!res.ok) throw new Error(body.error ?? `HTTP ${res.status}`);
    return body as { admin: AdminUser };
  },
  logout: () => adminFetch<{ ok: boolean }>("/api/admin/logout", { method: "POST" }),
  me: () => adminFetch<{ admin: AdminUser }>("/api/admin/me"),
  dashboard: () => adminFetch<Record<string, unknown>>("/api/admin/dashboard"),
  users: () => adminFetch<{ users: Array<Record<string, unknown>> }>("/api/admin/users"),
  updateUser: (id: string, body: Record<string, unknown>) =>
    adminFetch<{ user: Record<string, unknown> }>(`/api/admin/users/${id}`, {
      method: "PATCH",
      body: JSON.stringify(body),
    }),
  deleteUser: (id: string) => adminFetch<{ ok: boolean }>(`/api/admin/users/${id}`, { method: "DELETE" }),
  config: () => adminFetch<Record<string, unknown>>("/api/admin/config"),
  updateConfig: (body: Record<string, unknown>) =>
    adminFetch<Record<string, unknown>>("/api/admin/config", { method: "PATCH", body: JSON.stringify(body) }),
  auditLogs: () => adminFetch<{ logs: Array<Record<string, unknown>> }>("/api/admin/audit-logs"),
  setup2fa: () => adminFetch<{ secret: string; qrDataUrl: string }>("/api/admin/2fa/setup", { method: "POST", body: "{}" }),
  enable2fa: (code: string) =>
    adminFetch<{ ok: boolean }>("/api/admin/2fa/enable", { method: "POST", body: JSON.stringify({ code }) }),
};
