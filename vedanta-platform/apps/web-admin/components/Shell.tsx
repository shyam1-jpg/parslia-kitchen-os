"use client";
import { usePathname } from "next/navigation";
import Nav from "@/components/Nav";
import { StoreProvider } from "@/lib/store";
/** Admin shell with nav, except on public pages (the organiser form) which stand alone. */
export default function Shell({ children }: { children: React.ReactNode }) {
  const p = usePathname();
  if (p?.startsWith("/form")) return <>{children}</>;
  return <StoreProvider><div className="shell"><Nav /><main className="main">{children}</main></div></StoreProvider>;
}
