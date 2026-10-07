import { useState } from 'react';
import { Link, NavLink, Outlet } from 'react-router-dom';
import { LogOut, MoreHorizontal, User } from 'lucide-react';
import useAuth from '../../hooks/useAuth';
import { cn } from '../../utils/helpers';
import NotificationBell from '../notifications/NotificationBell';
import Avatar from '../ui/Avatar';
import Dropdown, { DropdownItem } from '../ui/Dropdown';
import Modal from '../ui/Modal';
import Logo from './Logo';
import ThemeToggle from './ThemeToggle';

const desktopLink = ({ isActive }) =>
  cn(
    'flex items-center gap-3 rounded-xl px-3 py-2.5 text-sm font-medium transition-colors',
    isActive ? 'bg-brand/10 text-brand' : 'text-muted hover:bg-surface-2 hover:text-fg',
  );

const mobileLink = ({ isActive }) =>
  cn(
    'flex min-w-0 flex-1 flex-col items-center gap-1 px-1 py-2 text-[11px] font-medium transition-colors',
    isActive ? 'text-brand' : 'text-muted',
  );

function UserMenu({ profilePath }) {
  const { user, logout } = useAuth();
  return (
    <Dropdown
      trigger={({ toggle }) => (
        <button type="button" onClick={toggle} aria-label="Open account menu" className="rounded-full">
          <Avatar src={user?.profile_image} name={user?.name} size="md" />
        </button>
      )}
    >
      {({ close }) => (
        <>
          <div className="border-b border-border px-3 pb-2.5 pt-1.5">
            <p className="truncate text-sm font-semibold">{user?.name}</p>
            <p className="truncate text-xs text-muted">{user?.email}</p>
          </div>
          {profilePath && (
            <DropdownItem as={Link} to={profilePath} icon={User} onClick={close}>
              Profile
            </DropdownItem>
          )}
          <DropdownItem icon={LogOut} danger onClick={logout}>
            Sign out
          </DropdownItem>
        </>
      )}
    </Dropdown>
  );
}

/**
 * Shared authenticated app frame used by the User, Recruiter and Admin layouts.
 * Desktop: fixed sidebar. Mobile: top bar + bottom tab bar (+ "More" sheet).
 */
export default function DashboardShell({ navItems, roleLabel, profilePath, showNotifications = true }) {
  const [moreOpen, setMoreOpen] = useState(false);
  const primaryMobile = navItems.length > 5 ? navItems.slice(0, 4) : navItems;
  const overflowMobile = navItems.length > 5 ? navItems.slice(4) : [];

  return (
    <div className="min-h-dvh bg-bg">
      <aside className="fixed inset-y-0 left-0 z-30 hidden w-64 flex-col border-r border-border bg-surface lg:flex">
        <div className="flex h-16 items-center justify-between px-5">
          <Logo to="/" />
        </div>
        {roleLabel && <p className="px-5 pb-2 text-xs font-semibold uppercase tracking-wider text-muted">{roleLabel}</p>}
        <nav className="flex-1 space-y-1 overflow-y-auto px-3 pb-4" aria-label="Main navigation">
          {navItems.map(({ to, label, icon: Icon, end }) => (
            <NavLink key={to} to={to} end={end} className={desktopLink}>
              <Icon className="h-[18px] w-[18px]" aria-hidden />
              {label}
            </NavLink>
          ))}
        </nav>
      </aside>

      <div className="lg:pl-64">
        <header className="sticky top-0 z-20 flex h-16 items-center justify-between gap-3 border-b border-border bg-bg/85 px-4 backdrop-blur sm:px-6">
          <div className="lg:hidden">
            <Logo to="/" />
          </div>
          <div className="ml-auto flex items-center gap-1.5">
            <ThemeToggle />
            {showNotifications && <NotificationBell />}
            <UserMenu profilePath={profilePath} />
          </div>
        </header>

        <main className="px-4 pb-28 pt-6 sm:px-6 lg:pb-10">
          <div className="mx-auto w-full max-w-6xl">
            <Outlet />
          </div>
        </main>
      </div>

      <nav
        aria-label="Primary"
        className="safe-bottom fixed inset-x-0 bottom-0 z-30 flex border-t border-border bg-surface/95 backdrop-blur lg:hidden"
      >
        {primaryMobile.map(({ to, label, icon: Icon, end }) => (
          <NavLink key={to} to={to} end={end} className={mobileLink}>
            <Icon className="h-5 w-5" aria-hidden />
            <span className="truncate">{label}</span>
          </NavLink>
        ))}
        {overflowMobile.length > 0 && (
          <button type="button" onClick={() => setMoreOpen(true)} className="flex min-w-0 flex-1 flex-col items-center gap-1 px-1 py-2 text-[11px] font-medium text-muted">
            <MoreHorizontal className="h-5 w-5" aria-hidden />
            More
          </button>
        )}
      </nav>

      <Modal open={moreOpen} onClose={() => setMoreOpen(false)} title="More" size="sm">
        <div className="grid gap-1">
          {overflowMobile.map(({ to, label, icon: Icon }) => (
            <NavLink key={to} to={to} onClick={() => setMoreOpen(false)} className={desktopLink}>
              <Icon className="h-[18px] w-[18px]" aria-hidden />
              {label}
            </NavLink>
          ))}
        </div>
      </Modal>
    </div>
  );
}
