import { useEffect, useState } from 'react';
import { useAuth } from '../../lib/auth';
import { Link, NavLink, Routes, useLocation } from '../../lib/router';
import Icon from '../../components/Icon';
import ChatView from '../../components/shared/ChatView';
import NotificationBell, { refreshBell } from '../../components/shared/NotificationBell';
import NotificationsView from '../../components/shared/NotificationsView';
import { Avatar, EmptyState, Logo, PageHeader } from '../../components/ui';
import Account from './pages/Account';
import Applications from './pages/Applications';
import Banners from './pages/Banners';
import Broadcast from './pages/Broadcast';
import Companies from './pages/Companies';
import Dashboard from './pages/Dashboard';
import Interviews from './pages/Interviews';
import Landing from './pages/Landing';
import Learning from './pages/Learning';
import AuditLog from './pages/AuditLog';
import Jobs from './pages/Jobs';
import Recruiters from './pages/Recruiters';
import Reports from './pages/Reports';
import Settings from './pages/Settings';
import Skills from './pages/Skills';
import Users from './pages/Users';
import Videos from './pages/Videos';
import './admin.css';

const NAV = [
  { group: 'Overview', items: [['/admin/dashboard', 'Dashboard', 'grid']] },
  { group: 'People', items: [['/admin/users', 'Users', 'users'], ['/admin/recruiters', 'Recruiters', 'user'], ['/admin/companies', 'Companies', 'building']] },
  { group: 'Content', items: [['/admin/jobs', 'Jobs', 'briefcase'], ['/admin/applications', 'Applications', 'clipboard'], ['/admin/interviews', 'Interviews', 'calendar'], ['/admin/videos', 'Videos', 'video'], ['/admin/reports', 'Reports', 'flag']] },
  { group: 'Platform', items: [['/admin/landing', 'Landing page', 'home'], ['/admin/skills', 'Skills & categories', 'sparkles'], ['/admin/learning', 'Prep & assessments', 'book'], ['/admin/banners', 'Banners', 'layers'], ['/admin/broadcast', 'Broadcast', 'send'], ['/admin/messages', 'Messages', 'message'], ['/admin/settings', 'Settings', 'settings'], ['/admin/audit', 'Audit log', 'shield'], ['/admin/account', 'My account', 'lock']] },
];
const TABS = [['/admin/dashboard', 'Home', 'grid'], ['/admin/users', 'Users', 'users'], ['/admin/jobs', 'Jobs', 'briefcase'], ['/admin/reports', 'Reports', 'flag']];

export default function AdminPanel() {
  const { user, logout } = useAuth();
  const { pathname } = useLocation();
  const [open, setOpen] = useState(false);
  useEffect(() => { setOpen(false); }, [pathname]);
  useEffect(() => {
    document.body.classList.toggle('modal-open', open);
    return () => document.body.classList.remove('modal-open');
  }, [open]);

  const routes = [
    { path: '/admin', element: <Dashboard /> },
    { path: '/admin/dashboard', element: <Dashboard /> },
    { path: '/admin/users', element: <Users /> },
    { path: '/admin/recruiters', element: <Recruiters /> },
    { path: '/admin/companies', element: <Companies /> },
    { path: '/admin/jobs', element: <Jobs /> },
    { path: '/admin/applications', element: <Applications /> },
    { path: '/admin/interviews', element: <Interviews /> },
    { path: '/admin/videos', element: <Videos /> },
    { path: '/admin/reports', element: <Reports /> },
    { path: '/admin/skills', element: <Skills /> },
    { path: '/admin/landing', element: <Landing /> },
    { path: '/admin/learning', element: <Learning /> },
    { path: '/admin/audit', element: <AuditLog /> },
    { path: '/admin/banners', element: <Banners /> },
    { path: '/admin/broadcast', element: <Broadcast /> },
    { path: '/admin/settings', element: <Settings /> },
    { path: '/admin/account', element: <Account /> },
    { path: '/admin/messages', element: (<><PageHeader title="Messages" description="Conversations with any user or recruiter." /><ChatView myId={user.id} /></>) },
    { path: '/admin/notifications', element: (<><PageHeader title="Notifications" /><NotificationsView role="admin" onChange={refreshBell} /></>) },
  ];

  const sidebar = (
    <>
      <Link to="/admin/dashboard" className="a-brand"><Logo size={32} /><span className="a-role">Admin</span></Link>
      <nav className="a-nav" aria-label="Admin">
        {NAV.map((g) => (
          <div className="a-group" key={g.group}>
            <div className="a-group-title">{g.group}</div>
            {g.items.map(([to, label, ic]) => (
              <NavLink key={to} to={to} className="a-link"><Icon name={ic} size={18} /><span>{label}</span></NavLink>
            ))}
          </div>
        ))}
      </nav>
      <div className="a-side-foot">
        <Avatar name={user.name} src={user.profile_image} size={34} />
        <div className="a-me"><strong className="truncate">{user.name}</strong><span className="truncate">{user.email}</span></div>
        <button type="button" className="a-logout" onClick={() => logout()} aria-label="Sign out" title="Sign out"><Icon name="logout" size={18} /></button>
      </div>
    </>
  );

  return (
    <div className="p-admin">
      <aside className="a-side" aria-label="Sidebar">{sidebar}</aside>
      {open && <div className="a-scrim" onClick={() => setOpen(false)} />}
      <aside className={`a-drawer ${open ? 'open' : ''}`} aria-hidden={!open} aria-label="Menu" role="dialog">{open && sidebar}</aside>

      <div className="a-content">
        <header className="a-top">
          <button type="button" className="icon-btn a-burger" onClick={() => setOpen(true)} aria-label="Open menu"><Icon name="menu" size={22} /></button>
          <span className="a-top-title">Carevo Admin</span>
          <div className="a-top-right">
            <Link to="/admin/messages" className="icon-btn" aria-label="Messages"><Icon name="message" size={20} /></Link>
            <NotificationBell to="/admin/notifications" />
          </div>
        </header>
        <main className="a-main" id="main">
          <Routes routes={routes} fallback={<EmptyState icon="search" title="Page not found" description="This admin page does not exist." action={<Link className="btn btn-primary" to="/admin/dashboard">Go to dashboard</Link>} />} />
        </main>
      </div>

      <nav className="a-tabbar" aria-label="Primary">
        {TABS.map(([to, label, ic]) => (
          <NavLink key={to} to={to} className="a-tab"><Icon name={ic} size={22} /><span>{label}</span></NavLink>
        ))}
        <button type="button" className="a-tab" onClick={() => setOpen(true)} aria-label="More"><Icon name="grid" size={22} /><span>More</span></button>
      </nav>
    </div>
  );
}
