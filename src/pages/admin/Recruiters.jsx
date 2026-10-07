import { UserCheck } from 'lucide-react';
import ModulePlaceholder from '../../components/common/ModulePlaceholder';

// TODO: review and approve recruiter accounts.
export default function AdminRecruiters() {
  return <ModulePlaceholder title="Recruiters" description="Review and manage recruiter accounts." icon={UserCheck} />;
}
