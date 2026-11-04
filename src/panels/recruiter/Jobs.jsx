import { useState } from 'react';
import { api, errorMessage } from '../../lib/api';
import { jobTypeLabel, formatDate, salaryRange } from '../../lib/format';
import { useAsync, useDebounce } from '../../lib/hooks';
import { Link, useNavigate, useParams } from '../../lib/router';
import { useToast } from '../../lib/toast';
import JobForm from '../../components/shared/JobForm';
import { Badge, Button, Card, ConfirmDialog, DataState, IconButton, PageHeader, Pagination, SearchInput, Select, StatusBadge, Switch, SkeletonList } from '../../components/ui';
import Icon from '../../components/Icon';
import { useCompany } from './context';

export function JobsList() {
  const toast = useToast();
  const [search, setSearch] = useState('');
  const [status, setStatus] = useState('');
  const [page, setPage] = useState(1);
  const q = useDebounce(search, 350);
  const [toDelete, setToDelete] = useState(null);
  const [deleting, setDeleting] = useState(false);
  const { data, loading, error, reload } = useAsync(() => api.get('/recruiter/jobs', { search: q, status, page, limit: 8 }), [q, status, page]);
  const items = data?.items || [];

  const toggle = async (job) => {
    try {
      const r = await api.patch(`/recruiter/jobs/${job.id}/toggle`);
      toast.success(r.message);
      reload();
    } catch (e) { toast.error(errorMessage(e)); }
  };
  const remove = async () => {
    setDeleting(true);
    try {
      await api.delete(`/recruiter/jobs/${toDelete.id}`);
      toast.success('Job deleted.');
      setToDelete(null);
      reload();
    } catch (e) { toast.error(errorMessage(e)); } finally { setDeleting(false); }
  };

  return (
    <>
      <PageHeader title="My jobs" description="Manage your postings. New and edited jobs are reviewed by an admin before going live." actions={<Link className="btn btn-primary" to="/recruiter/jobs/new"><Icon name="plus" size={18} /><span>Post a job</span></Link>} />
      <div className="r-filters">
        <SearchInput value={search} onChange={(v) => { setSearch(v); setPage(1); }} placeholder="Search your jobs" />
        <Select aria-label="Filter by status" value={status} onChange={(e) => { setStatus(e.target.value); setPage(1); }} placeholder="All statuses" options={[{ value: 'pending', label: 'Pending review' }, { value: 'approved', label: 'Approved' }, { value: 'rejected', label: 'Rejected' }]} />
      </div>
      <DataState loading={loading} error={error} onRetry={reload} hasData={!!data} skeleton={<SkeletonList count={3} />} isEmpty={items.length === 0} empty={{ icon: 'briefcase', title: q || status ? 'No jobs match your filters' : 'You have not posted any jobs yet', description: 'Post a job and add your company job link so candidates can apply on your site.', action: <Link className="btn btn-primary" to="/recruiter/jobs/new">Post your first job</Link> }}>
        <div className="stack">
          {items.map((j) => (
            <Card key={j.id} className="r-job">
              <div className="r-job-main">
                <div className="row-wrap" style={{ gap: 8 }}>
                  <h3 className="r-job-title">{j.title}</h3>
                  <StatusBadge status={j.status} />
                  {j.status === 'approved' && !j.is_active && <Badge tone="neutral">Paused</Badge>}
                  {j.apply_type === 'external' && <Badge tone="info"><Icon name="link" size={12} /> Company link</Badge>}
                </div>
                <p className="muted small">{[j.location || 'Location not set', jobTypeLabel(j.job_type), salaryRange(j.salary_min, j.salary_max), `Posted ${formatDate(j.created_at)}`].filter(Boolean).join(' · ')}</p>
                {j.status === 'rejected' && j.rejection_reason && <p className="r-reject">Admin feedback: {j.rejection_reason}</p>}
              </div>
              <div className="r-job-stats">
                <span title="Views"><Icon name="eye" size={15} /> {j.views_count || 0}</span>
                <span title="Applications"><Icon name="clipboard" size={15} /> {j.applications_count || 0}</span>
              </div>
              <div className="r-job-actions">
                {j.status === 'approved' && <Switch checked={j.is_active} onChange={() => toggle(j)} label={j.is_active ? 'Live' : 'Paused'} />}
                <Link className="btn btn-secondary btn-sm" to={`/recruiter/applications?job_id=${j.id}`}>Applicants</Link>
                <Link className="icon-btn" to={`/recruiter/jobs/${j.id}/edit`} aria-label={`Edit ${j.title}`} title="Edit"><Icon name="edit" size={18} /></Link>
                <IconButton icon="trash" label={`Delete ${j.title}`} className="icon-btn-danger" onClick={() => setToDelete(j)} />
              </div>
            </Card>
          ))}
        </div>
        <Pagination page={data?.page || 1} pages={data?.pages} onChange={setPage} />
      </DataState>
      <ConfirmDialog open={!!toDelete} danger loading={deleting} title="Delete this job?" message={toDelete ? `"${toDelete.title}" will be removed. Candidates who already applied keep it in their history.` : ''} confirmLabel="Delete job" onConfirm={remove} onCancel={() => setToDelete(null)} />
    </>
  );
}

