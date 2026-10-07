import { Link } from 'react-router-dom';
import { ShieldAlert } from 'lucide-react';
import Button from '../../components/ui/Button';
import useAuth from '../../hooks/useAuth';
import { ROLE_HOME } from '../../utils/constants';

export default function Unauthorized() {
  const { user, isAuthenticated } = useAuth();
  return (
    <div className="container-page flex min-h-[60dvh] flex-col items-center justify-center text-center">
      <span className="mb-4 flex h-14 w-14 items-center justify-center rounded-2xl bg-danger/10 text-danger">
        <ShieldAlert className="h-7 w-7" aria-hidden />
      </span>
      <h1 className="text-2xl font-bold">You do not have access</h1>
      <p className="mt-2 max-w-md text-muted">Your account does not have permission to view this page.</p>
      <Button as={Link} to={isAuthenticated ? ROLE_HOME[user.role] ?? '/' : '/login'} className="mt-6">
        {isAuthenticated ? 'Go to my dashboard' : 'Sign in'}
      </Button>
    </div>
  );
}
