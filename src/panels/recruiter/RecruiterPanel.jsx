import { useCallback, useEffect, useRef, useState } from 'react';
import './recruiter.css';
import Icon from '../../components/Icon';
import NotificationBell from '../../components/shared/NotificationBell';
import { Avatar, Badge, Button, EmptyState, Logo, PageHeader } from '../../components/ui';
import { BannerStrip } from '../../components/shared/Announcements';
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
import Calendar from './Calendar';
import Analytics from './Analytics';
import Team from './Team';
import Candidates from './Candidates';
import Offers from './Offers';
import AccountCenter from '../../components/shared/AccountCenter';
import HelpCenter from '../../components/shared/HelpCenter';

export const GROUPS = [
  { title: 'Hiring', items: [
    ['/recruiter/dashboard', 'Dashboard', 'grid'],
    ['/recruiter/jobs', 'Jobs', 'briefcase'],
    ['/recruiter/applications', 'Applications', 'clipboard'],
    ['/recruiter/interviews', 'Interviews', 'calendar'],
    ['/recruiter/calendar', 'Calendar', 'clock'],
    ['/recruiter/candidates', 'Candidate pool', 'users'],
    ['/recruiter/offers', 'Offer letters', 'award'],
    ['/recruiter/analytics', 'Analytics', 'chart'],
    ['/recruiter/team', 'Team', 'user'],
    ['/recruiter/videos', 'Videos', 'video'],
  ] },
  { title: 'Communicate', items: [
    ['/recruiter/messages', 'Messages', 'message'],
    ['/recruiter/notifications', 'Notifications', 'bell'],
    ['/recruiter/followers', 'Followers', 'users'],
  ] },
  { title: 'Company', items: [
    ['/recruiter/company', 'Company profile', 'building'],
    ['/recruiter/account', 'Profile', 'settings'],
    ['/recruiter/security', 'Account & security', 'shield'],
    ['/recruiter/help', 'Help & support', 'info'],
  ] },
];
const PRIMARY = GROUPS[0].items.concat(GROUPS[1].items.slice(0, 1));
const SECONDARY = GROUPS[1].items.slice(1).concat(GROUPS[2].items);
const TABS = GROUPS[0].items.slice(0, 4);

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

  const nav = (
    <>
      {GROUPS.map((g) => (
        <div key={g.title} className="r-side-group">
          <p className="r-side-title">{g.title}</p>
          {g.items.map(([to, label, ic]) => (
            <NavLink key={to} to={to} className="r-side-link"><Icon name={ic} size={19} /><span>{label}</span></NavLink>
          ))}
        </div>
      ))}
    </>
  );

  return (
    <CompanyContext.Provider value={{ company, loading, reload }}>
      <div className="p-recruiter r-shell">
        <aside className="r-side">
          <div className="r-side-in">
            <Link to="/recruiter/dashboard" className="r-brand"><Logo size={32} /><span className="r-role">Recruiter</span></Link>
            {company && <Link to="/recruiter/company" className="r-company-card" title="Company profile"><Icon name="building" size={18} /><span className="truncate">{company.name}</span></Link>}
            <nav className="r-side-nav" aria-label="Main">{nav}</nav>
            <div className="r-side-foot">
              <button type="button" className="r-side-link r-side-logout" onClick={() => logout()}><Icon name="logout" size={19} /><span>Sign out</span></button>
            </div>
          </div>
        </aside>

        <div className="r-content">
          <header className="r-nav">
            <div className="r-nav-inner">
              <button type="button" className="icon-btn r-burger only-mobile" aria-label={menu ? 'Close menu' : 'Open menu'} aria-expanded={menu} onClick={() => setMenu((m) => !m)}>
                <Icon name={menu ? 'x' : 'menu'} size={22} />
              </button>
              <Link to="/recruiter/dashboard" className="r-brand r-top-brand only-mobile"><Logo size={28} /></Link>
              <div className="r-nav-right">
                {company && <Link to="/recruiter/company" className="r-company-chip hide-mobile" title="Company profile"><Icon name="building" size={14} /><span className="truncate">{company.name}</span></Link>}
                <Link to="/recruiter/messages" className="icon-btn hide-mobile" aria-label="Messages"><Icon name="mail" size={20} /></Link>
                <NotificationBell to="/recruiter/notifications" className="icon-btn r-bell" />
                <UserMenu user={user} logout={logout} />
              </div>
            </div>
          </header>
          <main className="r-main" id="main"><BannerStrip />{children}</main>
        </div>

        {menu && (
          <div className="r-drawer-wrap" onMouseDown={(e) => e.target === e.currentTarget && setMenu(false)}>
            <div className="r-drawer" role="dialog" aria-modal="true" aria-label="Menu"><nav aria-label="Mobile" className="r-drawer-nav">
              <div className="r-dropdown-head"><strong>{user.name}</strong><span className="muted small">{company ? company.name : user.email}</span></div>
              {GROUPS.map((g) => (
                <div key={g.title} className="r-side-group">
                  <p className="r-side-title">{g.title}</p>
                  {g.items.map(([to, label, ic]) => (
                    <NavLink key={to} to={to} className="r-mobile-link"><Icon name={ic} size={18} />{label}</NavLink>
                  ))}
                </div>
              ))}
              <button type="button" className="r-mobile-link danger" onClick={() => logout()}><Icon name="logout" size={18} />Sign out</button>
            </nav></div>
          </div>
        )}

        <nav className="r-tabbar" aria-label="Primary">
          {TABS.map(([to, label, ic]) => (
            <NavLink key={to} to={to} className="r-tab"><Icon name={ic} size={21} /><span>{label}</span></NavLink>
          ))}
          <button type="button" className="r-tab" onClick={() => setMenu(true)} aria-label="More"><Icon name="grid" size={21} /><span>More</span></button>
        </nav>
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
          { path: '/recruiter/calendar', element: <Calendar /> },
          { path: '/recruiter/candidates', element: <Candidates /> },
          { path: '/recruiter/offers', element: <Offers /> },
          { path: '/recruiter/analytics', element: <Analytics /> },
          { path: '/recruiter/team', element: <Team /> },
          { path: '/recruiter/security', element: <AccountCenter role="recruiter" /> },
          { path: '/recruiter/help', element: <HelpCenter role="recruiter" /> },
        ]}
      />
    </Layout>
  );
}
