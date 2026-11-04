import { useEffect, useRef, useState } from 'react';
import { api } from '../../../lib/api';
import { JOB_TYPES } from '../../../lib/format';
import { useAsync, useDebounce } from '../../../lib/hooks';
import { useSearchParams } from '../../../lib/router';
import { Button, DataState, Pagination, PageHeader, SearchInput, Select, SkeletonList } from '../../../components/ui';
import { JobCard, useApply, usePatchJobs, useSaveToggle } from '../parts';

const EMPTY = { q: '', location: '', type: '', min: '', skills: '', featured: '', sort: 'latest' };

export default function Jobs() {
  const [params, setParams] = useSearchParams();
  const fromUrl = () => Object.fromEntries(Object.keys(EMPTY).map((k) => [k, params.get(k) ?? EMPTY[k]]));
  const [f, setF] = useState(fromUrl);
  const [showFilters, setShowFilters] = useState(false);
  const debounced = useDebounce(f, 400);
  const first = useRef(true);
  const page = Number(params.get('page') || 1);

  useEffect(() => {
    if (first.current) { first.current = false; return; }
    setParams({ ...debounced, sort: debounced.sort === 'latest' ? '' : debounced.sort, page: '' });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [debounced]);

  // the header search box navigates here with ?q=...; pick that up without fighting the user's own typing
  const urlQ = params.get('q') ?? '';
  useEffect(() => {
    if (urlQ !== debounced.q) setF((s) => (s.q === urlQ ? s : { ...s, q: urlQ }));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [urlQ]);

  const key = params.toString();
  const { data, loading, error, reload, setData } = useAsync(
    () => api.get('/jobs', { search: params.get('q'), location: params.get('location'), job_type: params.get('type'), min_salary: params.get('min'), skills: params.get('skills'), featured: params.get('featured') === 'true' ? 'true' : '', sort: params.get('sort') || 'latest', page, limit: 8 }),
    [key],
  );
  const patch = usePatchJobs(setData);
  const toggleSave = useSaveToggle(patch);
  const { apply, busyId, node } = useApply({ onApplied: (job) => patch(job.id, { has_applied: true, application_status: 'applied' }) });
  const set = (k) => (e) => setF((s) => ({ ...s, [k]: e.target.value }));
  const items = data?.items || [];
  const active = Object.keys(EMPTY).some((k) => k !== 'sort' && f[k]);

  return (
    <>
      <PageHeader title="Find your next job" description={data ? `${data.total} open position${data.total === 1 ? '' : 's'}` : 'Search opportunities that match your skills.'} />
      <div className="u-filterbar">
        <SearchInput value={f.q} onChange={(v) => setF((s) => ({ ...s, q: v }))} placeholder="Search job title, skill or keyword" />
        <Button variant="secondary" icon="filter" className="only-mobile" onClick={() => setShowFilters((v) => !v)} aria-expanded={showFilters}>Filters</Button>
        <div className={`u-filters ${showFilters ? 'open' : ''}`}>
          <input className="input" placeholder="Location" aria-label="Location" value={f.location} onChange={set('location')} />
          <Select aria-label="Job type" value={f.type} onChange={set('type')} placeholder="Any type" options={JOB_TYPES} />
          <input className="input" type="number" min="0" placeholder="Min salary" aria-label="Minimum salary" value={f.min} onChange={set('min')} />
          <input className="input" placeholder="Skills (comma separated)" aria-label="Skills" value={f.skills} onChange={set('skills')} />
          <Select aria-label="Sort by" value={f.sort} onChange={set('sort')} options={[{ value: 'latest', label: 'Latest' }, { value: 'salary', label: 'Highest salary' }, { value: 'featured', label: 'Featured first' }]} />
          <label className="u-check"><input type="checkbox" checked={f.featured === 'true'} onChange={(e) => setF((s) => ({ ...s, featured: e.target.checked ? 'true' : '' }))} /> Featured only</label>
          {active && <Button variant="ghost" icon="x" onClick={() => setF(EMPTY)}>Clear</Button>}
        </div>
      </div>
      <DataState loading={loading} error={error} onRetry={reload} hasData={!!data} skeleton={<SkeletonList count={4} />} isEmpty={items.length === 0}
        empty={{ icon: 'briefcase', title: 'No jobs found', description: 'Try different keywords or clear some filters.', action: active ? <Button variant="secondary" onClick={() => setF(EMPTY)}>Clear filters</Button> : null }}>
        <div className="u-grid">
          {items.map((j) => <JobCard key={j.id} job={j} onApply={apply} onToggleSave={toggleSave} busy={busyId} />)}
        </div>
        <Pagination page={data?.page || 1} pages={data?.pages} onChange={(p) => setParams({ page: p }, { replace: false })} />
      </DataState>
      {node}
    </>
  );
}
