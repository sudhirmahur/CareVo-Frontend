import { useState } from 'react';
import { api, errorMessage, safeHref } from '../../../lib/api';
import { formatDate } from '../../../lib/format';
import { useAsync } from '../../../lib/hooks';
import { useToast } from '../../../lib/toast';
import Icon from '../../../components/Icon';
import { Badge, Button, Card, DataState, PageHeader, Tabs } from '../../../components/ui';

function EventCard({ e, onChange, past }) {
  const toast = useToast();
  const [busy, setBusy] = useState(false);
  const act = async (fn, msg) => { setBusy(true); try { await fn(); toast.success(msg); await onChange(); } catch (x) { toast.error(errorMessage(x)); } finally { setBusy(false); } };
  return (
    <article className="u-event" data-testid="event-card">
      <div className="u-event-top"><Badge tone="info">{e.type.replace('_', ' ')}</Badge>{e.registered && <Badge tone="success" dot>Registered</Badge>}{e.full && !e.registered && <Badge tone="warning">Full</Badge>}</div>
      <h3>{e.title}</h3>
      <p className="muted small"><Icon name="calendar" size={14} /> {formatDate(e.starts_at, true)}{e.host ? ` · ${e.host}` : ''}{e.location ? ` · ${e.location}` : ''}</p>
      {e.description && <p className="u-event-desc">{e.description}</p>}
      <p className="muted small">{e.registrations} registered{e.capacity ? ` of ${e.capacity}` : ''}</p>
      <div className="row">
        {!past && !e.registered && <Button size="sm" disabled={e.full} loading={busy} onClick={() => act(() => api.post(`/events/${e.id}/register`), 'You are registered')}>Register</Button>}
        {!past && e.registered && <Button size="sm" variant="secondary" loading={busy} onClick={() => act(() => api.delete(`/events/${e.id}/register`), 'Registration cancelled')}>Cancel registration</Button>}
        {e.registered && safeHref(e.join_url) && <a className="btn btn-primary btn-sm" href={safeHref(e.join_url)} target="_blank" rel="noopener noreferrer"><Icon name="external" size={15} /><span>Join link</span></a>}
      </div>
    </article>
  );
}

export default function Events() {
  const [tab, setTab] = useState('upcoming');
  const list = useAsync(() => (tab === 'mine' ? api.get('/events/mine') : api.get('/events', { when: tab, limit: 50 })), [tab]);
  const d = list.data;
  const items = tab === 'mine' ? null : d?.items || [];
  const mineUp = d?.upcoming || [], mineDone = d?.completed || [];
  const empty = tab === 'mine' ? !mineUp.length && !mineDone.length : !items?.length;
  return (
    <>
      <PageHeader title="Career events & webinars" description="Learn from experts and meet recruiters. Register to get the join link and a reminder." />
      <Tabs value={tab} onChange={setTab} tabs={[{ value: 'upcoming', label: 'Upcoming' }, { value: 'mine', label: 'My events' }, { value: 'past', label: 'Past' }]} />
      <DataState loading={list.loading} error={list.error} onRetry={list.reload} hasData={!!d} isEmpty={empty} empty={{ icon: 'calendar', title: tab === 'mine' ? 'You have not registered for any event' : 'No events here', description: 'Check back soon for new webinars and workshops.' }}>
        {tab === 'mine' ? (
          <div className="stack">
            {mineUp.length > 0 && <><h2 className="h-sm">Upcoming</h2><div className="u-events" data-testid="my-upcoming">{mineUp.map((e) => <EventCard key={e.id} e={e} onChange={list.reload} />)}</div></>}
            {mineDone.length > 0 && <><h2 className="h-sm">Completed</h2><div className="u-events" data-testid="my-completed">{mineDone.map((e) => <EventCard key={e.id} e={e} past onChange={list.reload} />)}</div></>}
          </div>
        ) : <div className="u-events">{items.map((e) => <EventCard key={e.id} e={e} past={tab === 'past'} onChange={list.reload} />)}</div>}
      </DataState>
    </>
  );
}
