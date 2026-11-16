import { useEffect, useState } from 'react';
import { api, errorMessage } from '../../lib/api';
import { formatDate, fromLocalInput } from '../../lib/format';
import { useAsync } from '../../lib/hooks';
import { useSearchParams } from '../../lib/router';
import { useToast } from '../../lib/toast';
import { Badge, Button, Card, ConfirmDialog, DataState, Input, Modal, PageHeader, Select, Tabs, Textarea } from '../../components/ui';
import { downloadFile, inr } from './util';

const TONE = { draft: 'neutral', sent: 'info', accepted: 'success', declined: 'danger', withdrawn: 'warning', expired: 'warning' };

function OfferModal({ offer, templates, defaultAppId, onClose, onDone }) {
  const toast = useToast();
  const apps = useAsync(() => (offer ? Promise.resolve(null) : api.get('/recruiter/applications', { limit: 50 })), []);
  const [f, setF] = useState({ application_id: defaultAppId || '', designation: offer?.designation || '', salary: offer?.salary ?? '', currency: offer?.currency || 'INR', joining_date: offer?.joining_date ? String(offer.joining_date).slice(0, 10) : '', expires_in_days: '7', template_id: '', terms: offer?.terms || '' });
  const [errors, setErrors] = useState({});
  const [busy, setBusy] = useState(false);
  const set = (k) => (e) => setF((s) => ({ ...s, [k]: e.target.value }));
  const save = async () => {
    const er = {};
    if (!offer && !f.application_id) er.application_id = 'Choose the candidate application.';
    if (f.designation.trim().length < 2) er.designation = 'Enter the designation.';
    if (!(Number(f.salary) > 0)) er.salary = 'Enter a salary greater than 0.';
    setErrors(er);
    if (Object.keys(er).length) return;
    setBusy(true);
    try {
      const joining = f.joining_date ? fromLocalInput(`${f.joining_date}T09:00`) : null;
      if (offer) await api.put(`/recruiter/offers/${offer.id}`, { designation: f.designation.trim(), salary: Number(f.salary), joining_date: joining, terms: f.terms.trim() || null });
      else await api.post('/recruiter/offers', { application_id: f.application_id, designation: f.designation.trim(), salary: Number(f.salary), currency: f.currency, joining_date: joining, expires_in_days: Number(f.expires_in_days), template_id: f.template_id || null, terms: f.terms.trim() || null });
      toast.success(offer ? 'Draft updated' : 'Offer drafted');
      onDone(); onClose();
    } catch (e) { toast.error(errorMessage(e)); } finally { setBusy(false); }
  };
  const appOpts = (apps.data?.items || []).filter((a) => a.status !== 'rejected' && a.status !== 'withdrawn').map((a) => ({ value: a.id, label: `${a.candidate?.name || 'Candidate'} - ${a.job_title}` }));
  return (
    <Modal open size="lg" title={offer ? 'Edit draft offer' : 'New offer letter'} onClose={onClose} footer={<><Button variant="ghost" onClick={onClose}>Cancel</Button><Button loading={busy} onClick={save}>{offer ? 'Save draft' : 'Create draft'}</Button></>}>
      <div className="stack">
        {!offer && <Select label="Candidate application" value={f.application_id} onChange={set('application_id')} error={errors.application_id} options={[{ value: '', label: 'Select…' }, ...appOpts]} />}
        <Input label="Designation" value={f.designation} onChange={set('designation')} error={errors.designation} />
        <div className="grid grid-3">
          <Input label="Salary (per year)" type="number" min="1" value={f.salary} onChange={set('salary')} error={errors.salary} />
          {!offer && <Select label="Currency" value={f.currency} onChange={set('currency')} options={['INR', 'USD', 'EUR', 'GBP'].map((v) => ({ value: v, label: v }))} />}
          <Input label="Joining date" type="date" value={f.joining_date} onChange={set('joining_date')} />
        </div>
        {!offer && <div className="grid grid-2">
          <Select label="Template" value={f.template_id} onChange={set('template_id')} options={[{ value: '', label: 'Default letter' }, ...templates.map((t) => ({ value: t.id, label: t.name }))]} />
          <Select label="Valid for" value={f.expires_in_days} onChange={set('expires_in_days')} options={['3', '7', '14', '30'].map((v) => ({ value: v, label: `${v} days` }))} />
        </div>}
        <Textarea label="Terms (optional - overrides the template)" rows={3} value={f.terms} onChange={set('terms')} maxLength={3000} />
      </div>
    </Modal>
  );
}

