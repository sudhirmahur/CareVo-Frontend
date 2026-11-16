import { useState } from 'react';
import '../../styles/account.css';
import { api, errorMessage } from '../../lib/api';
import { formatDate, titleCase } from '../../lib/format';
import { useAsync } from '../../lib/hooks';
import { useToast } from '../../lib/toast';
import { Badge, Button, Card, DataState, Input, Modal, PageHeader, Pagination, Select, Tabs, Textarea } from '../ui';

const FAQ = {
  common: [
    ['How do I reset my password?', 'Use "Forgot password?" on the login page, or change it from Account > Password while signed in.'],
    ['How do I turn on two-step verification?', 'Open Account > Security and choose an email code or an authenticator app.'],
    ['How do I delete my account?', 'Account > Privacy & data > Request deletion. Our team removes your account and data.'],
    ['Someone is bothering me. What can I do?', 'Open the chat and choose Block user, or use Report on the content. Our team reviews every report.'],
  ],
  user: [
    ['Why was my application rejected?', 'Recruiters decide on each application. You will see status changes under My applications, and you can message the recruiter if messaging is allowed.'],
    ['How do I get Premium?', 'Open Premium plans and pay securely with Razorpay. Premium starts immediately after payment.'],
    ['Can I apply with a different resume?', 'Yes. Upload resumes in Resume and pick one when you apply.'],
  ],
  recruiter: [
    ['Why is my job not visible?', 'New jobs wait for admin approval unless auto-approval is on. You will be notified once it is approved.'],
    ['How do I add team members?', 'Use Team in the sidebar to invite colleagues and set their roles.'],
  ],
  admin: [['Where do tickets show up?', 'Support desk in the admin sidebar lists every ticket with filters and assignment.']],
};
const CATS = ['account', 'billing', 'jobs', 'technical', 'recruiting', 'report', 'other'];
const TONE = { open: 'info', in_progress: 'warning', waiting: 'neutral', resolved: 'success', closed: 'neutral' };

function NewTicket({ onClose, onDone }) {
  const toast = useToast();
  const [f, setF] = useState({ subject: '', category: 'account', priority: 'normal', message: '' });
  const [err, setErr] = useState('');
  const [busy, setBusy] = useState(false);
  const set = (k) => (e) => setF({ ...f, [k]: e.target.value });
  const submit = async () => {
    if (f.subject.trim().length < 4) return setErr('Subject needs at least 4 characters.');
    if (f.message.trim().length < 5) return setErr('Please describe the problem (at least 5 characters).');
    setBusy(true); setErr('');
    try { const t = await api.post('/support/tickets', f); toast.success(`Ticket ${t.ticket_no} created`); onDone(t); onClose(); } catch (e) { setErr(errorMessage(e)); } finally { setBusy(false); }
  };
  return (
    <Modal title="New support ticket" onClose={onClose} footer={<><Button variant="ghost" onClick={onClose}>Cancel</Button><Button loading={busy} onClick={submit}>Submit ticket</Button></>}>
      <div className="stack">
        {err && <p className="form-error" role="alert">{err}</p>}
        <Input label="Subject" value={f.subject} onChange={set('subject')} maxLength={140} />
        <div className="grid grid-2">
          <Select label="Category" value={f.category} onChange={set('category')} options={CATS.map((c) => ({ value: c, label: titleCase(c) }))} />
          <Select label="Priority" value={f.priority} onChange={set('priority')} options={['low', 'normal', 'high', 'urgent'].map((c) => ({ value: c, label: titleCase(c) }))} />
        </div>
        <Textarea label="Message" rows={5} value={f.message} onChange={set('message')} maxLength={4000} />
      </div>
    </Modal>
  );
}

