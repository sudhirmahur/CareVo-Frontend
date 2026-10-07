import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { ArrowLeft, Send } from 'lucide-react';
import { getErrorMessage } from '../../api/errors';
import { messageApi } from '../../api/message.api';
import useApi from '../../hooks/useApi';
import useAuth from '../../hooks/useAuth';
import useToast from '../../hooks/useToast';
import { cn, getId, formatTime, unwrapList } from '../../utils/helpers';
import DataState from '../common/DataState';
import Avatar from '../ui/Avatar';
import Button from '../ui/Button';
import { SkeletonList } from '../ui/Skeleton';

/**
 * One conversation. History is fetched over REST; a sent message is appended
 * only after the server confirms it (no optimistic fake delivery).
 * TODO: subscribe to a WebSocket here for live incoming messages.
 */
export default function ChatPanel({ conversation, onBack }) {
  const { user } = useAuth();
  const toast = useToast();
  const [draft, setDraft] = useState('');
  const [sending, setSending] = useState(false);
  const [extra, setExtra] = useState([]);
  const bottomRef = useRef(null);

  const request = useCallback(() => messageApi.getThread(conversation.userId), [conversation.userId]);
  const { data, loading, error, notAvailable, reload } = useApi(request);

  useEffect(() => setExtra([]), [conversation.userId]);

  const messages = useMemo(() => [...unwrapList(data), ...extra], [data, extra]);
  useEffect(() => bottomRef.current?.scrollIntoView({ block: 'end' }), [messages.length]);

  const send = async (event) => {
    event.preventDefault();
    const text = draft.trim();
    if (!text) return;
    setSending(true);
    try {
      const saved = await messageApi.send({ recipientId: conversation.userId, text });
      setExtra((list) => [...list, saved?.text ? saved : { text, sender_id: user.id, created_at: new Date().toISOString() }]);
      setDraft('');
    } catch (err) {
      toast.error(getErrorMessage(err));
    } finally {
      setSending(false);
    }
  };

  return (
    <div className="flex h-full min-h-0 flex-col">
      <div className="flex items-center gap-3 border-b border-border px-4 py-3">
        <button type="button" onClick={onBack} aria-label="Back to conversations" className="rounded-lg p-1.5 text-muted hover:bg-surface-2 md:hidden">
          <ArrowLeft className="h-5 w-5" />
        </button>
        <Avatar src={conversation.image} name={conversation.name} size="sm" />
        <p className="text-sm font-semibold">{conversation.name}</p>
      </div>

      <div className="min-h-0 flex-1 overflow-y-auto p-4">
        <DataState
          loading={loading}
          error={error}
          notAvailable={notAvailable}
          onRetry={reload}
          skeleton={<SkeletonList count={2} lines={1} />}
          isEmpty={messages.length === 0}
          empty={{ title: 'No messages yet', description: 'Say hello to start the conversation.' }}
        >
          <ul className="space-y-2">
            {messages.map((message, index) => {
              const mine = (message.sender_id ?? message.from_user_id) === user.id;
              return (
                <li key={getId(message) ?? index} className={cn('flex', mine ? 'justify-end' : 'justify-start')}>
                  <div className={cn('max-w-[80%] rounded-2xl px-3.5 py-2 text-sm', mine ? 'bg-brand text-white' : 'bg-surface-2')}>
                    <p className="whitespace-pre-wrap break-words">{message.text ?? message.content}</p>
                    <p className={cn('mt-1 text-[10px]', mine ? 'text-white/70' : 'text-muted')}>{formatTime(message.created_at)}</p>
                  </div>
                </li>
              );
            })}
          </ul>
          <div ref={bottomRef} />
        </DataState>
      </div>

      <form onSubmit={send} className="flex gap-2 border-t border-border p-3">
        <input
          value={draft}
          onChange={(event) => setDraft(event.target.value)}
          placeholder="Write a message"
          aria-label="Message"
          className="h-11 min-w-0 flex-1 rounded-xl border border-border bg-surface-2/60 px-3.5 text-sm focus:border-brand focus:outline-none focus:ring-2 focus:ring-brand/30"
        />
        <Button type="submit" size="icon" loading={sending} disabled={!draft.trim()} aria-label="Send message">
          <Send className="h-4 w-4" />
        </Button>
      </form>
    </div>
  );
}
