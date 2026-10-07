import { AlertTriangle, RefreshCw } from 'lucide-react';
import { cn } from '../../utils/helpers';
import Button from './Button';

export default function ErrorState({ title = 'Something went wrong', message, onRetry, className }) {
  return (
    <div
      role="alert"
      className={cn('flex flex-col items-center rounded-2xl border border-danger/30 bg-danger/5 px-6 py-10 text-center', className)}
    >
      <span className="mb-4 flex h-12 w-12 items-center justify-center rounded-2xl bg-danger/10 text-danger">
        <AlertTriangle className="h-6 w-6" aria-hidden />
      </span>
      <h3 className="text-base font-semibold">{title}</h3>
      {message && <p className="mt-1.5 max-w-md text-sm text-muted">{message}</p>}
      {onRetry && (
        <Button variant="secondary" size="sm" leftIcon={RefreshCw} onClick={onRetry} className="mt-5">
          Try again
        </Button>
      )}
    </div>
  );
}
