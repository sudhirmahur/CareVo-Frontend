import { Link } from 'react-router-dom';
import { KeyRound } from 'lucide-react';
import AuthShell from '../../components/auth/AuthShell';
import ComingSoon from '../../components/common/ComingSoon';
import Button from '../../components/ui/Button';

// TODO: wire to POST /api/auth/forgot-password once the backend provides it.
export default function ForgotPassword() {
  return (
    <AuthShell title="Reset your password" subtitle="Password recovery is not available yet.">
      <ComingSoon
        icon={KeyRound}
        title="Password reset is coming soon"
        description="We are still building this feature. Please contact support if you are locked out."
        action={
          <Button as={Link} to="/login" variant="secondary">
            Back to sign in
          </Button>
        }
      />
    </AuthShell>
  );
}
