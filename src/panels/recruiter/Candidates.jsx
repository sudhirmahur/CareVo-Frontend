import { useRef, useState } from 'react';
import { api, errorMessage } from '../../lib/api';
import { useAsync } from '../../lib/hooks';
import { useToast } from '../../lib/toast';
import { Badge, Button, Card, DataState, PageHeader, Select, Tabs } from '../../components/ui';
import { BulkMessageModal } from './Applications';
import { STAGE_OPTIONS, downloadFile } from './util';

export default function Candidates() {
  const toast = useToast();
  const fileRef = useRef(null);
  const [stage, setStage] = useState('');
  const [sel, setSel] = useState([]);
  const [report, setReport] = useState(null);
  const [msg, setMsg] = useState(false);
  const [busy, setBusy] = useState(false);
  const { data, loading, error, reload } = useAsync(() => api.get('/recruiter/candidates/pool', { stage: stage || undefined }), [stage]);
  const items = data?.items || [];
  const upload = async (e) => {
    const file = e.target.files?.[0];
    e.target.value = '';
    if (!file) return;
    if (!file.name.toLowerCase().endsWith('.csv')) return toast.error('Choose a .csv file.');
    if (file.size > 1024 * 1024) return toast.error('CSV must be 1 MB or smaller.');
    setBusy(true);
    try {
      const fd = new FormData(); fd.append('file', file);
      const r = await api.post('/recruiter/candidates/import', undefined, { form: fd });
      setReport(r);
      toast[r.imported ? 'success' : 'error'](`${r.imported} imported, ${r.failed} failed`);
      reload();
    } catch (err) { toast.error(errorMessage(err)); setReport(null); } finally { setBusy(false); }
  };
  const act = async (fn, ok) => { try { await fn(); toast.success(ok); setSel([]); reload(); } catch (err) { toast.error(errorMessage(err)); } };
  const toggle = (id) => setSel((s) => (s.includes(id) ? s.filter((x) => x !== id) : [...s, id]));
  return (
    <>
      <PageHeader title="Candidate pool" description="Import candidates from CSV, move them through stages and message them in bulk." actions={<>
        <input ref={fileRef} type="file" accept=".csv,text/csv" className="sr-only" aria-label="CSV file" onChange={upload} />
        <Button icon="upload" loading={busy} onClick={() => fileRef.current?.click()}>Import CSV</Button>
        <Button variant="secondary" icon="download" onClick={() => downloadFile('/recruiter/candidates/pool/export', 'candidates.csv').catch((e) => toast.error(errorMessage(e)))}>Export</Button>
      </>} />
      <p className="muted small">CSV columns: <code>name</code>, <code>email</code> (required), <code>phone</code>, <code>skills</code> (separate with ;), <code>notes</code>. Max 1000 rows.</p>
      {report && (
        <Card title="Import result" data-testid="import-report">
          <p><Badge tone="success">{report.imported} imported</Badge> <Badge tone={report.failed ? 'danger' : 'neutral'}>{report.failed} failed</Badge></p>
          {report.errors.length > 0 && <div className="table-wrap"><table className="table rtable"><thead><tr><th>Row</th><th>Problem</th></tr></thead><tbody>{report.errors.map((e, i) => <tr key={i}><td data-label="Row">{e.row}</td><td data-label="Problem">{e.error}</td></tr>)}</tbody></table></div>}
        </Card>
      )}
      <Tabs value={stage} onChange={(v) => { setStage(v); setSel([]); }} tabs={[{ value: '', label: 'All' }, ...STAGE_OPTIONS]} />
      {sel.length > 0 && (
        <div className="row wrap bulk-bar" style={{ gap: 8, margin: '8px 0' }} data-testid="pool-bulk">
          <strong>{sel.length} selected</strong>
          <Select aria-label="Move to stage" value="" onChange={(e) => e.target.value && act(() => api.post('/recruiter/candidates/pool/stage', { ids: sel, stage: e.target.value }), 'Stage updated')} options={[{ value: '', label: 'Move to stage…' }, ...STAGE_OPTIONS]} />
          <Button size="sm" variant="secondary" icon="message" onClick={() => setMsg(true)}>Email</Button>
          <Button size="sm" variant="danger" onClick={() => act(() => api.post('/recruiter/candidates/pool/delete', { ids: sel }), 'Candidates removed')}>Remove</Button>
        </div>
      )}
      <DataState loading={loading} error={error} onRetry={reload} hasData={!!data} isEmpty={items.length === 0} empty={{ icon: 'users', title: 'No candidates here', description: 'Import a CSV to build your pool.' }}>
        <div className="table-wrap"><table className="table rtable" data-testid="pool-table">
          <thead><tr><th><input type="checkbox" aria-label="Select all" checked={sel.length === items.length && items.length > 0} onChange={(e) => setSel(e.target.checked ? items.map((i) => i.id) : [])} /></th><th>Name</th><th>Email</th><th>Skills</th><th>Stage</th></tr></thead>
          <tbody>{items.map((c) => (
            <tr key={c.id}>
              <td><input type="checkbox" aria-label={`Select ${c.name}`} checked={sel.includes(c.id)} onChange={() => toggle(c.id)} /></td>
              <td data-label="Name"><strong>{c.name}</strong></td><td data-label="Email">{c.email}</td><td data-label="Skills">{(c.skills || []).join(', ')}</td><td data-label="Stage"><Badge>{c.stage}</Badge></td>
            </tr>))}</tbody>
        </table></div>
      </DataState>
      {msg && <BulkMessageModal poolIds={sel} onClose={() => { setMsg(false); setSel([]); }} />}
    </>
  );
}
