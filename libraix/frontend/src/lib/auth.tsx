import { createContext, useCallback, useContext, useEffect, useState, type ReactNode } from "react";
import { authApi, type Usage, type User } from "./api";

interface AuthState {
  user: User | null;
  usage: Usage | null;
  loading: boolean;
  refresh: () => Promise<void>;
  login: (email: string, password: string) => Promise<void>;
  signup: (email: string, password: string, displayName?: string) => Promise<void>;
  logout: () => Promise<void>;
}

const AuthContext = createContext<AuthState | null>(null);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [usage, setUsage] = useState<Usage | null>(null);
  const [loading, setLoading] = useState(true);

  const refresh = useCallback(async () => {
    const ctrl = new AbortController();
    const timer = window.setTimeout(() => ctrl.abort(), 12_000);
    try {
      const data = await authApi.me(ctrl.signal);
      setUser(data.user);
      setUsage(data.usage);
    } catch {
      setUser(null);
      setUsage(null);
    } finally {
      window.clearTimeout(timer);
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    refresh();
  }, [refresh]);

  const login = async (email: string, password: string) => {
    const data = await authApi.login(email, password);
    setUser(data.user);
    setUsage(data.usage);
  };

  const signup = async (email: string, password: string, displayName?: string) => {
    const data = await authApi.signup(email, password, displayName);
    setUser(data.user);
    setUsage(data.usage);
  };

  const logout = async () => {
    await authApi.logout();
    setUser(null);
    setUsage(null);
  };

  return (
    <AuthContext.Provider value={{ user, usage, loading, refresh, login, signup, logout }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error("useAuth must be used within AuthProvider");
  return ctx;
}
