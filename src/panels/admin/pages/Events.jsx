import { useState } from 'react';
import { api } from '../../../lib/api';
import { formatDate, fromLocalInput, isHttpUrl } from '../../../lib/format';
import { useAsync } from '../../../lib/hooks';
import { Badge, Button, ConfirmDialog, DataState, Input, Modal, PageHeader, Select, Switch, Tabs, Textarea } from '../../../components/ui';
import { ListShell, useDo, usePagedList } from '../common';

const TYPES = ['webinar', 'workshop', 'seminar', 'career_fair', 'networking'].map((v) => ({ value: v, label: v.replace('_', ' ') }));
const local = (iso) => { if (!iso) return ''; const d = new Date(iso); const p = (n) => String(n).padStart(2, '0'); return `${d.getFullYear()}-${p(d.getMonth() + 1)}-${p(d.getDate())}T${p(d.getHours())}:${p(d.getMinutes())}`; };

function EventModal({ ev, onClose, onDone }) {
  const [f, setF] = useState({ title: ev?.title || '', type: ev?.type || 'webinar', description: ev?.description || '', host: ev?.host || '', starts_at: local(ev?.starts_at), ends_at: local(ev?.ends_at), location: ev?.location || '', join_url: ev?.join_url || '', capacity: ev?.capacity || '', is_published: ev ? ev.is_published !== false : true });
  const [errors, setErrors] = useState({});
  const [run, busy] = useDo(onDone);
  const set = (k) => (e) => setF((s) => ({ ...s, [k]: e.target.value }));
  const save = async () => {
    const er = {};
    if (f.title.trim().length < 3) er.title = 'Title needs 3+ characters.';
    if (!f.starts_at) er.starts_at = 'Pick a start time.';
    if (f.starts_at && f.ends_at && new Date(f.ends_at) <= new Date(f.starts_at)) er.ends_at = 'End must be after the start.';
    if (f.join_url && !isHttpUrl(f.join_url)) er.join_url = 'Enter a full http(s):// link.';
    setErrors(er);
    if (Object.keys(er).length) return;
    const body = { title: f.title.trim(), type: f.type, description: f.description, host: f.host.trim() || null, starts_at: fromLocalInput(f.starts_at), ends_at: f.ends_at ? fromLocalInput(f.ends_at) : null, location: f.location.trim() || null, join_url: f.join_url.trim() || null, capacity: f.capacity ? Number(f.capacity) : null, is_published: f.is_published };
    if (await run(() => (ev ? api.put(`/admin/events/${ev.id}`, body) : api.post('/admin/events', body)), 'Event saved')) onClose();
  };
  return (
    <Modal open size="lg" title={ev ? 'Edit event' : 'New event'} onClose={onClose} footer={<><Button variant="ghost" onClick={onClose}>Cancel</Button><Button loading={busy} onClick={save}>Save event</Button></>}>
      <div className="stack">
        <Input label="Title" value={f.title} onChange={set('title')} error={errors.title} />
        <div className="grid grid-2"><Select label="Type" value={f.type} onChange={set('type')} options={TYPES} /><Input label="Host" value={f.host} onChange={set('host')} /></div>
        <div className="grid grid-2"><Input label="Starts" type="datetime-local" value={f.starts_at} onChange={set('starts_at')} error={errors.starts_at} /><Input label="Ends" type="datetime-local" value={f.ends_at} onChange={set('ends_at')} error={errors.ends_at} /></div>
        <div className="grid grid-2"><Input label="Join link" value={f.join_url} onChange={set('join_url')} error={errors.join_url} /><Input label="Capacity (blank = unlimited)" type="number" min="1" value={f.capacity} onChange={set('capacity')} /></div>
        <Input label="Location" value={f.location} onChange={set('location')} />
        <Textarea label="Description" rows={3} value={f.description} onChange={set('description')} />
        <Switch checked={f.is_published} onChange={(is_published) => setF({ ...f, is_published })} label="Published" />
      </div>
    </Modal>
  );
}

function Registrations({ ev, onClose }) {
  const { data, loading, error, reload } = useAsync(() => api.get(`/admin/events/${ev.id}/registrations`), [ev.id]);
  return (
    <Modal open title={`Registrations - ${ev.title}`} onClose={onClose}>
      <DataState loading={loading} error={error} onRetry={reload} hasData={!!data} isEmpty={(data?.items || []).length === 0} empty={{ icon: 'users', title: 'No registrations yet' }}>
        <ul className="stack" data-testid="registrations">{(data?.items || []).map((r) => <li key={r.email}><strong>{r.name}</strong> <span className="muted small">{r.email} · {formatDate(r.registered_at, true)}</span></li>)}</ul>
      </DataState>
    </Modal>
  );
}

