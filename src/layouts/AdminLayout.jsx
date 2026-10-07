import { Briefcase, Flag, LayoutDashboard, Settings, UserCheck, Users } from 'lucide-react';
import DashboardShell from '../components/common/DashboardShell';

export const ADMIN_NAV = [
  { to: '/admin/dashboard', label: 'Dashboard', icon: LayoutDashboard, end: true },
  { to: '/admin/users', label: 'Users', icon: Users },
  { to: '/admin/recruiters', label: 'Recruiters', icon: UserCheck },
  { to: '/admin/jobs', label: 'Jobs', icon: Briefcase },
  { to: '/admin/reports', label: 'Reports', icon: Flag },
  { to: '/admin/settings', label: 'Settings', icon: Settings },
];

export default function AdminLayout() {
  return <DashboardShell navItems={ADMIN_NAV} roleLabel="Admin" showNotifications={false} />;
}
