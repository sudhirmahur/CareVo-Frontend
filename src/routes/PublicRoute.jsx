import { Navigate, Outlet, useLocation } from 'react-router-dom';
import { FullPageLoader } from '../components/ui/Loader';
import useAuth from '../hooks/useAuth';
import { ROLE_HOME } from '../utils/constants';

/** For guest-only pages (login, register). Signed-in users go to their role home. */
export default function PublicRoute() {
  const { isAuthenticated, loading, user } = useAuth();
  const location = useLocation();

  if (loading) return <FullPageLoader />;
  if (isAuthenticated) {
    const from = location.state?.from?.pathname;
    return <Navigate to={from || ROLE_HOME[user.role] || '/dashboard'} replace />;
  }
  return <Outlet />;
}
