import { cn, timeAgo } from '../../utils/helpers';
import Avatar from '../ui/Avatar';

export default function ConversationList({ conversations, activeUserId, onSelect }) {
  return (
    <ul className="divide-y divide-border">
      {conversations.map((conversation) => (
        <li key={conversation.userId}>
          <button
            type="button"
            onClick={() => onSelect(conversation)}
            className={cn(
              'flex w-full items-center gap-3 px-4 py-3 text-left transition-colors hover:bg-surface-2',
              activeUserId === conversation.userId && 'bg-brand/5',
            )}
          >
            <Avatar src={conversation.image} name={conversation.name} />
            <span className="min-w-0 flex-1">
              <span className="flex items-center justify-between gap-2">
                <span className="truncate text-sm font-semibold">{conversation.name}</span>
                <span className="shrink-0 text-xs text-muted">{timeAgo(conversation.updatedAt)}</span>
              </span>
              <span className="block truncate text-sm text-muted">{conversation.lastMessage}</span>
            </span>
            {conversation.unread > 0 && (
              <span className="flex h-5 min-w-5 items-center justify-center rounded-full bg-brand px-1.5 text-[11px] font-semibold text-white">
                {conversation.unread}
              </span>
            )}
          </button>
        </li>
      ))}
    </ul>
  );
}
