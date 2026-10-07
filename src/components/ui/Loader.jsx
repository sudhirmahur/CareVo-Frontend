import { Loader2 } from 'lucide-react';
import { cn } from '../../utils/helpers';

export default function Loader({ className, label = 'Loading' }) {
  return <Loader2 role="status" aria-label={label} className={cn('h-5 w-5 animate-spin text-brand', className)} />;
}

export function FullPageLoader() {
  return (
    <div className="flex min-h-dvh items-center justify-center bg-bg">
      <Loader className="h-8 w-8" label="Loading Carevo" />
    </div>
  );
}
