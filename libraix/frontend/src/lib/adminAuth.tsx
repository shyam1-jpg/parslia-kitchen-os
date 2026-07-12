import { createContext, useCallback, useContext, useEffect, useState, type ReactNode } from "react";
import { adminApi, type AdminUser } from "./adminApi";

interface AdminAuthState {
  admin: AdminUser | null;
  loading: boolean;
  refresh: () => Promise<void>;
  login: (email: string, password: string, totpCode?: string) => Promise<{ totpRequired?: boolean }>;
  logout: () => Promise<void>;
}

const AdminAuthContext = createContext<AdminAuthState | null>(null);

export function AdminAuthProvider({ children }: { children: ReactNode }) {
  const [admin, setAdmin] = useState<AdminUser | null>(null);
  const [loading, setLoading] = useState(true);

  const refresh = useCallback(async () => {
    try {
      const data = await adminApi.me();
      setAdmin(data.admin);
    } catch {
      setAdmin(null);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    if (window.location.pathname.startsWith("/admin")) refresh();
    else setLoading(false);
  }, [refresh]);

  const login = async (email: string, password: string, totpCode?: string) => {
    try {
      const data = await adminApi.login(email, password, totpCode);
      setAdmin(data.admin);
      return {};
    } catch (e) {
      if (e instanceof Error && e.message === "ADMIN_2FA_REQUIRED") {
        return { totpRequired: true };
      }
      throw e;
    }
  };

  const logout = async () => {
    await adminApi.logout();
    setAdmin(null);
  };

  return (
    <AdminAuthContext.Provider value={{ admin, loading, refresh, login, logout }}>
      {children}
    </AdminAuthContext.Provider>
  );
}

export function useAdminAuth() {
  const ctx = useContext(AdminAuthContext);
  if (!ctx) throw new Error("useAdminAuth must be used within AdminAuthProvider");
  return ctx;
}
