import { formatDate } from '../../../lib/format';
import { Badge, PageHeader } from '../../../components/ui';
import { ListShell, usePagedList } from '../common';

export default function AuditLog() {
  const res = usePagedList('/admin/audit-logs', {}, 25);
  return (
    <>
      <PageHeader title="Audit log" description="Who changed what in the admin panel." />
      <ListShell res={res} empty={{ icon: 'shield', title: 'Nothing logged yet', description: 'Admin actions will appear here.' }}>
        {(items) => (
          <div className="table-wrap"><table className="table rtable" data-testid="audit-table"><thead><tr><th>When</th><th>Admin</th><th>Action</th><th>Target</th><th>Details</th></tr></thead>
            <tbody>{items.map((l) => (
              <tr key={l.id}>
                <td data-label="When">{formatDate(l.created_at, true)}</td>
                <td data-label="Admin">{l.admin_email || '-'}</td>
                <td data-label="Action"><Badge tone="brand">{l.action}</Badge></td>
                <td data-label="Target"><span className="truncate" style={{ maxWidth: 200, display: 'inline-block' }}>{l.target || '-'}</span></td>
                <td data-label="Details">{l.detail || '-'}</td>
              </tr>))}</tbody></table></div>
        )}
      </ListShell>
    </>
  );
}
