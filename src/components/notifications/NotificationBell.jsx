import { Link } from 'react-router-dom';
import { Bell } from 'lucide-react';
import useNotifications from '../../hooks/useNotifications';
import Dropdown from '../ui/Dropdown';
import Loader from '../ui/Loader';
import NotificationItem from './NotificationItem';

export default function NotificationBell() {
  const { notifications, unreadCount, loading, error, notAvailable, markRead, markAllRead } = useNotifications();

  return (
    <Dropdown
      panelClassName="w-[min(22rem,calc(100vw-2rem))] p-0"
      trigger={({ toggle }) => (
        <button
          type="button"
          onClick={toggle}
          aria-label={unreadCount ? `Notifications, ${unreadCount} unread` : 'Notifications'}
          className="relative flex h-10 w-10 items-center justify-center rounded-xl text-muted transition-colors hover:bg-surface-2 hover:text-fg"
        >
          <Bell className="h-5 w-5" />
          {unreadCount > 0 && (
            <span className="absolute right-1.5 top-1.5 flex h-4 min-w-4 items-center justify-center rounded-full bg-brand px-1 text-[10px] font-semibold text-white">
              {unreadCount > 9 ? '9+' : unreadCount}
            </span>
          )}
        </button>
      )}
    >
      {({ close }) => (
        <div>
          <div className="flex items-center justify-between border-b border-border px-4 py-3">
            <p className="text-sm font-semibold">Notifications</p>
            {unreadCount > 0 && (
              <button type="button" onClick={markAllRead} className="text-xs font-medium text-brand hover:underline">
                Mark all read
              </button>
            )}
          </div>
          <div className="max-h-96 overflow-y-auto p-1.5">
            {loading && (
              <div className="flex justify-center py-8">
                <Loader />
              </div>
            )}
            {!loading && (notAvailable || error) && (
              <p className="px-3 py-8 text-center text-sm text-muted">
                {notAvailable ? 'Notifications are coming soon.' : 'Could not load notifications.'}
              </p>
            )}
            {!loading && !error && !notAvailable && notifications.length === 0 && (
              <p className="px-3 py-8 text-center text-sm text-muted">You are all caught up.</p>
            )}
            {!loading &&
              notifications.slice(0, 6).map((notification) => (
                <NotificationItem key={notification.id} notification={notification} onRead={markRead} compact />
              ))}
          </div>
          <Link to="/notifications" onClick={close} className="block border-t border-border px-4 py-3 text-center text-sm font-medium text-brand hover:bg-surface-2">
            View all
          </Link>
        </div>
      )}
    </Dropdown>
  );
}
