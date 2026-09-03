"use client";
import { useEffect, type ReactNode } from "react";
import { useRouter } from "next/navigation";
import { useStore } from "@/lib/store";
export default function Guard({ perm, children }: { perm: string | string[]; children: ReactNode }) {
  const { user, ready, can, error } = useStore(); const router = useRouter();
  useEffect(() => { if (ready && !user) router.replace("/sign-in/"); }, [ready, user, router]);
  if (!ready || !user) return <div className="empty">Opening the house…</div>;
  const ok = Array.isArray(perm) ? perm.some(p => can(p)) : can(perm);
  if (!ok) return <div className="empty">Your role doesn&apos;t have access to this screen.</div>;
  return <>{error && <div className="note" style={{ borderColor: "var(--brick)", background: "var(--brick-soft)" }}>{error}</div>}{children}</>;
}
