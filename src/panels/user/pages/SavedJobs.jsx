import { api } from '../../../lib/api';
import { useAsync } from '../../../lib/hooks';
import { Link } from '../../../lib/router';
import { DataState, PageHeader, SkeletonList } from '../../../components/ui';
import { JobCard, useApply, usePatchJobs } from '../parts';
import { useToast } from '../../../lib/toast';
import { errorMessage } from '../../../lib/api';

export default function SavedJobs() {
  const toast = useToast();
  const { data, loading, error, reload, setData } = useAsync(() => api.get('/jobs/saved'), []);
  const patch = usePatchJobs(setData);
  const { apply, busyId, node } = useApply({ onApplied: (job) => patch(job.id, { has_applied: true }) });
  const unsave = async (job) => {
    try {
      await api.delete(`/jobs/${job.id}/save`);
      setData((d) => ({ ...d, items: d.items.filter((j) => j.id !== job.id), total: d.total - 1 }));
      toast.success('Removed from saved jobs');
    } catch (e) {
      toast.error(errorMessage(e));
    }
  };
  const items = data?.items || [];
  return (
    <>
      <PageHeader title="Saved jobs" description="Jobs you bookmarked to apply later." />
      <DataState loading={loading} error={error} onRetry={reload} hasData={!!data} skeleton={<SkeletonList count={3} />} isEmpty={items.length === 0}
        empty={{ icon: 'bookmark', title: 'Nothing saved yet', description: 'Tap the bookmark on any job to keep it here.', action: <Link className="btn btn-primary" to="/jobs">Find jobs</Link> }}>
        <div className="u-grid">{items.map((j) => <JobCard key={j.id} job={j} onApply={apply} onToggleSave={unsave} busy={busyId} />)}</div>
      </DataState>
      {node}
    </>
  );
}
