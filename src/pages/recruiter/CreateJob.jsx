import { PlusCircle } from 'lucide-react';
import ModulePlaceholder from '../../components/common/ModulePlaceholder';

// TODO: job creation form (title, description, requirements, skills, salary, location, type).
export default function RecruiterCreateJob() {
  return <ModulePlaceholder title="Create job" description="Publish a new role." icon={PlusCircle} />;
}