function TemplateModal({ tpl, defaults, placeholders, onClose, onDone }) {
  const toast = useToast();
  const [f, setF] = useState({ name: tpl?.name || '', body: tpl?.body || defaults.body, terms: tpl?.terms || defaults.terms });
  const [errors, setErrors] = useState({});
  const save = async () => {
    const er = {};
    if (f.name.trim().length < 2) er.name = 'Name the template.';
    if (f.body.trim().length < 20) er.body = 'The letter needs at least 20 characters.';
    setErrors(er);
    if (Object.keys(er).length) return;
    try {
      const body = { name: f.name.trim(), body: f.body, terms: f.terms };
      if (tpl) await api.put(`/recruiter/offer-templates/${tpl.id}`, body); else await api.post('/recruiter/offer-templates', body);
      toast.success('Template saved'); onDone(); onClose();
    } catch (e) { toast.error(errorMessage(e)); }
  };
  return (
    <Modal open size="lg" title={tpl ? 'Edit template' : 'New template'} onClose={onClose} footer={<><Button variant="ghost" onClick={onClose}>Cancel</Button><Button onClick={save}>Save template</Button></>}>
      <div className="stack">
        <Input label="Template name" value={f.name} onChange={(e) => setF({ ...f, name: e.target.value })} error={errors.name} />
        <p className="muted small">Placeholders: {placeholders.map((p) => <code key={p} style={{ marginRight: 6 }}>{`{{${p}}}`}</code>)}</p>
        <Textarea label="Letter" rows={8} value={f.body} onChange={(e) => setF({ ...f, body: e.target.value })} error={errors.body} />
        <Textarea label="Terms" rows={3} value={f.terms} onChange={(e) => setF({ ...f, terms: e.target.value })} />
      </div>
    </Modal>
  );
}