export function JobEditor() {
  const { id } = useParams();
  const toast = useToast();
  const navigate = useNavigate();
  const { company, loading: cLoading } = useCompany();
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const { data, loading, error: loadError, reload } = useAsync(() => (id ? api.get(`/recruiter/jobs/${id}`) : Promise.resolve(null)), [id]);

  const submit = async (payload) => {
    setBusy(true);
    setError('');
    try {
      if (id) {
        await api.put(`/recruiter/jobs/${id}`, payload);
        toast.success(data?.status === 'rejected' ? 'Job updated and re-submitted for review.' : 'Job updated.');
      } else {
        const j = await api.post('/recruiter/jobs', payload);
        toast.success(j.status === 'approved' ? 'Job published.' : 'Job submitted. It goes live once an admin approves it.');
      }
      navigate('/recruiter/jobs');
    } catch (e) {
      setError(errorMessage(e));
    } finally { setBusy(false); }
  };

  if (!id && !cLoading && !company) {
    return (
      <>
        <PageHeader title="Post a job" />
        <div className="r-onboard"><span className="r-onboard-icon"><Icon name="building" size={28} /></span><div className="grow"><h2>Create your company profile first</h2><p>Jobs are posted under your company.</p></div><Link className="btn btn-primary" to="/recruiter/company">Create company profile</Link></div>
      </>
    );
  }
  return (
    <>
      <PageHeader title={id ? 'Edit job' : 'Post a job'} description={id ? 'Update the details below.' : 'Fill in the role. Add your company job link to receive applicants on your own site.'} actions={<Link className="btn btn-ghost" to="/recruiter/jobs"><Icon name="chevronLeft" size={16} /><span>All jobs</span></Link>} />
      <DataState loading={loading} error={loadError} onRetry={reload} hasData={!id || !!data} skeleton={<SkeletonList count={2} lines={5} />}>
        {data?.status === 'rejected' && <div className="r-banner warn" role="alert"><Icon name="alert" size={18} /><span>This job was rejected{data.rejection_reason ? `: "${data.rejection_reason}"` : '.'} Saving your edits sends it back for review.</span></div>}
        <Card>
          {error && <p className="form-error" role="alert" style={{ marginBottom: 12 }}>{error}</p>}
          <JobForm key={data?.id || 'new'} initial={data || undefined} onSubmit={submit} submitting={busy} submitLabel={id ? 'Save changes' : 'Submit job'} onCancel={() => navigate('/recruiter/jobs')} />
        </Card>
      </DataState>
    </>
  );
}
