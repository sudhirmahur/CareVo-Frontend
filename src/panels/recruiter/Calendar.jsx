import { useState } from 'react';
import { api } from '../../lib/api';
import { formatDate, fromLocalInput } from '../../lib/format';
import { useAsync } from '../../lib/hooks';
import { useToast } from '../../lib/toast';
import { errorMessage } from '../../lib/api';
import { Badge, Button, Card, ConfirmDialog, DataState, Input, Modal, PageHeader, Select, Tabs, Textarea } from '../../components/ui';

const KINDS = ['meeting', 'interview', 'deadline', 'reminder', 'other'].map((k) => ({ value: k, label: k[0].toUpperCase() + k.slice(1) }));
const dayKey = (iso) => String(iso).slice(0, 10);
const toLocalInput = (iso) => { const d = new Date(iso); const p = (n) => String(n).padStart(2, '0'); return `${d.getFullYear()}-${p(d.getMonth() + 1)}-${p(d.getDate())}T${p(d.getHours())}:${p(d.getMinutes())}`; };

function EventModal({ ev, onClose, onDone }) {
  const toast = useToast();
  const [f, setF] = useState({ title: ev?.title || '', kind: ev?.kind || 'meeting', starts_at: ev ? toLocalInput(ev.starts_at) : '', ends_at: ev?.ends_at ? toLocalInput(ev.ends_at) : '', notes: ev?.notes || '', remind_minutes: String(ev?.remind_minutes ?? 30) });
  const [errors, setErrors] = useState({});
  const [busy, setBusy] = useState(false);
  const set = (k) => (e) => setF((s) => ({ ...s, [k]: e.target.value }));
  const save = async () => {
    const er = {};
    if (f.title.trim().length < 2) er.title = 'Give the event a title (2+ characters).';
    if (!f.starts_at) er.starts_at = 'Pick a start time.';
    if (f.starts_at && f.ends_at && new Date(f.ends_at) <= new Date(f.starts_at)) er.ends_at = 'End must be after the start.';
    setErrors(er);
    if (Object.keys(er).length) return;
    setBusy(true);
    try {
      const body = { title: f.title.trim(), starts_at: fromLocalInput(f.starts_at), ends_at: f.ends_at ? fromLocalInput(f.ends_at) : null, notes: f.notes.trim() || null, remind_minutes: Number(f.remind_minutes) || 0 };
      if (ev) await api.patch(`/recruiter/calendar/${ev.id}`, body);
      else await api.post('/recruiter/calendar', { ...body, kind: f.kind });
      toast.success(ev ? 'Event rescheduled' : 'Event created');
      onDone(); onClose();
    } catch (e) { toast.error(errorMessage(e)); } finally { setBusy(false); }
  };
  return (
    <Modal open title={ev ? 'Edit / reschedule event' : 'New event'} onClose={onClose} footer={<><Button variant="ghost" onClick={onClose}>Cancel</Button><Button loading={busy} onClick={save}>{ev ? 'Save changes' : 'Create event'}</Button></>}>
      <div className="stack">
        <Input label="Title" value={f.title} onChange={set('title')} error={errors.title} maxLength={120} />
        {!ev && <Select label="Type" value={f.kind} onChange={set('kind')} options={KINDS} />}
        <div className="grid grid-2">
          <Input label="Starts" type="datetime-local" value={f.starts_at} onChange={set('starts_at')} error={errors.starts_at} />
          <Input label="Ends (optional)" type="datetime-local" value={f.ends_at} onChange={set('ends_at')} error={errors.ends_at} />
        </div>
        <Select label="Reminder" value={f.remind_minutes} onChange={set('remind_minutes')} options={[['0', 'No reminder'], ['15', '15 minutes before'], ['30', '30 minutes before'], ['60', '1 hour before'], ['1440', '1 day before']].map(([value, label]) => ({ value, label }))} />
        <Textarea label="Notes" rows={2} value={f.notes} onChange={set('notes')} maxLength={1000} />
      </div>
    </Modal>
  );
}

