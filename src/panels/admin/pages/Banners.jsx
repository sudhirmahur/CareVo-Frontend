import { useState } from 'react';
import { api } from '../../../lib/api';
import { formatDate, fromLocalInput, isHttpUrl, toLocalInput } from '../../../lib/format';
import { useAsync } from '../../../lib/hooks';
import { Badge, Button, Card, ConfirmDialog, DataState, Input, Modal, PageHeader, Select, Switch, Tabs, Textarea } from '../../../components/ui';
import MediaUpload from '../../../components/shared/MediaUpload';
import { ActionBtn, useDo } from '../common';

const AUDIENCE = [{ value: 'all', label: 'Everyone' }, { value: 'guest', label: 'Visitors (not signed in)' }, { value: 'user', label: 'Candidates' }, { value: 'recruiter', label: 'Recruiters' }];
const AUD_LABEL = Object.fromEntries(AUDIENCE.map((a) => [a.value, a.label]));
const STYLES = [{ value: 'promo', label: 'Blue (promo)' }, { value: 'info', label: 'Info' }, { value: 'success', label: 'Success' }, { value: 'warning', label: 'Warning' }];
const FREQ = [{ value: 'once', label: 'Once per visitor' }, { value: 'daily', label: 'Once a day' }, { value: 'always', label: 'Every visit' }];
const STATUS_TONE = { live: 'success', scheduled: 'info', expired: 'neutral', hidden: 'warning' };

const BLANK = {
  banner: { title: '', text: '', image_url: '', link_url: '', audience: 'all', style: 'promo', starts_at: '', ends_at: '' },
  popup: { title: '', message: '', image_url: '', button_label: '', button_link: '', audience: 'all', frequency: 'once', delay_seconds: '2', starts_at: '', ends_at: '' },
};

function validate(kind, f) {
  const er = {};
  if (f.title.trim().length < 2) er.title = 'Enter a title (min 2 characters).';
  if (kind === 'popup' && f.message.trim().length < 2) er.message = 'Enter the popup message.';
  const img = f.image_url.trim();
  if (img && !isHttpUrl(img) && !img.startsWith('/uploads/')) er.image_url = 'Upload an image or use a link starting with http:// or https://';
  const link = (kind === 'banner' ? f.link_url : f.button_link).trim();
  if (link && !isHttpUrl(link)) er[kind === 'banner' ? 'link_url' : 'button_link'] = 'Must start with http:// or https://';
  if (kind === 'popup' && link && !f.button_label.trim()) er.button_label = 'Add the button text.';
  if (f.starts_at && f.ends_at && new Date(f.ends_at) <= new Date(f.starts_at)) er.ends_at = 'End must be after the start.';
  return er;
}

function toBody(kind, f) {
  const base = { title: f.title.trim(), image_url: f.image_url.trim() || null, audience: f.audience, starts_at: fromLocalInput(f.starts_at), ends_at: fromLocalInput(f.ends_at) };
  if (kind === 'banner') return { ...base, text: f.text.trim() || null, link_url: f.link_url.trim() || null, style: f.style };
  return { ...base, message: f.message.trim(), button_label: f.button_label.trim() || null, button_link: f.button_link.trim() || null, frequency: f.frequency, delay_seconds: Math.max(0, Math.min(120, Number(f.delay_seconds) || 0)) };
}

function fromItem(kind, it) {
  const f = { ...BLANK[kind] };
  Object.keys(f).forEach((k) => { if (it[k] != null) f[k] = String(it[k]); });
  f.starts_at = toLocalInput(it.starts_at);
  f.ends_at = toLocalInput(it.ends_at);
  return f;
}

function EditModal({ kind, item, onClose, onSaved }) {
  const label = kind === 'banner' ? 'banner' : 'popup';
  const [f, setF] = useState(item ? fromItem(kind, item) : BLANK[kind]);
  const [err, setErr] = useState({});
  const [run, busy] = useDo();
  const set = (k) => (e) => setF({ ...f, [k]: e.target.value });
  const save = async () => {
    const er = validate(kind, f);
    setErr(er);
    if (Object.keys(er).length) return;
    const body = toBody(kind, f);
    const url = `/admin/${label}s`;
    const ok = await run(() => (item ? api.put(`${url}/${item.id}`, body) : api.post(url, body)), item ? `${label[0].toUpperCase()}${label.slice(1)} updated` : `${label[0].toUpperCase()}${label.slice(1)} created`);
    if (ok) { onSaved(); onClose(); }
  };
  return (
    <Modal title={`${item ? 'Edit' : 'New'} ${label}`} onClose={onClose} footer={<><Button variant="ghost" onClick={onClose}>Cancel</Button><Button loading={busy} onClick={save}>{item ? 'Save changes' : `Create ${label}`}</Button></>}>
      <div className="stack">
        <Input label="Title" value={f.title} onChange={set('title')} error={err.title} maxLength={kind === 'banner' ? 150 : 120} required />
        {kind === 'banner'
          ? <Input label="Short text (optional)" value={f.text} onChange={set('text')} maxLength={300} />
          : <Textarea label="Message" rows={3} value={f.message} onChange={set('message')} error={err.message} maxLength={600} required />}
        <div className="field"><label>Image (optional)</label>
          <MediaUpload purpose={label} kind="image" value={f.image_url} onChange={(u) => setF({ ...f, image_url: u || '' })} label="Upload image" size={64} />
          <Input aria-label="Image URL" value={f.image_url} onChange={set('image_url')} error={err.image_url} placeholder="…or paste an https:// image link" /></div>
        {kind === 'banner'
          ? <Input label="Link URL (optional)" value={f.link_url} onChange={set('link_url')} error={err.link_url} placeholder="https://…" />
          : <div className="grid grid-2"><Input label="Button text" value={f.button_label} onChange={set('button_label')} error={err.button_label} maxLength={40} placeholder="e.g. See plans" /><Input label="Button link" value={f.button_link} onChange={set('button_link')} error={err.button_link} placeholder="https://…" /></div>}
        <div className="grid grid-2">
          <Select label="Show to" value={f.audience} onChange={set('audience')} options={AUDIENCE} />
          {kind === 'banner'
            ? <Select label="Colour" value={f.style} onChange={set('style')} options={STYLES} />
            : <Select label="How often" value={f.frequency} onChange={set('frequency')} options={FREQ} />}
        </div>
        {kind === 'popup' && <Input label="Delay before showing (seconds)" type="number" min="0" max="120" value={f.delay_seconds} onChange={set('delay_seconds')} />}
        <div className="grid grid-2">
          <Input label="Start (optional)" type="datetime-local" value={f.starts_at} onChange={set('starts_at')} hint="Empty = starts immediately" />
          <Input label="End (optional)" type="datetime-local" value={f.ends_at} onChange={set('ends_at')} error={err.ends_at} hint="Empty = never ends" />
        </div>
      </div>
    </Modal>
  );
}

