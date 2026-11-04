import { useCallback, useEffect, useState } from 'react';
import { api } from '../../lib/api';
import { usePolling } from '../../lib/hooks';
import { Link } from '../../lib/router';
import Icon from '../Icon';

/** Bell with unread badge; links to the panel's notifications page. */
export default function NotificationBell({ to, className = 'icon-btn' }) {
  const [count, setCount] = useState(0);
  const load = useCallback(() => api.get('/notifications/unread-count').then((r) => setCount(r.count)).catch(() => {}), []);
  useEffect(() => { load(); }, [load]);
  usePolling(load, 20000);
  useEffect(() => {
    window.addEventListener('carevo:notifications', load);
    return () => window.removeEventListener('carevo:notifications', load);
  }, [load]);
  return (
    <Link to={to} className={className} aria-label={count ? `Notifications (${count} unread)` : 'Notifications'}>
      <Icon name="bell" size={20} />
      {count > 0 && <span className="bell-dot" data-testid="bell-count">{count > 9 ? '9+' : count}</span>}
    </Link>
  );
}
export const refreshBell = () => window.dispatchEvent(new Event('carevo:notifications'));
