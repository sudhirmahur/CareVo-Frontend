import { Sparkles } from 'lucide-react';
import { getErrorMessage } from '../../api/errors';
import ComingSoon from './ComingSoon';
import EmptyState from '../ui/EmptyState';
import ErrorState from '../ui/ErrorState';
import { SkeletonList } from '../ui/Skeleton';

/**
 * One place that decides which of the four page states to render:
 * loading -> skeleton, error -> ErrorState, notAvailable -> ComingSoon,
 * empty -> EmptyState, otherwise the children.
 */
export default function DataState({
  loading,
  error,
  notAvailable,
  isEmpty,
  onRetry,
  skeleton,
  comingSoon,
  empty,
  children,
}) {
  if (loading) return skeleton ?? <SkeletonList />;
  if (notAvailable) {
    return <ComingSoon icon={Sparkles} {...comingSoon} />;
  }
  if (error) return <ErrorState message={getErrorMessage(error)} onRetry={onRetry} />;
  if (isEmpty) return <EmptyState {...empty} />;
  return children;
}