function EventsTab() {
  const res = usePagedList('/admin/events');
  const [edit, setEdit] = useState(null);
  const [regs, setRegs] = useState(null);
  const [del, setDel] = useState(null);
  const [run] = useDo(res.reload);
  return (
    <>
      <div style={{ margin: '10px 0' }}><Button icon="plus" onClick={() => setEdit({})}>New event</Button></div>
      <ListShell res={res} empty={{ icon: 'calendar', title: 'No events', description: 'Create a webinar or career fair for candidates.' }}>
        {(items) => <div className="table-wrap"><table className="table rtable" data-testid="events-table">
          <thead><tr><th>Event</th><th>When</th><th>Registrations</th><th>Status</th><th /></tr></thead>
          <tbody>{items.map((e) => <tr key={e.id}><td data-label="Event"><strong>{e.title}</strong><div className="muted small">{e.type.replace('_', ' ')}</div></td><td data-label="When">{formatDate(e.starts_at, true)}</td><td data-label="Registrations">{e.registrations}{e.capacity ? ` / ${e.capacity}` : ''}</td><td data-label="Status"><Badge tone={e.is_published ? 'success' : 'neutral'}>{e.is_published ? 'published' : 'hidden'}</Badge></td>
            <td className="cell-actions"><div className="actions"><Button size="sm" variant="secondary" onClick={() => setRegs(e)}>Registrations</Button><Button size="sm" variant="secondary" onClick={() => setEdit(e)}>Edit</Button><Button size="sm" variant="ghost" onClick={() => setDel(e)} aria-label={`Delete ${e.title}`}>Delete</Button></div></td></tr>)}</tbody>
        </table></div>}
      </ListShell>
      {edit && <EventModal ev={edit.id ? edit : null} onClose={() => setEdit(null)} onDone={res.reload} />}
      {regs && <Registrations ev={regs} onClose={() => setRegs(null)} />}
      <ConfirmDialog open={!!del} danger title="Delete event?" message={`"${del?.title}" and its registrations will be removed.`} confirmLabel="Delete" onCancel={() => setDel(null)} onConfirm={async () => { const e = del; setDel(null); await run(() => api.delete(`/admin/events/${e.id}`), 'Event deleted'); }} />
    </>
  );
}

function Requests() {
  const [status, setStatus] = useState('pending');
  const { data, loading, error, reload } = useAsync(() => api.get('/admin/deletion-requests', { status }), [status]);
  const [run] = useDo(reload);
  const [confirm, setConfirm] = useState(null);
  return (
    <>
      <Tabs value={status} onChange={setStatus} tabs={['pending', 'approved', 'rejected'].map((v) => ({ value: v, label: v[0].toUpperCase() + v.slice(1) }))} />
      <DataState loading={loading} error={error} onRetry={reload} hasData={!!data} isEmpty={(data?.items || []).length === 0} empty={{ icon: 'shield', title: 'No requests', description: 'Account deletion requests from users appear here.' }}>
        <div className="table-wrap"><table className="table rtable" data-testid="deletion-table">
          <thead><tr><th>Account</th><th>Reason</th><th>Requested</th><th /></tr></thead>
          <tbody>{(data?.items || []).map((r) => <tr key={r.id}><td data-label="Account"><strong>{r.user?.name}</strong><div className="muted small">{r.user?.email} · {r.user?.role}</div></td><td data-label="Reason">{r.reason || '-'}</td><td data-label="Requested">{formatDate(r.created_at, true)}</td>
            <td className="cell-actions">{status === 'pending' && <div className="actions"><Button size="sm" variant="danger" onClick={() => setConfirm(r)}>Approve & delete</Button><Button size="sm" variant="secondary" onClick={() => run(() => api.post(`/admin/deletion-requests/${r.id}/reject`), 'Request rejected')}>Reject</Button></div>}</td></tr>)}</tbody>
        </table></div>
      </DataState>
      <ConfirmDialog open={!!confirm} danger title="Approve deletion?" message={`${confirm?.user?.name}'s account and personal data will be permanently removed.`} confirmLabel="Delete account" onCancel={() => setConfirm(null)} onConfirm={async () => { const r = confirm; setConfirm(null); await run(() => api.post(`/admin/deletion-requests/${r.id}/approve`), 'Account deleted'); }} />
    </>
  );
}

export default function Events() {
  const [tab, setTab] = useState('events');
  return (
    <>
      <PageHeader title="Events & requests" description="Career events and webinars, plus account deletion requests." />
      <Tabs value={tab} onChange={setTab} tabs={[{ value: 'events', label: 'Events' }, { value: 'requests', label: 'Deletion requests' }]} />
      {tab === 'events' ? <EventsTab /> : <Requests />}
    </>
  );
}
