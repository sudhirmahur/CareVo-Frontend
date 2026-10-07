import { Bell, CheckCheck } from 'lucide-react';
import DataState from '../../components/common/DataState';
import PageHeader from '../../components/common/PageHeader';
import NotificationItem from '../../components/notifications/NotificationItem';
import Button from '../../components/ui/Button';
import useNotifications from '../../hooks/useNotifications';

export default function Notifications() {
  const { notifications, unreadCount, loading, error, notAvailable, reload, markRead, markAllRead } = useNotifications();

  return (
    <>
      <PageHeader
        title="Notifications"
        description="Updates on jobs, applications, interviews and messages."
        actions={
          unreadCount > 0 && (
            <Button variant="secondary" size="sm" leftIcon={CheckCheck} onClick={markAllRead}>
              Mark all as read
            </Button>
          )
        }
      />
      <DataState
        loading={loading}
        error={error}
        notAvailable={notAvailable}
        onRetry={reload}
        comingSoon={{ icon: Bell, title: 'Notifications are coming soon.' }}
        isEmpty={notifications.length === 0}
        empty={{ icon: Bell, title: 'You are all caught up', description: 'New updates will appear here.' }}
      >
        <div className="grid gap-2.5">
          {notifications.map((notification) => (
            <NotificationItem key={notification.id} notification={notification} onRead={markRead} />
          ))}
        </div>
      </DataState>
    </>
  );
}
