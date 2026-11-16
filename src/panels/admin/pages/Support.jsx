import { useState } from 'react';
import { api } from '../../../lib/api';
import { formatDate, timeAgo } from '../../../lib/format';
import { useAsync } from '../../../lib/hooks';
import { Badge, Button, Card, DataState, Modal, PageHeader, Select, StatCard, Tabs, Textarea } from '../../../components/ui';
import { DownloadBtn, ListShell, useDo, usePagedList, useSearch } from '../common';

const ST = { open: 'warning', in_progress: 'info', waiting: 'neutral', resolved: 'success', closed: 'neutral' };
const PR = { low: 'neutral', normal: 'neutral', high: 'warning', urgent: 'danger' };
const opts = (arr, all) => [{ value: '', label: all }, ...arr.map((v) => ({ value: v, label: v.replace('_', ' ') }))];

function TicketModal({ id, agents, onClose, onChanged }) {
  const { data: t, reload } = useAsync(() => api.get(`/admin/support/tickets/${id}`), [id]);
  const [run, busy] = useDo(async () => { await reload(); onChanged(); });
  const [reply, setReply] = useState('');
  const [note, setNote] = useState('');
  if (!t) return <Modal open title="Ticket" onClose={onClose}><p className="muted">Loading…</p></Modal>;
  const patch = (body, msg) => run(() => api.patch(`/admin/support/tickets/${id}`, body), msg);
  return (
    <Modal open size="lg" title={`${t.ticket_no} - ${t.subject}`} description={`${t.user?.name} · ${t.category} · opened ${formatDate(t.created_at, true)}${t.resolution_hours != null ? ` · resolved in ${t.resolution_hours}h` : ''}`} onClose={onClose}>
      <div className="stack" data-testid="ticket-detail">
        <div className="row wrap" style={{ gap: 8 }}>
          <Select aria-label="Status" value={t.status} onChange={(e) => patch({ status: e.target.value }, 'Status updated')} options={opts(['open', 'in_progress', 'waiting', 'resolved', 'closed'], 'Status').slice(1)} />
          <Select aria-label="Priority" value={t.priority} onChange={(e) => patch({ priority: e.target.value }, 'Priority updated')} options={opts(['low', 'normal', 'high', 'urgent'], 'Priority').slice(1)} />
          <Select aria-label="Assignee" value={t.assignee?.id || ''} onChange={(e) => patch({ assigned_to: e.target.value }, 'Assignee updated')} options={[{ value: '', label: 'Unassigned' }, ...agents.map((a) => ({ value: a.id, label: a.name }))]} />
        </div>
        <ul className="stack ticket-thread">{t.messages.map((m, i) => <li key={i} className={m.staff ? 'is-staff' : ''}><strong>{m.staff ? 'Support' : m.author?.name}</strong> <span className="muted small">{timeAgo(m.created_at)}</span><p>{m.message}</p></li>)}</ul>
        <Textarea label="Reply to user" rows={3} value={reply} onChange={(e) => setReply(e.target.value)} maxLength={4000} />
        <Button loading={busy} disabled={!reply.trim()} onClick={async () => { if (await run(() => api.post(`/admin/support/tickets/${id}/reply`, { message: reply }), 'Reply sent')) setReply(''); }}>Send reply</Button>
        <Card title="Internal notes (not visible to the user)">
          <ul className="small stack" data-testid="ticket-notes">{(t.notes || []).map((n, i) => <li key={i}><strong>{n.author?.name}</strong>: {n.note}</li>)}</ul>
          <Textarea label="Add a note" rows={2} value={note} onChange={(e) => setNote(e.target.value)} maxLength={2000} />
          <Button variant="secondary" disabled={!note.trim()} onClick={async () => { if (await run(() => api.post(`/admin/support/tickets/${id}/notes`, { note }), 'Note added')) setNote(''); }}>Add note</Button>
        </Card>
      </div>
    </Modal>
  );
}

