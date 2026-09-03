"use client";
// Same-origin by default so the live tunnel (Cloudflare / localhost.run) can
// proxy /auth, /v1 and /me without the browser calling localhost:4000.
export const API = process.env.NEXT_PUBLIC_API_URL ?? "";
export type Problem = { status: number; code: string; detail: string };
export class ApiError extends Error { problem: Problem; constructor(p: Problem) { super(p.detail); this.problem = p; } }

export const token = { get: () => (typeof window === "undefined" ? null : window.sessionStorage.getItem("vedanta.token")), set: (t: string | null) => { if (t) window.sessionStorage.setItem("vedanta.token", t); else window.sessionStorage.removeItem("vedanta.token"); } };

export async function api<T>(path: string, init: RequestInit & { version?: number } = {}): Promise<T> {
  const headers: Record<string, string> = { "content-type": "application/json", ...(init.headers as Record<string, string> ?? {}) };
  const t = token.get(); if (t) headers.authorization = `Bearer ${t}`;
  if (init.version !== undefined) headers["if-match"] = String(init.version);
  const res = await fetch(API + path, { ...init, headers });
  const body = res.status === 204 ? null : await res.json().catch(() => null);
  if (!res.ok) throw new ApiError(body ?? { status: res.status, code: "http_" + res.status, detail: res.statusText });
  return body as T;
}
