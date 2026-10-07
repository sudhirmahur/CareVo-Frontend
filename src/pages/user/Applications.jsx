import { useCallback, useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import { ClipboardList } from 'lucide-react';
import { applicationApi } from '../../api/application.api';
import ApplicationCard from '../../components/applications/ApplicationCard';
import DataState from '../../components/common/DataState';
import PageHeader from '../../components/common/PageHeader';
import Button from '../../components/ui/Button';
import useApi from '../../hooks/useApi';
import { APPLICATION_STATUS } from '../../utils/constants';
import { cn, unwrapList } from '../../utils/helpers';
import { normalizeApplication } from '../../utils/normalizers';

const FILTERS = [{ value: 'all', label: 'All' }, ...Object.entries(APPLICATION_STATUS).map(([value, { label }]) => ({ value, label }))];

export default function Applications() {
  const request = useCallback(() => applicationApi.list(), []);
  const { data, loading, error, reload } = useApi(request);
  const [filter, setFilter] = useState('all');

  const applications = useMemo(() => unwrapList(data).map(normalizeApplication), [data]);
  const visible = filter === 'all' ? applications : applications.filter((application) => application.status === filter);

  return (
    <>
      <PageHeader title="Applications" description="Follow the progress of every job you applied to." />

      <div className="mb-5 flex gap-2 overflow-x-auto pb-1" role="tablist" aria-label="Filter by status">
        {FILTERS.map(({ value, label }) => {
          const count = value === 'all' ? applications.length : applications.filter((a) => a.status === value).length;
          return (
            <button
              key={value}
              type="button"
              role="tab"
              aria-selected={filter === value}
              onClick={() => setFilter(value)}
              className={cn(
                'shrink-0 rounded-full border px-4 py-1.5 text-sm font-medium transition-colors',
                filter === value ? 'border-brand bg-brand/10 text-brand' : 'border-border text-muted hover:text-fg',
              )}
            >
              {label} {!loading && <span className="opacity-70">({count})</span>}
            </button>
          );
        })}
      </div>

      <DataState
        loading={loading}
        error={error}
        onRetry={reload}
        isEmpty={visible.length === 0}
        empty={{
          icon: ClipboardList,
          title: filter === 'all' ? 'No applications yet' : 'Nothing in this status',
          description: filter === 'all' ? 'Apply to a job and it will show up here.' : 'Try another filter.',
          action: filter === 'all' && (
            <Button as={Link} to="/jobs">
              Find jobs
            </Button>
          ),
        }}
      >
        <div className="grid gap-3">
          {visible.map((application) => (
            <ApplicationCard key={application.id} application={application} />
          ))}
        </div>
      </DataState>
    </>
  );
}