function Tickets() {
  const [f, setF] = useState({ status: '', priority: '', category: '' });
  const [q, setQ, dq] = useSearch();
  const res = usePagedList('/admin/support/tickets', { ...f, q: dq });
  const sum = useAsync(() => api.get('/admin/support/summary'), []);
  const agents = useAsync(() => api.get('/admin/support/agents'), []);
  const [open, setOpen] = useState(null);
  const s = sum.data;
  return (
    <>
      {s && <div className="grid grid-4 ad-stats" data-testid="ticket-summary"><StatCard icon="inbox" tone="warning" label="Open" value={s.by_status.open} /><StatCard icon="clock" label="In progress" value={s.by_status.in_progress} /><StatCard icon="alert" tone="danger" label="Unassigned" value={s.unassigned} /><StatCard icon="check" tone="success" label="Avg resolution" value={s.avg_resolution_hours != null ? `${s.avg_resolution_hours}h` : '-'} /></div>}
      <ListShell res={res} search={q} onSearch={setQ} searchPlaceholder="Search ticket number or subject"
        extraFilters={<>
          <Select aria-label="Filter status" value={f.status} onChange={(e) => setF({ ...f, status: e.target.value })} options={opts(['open', 'in_progress', 'waiting', 'resolved', 'closed'], 'All statuses')} />
          <Select aria-label="Filter priority" value={f.priority} onChange={(e) => setF({ ...f, priority: e.target.value })} options={opts(['low', 'normal', 'high', 'urgent'], 'All priorities')} />
          <Select aria-label="Filter category" value={f.category} onChange={(e) => setF({ ...f, category: e.target.value })} options={opts(['account', 'billing', 'jobs', 'technical', 'recruiting', 'report', 'other'], 'All categories')} />
        </>}
        empty={{ icon: 'inbox', title: 'No tickets', description: 'Support tickets raised by users and recruiters appear here.' }}>
        {(items) => (
          <div className="table-wrap"><table className="table rtable" data-testid="tickets-table">
            <thead><tr><th>Ticket</th><th>From</th><th>Category</th><th>Priority</th><th>Status</th><th>Assignee</th><th>Updated</th></tr></thead>
            <tbody>{items.map((t) => (
              <tr key={t.id}>
                <td data-label="Ticket"><button type="button" className="link-btn" onClick={() => setOpen(t.id)}><strong>{t.ticket_no}</strong> {t.subject}</button></td>
                <td data-label="From">{t.user?.name}</td><td data-label="Category">{t.category}</td>
                <td data-label="Priority"><Badge tone={PR[t.priority]}>{t.priority}</Badge></td><td data-label="Status"><Badge tone={ST[t.status]} dot>{t.status.replace('_', ' ')}</Badge></td>
                <td data-label="Assignee">{t.assignee?.name || '-'}</td><td data-label="Updated">{timeAgo(t.updated_at)}</td>
              </tr>))}</tbody>
          </table></div>
        )}
      </ListShell>
      {open && <TicketModal id={open} agents={agents.data?.items || []} onClose={() => setOpen(null)} onChanged={() => { res.reload(); sum.reload(); }} />}
    </>
  );
}

function Feedback() {
  const [f, setF] = useState({ category: '', status: '' });
  const res = usePagedList('/admin/feedback', f);
  const sum = useAsync(() => api.get('/admin/feedback/summary'), []);
  const [run] = useDo(() => { res.reload(); sum.reload(); });
  const s = sum.data;
  return (
    <>
      {s && <div className="grid grid-4 ad-stats" data-testid="feedback-summary"><StatCard icon="message" label="Total feedback" value={s.total} /><StatCard icon="star" tone="success" label="Average rating" value={s.average_rating ?? '-'} hint={`${s.ratings_count} ratings`} /><StatCard icon="sparkles" label="New" value={s.by_status.new || 0} /></div>}
      <ListShell res={res}
        extraFilters={<>
          <Select aria-label="Feedback category" value={f.category} onChange={(e) => setF({ ...f, category: e.target.value })} options={opts(['bug', 'idea', 'praise', 'feature_request', 'other'], 'All categories')} />
          <Select aria-label="Feedback status" value={f.status} onChange={(e) => setF({ ...f, status: e.target.value })} options={opts(['new', 'reviewing', 'planned', 'done', 'declined'], 'All statuses')} />
        </>}
        filtersRight={<DownloadBtn path="/admin/feedback/export" filename="feedback.csv">Export CSV</DownloadBtn>}
        empty={{ icon: 'message', title: 'No feedback yet', description: 'Feedback submitted from the Help centre shows up here.' }}>
        {(items) => (
          <div className="table-wrap"><table className="table rtable" data-testid="feedback-table">
            <thead><tr><th>From</th><th>Category</th><th>Rating</th><th>Message</th><th>Status</th></tr></thead>
            <tbody>{items.map((x) => (
              <tr key={x.id}><td data-label="From">{x.user?.name}</td><td data-label="Category">{x.category}</td><td data-label="Rating">{x.rating ? `${x.rating}/5` : '-'}</td><td data-label="Message">{x.message}</td>
                <td data-label="Status"><Select aria-label={`Status of feedback from ${x.user?.name}`} value={x.status || 'new'} onChange={(e) => run(() => api.patch(`/admin/feedback/${x.id}`, { status: e.target.value }), 'Feedback updated')} options={opts(['new', 'reviewing', 'planned', 'done', 'declined'], '').slice(1)} /></td></tr>))}</tbody>
          </table></div>
        )}
      </ListShell>
    </>
  );
}

export default function Support() {
  const [tab, setTab] = useState('tickets');
  return (
    <>
      <PageHeader title="Support & feedback" description="Tickets raised by users and recruiters, and product feedback." />
      <Tabs value={tab} onChange={setTab} tabs={[{ value: 'tickets', label: 'Tickets' }, { value: 'feedback', label: 'Feedback' }]} />
      {tab === 'tickets' ? <Tickets /> : <Feedback />}
    </>
  );
}
