import { LayoutDashboard } from 'lucide-react';
import ModulePlaceholder from '../../components/common/ModulePlaceholder';

// TODO: recruiter dashboard (open roles, new applications, upcoming interviews) once the recruiter API exists.
export default function RecruiterDashboard() {
  return (
    <ModulePlaceholder
      title="Recruiter dashboard"
      description="Your hiring overview."
      icon={LayoutDashboard}
      planned={['Open roles and their performance', 'New applications to review', 'Upcoming interviews']}
    />
  );
}
