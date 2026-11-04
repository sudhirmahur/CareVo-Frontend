import { useEffect, useMemo, useState } from 'react';
import { api, errorMessage, openResume } from '../../lib/api';
import { formatDate, fromLocalInput, isHttpUrl, timeAgo } from '../../lib/format';
import { useAsync, useDebounce } from '../../lib/hooks';
import { Link, useNavigate, useSearchParams } from '../../lib/router';
import { useToast } from '../../lib/toast';
import { Avatar, Badge, Button, Card, DataState, Input, Modal, PageHeader, SearchInput, Select, SkeletonList, SkillChips, StatusBadge, Tabs, Textarea } from '../../components/ui';
import Icon from '../../components/Icon';
import { STAGES } from './util';

function CandidateCard({ a, onOpen }) {
  const c = a.candidate || {};
  return (
    <button type="button" className="r-cand" onClick={() => onOpen(a.id)} aria-label={`Open application from ${c.name}`}>
      <Avatar name={c.name} src={c.profile_image} size={38} />
      <span className="grow">
        <strong className="truncate" style={{ display: 'block' }}>{c.name}</strong>
        <span className="muted small truncate" style={{ display: 'block' }}>{a.job_title}</span>
        <span className="muted small">{timeAgo(a.applied_at)}{a.source === 'external' ? ' · via company link' : ''}</span>
      </span>
    </button>
  );
}

function ScheduleForm({ app, onDone, onCancel }) {
  const toast = useToast();
  const [f, setF] = useState({ scheduled_at: '', mode: 'online', meeting_link: '', location: '' });
  const [errors, setErrors] = useState({});
  const [err, setErr] = useState('');
  const [busy, setBusy] = useState(false);
  const set = (k) => (e) => setF((s) => ({ ...s, [k]: e.target.value }));
  const submit = async (e) => {
    e.preventDefault();
    const er = {};
    if (!f.scheduled_at) er.scheduled_at = 'Pick a date and time.';
    else if (new Date(f.scheduled_at) < new Date()) er.scheduled_at = 'Choose a time in the future.';
    if (f.mode === 'online' && !f.meeting_link.trim()) er.meeting_link = 'A meeting link is required for online interviews.';
    else if (f.meeting_link.trim() && !isHttpUrl(f.meeting_link)) er.meeting_link = 'Enter a full link starting with http(s)://';
    setErrors(er);
    setErr('');
    if (Object.keys(er).length) return;
    setBusy(true);
    try {
      await api.post('/recruiter/interviews', { application_id: app.id, scheduled_at: fromLocalInput(f.scheduled_at), mode: f.mode, meeting_link: f.meeting_link.trim() || null, location: f.location.trim() || null });
      toast.success('Interview scheduled. The candidate has been notified.');
      onDone();
    } catch (e2) { setErr(errorMessage(e2)); } finally { setBusy(false); }
  };
  return (
    <form className="r-schedule stack" onSubmit={submit} noValidate>
      <h4>Schedule interview</h4>
      {err && <p className="form-error" role="alert">{err}</p>}
      <div className="form-grid">
        <Input label="Date & time" type="datetime-local" value={f.scheduled_at} onChange={set('scheduled_at')} error={errors.scheduled_at} />
        <Select label="Mode" value={f.mode} onChange={set('mode')} options={[{ value: 'online', label: 'Online' }, { value: 'offline', label: 'In person' }]} />
        {f.mode === 'online' ? <div className="full"><Input label="Meeting link" type="url" value={f.meeting_link} onChange={set('meeting_link')} error={errors.meeting_link} placeholder="https://meet.google.com/…" /></div> : <div className="full"><Input label="Location" value={f.location} onChange={set('location')} placeholder="Office address" /></div>}
      </div>
      <div className="row" style={{ justifyContent: 'flex-end' }}><Button variant="ghost" onClick={onCancel}>Cancel</Button><Button type="submit" loading={busy}>Schedule</Button></div>
    </form>
  );
}

