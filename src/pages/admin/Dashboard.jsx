import { LayoutDashboard } from 'lucide-react';
import ModulePlaceholder from '../../components/common/ModulePlaceholder';

// TODO: platform overview once the admin API exists. Do not show invented statistics.
export default function AdminDashboard() {
  return (
    <ModulePlaceholder
      title="Admin dashboard"
      description="Platform overview."
      icon={LayoutDashboard}
      planned={['User and recruiter activity', 'Moderation queue', 'Platform health']}
    />
  );
}
