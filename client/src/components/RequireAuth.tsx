import { Navigate } from "react-router-dom";
import type { ReactNode } from "react";
import { useAuth } from "../context/AuthContext.js";

export default function RequireAuth({ children }: { children: ReactNode }) {
  const { user, loading } = useAuth();
  if (loading) return <div className="p-6 text-slate-500">Loading…</div>;
  if (!user) return <Navigate to="/login" replace />;
  return <>{children}</>;
}
