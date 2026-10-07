import { useCallback, useEffect, useMemo, useState } from 'react';
import { Briefcase } from 'lucide-react';
import { jobApi } from '../../api/job.api';
import DataState from '../../components/common/DataState';
import PageHeader from '../../components/common/PageHeader';
import ApplyModal from '../../components/jobs/ApplyModal';
import JobCard from '../../components/jobs/JobCard';
import JobFilters, { EMPTY_FILTERS } from '../../components/jobs/JobFilters';
import Pagination from '../../components/ui/Pagination';
import { SkeletonList } from '../../components/ui/Skeleton';
import useApi from '../../hooks/useApi';
import useDebounce from '../../hooks/useDebounce';
import useSavedJobs from '../../hooks/useSavedJobs';
import { PAGE_SIZE } from '../../utils/constants';
import { getTotal, unwrapList } from '../../utils/helpers';
import { normalizeJob } from '../../utils/normalizers';

export default function Jobs() {
  const [filters, setFilters] = useState(EMPTY_FILTERS);
  const [page, setPage] = useState(1);
  const [applyingJob, setApplyingJob] = useState(null);
  const [appliedIds, setAppliedIds] = useState(() => new Set());
  const { savedIds, toggle: toggleSave } = useSavedJobs();

  const debouncedFilters = useDebounce(filters, 400);

  // Any filter change returns to the first page.
  useEffect(() => setPage(1), [debouncedFilters]);

  const request = useCallback(
    () =>
      jobApi.list({
        ...debouncedFilters,
        skills: debouncedFilters.skills
          .split(',')
          .map((skill) => skill.trim())
          .filter(Boolean)
          .join(','),
        page,
        limit: PAGE_SIZE,
      }),
    [debouncedFilters, page],
  );
  const { data, loading, error, reload } = useApi(request);

  const jobs = useMemo(() => unwrapList(data).map(normalizeJob), [data]);
  const total = getTotal(data, 0);
  // Without a total from the API, assume another page exists while pages are full.
  const totalPages = total ? Math.ceil(total / PAGE_SIZE) : jobs.length === PAGE_SIZE ? page + 1 : page;

  const updateFilters = (partial) => setFilters((current) => ({ ...current, ...partial }));

  return (
    <>
      <PageHeader title="Find jobs" description="Search opportunities that match your skills." />
      <div className="space-y-5">
        <JobFilters filters={filters} onChange={updateFilters} onReset={() => setFilters(EMPTY_FILTERS)} />

        <DataState
          loading={loading}
          error={error}
          onRetry={reload}
          skeleton={<SkeletonList count={4} lines={3} className="md:grid-cols-2" />}
          isEmpty={jobs.length === 0}
          empty={{
            icon: Briefcase,
            title: 'No jobs found',
            description: 'Try adjusting your search or clearing some filters.',
          }}
        >
          <div className="grid gap-4 md:grid-cols-2">
            {jobs.map((job) => (
              <JobCard
                key={job.id}
                job={job}
                saved={savedIds.has(job.id) || job.isSaved}
                applied={appliedIds.has(job.id) || job.hasApplied}
                onToggleSave={toggleSave}
                onApply={setApplyingJob}
              />
            ))}
          </div>
          <div className="mt-6">
            <Pagination page={page} totalPages={totalPages} onChange={setPage} />
          </div>
        </DataState>
      </div>

      {applyingJob && (
        <ApplyModal
          job={applyingJob}
          onClose={() => setApplyingJob(null)}
          onApplied={(job) => setAppliedIds((current) => new Set(current).add(job.id))}
        />
      )}
    </>
  );
}