function TicketDetail({ id, onBack }) {
  const toast = useToast();
  const t = useAsync(() => api.get(`/support/tickets/${id}`), [id]);
  const [msg, setMsg] = useState('');
  const [busy, setBusy] = useState(false);
  const d = t.data;
  const act = async (fn, ok) => { setBusy(true); try { const r = await fn(); t.setData(r); if (ok) toast.success(ok); return true; } catch (e) { toast.error(errorMessage(e)); return false; } finally { setBusy(false); } };
  return (
    <div className="stack" data-testid="ticket-detail">
      <div><Button variant="ghost" icon="chevronLeft" onClick={onBack}>All tickets</Button></div>
      <DataState loading={t.loading} error={t.error} onRetry={t.reload} hasData={!!d}>
        {d && (
          <Card title={`${d.ticket_no} - ${d.subject}`} subtitle={`${titleCase(d.category)} · ${titleCase(d.priority)} priority · opened ${formatDate(d.created_at, true)}`} actions={<Badge tone={TONE[d.status]} dot>{titleCase(d.status)}</Badge>}>
            <div className="hc-thread">
              {d.messages.map((m, i) => (
                <div key={i} className={`hc-msg ${m.staff ? 'staff' : ''}`}><small>{m.staff ? `Support${m.author?.name ? ` (${m.author.name})` : ''}` : 'You'} · {formatDate(m.created_at, true)}</small>{m.message}</div>
              ))}
            </div>
            {d.status !== 'closed' ? (
              <div className="stack" style={{ marginTop: 14 }}>
                <Textarea label="Reply" rows={3} value={msg} onChange={(e) => setMsg(e.target.value)} maxLength={4000} />
                <div className="ac-pill-row">
                  <Button loading={busy} disabled={!msg.trim()} onClick={async () => { if (await act(() => api.post(`/support/tickets/${id}/reply`, { message: msg.trim() }), 'Reply sent')) setMsg(''); }}>Send reply</Button>
                  <Button variant="secondary" disabled={busy} onClick={() => act(() => api.post(`/support/tickets/${id}/close`), 'Ticket closed')}>Close ticket</Button>
                </div>
              </div>
            ) : <p className="muted" style={{ marginTop: 12 }}>This ticket is closed. Open a new one if you still need help.</p>}
          </Card>
        )}
      </DataState>
    </div>
  );
}

function Tickets() {
  const [page, setPage] = useState(1);
  const [status, setStatus] = useState('');
  const [open, setOpen] = useState(null);
  const [creating, setCreating] = useState(false);
  const res = useAsync(() => api.get('/support/tickets', { page, limit: 8, status }), [page, status]);
  if (open) return <TicketDetail id={open} onBack={() => { setOpen(null); res.reload(); }} />;
  const items = res.data?.items || [];
  return (
    <div className="stack" data-testid="tickets">
      <div className="ac-pill-row" style={{ justifyContent: 'space-between' }}>
        <Select aria-label="Filter by status" value={status} onChange={(e) => { setStatus(e.target.value); setPage(1); }} options={[{ value: '', label: 'All tickets' }, ...['open', 'in_progress', 'waiting', 'resolved', 'closed'].map((s) => ({ value: s, label: titleCase(s) }))]} />
        <Button icon="plus" onClick={() => setCreating(true)}>New ticket</Button>
      </div>
      <DataState loading={res.loading} error={res.error} onRetry={res.reload} hasData={!!res.data} isEmpty={items.length === 0} empty={{ icon: 'inbox', title: 'No tickets yet', description: 'Need help? Create a ticket and our team will reply here.' }}>
        <div className="stack">
          {items.map((t) => (
            <button key={t.id} type="button" className="hc-ticket" data-testid="ticket-row" onClick={() => setOpen(t.id)}>
              <div><strong>{t.ticket_no}</strong> <span className="truncate">{t.subject}</span><p className="muted small">{titleCase(t.category)} · updated {formatDate(t.updated_at, true)} · {t.messages_count} message{t.messages_count === 1 ? '' : 's'}</p></div>
              <Badge tone={TONE[t.status]} dot>{titleCase(t.status)}</Badge>
            </button>
          ))}
        </div>
        <Pagination page={res.data?.page || 1} pages={res.data?.pages || 1} onChange={setPage} />
      </DataState>
      {creating && <NewTicket onClose={() => setCreating(false)} onDone={(t) => { res.reload(); setOpen(t.id); }} />}
    </div>
  );
}