function DetailModal({ app, onClose, onChanged }) {
  const toast = useToast();
  const navigate = useNavigate();
  const [note, setNote] = useState('');
  const [busy, setBusy] = useState('');
  const [scheduling, setScheduling] = useState(false);
  const c = app.candidate || {};
  const setStatus = async (status) => {
    setBusy(status);
    try {
      await api.patch(`/recruiter/applications/${app.id}/status`, { status, note: note.trim() || null });
      toast.success(`Marked as ${status}. The candidate was notified.`);
      setNote('');
      await onChanged();
    } catch (e) { toast.error(errorMessage(e)); } finally { setBusy(''); }
  };
  const withdrawn = app.status === 'withdrawn';
  return (
    <Modal open size="lg" onClose={onClose} title={c.name || 'Candidate'} description={`Applied for ${app.job_title} · ${formatDate(app.applied_at, true)}`}>
      <div className="stack">
        <div className="row-wrap"><StatusBadge status={app.status} />{app.source === 'external' && <Badge tone="info"><Icon name="link" size={12} /> Applied via company link</Badge>}</div>
        <div className="r-detail-grid">
          <div className="stack-sm">
            <div className="row"><Avatar name={c.name} src={c.profile_image} size={52} /><div><strong>{c.current_position || 'Position not provided'}</strong><p className="muted small">{c.experience_years ?? 0} yrs experience{c.location ? ` · ${c.location}` : ''}</p></div></div>
            <p className="small"><Icon name="mail" size={14} /> <a href={`mailto:${c.email}`}>{c.email}</a></p>
            {c.phone && <p className="small"><Icon name="phone" size={14} /> {c.phone}</p>}
            {c.bio && <p className="small muted">{c.bio}</p>}
            <SkillChips skills={c.skills} />
            <div className="row-wrap small">
              {c.github_url && <a href={c.github_url} target="_blank" rel="noreferrer noopener">GitHub</a>}
              {c.linkedin_url && <a href={c.linkedin_url} target="_blank" rel="noreferrer noopener">LinkedIn</a>}
              {c.portfolio_url && <a href={c.portfolio_url} target="_blank" rel="noreferrer noopener">Portfolio</a>}
            </div>
          </div>
          <div className="stack-sm">
            <h4>Resume</h4>
            {app.resume ? (
              <button type="button" className="btn btn-secondary btn-sm" onClick={() => openResume(app.resume.id).catch((e) => toast.error(errorMessage(e)))}><Icon name="download" size={16} /><span>{app.resume.name || 'Download resume'}</span></button>
            ) : <p className="muted small">{app.source === 'external' ? 'Candidate applied through your company link - no resume attached here.' : 'No resume attached.'}</p>}
            {app.resume?.ai_score != null && <p className="small">Resume score: <strong>{app.resume.ai_score}/100</strong></p>}
            <h4>Cover letter</h4>
            <p className="small" style={{ whiteSpace: 'pre-wrap' }}>{app.cover_letter || <span className="muted">None provided.</span>}</p>
          </div>
        </div>
        <div>
          <h4>History</h4>
          <ol className="r-history">
            {(app.status_history || []).map((h, i) => (
              <li key={i}><StatusBadge status={h.status} /><span className="muted small">{formatDate(h.at, true)}{h.note ? ` - ${h.note}` : ''}</span></li>
            ))}
          </ol>
        </div>
        {app.interviews?.length > 0 && (
          <div><h4>Interviews</h4>{app.interviews.map((iv) => <p key={iv.id} className="small"><Icon name="calendar" size={14} /> {formatDate(iv.scheduled_at, true)} · {iv.mode} · <StatusBadge status={iv.status} /></p>)}</div>
        )}
        {withdrawn ? <p className="muted">The candidate withdrew this application.</p> : scheduling ? (
          <ScheduleForm app={app} onCancel={() => setScheduling(false)} onDone={async () => { setScheduling(false); await onChanged(); }} />
        ) : (
          <div className="r-actions stack-sm">
            <Textarea label="Note to candidate (optional)" rows={2} value={note} onChange={(e) => setNote(e.target.value)} maxLength={1000} placeholder="Shown in their notification" />
            <div className="row-wrap">
              <Button variant="soft" icon="check" loading={busy === 'shortlisted'} disabled={app.status === 'shortlisted'} onClick={() => setStatus('shortlisted')}>Shortlist</Button>
              <Button variant="success" icon="award" loading={busy === 'accepted'} disabled={app.status === 'accepted'} onClick={() => setStatus('accepted')}>Accept</Button>
              <Button variant="danger" icon="x" loading={busy === 'rejected'} disabled={app.status === 'rejected'} onClick={() => setStatus('rejected')}>Reject</Button>
              <Button variant="secondary" icon="calendar" onClick={() => setScheduling(true)} disabled={app.status === 'rejected'}>Schedule interview</Button>
              <Button variant="secondary" icon="message" onClick={() => navigate(`/recruiter/messages?with=${c.id}`)}>Message</Button>
            </div>
          </div>
        )}
      </div>
    </Modal>
  );
}

