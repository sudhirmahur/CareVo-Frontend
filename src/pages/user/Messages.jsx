import { useCallback, useMemo, useState } from 'react';
import { MessageSquare } from 'lucide-react';
import { messageApi } from '../../api/message.api';
import DataState from '../../components/common/DataState';
import PageHeader from '../../components/common/PageHeader';
import ChatPanel from '../../components/messages/ChatPanel';
import ConversationList from '../../components/messages/ConversationList';
import Card from '../../components/ui/Card';
import EmptyState from '../../components/ui/EmptyState';
import useApi from '../../hooks/useApi';
import { cn, unwrapList } from '../../utils/helpers';
import { normalizeConversation } from '../../utils/normalizers';

export default function Messages() {
  const request = useCallback(() => messageApi.listConversations(), []);
  const { data, loading, error, notAvailable, reload } = useApi(request);
  const conversations = useMemo(() => unwrapList(data).map(normalizeConversation), [data]);
  const [active, setActive] = useState(null);

  // TODO: open a WebSocket here (e.g. src/api/socket.js) to push new messages into
  // the list and ChatPanel. Until then messages load over REST only.
  return (
    <>
      <PageHeader title="Messages" description="Talk directly with recruiters and candidates." />
      <DataState
        loading={loading}
        error={error}
        notAvailable={notAvailable}
        onRetry={reload}
        comingSoon={{
          icon: MessageSquare,
          title: 'Messaging is coming soon.',
          description: 'Conversations with recruiters will appear here.',
        }}
        isEmpty={conversations.length === 0}
        empty={{ icon: MessageSquare, title: 'No conversations yet', description: 'Messages from recruiters will show up here.' }}
      >
        <Card padded={false} className="grid h-[calc(100dvh-14rem)] min-h-[28rem] overflow-hidden md:grid-cols-[20rem_1fr]">
          <div className={cn('overflow-y-auto border-border md:border-r', active && 'hidden md:block')}>
            <ConversationList conversations={conversations} activeUserId={active?.userId} onSelect={setActive} />
          </div>
          <div className={cn('min-h-0', !active && 'hidden md:block')}>
            {active ? (
              <ChatPanel conversation={active} onBack={() => setActive(null)} />
            ) : (
              <EmptyState icon={MessageSquare} title="Select a conversation" className="h-full rounded-none border-0 bg-transparent" />
            )}
          </div>
        </Card>
      </DataState>
    </>
  );
}
