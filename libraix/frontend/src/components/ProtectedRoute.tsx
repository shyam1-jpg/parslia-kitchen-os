import { Navigate, Outlet } from "react-router-dom";
import { useAuth } from "../lib/auth";

export function ProtectedRoute() {
  const { user, loading } = useAuth();

  if (loading) return <div className="protected-loading">Loading…</div>;
  if (!user) return <Navigate to="/login" replace />;
  return <Outlet />;
}

export function PublicOnlyRoute() {
  const { user, loading } = useAuth();

  if (loading) return <div className="protected-loading">Loading…</div>;
  if (user) return <Navigate to="/app" replace />;
  return <Outlet />;
}
