import { Link } from 'react-router-dom';
import Button from '../../components/ui/Button';

export default function NotFound() {
  return (
    <div className="container-page flex min-h-[60dvh] flex-col items-center justify-center text-center">
      <p className="font-display text-6xl font-extrabold text-brand">404</p>
      <h1 className="mt-4 text-2xl font-bold">Page not found</h1>
      <p className="mt-2 max-w-md text-muted">The page you are looking for does not exist or has been moved.</p>
      <Button as={Link} to="/" className="mt-6">
        Back to home
      </Button>
    </div>
  );
}