function Feedback() {
  const toast = useToast();
  const mine = useAsync(() => api.get('/feedback/mine'), []);
  const [f, setF] = useState({ category: 'idea', rating: 0, message: '' });
  const [err, setErr] = useState('');
  const [busy, setBusy] = useState(false);
  const submit = async (e) => {
    e.preventDefault();
    if (f.message.trim().length < 5) return setErr('Please write at least 5 characters.');
    setBusy(true); setErr('');
    try { const r = await api.post('/feedback', { category: f.category, rating: f.rating || null, message: f.message.trim() }); toast.success(r.message); setF({ category: 'idea', rating: 0, message: '' }); mine.reload(); } catch (e2) { setErr(errorMessage(e2)); } finally { setBusy(false); }
  };
  const items = mine.data?.items || [];
  return (
    <div className="stack" data-testid="feedback">
      <Card title="Share feedback" subtitle="Tell us what works and what does not.">
        <form className="stack" onSubmit={submit} noValidate>
          {err && <p className="form-error" role="alert">{err}</p>}
          <Select label="Type" value={f.category} onChange={(e) => setF({ ...f, category: e.target.value })} options={[{ value: 'idea', label: 'Idea' }, { value: 'bug', label: 'Something is broken' }, { value: 'praise', label: 'Praise' }, { value: 'feature_request', label: 'Feature request' }, { value: 'other', label: 'Other' }]} />
          <div><span className="small muted">Rating (optional)</span>
            <div className="hc-rating" role="radiogroup" aria-label="Rating">{[1, 2, 3, 4, 5].map((n) => <button key={n} type="button" role="radio" aria-checked={f.rating === n} aria-label={`${n} star${n > 1 ? 's' : ''}`} className={n <= f.rating ? 'on' : ''} onClick={() => setF({ ...f, rating: f.rating === n ? 0 : n })}>★</button>)}</div></div>
          <Textarea label="Your feedback" rows={4} value={f.message} onChange={(e) => setF({ ...f, message: e.target.value })} maxLength={3000} />
          <div><Button type="submit" loading={busy}>Send feedback</Button></div>
        </form>
      </Card>
      <Card title="Your feedback">
        <DataState loading={mine.loading} error={mine.error} onRetry={mine.reload} hasData={!!mine.data} isEmpty={items.length === 0} empty={{ icon: 'message', title: 'Nothing sent yet' }}>
          <ul className="ac-list">
            {items.map((x) => (
              <li key={x.id} className="ac-row" data-testid="feedback-row"><div><strong>{titleCase(x.category)}</strong> <Badge>{titleCase(x.status)}</Badge><p>{x.message}</p>{x.response && <p className="small"><strong>Our reply:</strong> {x.response}</p>}</div><span className="muted small">{formatDate(x.created_at)}</span></li>
            ))}
          </ul>
        </DataState>
      </Card>
    </div>
  );
}

export default function HelpCenter({ role = 'user' }) {
  const [tab, setTab] = useState('faq');
  const faq = [...(FAQ[role] || []), ...FAQ.common];
  return (
    <div className="hc" data-testid="help-center">
      <PageHeader title="Help & support" description="Find answers, contact our team, or send feedback." />
      <Tabs value={tab} onChange={setTab} tabs={[{ value: 'faq', label: 'Help articles' }, { value: 'tickets', label: 'Support tickets' }, { value: 'feedback', label: 'Feedback' }]} />
      {tab === 'faq' && (
        <Card title="Frequently asked questions"><div className="hc-faq">{faq.map(([q, a]) => <details key={q}><summary>{q}</summary><p>{a}</p></details>)}</div>
          <p className="muted small" style={{ marginTop: 12 }}>Still stuck? <button type="button" className="linklike" onClick={() => setTab('tickets')}>Open a support ticket</button>.</p></Card>
      )}
      {tab === 'tickets' && <Tickets />}
      {tab === 'feedback' && <Feedback />}
    </div>
  );
}
