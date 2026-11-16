import { useState } from 'react';
import { api, errorMessage } from '../../lib/api';
import { formatDate, fromLocalInput, isHttpUrl, toLocalInput } from '../../lib/format';
import { useAsync } from '../../lib/hooks';
import { useToast } from '../../lib/toast';
import { Avatar, Button, Card, ConfirmDialog, DataState, Input, Modal, PageHeader, Select, SkeletonList, StatusBadge, Tabs, Textarea } from '../../components/ui';
import Icon from '../../components/Icon';

function RescheduleModal({ iv, onClose, onDone }) {
  const toast = useToast();
  const [f, setF] = useState({ scheduled_at: toLocalInput(iv.scheduled_at), mode: iv.mode, meeting_link: iv.meeting_link || '', location: iv.location || '' });
  const [errors, setErrors] = useState({});
  const [busy, setBusy] = useState(false);
  const set = (k) => (e) => setF((s) => ({ ...s, [k]: e.target.value }));
  const save = async () => {
    const er = {};
    if (!f.scheduled_at) er.scheduled_at = 'Pick a date and time.';
    if (f.mode === 'online' && !f.meeting_link.trim()) er.meeting_link = 'A meeting link is required for online interviews.';
    else if (f.meeting_link.trim() && !isHttpUrl(f.meeting_link)) er.meeting_link = 'Enter a full link starting with http(s)://';
    setErrors(er);
    if (Object.keys(er).length) return;
    setBusy(true);
    try {
      await api.put(`/recruiter/interviews/${iv.id}`, { scheduled_at: fromLocalInput(f.scheduled_at), mode: f.mode, meeting_link: f.meeting_link.trim() || null, location: f.location.trim() || null });
      toast.success('Interview updated. The candidate was notified.');
      onDone();
    } catch (e) { toast.error(errorMessage(e)); } finally { setBusy(false); }
  };
  return (
    <Modal open title="Reschedule interview" description={iv.candidate?.name} onClose={onClose} footer={<><Button variant="ghost" onClick={onClose}>Cancel</Button><Button loading={busy} onClick={save}>Save</Button></>}>
      <div className="form-grid">
        <Input label="Date & time" type="datetime-local" value={f.scheduled_at} onChange={set('scheduled_at')} error={errors.scheduled_at} />
        <Select label="Mode" value={f.mode} onChange={set('mode')} options={[{ value: 'online', label: 'Online' }, { value: 'offline', label: 'In person' }]} />
        {f.mode === 'online' ? <div className="full"><Input label="Meeting link" type="url" value={f.meeting_link} onChange={set('meeting_link')} error={errors.meeting_link} /></div> : <div className="full"><Input label="Location" value={f.location} onChange={set('location')} /></div>}
      </div>
    </Modal>
  );
}

function CompleteModal({ iv, onClose, onDone }) {
  const toast = useToast();
  const [fb, setFb] = useState(iv.feedback || '');
  const [busy, setBusy] = useState(false);
  const save = async () => {
    setBusy(true);
    try {
      await api.put(`/recruiter/interviews/${iv.id}`, { status: 'completed', feedback: fb.trim() || null });
      toast.success('Interview marked as completed.');
      onDone();
    } catch (e) { toast.error(errorMessage(e)); } finally { setBusy(false); }
  };
  return (
    <Modal open title="Complete interview" description={iv.candidate?.name} onClose={onClose} footer={<><Button variant="ghost" onClick={onClose}>Cancel</Button><Button loading={busy} onClick={save}>Mark completed</Button></>}>
      <Textarea label="Feedback (internal)" rows={5} value={fb} onChange={(e) => setFb(e.target.value)} maxLength={3000} placeholder="How did it go?" />
    </Modal>
  );
}

export default function Interviews() {
  const toast = useToast();
  const [tab, setTab] = useState('scheduled');
  const [resched, setResched] = useState(null);
  const [complete, setComplete] = useState(null);
  const [cancelIv, setCancelIv] = useState(null);
  const [busy, setBusy] = useState(false);
  const { data, loading, error, reload } = useAsync(() => api.get('/recruiter/interviews', { status: tab }), [tab]);
  const items = data?.items || [];
  const done = async () => { setResched(null); setComplete(null); await reload(); };
  const cancel = async () => {
    setBusy(true);
    try {
      await api.put(`/recruiter/interviews/${cancelIv.id}`, { status: 'cancelled' });
      toast.success('Interview cancelled. The candidate was notified.');
      setCancelIv(null);
      reload();
    } catch (e) { toast.error(errorMessage(e)); } finally { setBusy(false); }
  };
  return (
    <>
      <PageHeader title="Interviews" description="Schedule from a candidate's application, manage them here." />
      <Tabs value={tab} onChange={setTab} tabs={[{ value: 'scheduled', label: 'Upcoming' }, { value: 'completed', label: 'Completed' }, { value: 'cancelled', label: 'Cancelled' }]} />
      <DataState loading={loading} error={error} onRetry={reload} hasData={!!data} skeleton={<SkeletonList count={2} />} isEmpty={items.length === 0} empty={{ icon: 'calendar', title: `No ${tab === 'scheduled' ? 'upcoming' : tab} interviews`, description: tab === 'scheduled' ? 'Open a candidate on the Applications page and choose "Schedule interview".' : undefined }}>
        <div className="stack">
          {items.map((iv) => (
            <Card key={iv.id} className="r-iv">
              <div className="r-iv-date"><strong>{new Date(iv.scheduled_at).toLocaleDateString('en-IN', { day: 'numeric' })}</strong><span>{new Date(iv.scheduled_at).toLocaleDateString('en-IN', { month: 'short' })}</span></div>
              <div className="grow">
                <div className="row-wrap"><strong>{iv.candidate?.name}</strong><StatusBadge status={iv.status} /></div>
                <p className="muted small">{iv.job_title} · {formatDate(iv.scheduled_at, true)} · {iv.mode === 'online' ? 'Online' : 'In person'}</p>
                {iv.meeting_link && <p className="small"><Icon name="link" size={14} /> <a href={iv.meeting_link} target="_blank" rel="noreferrer noopener">{iv.meeting_link}</a></p>}
                {iv.location && <p className="small"><Icon name="mapPin" size={14} /> {iv.location}</p>}
                {iv.feedback && <p className="small muted">Feedback: {iv.feedback}</p>}
              </div>
              {iv.status === 'scheduled' && (
                <div className="r-iv-actions">
                  <Button size="sm" variant="secondary" onClick={() => setResched(iv)}>Reschedule</Button>
                  <Button size="sm" variant="soft" onClick={() => setComplete(iv)}>Complete</Button>
                  <Button size="sm" variant="ghost" onClick={() => setCancelIv(iv)}>Cancel</Button>
                </div>
              )}
            </Card>
          ))}
        </div>
      </DataState>
      {resched && <RescheduleModal iv={resched} onClose={() => setResched(null)} onDone={done} />}
      {complete && <CompleteModal iv={complete} onClose={() => setComplete(null)} onDone={done} />}
      <ConfirmDialog open={!!cancelIv} danger loading={busy} title="Cancel this interview?" message="The candidate will be notified." confirmLabel="Cancel interview" onConfirm={cancel} onCancel={() => setCancelIv(null)} />
    </>
  );
}
