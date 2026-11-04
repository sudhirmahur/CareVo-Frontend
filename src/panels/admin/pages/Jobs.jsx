import { useState } from 'react';
import { api } from '../../../lib/api';
import { formatDate, jobTypeLabel, salaryRange } from '../../../lib/format';
import { useAsync } from '../../../lib/hooks';
import { useSearchParams } from '../../../lib/router';
import { Badge, Button, ConfirmDialog, Modal, PageHeader, StatusBadge, Textarea } from '../../../components/ui';
import JobForm from '../../../components/shared/JobForm';
import Icon from '../../../components/Icon';
import { ActionBtn, ListShell, useDo, usePagedList, useSearch, useUrlFilter } from '../common';

export default function Jobs() {
  const [params] = useSearchParams();
  const [status, setStatus] = useUrlFilter('status');
  const [q, setQ, dq] = useSearch(params.get('search') || '');
  const res = usePagedList('/admin/jobs', { status, search: dq });
  const [run, busy] = useDo(res.reload);
  const companies = useAsync(() => api.get('/admin/companies', { limit: 100 }), []);
  const [editing, setEditing] = useState(null); // job | 'new'
  const [rejecting, setRejecting] = useState(null);
  const [reason, setReason] = useState('');
  const [del, setDel] = useState(null);

  const tabs = [{ value: '', label: 'All' }, { value: 'pending', label: 'Pending' }, { value: 'approved', label: 'Approved' }, { value: 'rejected', label: 'Rejected' }];
  const setStatusFor = (j, st, msg, reasonText) => run(() => api.patch(`/admin/jobs/${j.id}/status`, { status: st, reason: reasonText }), msg);

  const saveJob = async (payload) => {
    const isNew = editing === 'new';
    const ok = await run(() => (isNew ? api.post('/admin/jobs', payload) : api.put(`/admin/jobs/${editing.id}`, payload)), isNew ? 'Job posted and live' : 'Job updated');
    if (ok) setEditing(null);
  };

  return (
    <>
      <PageHeader title="Jobs" description="Moderate every job post. Admin-posted jobs go live immediately." actions={<Button icon="plus" onClick={() => setEditing('new')}>Post job</Button>} />
      <ListShell res={res} tabs={tabs} tab={status} onTab={setStatus} search={q} onSearch={setQ} searchPlaceholder="Search title or location" empty={{ icon: 'briefcase', title: 'No jobs found', description: 'Change the filter or post a job yourself.' }}>
        {(items) => (
          <div className="table-wrap">
            <table className="table rtable" data-testid="jobs-table">
              <thead><tr><th>Job</th><th>Company</th><th>Status</th><th>Apply</th><th>Apps</th><th>Posted</th><th /></tr></thead>
              <tbody>
                {items.map((j) => (
                  <tr key={j.id}>
                    <td data-label="Job">
                      <div className="strong">{j.title} {j.is_featured && <Badge tone="warning">Featured</Badge>}{!j.is_active && <Badge tone="neutral">Paused</Badge>}</div>
                      <div className="muted small">{jobTypeLabel(j.job_type)}{j.location ? ` · ${j.location}` : ''}{salaryRange(j.salary_min, j.salary_max) ? ` · ${salaryRange(j.salary_min, j.salary_max)}` : ''}</div>
                      {j.rejection_reason && <div className="small" style={{ color: 'var(--danger)' }}>Rejected: {j.rejection_reason}</div>}
                    </td>
                    <td data-label="Company">{j.company_name || '-'}</td>
                    <td data-label="Status"><StatusBadge status={j.status} /></td>
                    <td data-label="Apply">{j.apply_url ? <a href={j.apply_url} target="_blank" rel="noopener noreferrer" className="row small" style={{ gap: 4 }}><Icon name="external" size={14} />External</a> : <span className="muted small">In-app</span>}</td>
                    <td data-label="Apps">{j.applications_count ?? 0}</td>
                    <td data-label="Posted">{formatDate(j.created_at)}</td>
                    <td className="cell-actions"><div className="actions">
                      {j.status !== 'approved' && <ActionBtn icon="check" label={`Approve ${j.title}`} onClick={() => setStatusFor(j, 'approved', 'Job approved')} />}
                      {j.status !== 'rejected' && <ActionBtn icon="x" label={`Reject ${j.title}`} onClick={() => { setRejecting(j); setReason(''); }} />}
                      <ActionBtn icon="star" label={j.is_featured ? `Unfeature ${j.title}` : `Feature ${j.title}`} onClick={() => run(() => api.patch(`/admin/jobs/${j.id}/feature`), (r) => (r.is_featured ? 'Job featured' : 'Job unfeatured'))} />
                      <ActionBtn icon={j.is_active ? 'ban' : 'unlock'} label={j.is_active ? `Pause ${j.title}` : `Resume ${j.title}`} onClick={() => run(() => api.patch(`/admin/jobs/${j.id}/toggle`), (r) => (r.is_active ? 'Job resumed' : 'Job paused'))} />
                      <ActionBtn icon="edit" label={`Edit ${j.title}`} onClick={() => setEditing(j)} />
                      <ActionBtn icon="trash" tone="danger" label={`Delete ${j.title}`} onClick={() => setDel(j)} />
                    </div></td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </ListShell>

      {editing && (
        <Modal size="lg" title={editing === 'new' ? 'Post a job' : 'Edit job'} description={editing === 'new' ? 'Pick a company. Add the company job link so candidates are sent there after applying.' : undefined} onClose={() => setEditing(null)}>
          {companies.loading && !companies.data ? <p className="muted">Loading companies…</p> : (companies.data?.items || []).length === 0 && editing === 'new' ? (
            <p className="form-error">No companies exist yet. A recruiter must create a company profile first.</p>
          ) : (
            <JobForm initial={editing === 'new' ? undefined : editing} companies={companies.data?.items || []} onSubmit={saveJob} submitting={busy} submitLabel={editing === 'new' ? 'Post job' : 'Save changes'} onCancel={() => setEditing(null)} />
          )}
        </Modal>
      )}
      {rejecting && (
        <Modal size="sm" title="Reject job" description={rejecting.title} onClose={() => setRejecting(null)}
          footer={<><Button variant="ghost" onClick={() => setRejecting(null)}>Cancel</Button><Button variant="danger" loading={busy} onClick={async () => { if (await setStatusFor(rejecting, 'rejected', 'Job rejected', reason.trim() || undefined)) setRejecting(null); }}>Reject job</Button></>}>
          <Textarea label="Reason (shown to the recruiter)" value={reason} onChange={(e) => setReason(e.target.value)} maxLength={500} placeholder="e.g. Description is too vague" />
        </Modal>
      )}
      <ConfirmDialog open={!!del} danger title="Delete job?" message={del && `"${del.title}" will be removed. Candidates keep it in their application history.`} confirmLabel="Delete job" loading={busy}
        onCancel={() => setDel(null)} onConfirm={async () => { if (await run(() => api.delete(`/admin/jobs/${del.id}`), 'Job deleted')) setDel(null); }} />
    </>
  );
}
