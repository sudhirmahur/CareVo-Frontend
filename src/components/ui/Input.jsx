import { forwardRef, useId } from 'react';
import { cn } from '../../utils/helpers';

export const fieldBase =
  'w-full rounded-xl border bg-surface-2/60 px-3.5 text-sm text-fg placeholder:text-muted/70 transition-colors ' +
  'focus:border-brand focus:outline-none focus:ring-2 focus:ring-brand/30 disabled:opacity-60';

export function FieldWrapper({ id, label, error, hint, children }) {
  return (
    <div className="space-y-1.5">
      {label && (
        <label htmlFor={id} className="block text-sm font-medium text-fg">
          {label}
        </label>
      )}
      {children}
      {error ? (
        <p id={`${id}-error`} role="alert" className="text-xs text-danger">
          {error}
        </p>
      ) : (
        hint && <p className="text-xs text-muted">{hint}</p>
      )}
    </div>
  );
}

const Input = forwardRef(function Input({ label, error, hint, leftIcon: LeftIcon, rightElement, className, id, ...props }, ref) {
  const autoId = useId();
  const inputId = id || autoId;
  return (
    <FieldWrapper id={inputId} label={label} error={error} hint={hint}>
      <div className="relative">
        {LeftIcon && <LeftIcon className="pointer-events-none absolute left-3.5 top-1/2 h-4 w-4 -translate-y-1/2 text-muted" aria-hidden />}
        <input
          ref={ref}
          id={inputId}
          aria-invalid={Boolean(error)}
          aria-describedby={error ? `${inputId}-error` : undefined}
          className={cn(fieldBase, 'h-11', LeftIcon && 'pl-10', rightElement && 'pr-11', error ? 'border-danger' : 'border-border', className)}
          {...props}
        />
        {rightElement && <div className="absolute right-2 top-1/2 -translate-y-1/2">{rightElement}</div>}
      </div>
    </FieldWrapper>
  );
});

export default Input;
