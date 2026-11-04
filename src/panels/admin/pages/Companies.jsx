import { useState } from 'react';
import { api } from '../../../lib/api';
import { formatDate } from '../../../lib/format';
import { Avatar, Badge, ConfirmDialog, PageHeader, StatusBadge } from '../../../components/ui';
import { ActionBtn, ListShell, useDo, usePagedList, useSearch, useUrlFilter } from '../common';

export default function Companies() {
  const [status, setStatus] = useUrlFilter('status');
  const [q, setQ, dq] = useSearch();
  const res = usePagedList('/admin/companies', { status, search: dq });
  const [run, busy] = useDo(res.reload);
  const [del, setDel] = useState(null);
  const tabs = [{ value: '', label: 'All' }, { value: 'pending', label: 'Pending' }, { value: 'approved', label: 'Approved' }, { value: 'rejected', label: 'Rejected' }];
  const patch = (c, body, msg) => run(() => api.patch(`/admin/companies/${c.id}`, body), msg);
  return (
    <>
      <PageHeader title="Companies" description="Approve, verify or remove employer profiles." />
      <ListShell res={res} tabs={tabs} tab={status} onTab={setStatus} search={q} onSearch={setQ} searchPlaceholder="Search companies" empty={{ icon: 'building', title: 'No companies found', description: 'Companies appear when recruiters create their profile.' }}>
        {(items) => (
          <div className="table-wrap">
            <table className="table rtable" data-testid="companies-table">
              <thead><tr><th>Company</th><th>Recruiter</th><th>Jobs</th><th>Status</th><th>Verified</th><th>Created</th><th /></tr></thead>
              <tbody>
                {items.map((c) => (
                  <tr key={c.id}>
                    <td data-label="Company"><div className="row" style={{ gap: 10 }}><Avatar name={c.name} src={c.logo_url} size={34} /><div style={{ minWidth: 0 }}><div className="strong truncate">{c.name}</div><div className="muted small truncate">{c.industry || c.location || '-'}</div></div></div></td>
                    <td data-label="Recruiter">{c.recruiter ? <><div>{c.recruiter.name}</div><div className="muted small">{c.recruiter.email}</div></> : '-'}</td>
                    <td data-label="Jobs">{c.jobs_count}</td>
                    <td data-label="Status"><StatusBadge status={c.status} /></td>
                    <td data-label="Verified">{c.is_verified ? <Badge tone="brand">Verified</Badge> : <span className="muted">No</span>}</td>
                    <td data-label="Created">{formatDate(c.created_at)}</td>
                    <td className="cell-actions"><div className="actions">
                      {c.status !== 'approved' && <ActionBtn icon="check" label={`Approve ${c.name}`} onClick={() => patch(c, { status: 'approved' }, 'Company approved')} />}
                      {c.status !== 'rejected' && <ActionBtn icon="x" label={`Reject ${c.name}`} onClick={() => patch(c, { status: 'rejected' }, 'Company rejected')} />}
                      <ActionBtn icon="award" label={c.is_verified ? `Remove verification of ${c.name}` : `Verify ${c.name}`} onClick={() => patch(c, { is_verified: !c.is_verified }, c.is_verified ? 'Verification removed' : 'Company verified')} />
                      <ActionBtn icon="trash" tone="danger" label={`Delete ${c.name}`} onClick={() => setDel(c)} />
                    </div></td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </ListShell>
      <ConfirmDialog open={!!del} danger title="Delete company?" message={del && `${del.name} and all of its ${del.jobs_count} job(s) will be permanently deleted.`} confirmLabel="Delete company" loading={busy}
        onCancel={() => setDel(null)} onConfirm={async () => { if (await run(() => api.delete(`/admin/companies/${del.id}`), 'Company deleted')) setDel(null); }} />
    </>
  );
}
