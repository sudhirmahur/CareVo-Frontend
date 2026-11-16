import { useState } from 'react';
import { api, errorMessage } from '../../../lib/api';
import { useAsync, useDebounce } from '../../../lib/hooks';
import { Link, useNavigate, useParams } from '../../../lib/router';
import { useToast } from '../../../lib/toast';
import Icon from '../../../components/Icon';
import { Avatar, Badge, Button, Card, DataState, PageHeader, Pagination, SearchInput, SkeletonList } from '../../../components/ui';
import { JobCard, useApply, usePatchJobs, useSaveToggle } from '../parts';

function useFollow(toast) {
  return async (company, setData) => {
    const next = !company.is_following;
    setData((c) => (Array.isArray(c?.items) ? { ...c, items: c.items.map((x) => (x.id === company.id ? { ...x, is_following: next, followers_count: x.followers_count + (next ? 1 : -1) } : x)) } : { ...c, is_following: next, followers_count: c.followers_count + (next ? 1 : -1) }));
    try {
      if (next) await api.post('/follow', { following_id: company.id, type: 'company' });
      else await api.delete(`/follow/${company.id}`);
      toast.success(next ? `Following ${company.name}` : `Unfollowed ${company.name}`);
    } catch (e) {
      toast.error(errorMessage(e));
      setData((c) => (Array.isArray(c?.items) ? { ...c, items: c.items.map((x) => (x.id === company.id ? { ...x, is_following: !next, followers_count: x.followers_count + (next ? -1 : 1) } : x)) } : { ...c, is_following: !next, followers_count: c.followers_count + (next ? -1 : 1) }));
    }
  };
}

export function Companies() {
  const toast = useToast();
  const [q, setQ] = useState('');
  const [page, setPage] = useState(1);
  const dq = useDebounce(q, 350);
  const { data, loading, error, reload, setData } = useAsync(() => api.get('/companies', { search: dq, page, limit: 9 }), [dq, page]);
  const follow = useFollow(toast);
  const items = data?.items || [];
  return (
    <>
      <PageHeader title="Companies" description="Follow companies to keep up with what they post." />
      <div className="u-filterbar"><SearchInput value={q} onChange={(v) => { setQ(v); setPage(1); }} placeholder="Search companies" /></div>
      <DataState loading={loading} error={error} onRetry={reload} hasData={!!data} skeleton={<SkeletonList count={3} />} isEmpty={items.length === 0} empty={{ icon: 'building', title: 'No companies found', description: 'Try a different name.' }}>
        <div className="u-grid">
          {items.map((c) => (
            <article className="u-job" key={c.id} data-testid="company-card">
              <div className="u-job-top">
                <Avatar name={c.name} src={c.logo_url} size={52} className="u-logo" />
                <div className="grow"><h3 className="u-job-title"><Link to={`/companies/${c.id}`}>{c.name}</Link></h3><p className="muted truncate">{c.industry || 'Company'}{c.location ? ` · ${c.location}` : ''}</p></div>
                {c.is_verified && <Badge tone="success">Verified</Badge>}
              </div>
              <p className="muted small">{c.open_jobs} open job{c.open_jobs === 1 ? '' : 's'} · {c.followers_count} follower{c.followers_count === 1 ? '' : 's'}</p>
              <div className="u-job-foot">
                <Link to={`/companies/${c.id}`} className="u-link-sm">View company</Link>
                <Button size="sm" variant={c.is_following ? 'secondary' : 'primary'} icon={c.is_following ? 'check' : 'plus'} onClick={() => follow(c, setData)} aria-pressed={c.is_following}>{c.is_following ? 'Following' : 'Follow'}</Button>
              </div>
            </article>
          ))}
        </div>
        <Pagination page={data?.page || 1} pages={data?.pages} onChange={setPage} />
      </DataState>
    </>
  );
}

export function CompanyDetail() {
  const { id } = useParams();
  const toast = useToast();
  const navigate = useNavigate();
  const { data: c, loading, error, reload, setData } = useAsync(() => api.get(`/companies/${id}`), [id]);
  const follow = useFollow(toast);
  const patch = usePatchJobs(setData, 'jobs');
  const toggleSave = useSaveToggle(patch);
  const { apply, busyId, node } = useApply({ onApplied: (job) => patch(job.id, { has_applied: true }) });
  return (
    <>
      <Link to="/companies" className="u-back"><Icon name="chevronLeft" size={16} /> All companies</Link>
      <DataState loading={loading} error={error} onRetry={reload} hasData={!!c} skeleton={<SkeletonList count={2} />}>
        {c && (
          <div className="stack">
            <Card className="u-company-head">
              <Avatar name={c.name} src={c.logo_url} size={80} className="u-logo" />
              <div className="grow">
                <h1>{c.name} {c.is_verified && <Badge tone="success">Verified</Badge>}</h1>
                <p className="muted">{[c.industry, c.location, c.size].filter(Boolean).join(' · ')}</p>
                <p className="muted small">{c.followers_count} followers · {c.open_jobs} open jobs</p>
                {c.website && <a className="small" href={c.website} target="_blank" rel="noopener noreferrer">{c.website}</a>}
              </div>
              <div className="stack-sm">
                <Button icon={c.is_following ? 'check' : 'plus'} variant={c.is_following ? 'secondary' : 'primary'} onClick={() => follow(c, setData)} aria-pressed={c.is_following}>{c.is_following ? 'Following' : 'Follow'}</Button>
                <Button variant="secondary" icon="message" onClick={() => navigate(`/messages?with=${c.recruiter_id}`)}>Message</Button>
              </div>
            </Card>
            {c.description && <Card title="About"><p className="u-pre">{c.description}</p></Card>}
            <h2>Open positions</h2>
            {c.jobs.length === 0 ? <p className="muted">No open positions right now.</p> : <div className="u-grid">{c.jobs.map((j) => <JobCard key={j.id} job={j} onApply={apply} onToggleSave={toggleSave} busy={busyId} />)}</div>}
          </div>
        )}
      </DataState>
      {node}
    </>
  );
}
