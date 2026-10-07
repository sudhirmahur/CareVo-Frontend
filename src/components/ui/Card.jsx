import { cn } from '../../utils/helpers';

export default function Card({ as: Component = 'div', padded = true, interactive = false, className, children, ...props }) {
  return (
    <Component
      className={cn(
        'rounded-2xl border border-border bg-surface shadow-card',
        padded && 'p-4 sm:p-5',
        interactive && 'transition-colors duration-150 hover:border-brand/40',
        className,
      )}
      {...props}
    >
      {children}
    </Component>
  );
}

export function CardTitle({ title, action, className }) {
  return (
    <div className={cn('mb-4 flex items-center justify-between gap-3', className)}>
      <h2 className="text-base font-semibold">{title}</h2>
      {action}
    </div>
  );
}
