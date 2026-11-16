import { lazy, Suspense } from 'react';
import { ROLE_HOME, useAuth } from './lib/auth';
import { Navigate, Routes, useLocation } from './lib/router';
import { Spinner } from './components/ui';
import { PopupHost } from './components/shared/Announcements';
import { Landing, Login, Register, ForgotPassword, ResetPassword, LegalPage } from './pages/public/PublicPages';

// Each role gets its own panel (own layout, own stylesheet, loaded only when needed).
const AdminPanel = lazy(() => import('./panels/admin/AdminPanel'));
const RecruiterPanel = lazy(() => import('./panels/recruiter/RecruiterPanel'));
const UserPanel = lazy(() => import('./panels/user/UserPanel'));

const Loader = () => (
  <div className="full-loader"><Spinner size={34} label="Loading Carevo" /></div>
);

function Guard({ role, children }) {
  const { user, loading } = useAuth();
  const { pathname, search } = useLocation();
  if (loading) return <Loader />;
  if (!user) return <Navigate to={`/login?next=${encodeURIComponent(pathname + search)}`} />;
  if (user.role !== role) return <Navigate to={ROLE_HOME[user.role]} />;
  return children;
}

export default function App() {
  const { pathname } = useLocation();
  const isAdmin = pathname === '/admin' || pathname.startsWith('/admin/');
  return (
    <Suspense fallback={<Loader />}>
      {!isAdmin && <PopupHost />}
      {pathname === '/admin' || pathname.startsWith('/admin/') ? (
        <Guard role="admin"><AdminPanel /></Guard>
      ) : pathname === '/recruiter' || pathname.startsWith('/recruiter/') ? (
        <Guard role="recruiter"><RecruiterPanel /></Guard>
      ) : (
        <Routes
          routes={[
            { path: '/', element: <Landing /> },
            { path: '/login', element: <Login /> },
            { path: '/register', element: <Register /> },
            { path: '/forgot-password', element: <ForgotPassword /> },
            { path: '/reset-password', element: <ResetPassword /> },
            { path: '/terms', element: <LegalPage kind="terms" /> },
            { path: '/privacy', element: <LegalPage kind="privacy" /> },
          ]}
          fallback={<Guard role="user"><UserPanel /></Guard>}
        />
      )}
    </Suspense>
  );
}
