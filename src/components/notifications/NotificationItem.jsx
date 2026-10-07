import { Bell, Briefcase, CalendarDays, FileText, MessageSquare } from 'lucide-react';
import { cn, timeAgo } from '../../utils/helpers';

const TYPE_ICONS = {
  job: Briefcase,
  application: FileText,
  interview: CalendarDays,
  message: MessageSquare,
  system: Bell,
};

export const NOTIFICATION_TYPE_LABELS = {
  job: 'Job update',
  application: 'Application update',
  interview: 'Interview update',
  message: 'Message',
  system: 'System',
};

export default function NotificationItem({ notification, onRead, compact = false }) {
  const Icon = TYPE_ICONS[notification.type] ?? Bell;
  return (
    <button
      type="button"
      onClick={() => !notification.isRead && onRead?.(notification.id)}
      className={cn(
        'flex w-full items-start gap-3 rounded-xl text-left transition-colors hover:bg-surface-2',
        compact ? 'px-3 py-2.5' : 'border border-border bg-surface p-4',
        !notification.isRead && 'bg-brand/5',
      )}
    >
      <span className="mt-0.5 flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-brand/10 text-brand">
        <Icon className="h-4 w-4" aria-hidden />
      </span>
      <span className="min-w-0 flex-1">
        <span className="block text-xs font-medium text-muted">{NOTIFICATION_TYPE_LABELS[notification.type] ?? 'Notification'}</span>
        <span className="block text-sm font-medium">{notification.title || notification.message}</span>
        {notification.title && notification.message && (
          <span className="mt-0.5 line-clamp-2 block text-sm text-muted">{notification.message}</span>
        )}
        <span className="mt-1 block text-xs text-muted">{timeAgo(notification.createdAt)}</span>
      </span>
      {!notification.isRead && <span className="mt-2 h-2 w-2 shrink-0 rounded-full bg-brand" aria-label="Unread" />}
    </button>
  );
}
