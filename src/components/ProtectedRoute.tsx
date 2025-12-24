import { Navigate } from "react-router-dom";
import { useAuth } from "@/contexts/AuthContext";

interface ProtectedRouteProps {
  children: React.ReactNode;
  allowedRoles?: string[];
}

export const ProtectedRoute = ({ children, allowedRoles }: ProtectedRouteProps) => {
  const { user, isAuthenticated } = useAuth();

  if (!isAuthenticated) {
    console.warn('[ProtectedRoute] User not authenticated, redirecting to /login');
    return <Navigate to="/login" replace />;
  }

  // Normalize role comparison (handle both snake_case and format variations)
  const normalizeRole = (r: string) => r?.toLowerCase().replace(/\s+/g, '_') || '';
  const userRole = normalizeRole(user?.role || '');
  const normalizedAllowedRoles = (allowedRoles || []).map(normalizeRole);

  if (allowedRoles && allowedRoles.length > 0 && !normalizedAllowedRoles.includes(userRole)) {
    console.warn(`[ProtectedRoute] User role "${userRole}" not in allowed roles: ${normalizedAllowedRoles.join(', ')}`);
    return <Navigate to="/unauthorized" replace />;
  }

  return <>{children}</>;
};
