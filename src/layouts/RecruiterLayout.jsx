import { Building2, Briefcase, CalendarDays, ClipboardList, LayoutDashboard } from 'lucide-react';
import DashboardShell from '../components/common/DashboardShell';

export const RECRUITER_NAV = [
  { to: '/recruiter/dashboard', label: 'Dashboard', icon: LayoutDashboard, end: true },
  { to: '/recruiter/company', label: 'Company', icon: Building2 },
  { to: '/recruiter/jobs', label: 'Jobs', icon: Briefcase },
  { to: '/recruiter/applications', label: 'Applications', icon: ClipboardList },
  { to: '/recruiter/interviews', label: 'Interviews', icon: CalendarDays },
];

// TODO: enable notifications for recruiters once their backend module exists.
export default function RecruiterLayout() {
  return <DashboardShell navItems={RECRUITER_NAV} roleLabel="Recruiter" showNotifications={false} />;
}