export default function Offers() {
  const toast = useToast();
  const [params, setParams] = useSearchParams();
  const [tab, setTab] = useState('offers');
  const [status, setStatus] = useState('');
  const [modal, setModal] = useState(null); // {offer?}
  const [view, setView] = useState(null);
  const [tplModal, setTplModal] = useState(null);
  const [withdraw, setWithdraw] = useState(null);
  const list = useAsync(() => api.get('/recruiter/offers', { status: status || undefined }), [status]);
  const tpls = useAsync(() => api.get('/recruiter/offer-templates'), []);
  const preApp = params.get('application_id');
  useEffect(() => { if (preApp) setModal({}); }, [preApp]);
  const reloadAll = () => { list.reload(); tpls.reload(); };
  const run = async (fn, ok) => { try { await fn(); toast.success(ok); reloadAll(); setView(null); } catch (e) { toast.error(errorMessage(e)); } };
  const open = async (o) => { try { setView(await api.get(`/recruiter/offers/${o.id}`)); } catch (e) { toast.error(errorMessage(e)); } };
  const counts = list.data?.counts || {};
  return (
    <>
      <PageHeader title="Offer letters" description="Draft, send and track offers." actions={<Button icon="plus" onClick={() => setModal({})}>New offer</Button>} />
      <Tabs value={tab} onChange={setTab} tabs={[{ value: 'offers', label: 'Offers' }, { value: 'templates', label: 'Templates' }]} />
      {tab === 'offers' && (
        <>
          <div className="row wrap" style={{ gap: 8, margin: '10px 0' }} data-testid="offer-counts">{Object.entries(counts).map(([k, v]) => <Badge key={k} tone={TONE[k]}>{k}: {v}</Badge>)}</div>
          <Tabs value={status} onChange={setStatus} tabs={[{ value: '', label: 'All' }, ...['draft', 'sent', 'accepted', 'declined', 'withdrawn'].map((v) => ({ value: v, label: v[0].toUpperCase() + v.slice(1) }))]} />
          <DataState loading={list.loading} error={list.error} onRetry={list.reload} hasData={!!list.data} isEmpty={(list.data?.items || []).length === 0} empty={{ icon: 'award', title: 'No offers yet', description: 'Create an offer from an accepted or shortlisted application.' }}>
            <div className="table-wrap"><table className="table rtable" data-testid="offers-table">
              <thead><tr><th>Candidate</th><th>Role</th><th>Salary</th><th>Status</th><th>Sent</th><th /></tr></thead>
              <tbody>{(list.data?.items || []).map((o) => (
                <tr key={o.id}>
                  <td data-label="Candidate"><strong>{o.candidate_name}</strong></td><td data-label="Role">{o.designation}</td><td data-label="Salary">{inr(o.salary, o.currency)}</td>
                  <td data-label="Status"><Badge tone={TONE[o.status]} dot>{o.status}</Badge></td><td data-label="Sent">{o.sent_at ? formatDate(o.sent_at) : '-'}</td>
                  <td className="cell-actions"><Button size="sm" variant="secondary" onClick={() => open(o)}>Open</Button></td>
                </tr>))}</tbody>
            </table></div>
          </DataState>
        </>
      )}
      {tab === 'templates' && (
        <Card title="Templates" actions={<Button size="sm" icon="plus" onClick={() => setTplModal({})}>New template</Button>}>
          {(tpls.data?.items || []).length === 0 ? <p className="muted">No custom templates. The default letter is used.</p> : (
            <ul className="stack">{tpls.data.items.map((t) => <li key={t.id} className="row between"><strong>{t.name}</strong><span className="row" style={{ gap: 6 }}><Button size="sm" variant="secondary" onClick={() => setTplModal(t)}>Edit</Button><Button size="sm" variant="ghost" onClick={() => run(() => api.delete(`/recruiter/offer-templates/${t.id}`), 'Template deleted')} aria-label={`Delete template ${t.name}`}>Delete</Button></span></li>)}</ul>
          )}
        </Card>
      )}
      {modal && <OfferModal offer={modal.offer} templates={tpls.data?.items || []} defaultAppId={preApp || ''} onClose={() => { setModal(null); if (preApp) setParams({ application_id: '' }); }} onDone={reloadAll} />}
      {tplModal && tpls.data && <TemplateModal tpl={tplModal.id ? tplModal : null} defaults={tpls.data.default} placeholders={tpls.data.placeholders} onClose={() => setTplModal(null)} onDone={tpls.reload} />}
      {view && (
        <Modal open size="lg" title={`${view.designation} - ${view.candidate_name}`} description={<Badge tone={TONE[view.status]} dot>{view.status}</Badge>} onClose={() => setView(null)}
          footer={<>
            <Button variant="secondary" icon="download" onClick={() => downloadFile(`/recruiter/offers/${view.id}/pdf`, 'offer-letter.pdf').catch((e) => toast.error(errorMessage(e)))}>PDF</Button>
            {view.status === 'draft' && <Button variant="secondary" onClick={() => { const o = view; setView(null); setModal({ offer: o }); }}>Edit</Button>}
            {['draft', 'sent'].includes(view.status) && <Button variant="danger" onClick={() => setWithdraw(view)}>Withdraw</Button>}
            {view.status === 'draft' && <Button icon="send" onClick={() => run(() => api.post(`/recruiter/offers/${view.id}/send`), 'Offer sent to the candidate')}>Send offer</Button>}
          </>}>
          <pre className="offer-letter" data-testid="offer-letter" style={{ whiteSpace: 'pre-wrap', fontFamily: 'inherit' }}>{view.letter}</pre>
          <h4>History</h4>
          <ul className="small" data-testid="offer-history">{(view.history || []).map((h, i) => <li key={i}>{h.status} - {formatDate(h.at, true)}</li>)}</ul>
        </Modal>
      )}
      <ConfirmDialog open={!!withdraw} danger title="Withdraw this offer?" message="The candidate will be notified if it was already sent." confirmLabel="Withdraw" onCancel={() => setWithdraw(null)} onConfirm={() => { const o = withdraw; setWithdraw(null); run(() => api.post(`/recruiter/offers/${o.id}/withdraw`), 'Offer withdrawn'); }} />
    </>
  );
}
