import { useState } from 'react';
import { api } from '../../../lib/api';
import { formatDate } from '../../../lib/format';
import { Badge, Button, ConfirmDialog, PageHeader, StatusBadge } from '../../../components/ui';
import { ActionBtn, ListShell, PersonCell, useDo, usePagedList, useSearch } from '../common';

export default function Recruiters() {
  const [q, setQ, dq] = useSearch();
  const res = usePagedList('/admin/users', { role: 'recruiter', search: dq });
  const [run, busy] = useDo(res.reload);
  const [block, setBlock] = useState(null);
  const setCompany = (c, body, msg) => run(() => api.patch(`/admin/companies/${c.id}`, body), msg);
  return (
    <>
      <PageHeader title="Recruiters" description="Recruiter accounts and the status of their company profile." />
      <ListShell res={res} search={q} onSearch={setQ} searchPlaceholder="Search recruiters" empty={{ icon: 'building', title: 'No recruiters yet', description: 'Recruiters appear here after they register.' }}>
        {(items) => (
          <div className="table-wrap">
            <table className="table rtable" data-testid="recruiters-table">
              <thead><tr><th>Recruiter</th><th>Company</th><th>Company status</th><th>Account</th><th>Joined</th><th /></tr></thead>
              <tbody>
                {items.map((u) => (
                  <tr key={u.id}>
                    <td data-label="Recruiter"><PersonCell name={u.name} email={u.email} image={u.profile_image} /></td>
                    <td data-label="Company">{u.company ? u.company.name : <span className="muted">No company yet</span>}</td>
                    <td data-label="Company status">{u.company ? <StatusBadge status={u.company.status} /> : '-'}</td>
                    <td data-label="Account">{u.is_active ? <Badge tone="success" dot>Active</Badge> : <Badge tone="danger" dot>Blocked</Badge>}</td>
                    <td data-label="Joined">{formatDate(u.created_at)}</td>
                    <td className="cell-actions"><div className="actions">
                      {u.company && u.company.status !== 'approved' && <ActionBtn icon="check" label={`Approve company of ${u.name}`} onClick={() => setCompany(u.company, { status: 'approved' }, 'Company approved')} />}
                      {u.company && u.company.status !== 'rejected' && <ActionBtn icon="x" label={`Reject company of ${u.name}`} onClick={() => setCompany(u.company, { status: 'rejected' }, 'Company rejected')} />}
                      {u.company && <ActionBtn icon="award" label={`Verify company of ${u.name}`} onClick={() => setCompany(u.company, { is_verified: true }, 'Company verified')} />}
                      {u.is_active
                        ? <ActionBtn icon="ban" label={`Block ${u.name}`} onClick={() => setBlock(u)} />
                        : <ActionBtn icon="unlock" label={`Unblock ${u.name}`} onClick={() => run(() => api.patch(`/admin/users/${u.id}`, { is_active: true }), `${u.name} unblocked`)} />}
                    </div></td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </ListShell>
      <ConfirmDialog open={!!block} danger title="Block this recruiter?" message={block && `${block.name} will lose access and all their jobs will be paused.`} confirmLabel="Block recruiter" loading={busy}
        onCancel={() => setBlock(null)} onConfirm={async () => { if (await run(() => api.patch(`/admin/users/${block.id}`, { is_active: false }), `${block.name} blocked`)) setBlock(null); }} />
    </>
  );
}
