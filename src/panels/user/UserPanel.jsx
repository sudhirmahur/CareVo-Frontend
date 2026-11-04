import { useEffect, useState } from 'react';
import { useAuth } from '../../lib/auth';
import { useAsync } from '../../lib/hooks';
import { api } from '../../lib/api';
import { Link, NavLink, Routes, useLocation, useNavigate } from '../../lib/router';
import Icon from '../../components/Icon';
import ChatView from '../../components/shared/ChatView';
import NotificationBell, { refreshBell } from '../../components/shared/NotificationBell';
import NotificationsView from '../../components/shared/NotificationsView';
import { Avatar, Logo, PageHeader } from '../../components/ui';
import Applications from './pages/Applications';
import Assessments, { AssessmentTake } from './pages/Assessments';
import { Companies, CompanyDetail } from './pages/Companies';
import Dashboard from './pages/Dashboard';
import Following from './pages/Following';
import Interviews from './pages/Interviews';
import JobDetail from './pages/JobDetail';
import Jobs from './pages/Jobs';
import NotFound from './pages/NotFound';
import Prep from './pages/Prep';
import Profile from './pages/Profile';
import RecruiterProfile from './pages/RecruiterProfile';
import Reels from './pages/Reels';
import Resume from './pages/Resume';
import ResumeBuilder from './pages/ResumeBuilder';
import SavedJobs from './pages/SavedJobs';
import Settings from './pages/Settings';
import Skills from './pages/Skills';
import './user.css';
import './user-shell.css';

export const NAV = [
  { to: '/dashboard', label: 'Dashboard', icon: 'grid' },
  { to: '/jobs', label: 'Browse Jobs', icon: 'briefcase' },
  { to: '/videos', label: 'Job Reels', icon: 'video' },
  { to: '/applications', label: 'My Applications', icon: 'clipboard' },
  { to: '/saved', label: 'Saved Jobs', icon: 'bookmark' },
  { to: '/companies', label: 'Companies', icon: 'building' },
  { to: '/interviews', label: 'Interviews', icon: 'calendar' },
  { to: '/prep', label: 'Interview Prep', icon: 'book' },
  { to: '/assessments', label: 'Skill Assessments', icon: 'award' },
  { to: '/messages', label: 'Messages', icon: 'message' },
  { to: '/notifications', label: 'Notifications', icon: 'bell' },
  { to: '/profile', label: 'Profile', icon: 'user' },
  { to: '/resume-builder', label: 'Resume Builder', icon: 'file' },
  { to: '/settings', label: 'Settings', icon: 'settings' },
];
const TABS = [NAV[0], NAV[1], NAV[2], NAV[3]];

function Sidebar({ onNavigate }) {
  const { user, logout } = useAuth();
  const prem = useAsync(() => api.get('/users/me/premium'), []);
  const showUpgrade = prem.data && prem.data.gating_enabled && !prem.data.is_premium;
  return (
    <div className="u-side-in">
      <Link to="/dashboard" className="u-brand" onClick={onNavigate}><Logo size={34} /></Link>
      <nav className="u-side-nav" aria-label="Main">
        {NAV.map((i) => (
          <NavLink key={i.to} to={i.to} className="u-side-link" onClick={onNavigate}>
            <Icon name={i.icon} size={19} /><span>{i.label}</span>
          </NavLink>
        ))}
      </nav>
      <div className="u-side-foot">
        {showUpgrade ? (
          <Link to="/settings" className="u-upgrade" onClick={onNavigate}>
            <Icon name="crown" size={20} />
            <div><strong>Go Premium</strong><small>Apply from Reels and view recruiter profiles</small></div>
          </Link>
        ) : prem.data?.is_premium ? (
          <div className="u-upgrade is-on"><Icon name="crown" size={20} /><div><strong>Premium member</strong><small>All features unlocked</small></div></div>
        ) : null}
        <button type="button" className="u-side-link u-side-logout" onClick={() => logout()}><Icon name="logout" size={19} /><span>Sign out</span></button>
        <p className="u-side-user small muted truncate">{user.email}</p>
      </div>
    </div>
  );
}

