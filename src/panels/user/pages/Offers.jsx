import { useState } from 'react';
import { api, errorMessage } from '../../../lib/api';
import { formatDate } from '../../../lib/format';
import { useAsync } from '../../../lib/hooks';
import { useToast } from '../../../lib/toast';
import { Badge, Button, Card, DataState, Modal, PageHeader, Textarea } from '../../../components/ui';
import { downloadAuthed } from './_files';

const TONE = { sent: 'warning', accepted: 'success', declined: 'danger', withdrawn: 'neutral', expired: 'neutral' };

function Detail({ id, onClose, onChanged }) {
  const toast = useToast();
  const { data: o, loading, error, reload } = useAsync(() => api.get(`/me/offers/${id}`), [id]);
  const [decision, setDecision] = useState(null);
  const [note, setNote] = useState('');
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState('');
  const respond = async () => {
    setBusy(true); setErr('');
    try { await api.post(`/me/offers/${id}/respond`, { decision, note: note.trim() || null }); toast.success(decision === 'accept' ? 'Offer accepted - congratulations!' : 'Offer declined'); setDecision(null); await reload(); onChanged(); } catch (e) { setErr(errorMessage(e)); } finally { setBusy(false); }
  };
  const pdf = async () => { try { await downloadAuthed(`/me/offers/${id}/pdf`, `offer-${id.slice(-6)}.pdf`); } catch (e) { toast.error(errorMessage(e)); } };
  return (
    <Modal title={o ? `Offer: ${o.designation}` : 'Offer'} description={o?.company_name} onClose={onClose}
      footer={o && <>
        <Button variant="secondary" icon="download" onClick={pdf}>Download PDF</Button>
        {o.status === 'sent' && !decision && <><Button variant="danger" onClick={() => setDecision('decline')}>Decline</Button><Button onClick={() => setDecision('accept')}>Accept offer</Button></>}
      </>}>
      <DataState loading={loading} error={error} onRetry={reload} hasData={!!o}>
        {o && (
          <div className="stack">
            <div className="row"><Badge tone={TONE[o.status]} dot>{o.status}</Badge><strong>{o.salary_text}</strong>{o.expires_at && o.status === 'sent' && <span className="muted small">Respond by {formatDate(o.expires_at)}</span>}</div>
            <pre className="offer-letter" data-testid="offer-letter">{o.letter}</pre>
            {decision && (
              <div className="stack" data-testid="offer-respond">
                <p><strong>{decision === 'accept' ? 'Accept this offer?' : 'Decline this offer?'}</strong> This cannot be changed afterwards.</p>
                <Textarea label="Note to the recruiter (optional)" rows={2} maxLength={500} value={note} onChange={(e) => setNote(e.target.value)} />
                {err && <p className="form-error" role="alert">{err}</p>}
                <div className="row"><Button variant="ghost" onClick={() => setDecision(null)}>Back</Button><Button variant={decision === 'accept' ? 'primary' : 'danger'} loading={busy} onClick={respond}>Confirm {decision}</Button></div>
              </div>
            )}
            {!decision && err && <p className="form-error" role="alert">{err}</p>}
            {o.response_note && <p className="muted small">Your note: {o.response_note}</p>}
            <div><p className="label-like">History</p><ul className="offer-hist" data-testid="offer-history">{(o.history || []).map((h, i) => <li key={i}><Badge tone={TONE[h.status] || 'neutral'}>{h.status}</Badge> <span className="muted small">{formatDate(h.at, true)}</span></li>)}</ul></div>
          </div>
        )}
      </DataState>
    </Modal>
  );
}

export default function Offers() {
  const { data, loading, error, reload } = useAsync(() => api.get('/me/offers'), []);
  const [open, setOpen] = useState(null);
  const items = data?.items || [];
  return (
    <>
      <PageHeader title="Job offers" description="Offers from companies appear here. Review, download and respond." />
      <DataState loading={loading} error={error} onRetry={reload} hasData={!!data} isEmpty={items.length === 0} empty={{ icon: 'award', title: 'No offers yet', description: 'When a recruiter sends you an offer letter it will show up here.' }}>
        <Card padded={false}>
          <ul className="u-list" data-testid="offer-list">{items.map((o) => (
            <li key={o.id}>
              <div className="grow"><strong>{o.designation}</strong><p className="muted small">{o.company_name} · {o.salary_text} · sent {formatDate(o.sent_at)}</p></div>
              <Badge tone={TONE[o.status]} dot>{o.status}</Badge>
              <Button size="sm" variant="secondary" onClick={() => setOpen(o.id)} aria-label={`View offer ${o.designation}`}>View</Button>
            </li>
          ))}</ul>
        </Card>
      </DataState>
      {open && <Detail id={open} onClose={() => setOpen(null)} onChanged={reload} />}
    </>
  );
}
