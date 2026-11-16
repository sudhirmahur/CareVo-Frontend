import { useEffect, useMemo, useState } from 'react';
import { api, errorMessage, openResume } from '../../lib/api';
import { formatDate, fromLocalInput, isHttpUrl, timeAgo } from '../../lib/format';
import { useAsync, useDebounce } from '../../lib/hooks';
import { Link, useNavigate, useSearchParams } from '../../lib/router';
import { useToast } from '../../lib/toast';
import { Avatar, Badge, Button, Card, DataState, Input, Modal, PageHeader, SearchInput, Select, SkeletonList, SkillChips, StatusBadge, Tabs, Textarea } from '../../components/ui';
import Icon from '../../components/Icon';
import { CompareModal, EvaluationPanel } from './Evaluations';
import { STAGES, STAGE_OPTIONS, downloadFile } from './util';

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

function DetailModal({ app, onClose, onChanged, teamNames }) {
  const toast = useToast();
  const [tab, setTab] = useState('overview');
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
        <Tabs value={tab} onChange={setTab} tabs={[{ value: 'overview', label: 'Overview' }, { value: 'screening', label: 'Screening', count: (app.answers || []).length }, { value: 'evaluation', label: 'Evaluation' }]} />
        {tab === 'screening' && (
          (app.answers || []).length === 0 ? <p className="muted" data-testid="no-answers">No screening questions were asked for this job.</p> : (
            <dl className="r-answers" data-testid="answers">{app.answers.map((x) => <div key={x.question_id}><dt>{x.question}</dt><dd>{x.answer}</dd></div>)}</dl>
          )
        )}
        {tab === 'evaluation' && <EvaluationPanel appId={app.id} teamNames={teamNames} />}
        {tab === 'overview' && <>
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
              <Button variant="secondary" icon="award" disabled={app.status === 'rejected'} onClick={() => navigate(`/recruiter/offers?application_id=${app.id}`)}>Make offer</Button>
            </div>
          </div>
        )}
        </>}
      </div>
    </Modal>
  );
}

