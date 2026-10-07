import { useCallback, useEffect, useRef, useState } from 'react';
import { cn } from '../../utils/helpers';

/**
 * Generic popover. `trigger` receives ({ open, toggle }) and `children`
 * receives ({ close }) so menu items can dismiss the panel.
 */
export default function Dropdown({ trigger, children, align = 'right', panelClassName }) {
  const [open, setOpen] = useState(false);
  const containerRef = useRef(null);

  const close = useCallback(() => setOpen(false), []);
  const toggle = useCallback(() => setOpen((value) => !value), []);

  useEffect(() => {
    if (!open) return undefined;
    const onPointerDown = (event) => {
      if (!containerRef.current?.contains(event.target)) close();
    };
    const onKeyDown = (event) => event.key === 'Escape' && close();
    document.addEventListener('mousedown', onPointerDown);
    document.addEventListener('keydown', onKeyDown);
    return () => {
      document.removeEventListener('mousedown', onPointerDown);
      document.removeEventListener('keydown', onKeyDown);
    };
  }, [open, close]);

  return (
    <div ref={containerRef} className="relative">
      {trigger({ open, toggle })}
      {open && (
        <div
          className={cn(
            'absolute z-40 mt-2 min-w-48 animate-fade-in rounded-xl border border-border bg-surface p-1.5 shadow-card',
            align === 'right' ? 'right-0' : 'left-0',
            panelClassName,
          )}
        >
          {children({ close })}
        </div>
      )}
    </div>
  );
}

export function DropdownItem({ icon: Icon, children, danger, className, as: Component = 'button', ...props }) {
  return (
    <Component
      {...(Component === 'button' ? { type: 'button' } : {})}
      {...props}
      className={cn(
        'flex w-full items-center gap-2.5 rounded-lg px-3 py-2 text-left text-sm transition-colors hover:bg-surface-2',
        danger ? 'text-danger' : 'text-fg',
        className,
      )}
    >
      {Icon && <Icon className="h-4 w-4 text-muted" aria-hidden />}
      {children}
    </Component>
  );
}
