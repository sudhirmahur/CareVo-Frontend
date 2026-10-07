import { CheckCircle2 } from 'lucide-react';
import Logo from '../common/Logo';
import { APP_TAGLINE } from '../../utils/constants';

const HIGHLIGHTS = [
  'Build a profile that shows your real skills',
  'Apply to roles with a resume you control',
  'Track every application in one place',
];

/** Split-screen frame for login / register / password pages. */
export default function AuthShell({ title, subtitle, children, footer }) {
  return (
    <div className="grid min-h-dvh lg:grid-cols-2">
      <aside className="relative hidden flex-col justify-between overflow-hidden border-r border-border bg-surface p-12 lg:flex">
        <div className="pointer-events-none absolute -right-24 -top-24 h-80 w-80 rounded-full bg-brand/20 blur-3xl" aria-hidden />
        <Logo />
        <div className="relative">
          <h2 className="font-display text-4xl font-extrabold leading-tight">{APP_TAGLINE}</h2>
          <ul className="mt-8 space-y-4">
            {HIGHLIGHTS.map((item) => (
              <li key={item} className="flex items-start gap-3 text-muted">
                <CheckCircle2 className="mt-0.5 h-5 w-5 shrink-0 text-brand" aria-hidden />
                {item}
              </li>
            ))}
          </ul>
        </div>
        <p className="relative text-xs text-muted">© {new Date().getFullYear()} Carevo</p>
      </aside>

      <main className="flex items-center justify-center px-4 py-10 sm:px-8">
        <div className="w-full max-w-md">
          <div className="mb-8 lg:hidden">
            <Logo />
          </div>
          <h1 className="text-2xl font-bold sm:text-3xl">{title}</h1>
          {subtitle && <p className="mt-2 text-sm text-muted">{subtitle}</p>}
          <div className="mt-8">{children}</div>
          {footer && <p className="mt-6 text-center text-sm text-muted">{footer}</p>}
        </div>
      </main>
    </div>
  );
}