export default function Calendar() {
  const toast = useToast();
  const [view, setView] = useState('week');
  const [date, setDate] = useState(() => new Date());
  const [edit, setEdit] = useState(null); // {} = new
  const [del, setDel] = useState(null);
  const { data, loading, error, reload } = useAsync(() => api.get('/recruiter/calendar', { view, date: date.toISOString() }), [view, date.toDateString()]);
  const shift = (n) => setDate((d) => { const x = new Date(d); if (view === 'month') x.setMonth(x.getMonth() + n); else x.setDate(x.getDate() + n * (view === 'week' ? 7 : 1)); return x; });
  const items = data?.items || [];
  const groups = items.reduce((m, i) => { (m[dayKey(i.starts_at)] ||= []).push(i); return m; }, {});
  const label = view === 'day' ? formatDate(date) : view === 'month' ? date.toLocaleDateString('en-IN', { month: 'long', year: 'numeric' }) : `Week of ${formatDate(data?.from || date)}`;
  const cancel = async (e) => { try { await api.patch(`/recruiter/calendar/${e.id}`, { status: 'cancelled' }); toast.success('Event cancelled'); reload(); } catch (x) { toast.error(errorMessage(x)); } };
  return (
    <>
      <PageHeader title="Recruitment calendar" description="Interviews, meetings and deadlines in one place." actions={<Button icon="plus" onClick={() => setEdit({})}>New event</Button>} />
      <div className="row between wrap" style={{ gap: 8, marginBottom: 12 }}>
        <Tabs value={view} onChange={setView} tabs={[{ value: 'day', label: 'Day' }, { value: 'week', label: 'Week' }, { value: 'month', label: 'Month' }]} />
        <div className="row" style={{ gap: 6 }}>
          <Button variant="secondary" size="sm" aria-label="Previous" onClick={() => shift(-1)}>‹</Button>
          <Button variant="secondary" size="sm" onClick={() => setDate(new Date())}>Today</Button>
          <Button variant="secondary" size="sm" aria-label="Next" onClick={() => shift(1)}>›</Button>
        </div>
      </div>
      <h2 className="h3" data-testid="cal-label" style={{ margin: '4px 0 12px' }}>{label}</h2>
      <DataState loading={loading} error={error} onRetry={reload} hasData={!!data} isEmpty={items.length === 0} empty={{ icon: 'calendar', title: 'Nothing scheduled', description: 'Create an event or schedule an interview from an application.' }}>
        <div className="stack" data-testid="cal-agenda">
          {Object.keys(groups).sort().map((k) => (
            <Card key={k} title={formatDate(k)}>
              <ul className="cal-list">
                {groups[k].map((e) => (
                  <li key={`${e.source}-${e.id}`} className={`cal-item ${e.status === 'cancelled' ? 'is-cancelled' : ''}`}>
                    <span className="cal-time">{new Date(e.starts_at).toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit' })}</span>
                    <span className="grow"><strong>{e.title}</strong> <Badge tone={e.source === 'interview' ? 'info' : 'neutral'}>{e.kind}</Badge> {e.status !== 'scheduled' && <Badge tone="warning">{e.status}</Badge>}{e.notes && <span className="muted small" style={{ display: 'block' }}>{e.notes}</span>}</span>
                    {e.source === 'event' && e.status === 'scheduled' && (
                      <span className="row" style={{ gap: 4 }}>
                        <Button size="sm" variant="secondary" onClick={() => setEdit(e)} aria-label={`Reschedule ${e.title}`}>Reschedule</Button>
                        <Button size="sm" variant="ghost" onClick={() => cancel(e)} aria-label={`Cancel ${e.title}`}>Cancel</Button>
                        <Button size="sm" variant="ghost" onClick={() => setDel(e)} aria-label={`Delete ${e.title}`}>Delete</Button>
                      </span>
                    )}
                  </li>
                ))}
              </ul>
            </Card>
          ))}
        </div>
      </DataState>
      {edit && <EventModal ev={edit.id ? edit : null} onClose={() => setEdit(null)} onDone={reload} />}
      <ConfirmDialog open={!!del} danger title="Delete event?" message={`"${del?.title}" will be removed from your calendar.`} confirmLabel="Delete" onCancel={() => setDel(null)} onConfirm={async () => { try { await api.delete(`/recruiter/calendar/${del.id}`); toast.success('Event deleted'); setDel(null); reload(); } catch (x) { toast.error(errorMessage(x)); } }} />
    </>
  );
}
