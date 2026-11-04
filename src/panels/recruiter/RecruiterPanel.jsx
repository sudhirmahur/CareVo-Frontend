import { useCallback, useEffect, useRef, useState } from 'react';
import './recruiter.css';
import Icon from '../../components/Icon';
import NotificationBell from '../../components/shared/NotificationBell';
import { Avatar, Badge, Button, EmptyState, Logo, PageHeader } from '../../components/ui';
import ChatView from '../../components/shared/ChatView';
import NotificationsView from '../../components/shared/NotificationsView';
import { api } from '../../lib/api';
import { useAuth } from '../../lib/auth';
import { Link, NavLink, Routes, useLocation } from '../../lib/router';
import { CompanyContext } from './context';
import Dashboard from './Dashboard';
import CompanyPage from './CompanyPage';
import { JobsList, JobEditor } from './Jobs';
import Applications from './Applications';
import Interviews from './Interviews';
import Videos from './Videos';
import { Followers, Account } from './Misc';

const PRIMARY = [
  ['/recruiter/dashboard', 'Dashboard', 'grid'],
  ['/recruiter/jobs', 'Jobs', 'briefcase'],
  ['/recruiter/applications', 'Applications', 'clipboard'],
  ['/recruiter/interviews', 'Interviews', 'calendar'],
  ['/recruiter/videos', 'Videos', 'video'],
  ['/recruiter/messages', 'Messages', 'message'],
];
const SECONDARY = [
  ['/recruiter/company', 'Company profile', 'building'],
  ['/recruiter/followers', 'Followers', 'users'],
  ['/recruiter/notifications', 'Notifications', 'bell'],
  ['/recruiter/account', 'Account & security', 'settings'],
];

function UserMenu({ user, logout }) {
  const [open, setOpen] = useState(false);
  const ref = useRef(null);
  const { pathname } = useLocation();
  useEffect(() => setOpen(false), [pathname]);
  useEffect(() => {
    const h = (e) => ref.current && !ref.current.contains(e.target) && setOpen(false);
    document.addEventListener('mousedown', h);
    return () => document.removeEventListener('mousedown', h);
  }, []);
  return (
    <div className="r-usermenu" ref={ref}>
      <button type="button" className="r-userbtn" onClick={() => setOpen((o) => !o)} aria-haspopup="menu" aria-expanded={open} aria-label="Account menu">
        <Avatar name={user.name} src={user.profile_image} size={34} />
        <Icon name="chevronDown" size={14} />
      </button>
      {open && (
        <div className="r-dropdown" role="menu">
          <div className="r-dropdown-head"><strong className="truncate">{user.name}</strong><span className="muted small truncate">{user.email}</span></div>
          {SECONDARY.map(([to, label, ic]) => (
            <Link key={to} to={to} role="menuitem" className="r-dropdown-item"><Icon name={ic} size={16} />{label}</Link>
          ))}
          <button type="button" role="menuitem" className="r-dropdown-item danger" onClick={() => logout()}><Icon name="logout" size={16} />Sign out</button>
        </div>
      )}
    </div>
  );
}

function Layout({ children }) {
  const { user, logout } = useAuth();
  const { pathname } = useLocation();
  const [menu, setMenu] = useState(false);
  const [company, setCompany] = useState(null);
  const [loading, setLoading] = useState(true);

  const reload = useCallback(async () => {
    try {
      setCompany(await api.get('/recruiter/company'));
    } catch (e) {
      if (e.status === 404) setCompany(null);
    } finally {
      setLoading(false);
    }
  }, []);
  useEffect(() => { reload(); }, [reload]);
  useEffect(() => setMenu(false), [pathname]);

  return (
    <CompanyContext.Provider value={{ company, loading, reload }}>
      <div className="p-recruiter">
        <header className="r-nav">
          <div className="r-nav-inner">
            <Link to="/recruiter/dashboard" className="r-brand"><Logo size={30} /><span className="r-role">Recruiter</span></Link>
            <nav className="r-links" aria-label="Main">
              {PRIMARY.map(([to, label]) => (
                <NavLink key={to} to={to} className="r-link">{label}</NavLink>
              ))}
            </nav>
            <div className="r-nav-right">
              {company && <Link to="/recruiter/company" className="r-company-chip hide-mobile" title="Company profile"><Icon name="building" size={14} /><span className="truncate">{company.name}</span></Link>}
              <NotificationBell to="/recruiter/notifications" className="icon-btn r-bell" />
              <div className="hide-mobile"><UserMenu user={user} logout={logout} /></div>
              <button type="button" className="icon-btn r-burger only-mobile" aria-label={menu ? 'Close menu' : 'Open menu'} aria-expanded={menu} onClick={() => setMenu((m) => !m)}>
                <Icon name={menu ? 'x' : 'menu'} size={22} />
              </button>
            </div>
          </div>
          {menu && (
            <nav className="r-mobile-menu" aria-label="Mobile">
              <div className="r-dropdown-head"><strong>{user.name}</strong><span className="muted small">{company ? company.name : user.email}</span></div>
              {[...PRIMARY, ...SECONDARY].map(([to, label, ic]) => (
                <NavLink key={to} to={to} className="r-mobile-link"><Icon name={ic || 'grid'} size={18} />{label}</NavLink>
              ))}
              <button type="button" className="r-mobile-link danger" onClick={() => logout()}><Icon name="logout" size={18} />Sign out</button>
            </nav>
          )}
        </header>
        <main className="r-main" id="main">{children}</main>
      </div>
    </CompanyContext.Provider>
  );
}

function NotFound() {
  return <EmptyState icon="search" title="Page not found" description="That page does not exist in the recruiter panel." action={<Link className="btn btn-primary" to="/recruiter/dashboard">Back to dashboard</Link>} />;
}

export default function RecruiterPanel() {
  const { user } = useAuth();
  return (
    <Layout>
      <Routes
        fallback={<NotFound />}
        routes={[
          { path: '/recruiter', element: <Dashboard /> },
          { path: '/recruiter/dashboard', element: <Dashboard /> },
          { path: '/recruiter/company', element: <CompanyPage /> },
          { path: '/recruiter/jobs', element: <JobsList /> },
          { path: '/recruiter/jobs/new', element: <JobEditor /> },
          { path: '/recruiter/jobs/:id/edit', element: <JobEditor /> },
          { path: '/recruiter/applications', element: <Applications /> },
          { path: '/recruiter/interviews', element: <Interviews /> },
          { path: '/recruiter/videos', element: <Videos /> },
          { path: '/recruiter/followers', element: <Followers /> },
          { path: '/recruiter/messages', element: (<><PageHeader title="Messages" description="Chat with candidates." /><ChatView myId={user.id} /></>) },
          { path: '/recruiter/notifications', element: (<><PageHeader title="Notifications" description="Updates about your jobs, applicants and company." /><NotificationsView role="recruiter" onChange={() => window.dispatchEvent(new Event('carevo:notifications'))} /></>) },
          { path: '/recruiter/account', element: <Account /> },
        ]}
      />
    </Layout>
  );
}
