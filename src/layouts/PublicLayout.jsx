import { useState } from 'react';
import { Link, Outlet } from 'react-router-dom';
import { Menu, X } from 'lucide-react';
import Logo from '../components/common/Logo';
import ThemeToggle from '../components/common/ThemeToggle';
import Button from '../components/ui/Button';
import useAuth from '../hooks/useAuth';
import { ROLE_HOME } from '../utils/constants';
import { APP_NAME, APP_TAGLINE } from '../utils/constants';

const NAV_LINKS = [
  { href: '/#how-it-works', label: 'How it works' },
  { href: '/#job-seekers', label: 'Job seekers' },
  { href: '/#recruiters', label: 'Recruiters' },
  { href: '/about', label: 'About' },
];

function Footer() {
  return (
    <footer className="border-t border-border bg-surface/40">
      <div className="container-page grid gap-8 py-12 md:grid-cols-4">
        <div className="md:col-span-2">
          <Logo />
          <p className="mt-3 max-w-sm text-sm text-muted">{APP_TAGLINE}</p>
        </div>
        <div>
          <p className="mb-3 text-sm font-semibold">Platform</p>
          <ul className="space-y-2 text-sm text-muted">
            <li><Link to="/jobs" className="hover:text-fg">Find jobs</Link></li>
            <li><Link to="/register" className="hover:text-fg">Create profile</Link></li>
            <li><Link to="/login" className="hover:text-fg">Sign in</Link></li>
          </ul>
        </div>
        <div>
          <p className="mb-3 text-sm font-semibold">Company</p>
          <ul className="space-y-2 text-sm text-muted">
            <li><Link to="/about" className="hover:text-fg">About {APP_NAME}</Link></li>
            <li><a href="/#recruiters" className="hover:text-fg">For recruiters</a></li>
          </ul>
        </div>
      </div>
      <div className="border-t border-border py-5 text-center text-xs text-muted">
        © {new Date().getFullYear()} {APP_NAME}. All rights reserved.
      </div>
    </footer>
  );
}

export default function PublicLayout() {
  const { user, isAuthenticated } = useAuth();
  const [menuOpen, setMenuOpen] = useState(false);
  const homePath = ROLE_HOME[user?.role] ?? '/dashboard';

  return (
    <div className="flex min-h-dvh flex-col">
      <header className="sticky top-0 z-30 border-b border-border bg-bg/85 backdrop-blur">
        <div className="container-page flex h-16 items-center justify-between">
          <Logo />
          <nav className="hidden items-center gap-7 md:flex" aria-label="Main">
            {NAV_LINKS.map((link) => (
              <a key={link.href} href={link.href} className="text-sm font-medium text-muted transition-colors hover:text-fg">
                {link.label}
              </a>
            ))}
          </nav>
          <div className="flex items-center gap-2">
            <ThemeToggle />
            {isAuthenticated ? (
              <Button as={Link} to={homePath} size="sm">
                Go to dashboard
              </Button>
            ) : (
              <>
                <Button as={Link} to="/login" variant="ghost" size="sm" className="hidden sm:inline-flex">
                  Sign in
                </Button>
                <Button as={Link} to="/register" size="sm" className="hidden sm:inline-flex">
                  Get started
                </Button>
              </>
            )}
            <button
              type="button"
              onClick={() => setMenuOpen((open) => !open)}
              aria-label={menuOpen ? 'Close menu' : 'Open menu'}
              aria-expanded={menuOpen}
              className="flex h-10 w-10 items-center justify-center rounded-xl text-muted hover:bg-surface-2 md:hidden"
            >
              {menuOpen ? <X className="h-5 w-5" /> : <Menu className="h-5 w-5" />}
            </button>
          </div>
        </div>
        {menuOpen && (
          <div className="border-t border-border bg-surface px-4 py-4 md:hidden">
            <nav className="grid gap-1" aria-label="Mobile">
              {NAV_LINKS.map((link) => (
                <a key={link.href} href={link.href} onClick={() => setMenuOpen(false)} className="rounded-lg px-3 py-2.5 text-sm font-medium hover:bg-surface-2">
                  {link.label}
                </a>
              ))}
            </nav>
            {!isAuthenticated && (
              <div className="mt-3 grid grid-cols-2 gap-2">
                <Button as={Link} to="/login" variant="outline" onClick={() => setMenuOpen(false)}>Sign in</Button>
                <Button as={Link} to="/register" onClick={() => setMenuOpen(false)}>Get started</Button>
              </div>
            )}
          </div>
        )}
      </header>
      <main className="flex-1">
        <Outlet />
      </main>
      <Footer />
    </div>
  );
}
