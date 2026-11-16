import { Link } from '../../../lib/router';
import { EmptyState } from '../../../components/ui';

export default function NotFound() {
  return <EmptyState icon="search" title="Page not found" description="The page you are looking for does not exist." action={<Link className="btn btn-primary" to="/dashboard">Go to dashboard</Link>} />;
}