export default function Applications() {
  const [params, setParams] = useSearchParams();
  const jobId = params.get('job_id') || '';
  const [view, setView] = useState('board');
  const [status, setStatus] = useState('');
  const [search, setSearch] = useState('');
  const [col, setCol] = useState('applied');
  const [openId, setOpenId] = useState(null);
  const [page, setPage] = useState(1);
  const q = useDebounce(search, 350);
  const jobs = useAsync(() => api.get('/recruiter/jobs', { limit: 50 }), []);
  const boardMode = view === 'board';
  const { data, loading, error, reload } = useAsync(
    () => api.get('/recruiter/applications', { job_id: jobId, search: q, status: boardMode ? '' : status, page: boardMode ? 1 : page, limit: boardMode ? 100 : 10 }),
    [jobId, q, status, page, view],
  );
  const items = data?.items || [];
  const open = useMemo(() => items.find((a) => a.id === openId), [items, openId]);
  const groups = useMemo(() => Object.fromEntries(STAGES.map((s) => [s.key, items.filter((a) => a.status === s.key)])), [items]);
  const withdrawn = items.filter((a) => a.status === 'withdrawn');
  useEffect(() => setPage(1), [jobId, q, status]);

  return (
    <>
      <PageHeader title="Candidates" description="Review applicants, move them through your pipeline and schedule interviews." actions={<Tabs value={view} onChange={setView} tabs={[{ value: 'board', label: 'Board' }, { value: 'list', label: 'List' }]} className="r-viewtabs" />} />
      <div className="r-filters">
        <SearchInput value={search} onChange={setSearch} placeholder="Search by name or email" />
        <Select aria-label="Filter by job" value={jobId} onChange={(e) => setParams({ job_id: e.target.value })} placeholder="All jobs" options={(jobs.data?.items || []).map((j) => ({ value: j.id, label: j.title }))} />
        {!boardMode && <Select aria-label="Filter by status" value={status} onChange={(e) => setStatus(e.target.value)} placeholder="All statuses" options={[...STAGES.map((s) => ({ value: s.key, label: s.label })), { value: 'withdrawn', label: 'Withdrawn' }]} />}
      </div>
      <DataState loading={loading} error={error} onRetry={reload} hasData={!!data} skeleton={<SkeletonList count={3} />} isEmpty={items.length === 0} empty={{ icon: 'users', title: q || jobId || status ? 'No applications match your filters' : 'No applications yet', description: 'Candidates who apply to your jobs will appear here.' }}>
        {boardMode ? (
          <>
            <Tabs className="r-coltabs" value={col} onChange={setCol} tabs={STAGES.map((s) => ({ value: s.key, label: s.label, count: groups[s.key].length }))} />
            <div className="r-board">
              {STAGES.map((s) => (
                <section key={s.key} className={`r-col col-${s.key} ${col === s.key ? 'active' : ''}`} aria-label={s.label}>
                  <header><span>{s.label}</span><span className="chip">{groups[s.key].length}</span></header>
                  <div className="r-col-body">
                    {groups[s.key].length === 0 ? <p className="muted small r-col-empty">Nobody here yet</p> : groups[s.key].map((a) => <CandidateCard key={a.id} a={a} onOpen={setOpenId} />)}
                  </div>
                </section>
              ))}
            </div>
            {withdrawn.length > 0 && <p className="muted small" style={{ marginTop: 12 }}>{withdrawn.length} withdrawn application{withdrawn.length > 1 ? 's' : ''} hidden - use List view to see them.</p>}
          </>
        ) : (
          <>
            <div className="stack">
              {items.map((a) => (
                <Card key={a.id} className="r-app-row">
                  <Avatar name={a.candidate?.name} size={42} />
                  <div className="grow"><strong className="truncate" style={{ display: 'block' }}>{a.candidate?.name}</strong><span className="muted small truncate" style={{ display: 'block' }}>{a.job_title} · {a.candidate?.email}</span><span className="muted small">{formatDate(a.applied_at)}</span></div>
                  <StatusBadge status={a.status} />
                  <Button variant="secondary" size="sm" onClick={() => setOpenId(a.id)}>Review</Button>
                </Card>
              ))}
            </div>
            <div className="row" style={{ justifyContent: 'center', marginTop: 16 }}>
              <Button variant="secondary" size="sm" disabled={(data?.page || 1) <= 1} onClick={() => setPage((p) => p - 1)}>Previous</Button>
              <span className="muted small">Page {data?.page || 1} of {data?.pages || 1}</span>
              <Button variant="secondary" size="sm" disabled={(data?.page || 1) >= (data?.pages || 1)} onClick={() => setPage((p) => p + 1)}>Next</Button>
            </div>
          </>
        )}
      </DataState>
      {open && <DetailModal app={open} onClose={() => setOpenId(null)} onChanged={reload} />}
    </>
  );
}