export function BulkMessageModal({ appIds = [], poolIds = [], onClose }) {
  const toast = useToast();
  const [f, setF] = useState({ subject: '', message: '' });
  const [err, setErr] = useState('');
  const [busy, setBusy] = useState(false);
  const send = async () => {
    if (f.subject.trim().length < 2 || f.message.trim().length < 2) return setErr('Enter a subject and a message.');
    setBusy(true);
    try {
      const r = await api.post('/recruiter/candidates/message', { application_ids: appIds, pool_ids: poolIds, subject: f.subject.trim(), message: f.message.trim() });
      toast.success(`Sent: ${r.in_app} in-app, ${r.email} e-mail`);
      onClose();
    } catch (e) { setErr(errorMessage(e)); } finally { setBusy(false); }
  };
  return (
    <Modal open size="sm" title="Message candidates" description={`${appIds.length + poolIds.length} recipient(s)`} onClose={onClose} footer={<><Button variant="ghost" onClick={onClose}>Cancel</Button><Button loading={busy} onClick={send}>Send</Button></>}>
      <div className="stack">
        {err && <p className="form-error" role="alert">{err}</p>}
        <Input label="Subject" value={f.subject} onChange={(e) => setF({ ...f, subject: e.target.value })} maxLength={120} />
        <Textarea label="Message" rows={4} value={f.message} onChange={(e) => setF({ ...f, message: e.target.value })} maxLength={2000} />
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
  const [sel, setSel] = useState([]);
  const [compare, setCompare] = useState(false);
  const [msg, setMsg] = useState(false);
  const [qa, setQa] = useState({ question_id: '', answer: '' });
  const toast = useToast();
  const q = useDebounce(search, 350);
  const team = useAsync(async () => { try { return await api.get('/recruiter/team'); } catch { return { items: [] }; } }, []);
  const teamNames = (team.data?.items || []).map((m) => m.name);
  const jobDetail = useAsync(async () => (jobId ? api.get(`/recruiter/jobs/${jobId}`) : null), [jobId]);
  const questions = jobDetail.data?.screening_questions || [];
  const filtering = !!(jobId && qa.question_id && qa.answer);
  const screen = useAsync(async () => (filtering ? api.get(`/recruiter/jobs/${jobId}/screening`, { question_id: qa.question_id, answer: qa.answer }) : null), [jobId, qa.question_id, qa.answer]);
  const jobs = useAsync(() => api.get('/recruiter/jobs', { limit: 50 }), []);
  const boardMode = view === 'board';
  const { data, loading, error, reload } = useAsync(
    () => api.get('/recruiter/applications', { job_id: jobId, search: q, status: boardMode ? '' : status, page: boardMode ? 1 : page, limit: boardMode ? 100 : 10 }),
    [jobId, q, status, page, view],
  );
  const items = filtering ? (screen.data?.items || []) : (data?.items || []);
  const open = useMemo(() => items.find((a) => a.id === openId), [items, openId]);
  const groups = useMemo(() => Object.fromEntries(STAGES.map((s) => [s.key, items.filter((a) => a.status === s.key)])), [items]);
  const withdrawn = items.filter((a) => a.status === 'withdrawn');
  useEffect(() => setPage(1), [jobId, q, status]);
  useEffect(() => { setQa({ question_id: '', answer: '' }); }, [jobId]);
  useEffect(() => { setSel([]); }, [jobId, q, status, page, view]);
  const toggle = (id) => setSel((x) => (x.includes(id) ? x.filter((i) => i !== id) : [...x, id]));
  const allSelected = items.length > 0 && sel.length === items.length;
  const bulk = async (body, ok) => {
    try { const r = await api.post('/recruiter/applications/bulk', { ids: sel, ...body }); toast.success(`${r.updated} updated${r.skipped ? `, ${r.skipped} skipped` : ''}${ok ? '' : ''}`); setSel([]); reload(); } catch (e) { toast.error(errorMessage(e)); }
  };
  const exportCsv = () => downloadFile('/recruiter/applications/export', 'applications.csv', { job_id: jobId, status }).catch((e) => toast.error(errorMessage(e)));

  return (
    <>
      <PageHeader title="Candidates" description="Review applicants, move them through your pipeline and schedule interviews." actions={<Tabs value={view} onChange={setView} tabs={[{ value: 'board', label: 'Board' }, { value: 'list', label: 'List' }]} className="r-viewtabs" />} />
      <div className="r-filters">
        <SearchInput value={search} onChange={setSearch} placeholder="Search by name or email" />
        <Select aria-label="Filter by job" value={jobId} onChange={(e) => setParams({ job_id: e.target.value })} placeholder="All jobs" options={(jobs.data?.items || []).map((j) => ({ value: j.id, label: j.title }))} />
        {questions.length > 0 && <Select aria-label="Screening question" value={qa.question_id} onChange={(e) => setQa({ question_id: e.target.value, answer: '' })} placeholder="Screening filter" options={questions.map((x) => ({ value: x.id, label: x.question.slice(0, 40) }))} />}
        {qa.question_id && (() => { const qq = questions.find((x) => x.id === qa.question_id); const opts = qq?.type === 'yesno' ? ['Yes', 'No'] : qq?.type === 'choice' ? qq.options : null; return opts ? <Select aria-label="Screening answer" value={qa.answer} onChange={(e) => setQa({ ...qa, answer: e.target.value })} placeholder="Answer…" options={opts.map((o) => ({ value: o, label: o }))} /> : <input className="input" aria-label="Screening answer" placeholder="Exact answer" value={qa.answer} onChange={(e) => setQa({ ...qa, answer: e.target.value })} />; })()}
        <Button variant="secondary" size="sm" icon="download" onClick={exportCsv}>Export CSV</Button>
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
            <label className="r-selectall small"><input type="checkbox" className="r-check" checked={allSelected} onChange={() => setSel(allSelected ? [] : items.map((a) => a.id))} /> Select all ({items.length})</label>
            {sel.length > 0 && (
              <div className="r-bulkbar" role="region" aria-label="Bulk actions" data-testid="bulkbar">
                <strong>{sel.length} selected</strong>
                <Button size="sm" variant="soft" onClick={() => bulk({ status: 'shortlisted' })}>Shortlist</Button>
                <Button size="sm" variant="danger" onClick={() => bulk({ status: 'rejected' })}>Reject</Button>
                <Select aria-label="Move to stage" value="" onChange={(e) => e.target.value && bulk({ stage: e.target.value })} placeholder="Move to stage…" options={STAGE_OPTIONS} />
                <Button size="sm" variant="secondary" icon="message" onClick={() => setMsg(true)}>Message</Button>
                <Button size="sm" variant="secondary" icon="chart" disabled={sel.length < 2 || sel.length > 5} onClick={() => setCompare(true)}>Compare</Button>
              </div>
            )}
            <div className="stack">
              {items.map((a) => (
                <Card key={a.id} className="r-app-row">
                  <input type="checkbox" className="r-check" aria-label={`Select ${a.candidate?.name}`} checked={sel.includes(a.id)} onChange={() => toggle(a.id)} />
                  <Avatar name={a.candidate?.name} size={42} />
                  <div className="grow"><strong className="truncate" style={{ display: 'block' }}>{a.candidate?.name}</strong><span className="muted small truncate" style={{ display: 'block' }}>{a.job_title} · {a.candidate?.email}</span><span className="muted small">{formatDate(a.applied_at)}{a.stage ? ` · stage: ${a.stage}` : ''}</span></div>
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
      {open && <DetailModal app={open} onClose={() => setOpenId(null)} onChanged={reload} teamNames={teamNames} />}
      {compare && <CompareModal ids={sel} onClose={() => setCompare(false)} />}
      {msg && <BulkMessageModal appIds={sel} onClose={() => setMsg(false)} />}
    </>
  );
}
