import { Link } from 'react-router-dom';
import { cn } from '../../utils/helpers';

export function LogoMark({ className }) {
  return (
    <span className={cn('flex h-9 w-9 items-center justify-center rounded-xl bg-brand text-white', className)} aria-hidden>
      <svg viewBox="0 0 32 32" className="h-5 w-5" fill="none" stroke="currentColor" strokeWidth="3.2" strokeLinecap="round">
        <path d="M21 11.5a6.5 6.5 0 1 0 0 9" />
        <circle cx="23" cy="9.5" r="1.8" fill="currentColor" stroke="none" />
      </svg>
    </span>
  );
}

export default function Logo({ to = '/', showWordmark = true, className }) {
  return (
    <Link to={to} className={cn('inline-flex items-center gap-2.5', className)} aria-label="Carevo home">
      <LogoMark />
      {showWordmark && <span className="font-display text-lg font-extrabold tracking-wide">CAREVO</span>}
    </Link>
  );
}
