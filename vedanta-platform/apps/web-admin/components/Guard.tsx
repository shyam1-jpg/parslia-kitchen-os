"use client";
import type { ReactNode } from "react";
import { useStore } from "@/lib/store";

export default function Guard({ perm, children }: { perm: string | string[]; children: ReactNode }) {
  const { user, ready, can, error } = useStore();
  if (!ready || !user) return null;
  const ok = Array.isArray(perm) ? perm.some(p => can(p)) : can(perm);
  if (!ok) return <div className="empty">Your role doesn&apos;t have access to this screen.</div>;
  return <>{error && <div className="note" style={{ borderColor: "var(--brick)", background: "var(--brick-soft)" }}>{error}</div>}{children}</>;
}
