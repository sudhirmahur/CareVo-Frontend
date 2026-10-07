import { Briefcase } from 'lucide-react';
import ModulePlaceholder from '../../components/common/ModulePlaceholder';

// TODO: list/search/close the recruiter's own job posts - recruiter.api.js
export default function RecruiterJobs() {
  return (
    <ModulePlaceholder
      title="Jobs"
      description="Manage your job posts."
      icon={Briefcase}
      planned={['View and edit published roles', 'Close or reopen a role']}
    />
  );
}
