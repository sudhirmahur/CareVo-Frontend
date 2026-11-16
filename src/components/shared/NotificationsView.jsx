import { useState } from 'react';
import { api, errorMessage } from '../../lib/api';
import { useAsync } from '../../lib/hooks';
import { useNavigate } from '../../lib/router';
import { useToast } from '../../lib/toast';
import { resolveLink, timeAgo } from '../../lib/format';
import { Button, Card, DataState, IconButton, Pagination, Tabs } from '../ui';
import Icon from '../Icon';

const ICONS = { job: 'briefcase', application: 'clipboard', message: 'message', system: 'bell' };

export default function NotificationsView({ role, onChange }) {
  const toast = useToast();
  const navigate = useNavigate();
  const [tab, setTab] = useState('all');
  const [page, setPage] = useState(1);
  const { data, loading, error, reload } = useAsync(() => api.get('/notifications', { unread: tab === 'unread', page, limit: 15 }), [tab, page]);

  const items = data?.items || [];
  const act = async (fn) => {
    try {
      await fn();
      await reload();
      onChange?.();
    } catch (e) {
      toast.error(errorMessage(e));
    }
  };
  const open = (n) => {
    if (!n.is_read) api.patch(`/notifications/${n.id}/read`).then(() => onChange?.()).catch(() => {});
    const to = resolveLink(role, n.link);
    if (to) navigate(to);
    else reload();
  };
  return (
    <div>
      <div className="row between" style={{ flexWrap: 'wrap', gap: 8 }}>
        <Tabs value={tab} onChange={(v) => { setTab(v); setPage(1); }} tabs={[{ value: 'all', label: 'All' }, { value: 'unread', label: 'Unread', count: data?.unread_count }]} />
        <Button variant="secondary" size="sm" icon="check" onClick={() => act(() => api.post('/notifications/read-all'))} disabled={!data?.unread_count}>Mark all read</Button>
      </div>
      <Card padded={false}>
        <DataState loading={loading} error={error} onRetry={reload} hasData={!!data} isEmpty={items.length === 0} empty={{ icon: 'bell', title: tab === 'unread' ? 'You are all caught up' : 'No notifications yet', description: 'Updates about applications, jobs and messages will appear here.' }}>
          {items.map((n) => (
            <div key={n.id} className={`notif ${n.is_read ? '' : 'unread'}`}>
              <span className="notif-icon"><Icon name={ICONS[n.type] || 'bell'} size={18} /></span>
              <div className="grow" style={{ cursor: n.link ? 'pointer' : 'default' }} onClick={() => open(n)} role={n.link ? 'link' : undefined}>
                <p className="notif-title">{n.title}</p>
                <p className="muted">{n.message}</p>
                <p className="muted small">{timeAgo(n.created_at)}</p>
              </div>
              {!n.is_read && <IconButton icon="check" label="Mark as read" onClick={() => act(() => api.patch(`/notifications/${n.id}/read`))} />}
              <IconButton icon="trash" label="Delete notification" className="icon-btn-danger" onClick={() => act(() => api.delete(`/notifications/${n.id}`))} />
            </div>
          ))}
        </DataState>
      </Card>
      <Pagination page={data?.page || 1} pages={data?.pages} onChange={setPage} />
    </div>
  );
}
