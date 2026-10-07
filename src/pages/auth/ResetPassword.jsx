import { Link } from 'react-router-dom';
import { KeyRound } from 'lucide-react';
import AuthShell from '../../components/auth/AuthShell';
import ComingSoon from '../../components/common/ComingSoon';
import Button from '../../components/ui/Button';

// TODO: wire to POST /api/auth/reset-password (token from the emailed link) once available.
export default function ResetPassword() {
  return (
    <AuthShell title="Choose a new password" subtitle="Password recovery is not available yet.">
      <ComingSoon
        icon={KeyRound}
        title="Password reset is coming soon"
        action={
          <Button as={Link} to="/login" variant="secondary">
            Back to sign in
          </Button>
        }
      />
    </AuthShell>
  );
}
