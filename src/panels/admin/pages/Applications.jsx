import { useState } from 'react';
import { api } from '../../../lib/api';
import { formatDate } from '../../../lib/format';
import { Badge, ConfirmDialog, PageHeader, Select } from '../../../components/ui';
import Icon from '../../../components/Icon';
import { ActionBtn, ListShell, PersonCell, useDo, usePagedList, useSearch, useUrlFilter } from '../common';

const STATUSES = ['applied', 'shortlisted', 'accepted', 'rejected'];

export default function Applications() {
  const [status, setStatus] = useUrlFilter('status');
  const [q, setQ, dq] = useSearch();
  const res = usePagedList('/admin/applications', { status, search: dq });
  const [run, busy] = useDo(res.reload);
  const [del, setDel] = useState(null);
  const tabs = [{ value: '', label: 'All' }, ...STATUSES.map((s) => ({ value: s, label: s[0].toUpperCase() + s.slice(1) })), { value: 'withdrawn', label: 'Withdrawn' }];
  return (
    <>
      <PageHeader title="Applications" description="Every application across all jobs, including ones sent to an external company link." />
      <ListShell res={res} tabs={tabs} tab={status} onTab={setStatus} search={q} onSearch={setQ} searchPlaceholder="Search candidate or job" empty={{ icon: 'clipboard', title: 'No applications found', description: 'Applications appear here as candidates apply.' }}>
        {(items) => (
          <div className="table-wrap">
            <table className="table rtable" data-testid="applications-table">
              <thead><tr><th>Candidate</th><th>Job</th><th>Source</th><th>Applied</th><th>Status</th><th /></tr></thead>
              <tbody>
                {items.map((a) => (
                  <tr key={a.id}>
                    <td data-label="Candidate"><PersonCell name={a.candidate?.name || '-'} email={a.candidate?.email} image={a.candidate?.profile_image} /></td>
                    <td data-label="Job"><div className="strong">{a.job_title}</div><div className="muted small">{a.company_name || '-'}</div></td>
                    <td data-label="Source">{a.source === 'external' ? <Badge tone="info"><Icon name="external" size={12} /> External link</Badge> : <Badge tone="neutral">In-app</Badge>}</td>
                    <td data-label="Applied">{formatDate(a.applied_at)}</td>
                    <td data-label="Status">
                      <Select aria-label={`Change status for ${a.candidate?.name || 'candidate'}`} className="status-select" value={a.status} disabled={busy}
                        onChange={(e) => run(() => api.patch(`/admin/applications/${a.id}/status`, { status: e.target.value }), 'Status updated')}
                        options={[...(STATUSES.includes(a.status) ? [] : [{ value: a.status, label: a.status[0].toUpperCase() + a.status.slice(1) }]), ...STATUSES.map((s) => ({ value: s, label: s[0].toUpperCase() + s.slice(1) }))]} />
                    </td>
                    <td className="cell-actions"><div className="actions"><ActionBtn icon="trash" tone="danger" label={`Delete application of ${a.candidate?.name || 'candidate'}`} onClick={() => setDel(a)} /></div></td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </ListShell>
      <ConfirmDialog open={!!del} danger title="Delete application?" message="The application and its interviews are removed from the candidate's history too." confirmLabel="Delete" loading={busy}
        onCancel={() => setDel(null)} onConfirm={async () => { if (await run(() => api.delete(`/admin/applications/${del.id}`), 'Application deleted')) setDel(null); }} />
    </>
  );
}
