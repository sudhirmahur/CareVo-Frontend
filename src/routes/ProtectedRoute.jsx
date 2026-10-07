import { Navigate, Outlet, useLocation } from 'react-router-dom';
import { FullPageLoader } from '../components/ui/Loader';
import useAuth from '../hooks/useAuth';

/** Requires a signed-in user. The backend remains the real authority. */
export default function ProtectedRoute() {
  const { isAuthenticated, loading } = useAuth();
  const location = useLocation();

  if (loading) return <FullPageLoader />;
  if (!isAuthenticated) return <Navigate to="/login" replace state={{ from: location }} />;
  return <Outlet />;
}
