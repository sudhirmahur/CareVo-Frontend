import { ClipboardList } from 'lucide-react';
import ModulePlaceholder from '../../components/common/ModulePlaceholder';

// TODO: review applications and update status (applied -> shortlisted/rejected/accepted).
export default function RecruiterApplications() {
  return (
    <ModulePlaceholder
      title="Applications"
      description="Review candidates for your roles."
      icon={ClipboardList}
      planned={['Review resumes and cover letters', 'Shortlist, accept or reject candidates']}
    />
  );
}
