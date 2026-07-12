import { Navigate, Outlet } from "react-router-dom";
import { useAdminAuth } from "../lib/adminAuth";

export function AdminPublicRoute() {
  const { admin, loading } = useAdminAuth();
  if (loading) return <div className="protected-loading">Loading…</div>;
  if (admin) return <Navigate to="/admin" replace />;
  return <Outlet />;
}

export function AdminProtectedRoute() {
  const { admin, loading } = useAdminAuth();
  if (loading) return <div className="protected-loading">Loading…</div>;
  if (!admin) return <Navigate to="/admin/login" replace />;
  return <Outlet />;
}
