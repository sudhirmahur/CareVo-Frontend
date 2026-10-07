import { cn } from '../../utils/helpers';

export default function Skeleton({ className }) {
  return <div className={cn('skeleton h-4 w-full', className)} aria-hidden />;
}

/** Generic card-shaped placeholder used while lists load. */
export function SkeletonCard({ lines = 3 }) {
  return (
    <div className="rounded-2xl border border-border bg-surface p-5" aria-busy="true">
      <div className="flex items-center gap-3">
        <Skeleton className="h-11 w-11 rounded-xl" />
        <div className="flex-1 space-y-2">
          <Skeleton className="h-4 w-2/3" />
          <Skeleton className="h-3 w-1/3" />
        </div>
      </div>
      <div className="mt-4 space-y-2">
        {Array.from({ length: lines }).map((_, index) => (
          <Skeleton key={index} className={cn('h-3', index === lines - 1 ? 'w-1/2' : 'w-full')} />
        ))}
      </div>
    </div>
  );
}

export function SkeletonList({ count = 4, lines = 3, className }) {
  return (
    <div className={cn('grid gap-4', className)} role="status" aria-label="Loading content">
      {Array.from({ length: count }).map((_, index) => (
        <SkeletonCard key={index} lines={lines} />
      ))}
    </div>
  );
}
