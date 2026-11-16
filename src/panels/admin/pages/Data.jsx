import { useState } from 'react';
import { api } from '../../../lib/api';
import { formatDate } from '../../../lib/format';
import { useAsync } from '../../../lib/hooks';
import { Badge, Button, Card, DataState, Input, Modal, PageHeader, Select, Switch, Tabs } from '../../../components/ui';
import { DownloadBtn, useDo } from '../common';

const kb = (n) => (n > 1048576 ? `${(n / 1048576).toFixed(1)} MB` : `${Math.max(1, Math.round((n || 0) / 1024))} KB`);

function Exports() {
  const { data, loading, error, reload } = useAsync(() => api.get('/admin/exports'), []);
  return (
    <DataState loading={loading} error={error} onRetry={reload} hasData={!!data}>
      <div className="grid grid-2" data-testid="exports">{(data?.datasets || []).map((d) => (
        <Card key={d.key} title={d.key[0].toUpperCase() + d.key.slice(1)} subtitle={`${d.count} records`}>
          <div className="row wrap" style={{ gap: 6 }}>{['csv', 'xlsx', 'pdf'].map((f) => <DownloadBtn key={f} size="sm" path={`/admin/exports/${d.key}`} params={{ format: f }} filename={`carevo-${d.key}.${f}`} aria-label={`Export ${d.key} as ${f.toUpperCase()}`}>{f.toUpperCase()}</DownloadBtn>)}</div>
        </Card>))}</div>
    </DataState>
  );
}

function Backups() {
  const { data, loading, error, reload } = useAsync(() => api.get('/admin/backups'), []);
  const [run, busy] = useDo(reload);
  const [restore, setRestore] = useState(null);
  const [typed, setTyped] = useState('');
  const sch = data?.schedule;
  const setSch = (v) => run(() => api.put('/admin/backups/schedule', { enabled: sch.enabled, frequency: sch.frequency, keep: sch.keep, ...v }), 'Schedule saved');
  return (
    <div className="stack">
      <Card title="Schedule" subtitle="Automatic backups run inside the API process.">
        {sch && <div className="row wrap" style={{ gap: 12 }} data-testid="backup-schedule">
          <Switch checked={sch.enabled} onChange={(enabled) => setSch({ enabled })} label="Automatic backups" />
          <Select aria-label="Frequency" value={sch.frequency} onChange={(e) => setSch({ frequency: e.target.value })} options={[{ value: 'daily', label: 'Daily' }, { value: 'weekly', label: 'Weekly' }]} />
          <Select aria-label="Keep" value={String(sch.keep)} onChange={(e) => setSch({ keep: Number(e.target.value) })} options={['3', '7', '14', '30'].map((v) => ({ value: v, label: `Keep ${v}` }))} />
        </div>}
      </Card>
      <Card title="Backup history" actions={<Button icon="plus" loading={busy} onClick={() => run(() => api.post('/admin/backups'), 'Backup created')}>Back up now</Button>}>
        <DataState loading={loading} error={error} onRetry={reload} hasData={!!data} isEmpty={(data?.items || []).length === 0} empty={{ icon: 'layers', title: 'No backups yet', description: 'Create the first backup.' }}>
          <div className="table-wrap"><table className="table rtable" data-testid="backups-table">
            <thead><tr><th>When</th><th>Type</th><th>Status</th><th>Size</th><th>Documents</th><th /></tr></thead>
            <tbody>{(data?.items || []).map((b) => (
              <tr key={b.id}><td data-label="When">{formatDate(b.created_at, true)}</td><td data-label="Type">{b.kind}</td><td data-label="Status"><Badge tone={b.status === 'success' ? 'success' : b.status === 'failed' ? 'danger' : 'neutral'} dot>{b.status}</Badge></td><td data-label="Size">{b.size ? kb(b.size) : '-'}</td><td data-label="Documents">{b.documents ?? '-'}</td>
                <td className="cell-actions"><div className="actions">{b.status === 'success' && <Button size="sm" variant="secondary" onClick={() => { setRestore(b); setTyped(''); }}>Restore</Button>}<Button size="sm" variant="ghost" aria-label={`Delete backup ${b.filename}`} onClick={() => run(() => api.delete(`/admin/backups/${b.id}`), 'Backup deleted')}>Delete</Button></div></td></tr>))}</tbody>
          </table></div>
        </DataState>
      </Card>
      {restore && (
        <Modal open size="sm" title="Restore backup" onClose={() => setRestore(null)} footer={<><Button variant="ghost" onClick={() => setRestore(null)}>Cancel</Button><Button variant="danger" disabled={typed !== 'RESTORE'} loading={busy} onClick={async () => { if (await run(() => api.post(`/admin/backups/${restore.id}/restore`, { confirm: typed }), 'Backup restored')) setRestore(null); }}>Restore data</Button></>}>
          <div className="stack"><p><strong>This replaces ALL current data</strong> with the backup from {formatDate(restore.created_at, true)}. A safety backup of the current data is taken first. Only a Super Admin can do this.</p><Input label="Type RESTORE to confirm" value={typed} onChange={(e) => setTyped(e.target.value)} /></div>
        </Modal>
      )}
    </div>
  );
}

export default function Data() {
  const [tab, setTab] = useState('exports');
  return (
    <>
      <PageHeader title="Data & backups" description="Export platform data and manage database backups." />
      <Tabs value={tab} onChange={setTab} tabs={[{ value: 'exports', label: 'Data export' }, { value: 'backups', label: 'Backups' }]} />
      {tab === 'exports' ? <Exports /> : <Backups />}
    </>
  );
}