export default function UserPanel() {
  const { user } = useAuth();
  const { pathname } = useLocation();
  const navigate = useNavigate();
  const [drawer, setDrawer] = useState(false);
  const [q, setQ] = useState('');
  useEffect(() => { setDrawer(false); window.scrollTo(0, 0); }, [pathname]);
  useEffect(() => {
    document.body.classList.toggle('modal-open', drawer);
    return () => document.body.classList.remove('modal-open');
  }, [drawer]);

  const search = (e) => {
    e.preventDefault();
    navigate(`/jobs${q.trim() ? `?q=${encodeURIComponent(q.trim())}` : ''}`);
  };

  const routes = [
    { path: '/dashboard', element: <Dashboard /> },
    { path: '/jobs', element: <Jobs /> },
    { path: '/jobs/:id', element: <JobDetail /> },
    { path: '/applications', element: <Applications /> },
    { path: '/saved', element: <SavedJobs /> },
    { path: '/companies', element: <Companies /> },
    { path: '/companies/:id', element: <CompanyDetail /> },
    { path: '/videos', element: <Reels /> },
    { path: '/recruiters/:id', element: <RecruiterProfile /> },
    { path: '/resume', element: <Resume /> },
    { path: '/resume-builder', element: <ResumeBuilder /> },
    { path: '/profile', element: <Profile /> },
    { path: '/settings', element: <Settings /> },
    { path: '/skills', element: <Skills /> },
    { path: '/prep', element: <Prep /> },
    { path: '/assessments', element: <Assessments /> },
    { path: '/assessments/:id', element: <AssessmentTake /> },
    { path: '/interviews', element: <Interviews /> },
    { path: '/following', element: <Following /> },
    { path: '/messages', element: (<><PageHeader title="Messages" description="Chat with recruiters." /><ChatView myId={user.id} /></>) },
    { path: '/notifications', element: (<><PageHeader title="Notifications" /><NotificationsView role="user" onChange={refreshBell} /></>) },
  ];
  const reels = pathname === '/videos';

  return (
    <div className="p-user u-shell">
      <aside className="u-side" aria-label="Sidebar"><Sidebar /></aside>

      <div className="u-col">
        <header className="u-top">
          <button type="button" className="icon-btn u-burger" aria-label="Open menu" aria-expanded={drawer} onClick={() => setDrawer(true)}><Icon name="menu" size={22} /></button>
          <Link to="/dashboard" className="u-top-logo"><Logo size={30} /></Link>
          <form className="u-top-search" onSubmit={search} role="search">
            <Icon name="search" size={18} />
            <input value={q} onChange={(e) => setQ(e.target.value)} placeholder="Search jobs, companies, skills…" aria-label="Search jobs" maxLength={100} />
          </form>
          <div className="u-top-right">
            <NotificationBell to="/notifications" />
            <Link to="/messages" className="icon-btn" aria-label="Messages"><Icon name="mail" size={20} /></Link>
            <Link to="/profile" className="u-me" aria-label="My profile">
              <Avatar name={user.name} src={user.profile_image} size={38} />
              <span className="u-me-text"><strong className="truncate">{user.name}</strong><small>Job Seeker</small></span>
            </Link>
          </div>
        </header>
        <main className={`u-main ${reels ? 'u-main-wide' : ''}`} id="main">
          <Routes routes={routes} fallback={<NotFound />} />
        </main>
      </div>

      <nav className="u-tabbar" aria-label="Primary">
        {TABS.map((i) => (
          <NavLink key={i.to} to={i.to} className="u-tab">
            <Icon name={i.icon} size={22} /><span>{({ '/dashboard': 'Home', '/jobs': 'Jobs', '/videos': 'Reels', '/applications': 'Applied' })[i.to]}</span>
          </NavLink>
        ))}
        <button type="button" className={`u-tab ${drawer ? 'active' : ''}`} onClick={() => setDrawer(true)} aria-haspopup="dialog" aria-label="Menu">
          <Icon name="menu" size={22} /><span>Menu</span>
        </button>
      </nav>

      {drawer && (
        <div className="u-drawer-wrap" onMouseDown={(e) => e.target === e.currentTarget && setDrawer(false)}>
          <div className="u-drawer" role="dialog" aria-modal="true" aria-label="Menu">
            <button type="button" className="icon-btn u-drawer-x" aria-label="Close menu" onClick={() => setDrawer(false)}><Icon name="x" size={22} /></button>
            <Sidebar onNavigate={() => setDrawer(false)} />
          </div>
        </div>
      )}
    </div>
  );
}
