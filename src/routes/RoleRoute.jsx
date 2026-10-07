import { Navigate, Outlet } from 'react-router-dom';
import useAuth from '../hooks/useAuth';

/** Place inside <ProtectedRoute>. Redirects users whose backend-issued role is not allowed. */
export default function RoleRoute({ allowedRoles }) {
  const { user } = useAuth();
  if (!allowedRoles.includes(user?.role)) return <Navigate to="/unauthorized" replace />;
  return <Outlet />;
}
