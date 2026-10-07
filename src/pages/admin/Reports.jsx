import { Flag } from 'lucide-react';
import ModulePlaceholder from '../../components/common/ModulePlaceholder';

// TODO: review reports submitted via POST /api/reports (jobs, users, videos, comments).
export default function AdminReports() {
  return <ModulePlaceholder title="Reports" description="Review content reported by members." icon={Flag} />;
}
