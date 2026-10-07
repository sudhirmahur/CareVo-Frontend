import { Link } from 'react-router-dom';
import { ArrowRight, Briefcase, Sparkles, UserCircle2 } from 'lucide-react';
import Button from '../../../components/ui/Button';
import useAuth from '../../../hooks/useAuth';
import { APP_TAGLINE } from '../../../utils/constants';

/** Decorative product preview: abstract placeholders only, no invented data. */
function PreviewCard() {
  return (
    <div className="relative mx-auto w-full max-w-md" aria-hidden>
      <div className="absolute -inset-6 rounded-[2rem] bg-brand/15 blur-3xl" />
      <div className="relative space-y-3 rounded-3xl border border-border bg-surface p-5 shadow-card">
        <div className="flex items-center gap-3">
          <span className="flex h-11 w-11 items-center justify-center rounded-full bg-brand/15 text-brand">
            <UserCircle2 className="h-6 w-6" />
          </span>
          <div className="flex-1 space-y-2">
            <div className="h-3 w-1/2 rounded bg-surface-2" />
            <div className="h-2.5 w-1/3 rounded bg-surface-2" />
          </div>
        </div>
        <div className="flex flex-wrap gap-2 pt-1">
          {['Your skills', 'Your experience', 'Your goals'].map((label) => (
            <span key={label} className="rounded-full border border-brand/25 bg-brand/10 px-3 py-1 text-xs font-medium text-brand">
              {label}
            </span>
          ))}
        </div>
        <div className="rounded-2xl border border-border bg-surface-2/60 p-4">
          <div className="flex items-center gap-2 text-sm font-medium">
            <Briefcase className="h-4 w-4 text-brand" /> Roles that fit you
          </div>
          <div className="mt-3 space-y-2">
            <div className="h-2.5 w-full rounded bg-surface" />
            <div className="h-2.5 w-4/5 rounded bg-surface" />
            <div className="h-2.5 w-3/5 rounded bg-surface" />
          </div>
        </div>
        <div className="flex items-center gap-2 rounded-2xl border border-dashed border-border p-3 text-xs text-muted">
          <Sparkles className="h-4 w-4 text-brand" /> Intelligent career tools, built in
        </div>
      </div>
    </div>
  );
}

export default function HeroSection() {
  const { isAuthenticated } = useAuth();
  return (
    <section className="relative overflow-hidden">
      <div className="pointer-events-none absolute inset-x-0 top-0 h-96 bg-gradient-to-b from-brand/10 to-transparent" aria-hidden />
      <div className="container-page relative grid items-center gap-12 py-16 sm:py-24 lg:grid-cols-2">
        <div>
          <p className="inline-flex items-center rounded-full border border-border bg-surface px-3 py-1 text-xs font-semibold tracking-[0.2em] text-muted">
            CAREVO
          </p>
          <h1 className="mt-5 text-4xl font-extrabold leading-[1.1] sm:text-5xl lg:text-6xl">{APP_TAGLINE}</h1>
          <p className="mt-5 max-w-xl text-lg text-muted">
            Build your profile, discover the right opportunities, and move your career forward with intelligent career tools.
          </p>
          <div className="mt-8 flex flex-col gap-3 sm:flex-row">
            <Button as={Link} to="/jobs" size="lg" rightIcon={ArrowRight}>
              Find Jobs
            </Button>
            <Button as={Link} to={isAuthenticated ? '/profile' : '/register'} size="lg" variant="secondary">
              Build Your Profile
            </Button>
          </div>
        </div>
        <PreviewCard />
      </div>
    </section>
  );
}
