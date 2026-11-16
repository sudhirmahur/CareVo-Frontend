import { useEffect, useState } from 'react';
import { api } from '../../../lib/api';
import { formatDate } from '../../../lib/format';
import { useAsync, useDebounce } from '../../../lib/hooks';
import { Badge, Button, Card, DataState, Input, Modal, PageHeader, Switch, Tabs, Textarea } from '../../../components/ui';
import { ListShell, useDo, usePagedList } from '../common';

const SAMPLE = { name: 'Aarav', code: '123456', link: 'https://example.com', job_title: 'Frontend Developer', company: 'Acme', status: 'shortlisted', when: 'tomorrow 10:00', plan: 'Premium', until: '30 Nov', amount: '₹499', designation: 'Lead Dev', role: 'recruiter', subject: 'Hello', message: 'Message body' };

function Editor({ tpl, onClose, onDone }) {
  const [f, setF] = useState({ name: tpl.name, subject: tpl.subject, body: tpl.body, enabled: tpl.enabled !== false });
  const [errors, setErrors] = useState({});
  const [run, busy] = useDo(onDone);
  const dbs = useDebounce(f.subject, 300); const dbb = useDebounce(f.body, 300);
  const [preview, setPreview] = useState(null);
  useEffect(() => { api.post('/admin/email-templates/preview', { subject: dbs, body: dbb, context: SAMPLE }).then(setPreview).catch(() => setPreview(null)); }, [dbs, dbb]);
  const save = async () => {
    const er = {};
    if (f.subject.trim().length < 2) er.subject = 'Subject is required.';
    if (f.body.trim().length < 2) er.body = 'Body is required.';
    setErrors(er);
    if (Object.keys(er).length) return;
    if (await run(() => api.put(`/admin/email-templates/${tpl.key}`, f), 'Template saved')) onClose();
  };
  return (
    <Modal open size="lg" title={`Edit: ${tpl.name}`} onClose={onClose} footer={<><Button variant="ghost" onClick={onClose}>Cancel</Button><Button variant="secondary" onClick={() => run(() => api.post(`/admin/email-templates/${tpl.key}/test`), 'Test email recorded')}>Send test to me</Button><Button loading={busy} onClick={save}>Save</Button></>}>
      <div className="stack">
        <Input label="Subject" value={f.subject} onChange={(e) => setF({ ...f, subject: e.target.value })} error={errors.subject} />
        <Textarea label="Body" rows={8} value={f.body} onChange={(e) => setF({ ...f, body: e.target.value })} error={errors.body} />
        <Switch checked={f.enabled} onChange={(enabled) => setF({ ...f, enabled })} label="Enabled" />
        <p className="muted small">Placeholders: {(tpl.placeholders || []).map((p) => <code key={p} style={{ marginRight: 6 }}>{`{{${p}}}`}</code>)}</p>
        <Card title="Preview" subtitle="Rendered with sample data">
          <div data-testid="email-preview"><strong>{preview?.subject}</strong><pre style={{ whiteSpace: 'pre-wrap', fontFamily: 'inherit' }}>{preview?.body}</pre></div>
        </Card>
      </div>
    </Modal>
  );
}

export default function Emails() {
  const [tab, setTab] = useState('templates');
  const tpls = useAsync(() => api.get('/admin/email-templates'), []);
  const outbox = usePagedList('/admin/emails');
  const [edit, setEdit] = useState(null);
  useEffect(() => { if (tab === 'outbox') outbox.reload(); }, [tab]); // eslint-disable-line
  return (
    <>
      <PageHeader title="Email templates" description="Edit the emails CareVo sends. Without SMTP configured, emails are recorded in the outbox only." />
      <Tabs value={tab} onChange={setTab} tabs={[{ value: 'templates', label: 'Templates' }, { value: 'outbox', label: 'Outbox' }]} />
      {tab === 'templates' && (
        <DataState loading={tpls.loading} error={tpls.error} onRetry={tpls.reload} hasData={!!tpls.data}>
          <div className="table-wrap"><table className="table rtable" data-testid="templates-table">
            <thead><tr><th>Template</th><th>Subject</th><th>Status</th><th /></tr></thead>
            <tbody>{(tpls.data?.items || []).map((t) => <tr key={t.key}><td data-label="Template"><strong>{t.name}</strong><div className="muted small">{t.key}</div></td><td data-label="Subject">{t.subject}</td><td data-label="Status"><Badge tone={t.enabled === false ? 'warning' : 'success'}>{t.enabled === false ? 'disabled' : 'enabled'}</Badge></td><td className="cell-actions"><Button size="sm" variant="secondary" onClick={() => setEdit(t)}>Edit</Button></td></tr>)}</tbody>
          </table></div>
        </DataState>
      )}
      {tab === 'outbox' && (
        <ListShell res={outbox} empty={{ icon: 'mail', title: 'Outbox is empty', description: 'Sent and recorded emails appear here.' }}>
          {(items) => <div className="table-wrap"><table className="table rtable" data-testid="outbox-table"><thead><tr><th>When</th><th>To</th><th>Subject</th><th>Status</th></tr></thead><tbody>{items.map((m) => <tr key={m.id}><td data-label="When">{formatDate(m.created_at, true)}</td><td data-label="To">{m.to}</td><td data-label="Subject">{m.subject}</td><td data-label="Status"><Badge tone={m.status === 'failed' ? 'danger' : 'neutral'}>{m.status}</Badge></td></tr>)}</tbody></table></div>}
        </ListShell>
      )}
      {edit && <Editor tpl={edit} onClose={() => setEdit(null)} onDone={tpls.reload} />}
    </>
  );
}