function Manager({ kind }) {
  const label = kind;
  const cap = `${label[0].toUpperCase()}${label.slice(1)}`;
  const { data, loading, error, reload } = useAsync(() => api.get(`/admin/${label}s`), [kind]);
  const [run, busy] = useDo(reload);
  const [edit, setEdit] = useState(null); // {} = new, item = edit
  const [del, setDel] = useState(null);
  const items = data?.items || [];
  return (
    <>
      <div className="row between" style={{ marginBottom: 12 }}>
        <span className="muted">{kind === 'banner' ? 'Strips shown at the top of the site, candidate and recruiter panels.' : 'Popups appear over the page once the delay passes. Visitors can close them.'}</span>
        <Button icon="plus" onClick={() => setEdit({})}>New {label}</Button>
      </div>
      <Card padded={false}>
        <DataState loading={loading} error={error} onRetry={reload} hasData={!!data} isEmpty={items.length === 0} empty={{ icon: 'layers', title: `No ${label}s yet`, description: `Create one to reach your visitors.` }}>
          <div className="table-wrap">
            <table className="table rtable" data-testid={`${label}s-table`}>
              <thead><tr><th>{cap}</th><th>Audience</th><th>Schedule</th><th>Status</th><th>Active</th><th /></tr></thead>
              <tbody>
                {items.map((b) => (
                  <tr key={b.id}>
                    <td data-label={cap}><span className="strong">{b.title}</span>{(b.text || b.message) && <div className="muted small truncate" style={{ maxWidth: 260 }}>{b.text || b.message}</div>}</td>
                    <td data-label="Audience">{AUD_LABEL[b.audience] || 'Everyone'}</td>
                    <td data-label="Schedule"><span className="small">{b.starts_at ? formatDate(b.starts_at, true) : 'Now'} → {b.ends_at ? formatDate(b.ends_at, true) : 'No end'}</span></td>
                    <td data-label="Status"><Badge tone={STATUS_TONE[b.status] || 'neutral'} dot>{b.status}</Badge></td>
                    <td data-label="Active"><Switch checked={b.is_active} label={b.is_active ? 'Active' : 'Hidden'} onChange={() => run(() => api.patch(`/admin/${label}s/${b.id}`), (r) => (r.is_active ? `${cap} activated` : `${cap} hidden`))} /></td>
                    <td className="cell-actions"><div className="actions">
                      <ActionBtn icon="edit" label={`Edit ${label} ${b.title}`} onClick={() => setEdit(b)} />
                      <ActionBtn icon="trash" tone="danger" label={`Delete ${label} ${b.title}`} onClick={() => setDel(b)} />
                    </div></td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </DataState>
      </Card>
      {edit && <EditModal key={edit.id || 'new'} kind={kind} item={edit.id ? edit : null} onClose={() => setEdit(null)} onSaved={reload} />}
      <ConfirmDialog open={!!del} danger title={`Delete ${label}?`} message={del && `"${del.title}" will be removed.`} confirmLabel={`Delete ${label}`} loading={busy}
        onCancel={() => setDel(null)} onConfirm={async () => { if (await run(() => api.delete(`/admin/${label}s/${del.id}`), `${cap} deleted`)) setDel(null); }} />
    </>
  );
}

export default function Banners() {
  const [tab, setTab] = useState('banner');
  return (
    <>
      <PageHeader title="Banners & popups" description="Announcements with a schedule and an audience. They go live automatically between the start and end time." />
      <Tabs tabs={[{ value: 'banner', label: 'Banners' }, { value: 'popup', label: 'Popups' }]} value={tab} onChange={setTab} />
      <Manager key={tab} kind={tab} />
    </>
  );
}
