import { cn } from '../../../utils/helpers';

export default function Section({ id, eyebrow, title, description, tinted = false, children }) {
  return (
    <section id={id} className={cn('scroll-mt-20 py-16 sm:py-20', tinted && 'border-y border-border bg-surface/40')}>
      <div className="container-page">
        <div className="mx-auto mb-12 max-w-2xl text-center">
          {eyebrow && <p className="text-sm font-semibold uppercase tracking-wider text-brand">{eyebrow}</p>}
          <h2 className="mt-2 text-3xl font-bold sm:text-4xl">{title}</h2>
          {description && <p className="mt-4 text-muted">{description}</p>}
        </div>
        {children}
      </div>
    </section>
  );
}

export function FeatureCard({ icon: Icon, title, children, badge }) {
  return (
    <div className="rounded-2xl border border-border bg-surface p-6 transition-colors hover:border-brand/40">
      <span className="flex h-11 w-11 items-center justify-center rounded-xl bg-brand/10 text-brand">
        <Icon className="h-5 w-5" aria-hidden />
      </span>
      <div className="mt-4 flex items-center gap-2">
        <h3 className="text-base font-semibold">{title}</h3>
        {badge}
      </div>
      <p className="mt-2 text-sm text-muted">{children}</p>
    </div>
  );
}
