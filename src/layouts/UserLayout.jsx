import { Bookmark, Briefcase, CalendarDays, FileText, LayoutDashboard, MessageSquare, PlayCircle, Sparkles, User, Bell, ClipboardList } from 'lucide-react';
import DashboardShell from '../components/common/DashboardShell';

export const USER_NAV = [
  { to: '/dashboard', label: 'Dashboard', icon: LayoutDashboard, end: true },
  { to: '/jobs', label: 'Jobs', icon: Briefcase },
  { to: '/applications', label: 'Applications', icon: ClipboardList },
  { to: '/videos', label: 'Videos', icon: PlayCircle },
  { to: '/profile', label: 'Profile', icon: User },
  { to: '/resume', label: 'Resume', icon: FileText },
  { to: '/skills', label: 'Skills', icon: Sparkles },
  { to: '/saved-jobs', label: 'Saved jobs', icon: Bookmark },
  { to: '/interviews', label: 'Interviews', icon: CalendarDays },
  { to: '/messages', label: 'Messages', icon: MessageSquare },
  { to: '/notifications', label: 'Notifications', icon: Bell },
];

export default function UserLayout() {
  return <DashboardShell navItems={USER_NAV} profilePath="/profile" />;
}
