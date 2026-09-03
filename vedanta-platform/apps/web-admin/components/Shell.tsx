"use client";
import { useEffect, useState, type ReactNode } from "react";
import { usePathname, useRouter } from "next/navigation";
import Nav from "@/components/Nav";
import { StoreProvider, useStore } from "@/lib/store";
import { token } from "@/lib/api";

/** Admin shell with nav. Sign-in and the organiser form stand alone. */
export default function Shell({ children }: { children: React.ReactNode }) {
  const p = usePathname();
  if (p?.startsWith("/form")) return <>{children}</>;
  if (p?.startsWith("/sign-in")) return <StoreProvider>{children}</StoreProvider>;
  return <StoreProvider><HouseShell>{children}</HouseShell></StoreProvider>;
}

function HouseShell({ children }: { children: ReactNode }) {
  const { user, ready } = useStore();
  const router = useRouter();
  const [hasToken, setHasToken] = useState<boolean | null>(null);

  useEffect(() => { setHasToken(!!token.get()); }, [user]);

  useEffect(() => {
    if (hasToken === false) {
      router.replace("/sign-in/");
      return;
    }
    if (hasToken && ready && !user) {
      router.replace("/sign-in/?error=" + encodeURIComponent("Your session ended. Sign in again."));
    }
  }, [hasToken, ready, user, router]);

  if (hasToken === false || (ready && !user) || !user) return null;
  return <div className="shell"><Nav /><main className="main">{children}</main></div>;
}
