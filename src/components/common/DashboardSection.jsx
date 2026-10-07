import { Link } from 'react-router-dom';
import Card, { CardTitle } from '../ui/Card';
import { SkeletonList } from '../ui/Skeleton';
import DataState from './DataState';

/**
 * Dashboard card that owns its own loading / error / coming-soon / empty states,
 * so one failing module never breaks the rest of the dashboard.
 * `state` is the object returned by useApi.
 */
export default function DashboardSection({ title, to, linkLabel = 'View all', state, isEmpty, empty, comingSoon, children }) {
  return (
    <Card>
      <CardTitle
        title={title}
        action={
          to && (
            <Link to={to} className="text-sm font-medium text-brand hover:underline">
              {linkLabel}
            </Link>
          )
        }
      />
      <DataState
        loading={state.loading}
        error={state.error}
        notAvailable={state.notAvailable}
        onRetry={state.reload}
        skeleton={<SkeletonList count={2} lines={1} />}
        isEmpty={isEmpty}
        empty={{ ...empty, className: 'py-8' }}
        comingSoon={{ ...comingSoon, className: 'py-8' }}
      >
        {children}
      </DataState>
    </Card>
  );
}
