import { Loader2 } from 'lucide-react';
import { cn } from '../../utils/helpers';

const VARIANTS = {
  primary: 'bg-brand text-white hover:bg-brand-hover shadow-sm',
  secondary: 'bg-surface-2 text-fg hover:bg-border/60 border border-border',
  outline: 'border border-border text-fg hover:bg-surface-2',
  ghost: 'text-muted hover:bg-surface-2 hover:text-fg',
  danger: 'bg-danger/10 text-danger hover:bg-danger/20 border border-danger/30',
};

const SIZES = {
  sm: 'h-8 px-3 text-sm gap-1.5',
  md: 'h-10 px-4 text-sm gap-2',
  lg: 'h-12 px-6 text-base gap-2',
  icon: 'h-10 w-10 justify-center',
};

/** Pass `as={Link} to="/x"` to render a router link with button styling. */
export default function Button({
  as: Component = 'button',
  variant = 'primary',
  size = 'md',
  loading = false,
  leftIcon: LeftIcon,
  rightIcon: RightIcon,
  disabled,
  className,
  children,
  ...props
}) {
  const extra = Component === 'button' ? { type: 'button', disabled: disabled || loading } : {};
  return (
    <Component
      {...extra}
      {...props}
      className={cn(
        'inline-flex shrink-0 items-center justify-center rounded-xl font-medium transition-colors duration-150',
        'disabled:pointer-events-none disabled:opacity-50',
        VARIANTS[variant],
        SIZES[size],
        className,
      )}
    >
      {loading ? <Loader2 className="h-4 w-4 animate-spin" aria-hidden /> : LeftIcon && <LeftIcon className="h-4 w-4" aria-hidden />}
      {children}
      {!loading && RightIcon && <RightIcon className="h-4 w-4" aria-hidden />}
    </Component>
  );
}
