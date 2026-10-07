import { AlertCircle, CheckCircle2, Info, X } from 'lucide-react';
import { cn } from '../../utils/helpers';

const TONES = {
  success: { icon: CheckCircle2, style: 'border-success/40 text-success' },
  danger: { icon: AlertCircle, style: 'border-danger/40 text-danger' },
  info: { icon: Info, style: 'border-info/40 text-info' },
};

export default function ToastViewport({ toasts, onDismiss }) {
  return (
    <div
      aria-live="polite"
      className="pointer-events-none fixed inset-x-0 bottom-20 z-[60] flex flex-col items-center gap-2 px-4 sm:bottom-6 sm:items-end sm:px-6"
    >
      {toasts.map((toast) => {
        const { icon: Icon, style } = TONES[toast.tone] ?? TONES.info;
        return (
          <div
            key={toast.id}
            role="status"
            className={cn(
              'pointer-events-auto flex w-full max-w-sm animate-fade-in items-start gap-3 rounded-xl border bg-surface px-4 py-3 shadow-card',
              style,
            )}
          >
            <Icon className="mt-0.5 h-4 w-4 shrink-0" aria-hidden />
            <p className="flex-1 text-sm text-fg">{toast.message}</p>
            <button type="button" onClick={() => onDismiss(toast.id)} aria-label="Dismiss notification" className="text-muted hover:text-fg">
              <X className="h-4 w-4" />
            </button>
          </div>
        );
      })}
    </div>
  );
}
