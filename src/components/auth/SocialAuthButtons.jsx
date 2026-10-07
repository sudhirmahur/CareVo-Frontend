import { Apple } from 'lucide-react';
import Badge from '../ui/Badge';
import Button from '../ui/Button';

const GoogleMark = () => (
  <svg viewBox="0 0 24 24" className="h-4 w-4" aria-hidden>
    <path fill="#EA4335" d="M12 10.2v3.9h5.5c-.2 1.3-1.6 3.8-5.5 3.8a6.1 6.1 0 0 1 0-12.2c1.9 0 3.2.8 3.9 1.5l2.7-2.6A9.8 9.8 0 0 0 12 2a10 10 0 1 0 0 20c5.8 0 9.6-4 9.6-9.8 0-.7-.1-1.2-.2-2H12z" />
  </svg>
);

/**
 * Google / Apple sign-in entry points. They are intentionally inert until the
 * backend exposes POST /auth/google and /auth/apple - nothing is faked.
 * When ready: obtain the provider credential, then call
 * `loginWithProvider(provider, credential)` from AuthContext.
 */
export default function SocialAuthButtons() {
  return (
    <div className="grid gap-3">
      <Button variant="secondary" disabled leftIcon={GoogleMark} className="w-full justify-center" aria-label="Continue with Google (coming soon)">
        Continue with Google
        <Badge className="ml-1">Coming soon</Badge>
      </Button>
      <Button variant="secondary" disabled leftIcon={Apple} className="w-full justify-center" aria-label="Continue with Apple (coming soon)">
        Continue with Apple
        <Badge className="ml-1">Coming soon</Badge>
      </Button>
    </div>
  );
}
