import { useState } from 'react';
import { api } from '../../../lib/api';
import { formatDate, titleCase } from '../../../lib/format';
import { Badge, Button, Modal, PageHeader, Select, StatusBadge, Textarea } from '../../../components/ui';
import { ActionBtn, ListShell, useDo, usePagedList, useUrlFilter } from '../common';

export default function Reports() {
  const [status, setStatus] = useUrlFilter('status', 'pending');
  const res = usePagedList('/admin/reports', { status });
  const [run, busy] = useDo(res.reload);
  const [target, setTarget] = useState(null);
  const [action, setAction] = useState('none');
  const [note, setNote] = useState('');
  const open = (r) => { setTarget(r); setAction('none'); setNote(''); };
  const actions = target?.content_type === 'user'
    ? [{ value: 'none', label: 'No action - dismiss report' }, { value: 'block_user', label: 'Block the reported user' }]
    : [{ value: 'none', label: 'No action - dismiss report' }, { value: 'remove_content', label: `Remove the reported ${target?.content_type || 'content'}` }];
  return (
    <>
      <PageHeader title="Reports" description="Content and users reported by the community." />
      <ListShell res={res} tabs={[{ value: 'pending', label: 'Pending' }, { value: 'resolved', label: 'Resolved' }]} tab={status} onTab={setStatus} empty={{ icon: 'flag', title: status === 'pending' ? 'No pending reports' : 'No resolved reports', description: 'You are all caught up.' }}>
        {(items) => (
          <div className="table-wrap">
            <table className="table rtable" data-testid="reports-table">
              <thead><tr><th>Reported</th><th>Reason</th><th>By</th><th>Date</th><th>Status</th><th /></tr></thead>
              <tbody>
                {items.map((r) => (
                  <tr key={r.id}>
                    <td data-label="Reported"><Badge tone="warning">{titleCase(r.content_type)}</Badge> <span className="strong">{r.target_label}</span>{!r.target_exists && <span className="muted small"> (already removed)</span>}</td>
                    <td data-label="Reason" style={{ maxWidth: 320 }}>{r.reason}</td>
                    <td data-label="By">{r.reporter?.name || '-'}</td>
                    <td data-label="Date">{formatDate(r.created_at)}</td>
                    <td data-label="Status"><StatusBadge status={r.status} />{r.resolution && r.resolution.action !== 'none' && <div className="muted small">{titleCase(r.resolution.action)}</div>}</td>
                    <td className="cell-actions"><div className="actions">{r.status === 'pending' && <ActionBtn icon="check" label={`Resolve report on ${r.target_label}`} onClick={() => open(r)} />}</div></td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </ListShell>
      {target && (
        <Modal title="Resolve report" description={`${titleCase(target.content_type)}: ${target.target_label}`} size="sm" onClose={() => setTarget(null)}
          footer={<><Button variant="ghost" onClick={() => setTarget(null)}>Cancel</Button><Button loading={busy} onClick={async () => { if (await run(() => api.patch(`/admin/reports/${target.id}`, { status: 'resolved', action, note: note.trim() || undefined }), 'Report resolved')) setTarget(null); }}>Resolve</Button></>}>
          <div className="stack">
            <p className="muted small">“{target.reason}”</p>
            <Select label="Action" value={action} onChange={(e) => setAction(e.target.value)} options={actions} />
            <Textarea label="Internal note (optional)" rows={3} value={note} onChange={(e) => setNote(e.target.value)} maxLength={500} />
          </div>
        </Modal>
      )}
    </>
  );
}
