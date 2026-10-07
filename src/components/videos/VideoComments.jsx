import { useCallback, useState } from 'react';
import { Send } from 'lucide-react';
import { getErrorMessage } from '../../api/errors';
import { videoApi } from '../../api/video.api';
import useApi from '../../hooks/useApi';
import useToast from '../../hooks/useToast';
import { getId, timeAgo, unwrapList } from '../../utils/helpers';
import DataState from '../common/DataState';
import Avatar from '../ui/Avatar';
import Button from '../ui/Button';
import Modal from '../ui/Modal';
import { SkeletonList } from '../ui/Skeleton';

/** Mount only while open so comments load on demand. Comments API is planned. */
export default function VideoComments({ video, onClose }) {
  const toast = useToast();
  const request = useCallback(() => videoApi.listComments(video.id), [video.id]);
  const { data, loading, error, notAvailable, reload } = useApi(request);
  const comments = unwrapList(data);
  const [text, setText] = useState('');
  const [sending, setSending] = useState(false);

  const submit = async (event) => {
    event.preventDefault();
    if (!text.trim()) return;
    setSending(true);
    try {
      await videoApi.addComment(video.id, text.trim());
      setText('');
      await reload();
    } catch (err) {
      toast.error(getErrorMessage(err));
    } finally {
      setSending(false);
    }
  };

  return (
    <Modal open onClose={onClose} title="Comments" description={video.title || undefined}>
      <DataState
        loading={loading}
        error={error}
        notAvailable={notAvailable}
        onRetry={reload}
        skeleton={<SkeletonList count={2} lines={1} />}
        comingSoon={{ title: 'Comments are coming soon.' }}
        isEmpty={comments.length === 0}
        empty={{ title: 'No comments yet', description: 'Be the first to share your thoughts.', className: 'py-8' }}
      >
        <ul className="space-y-4">
          {comments.map((comment, index) => (
            <li key={getId(comment) ?? index} className="flex gap-3">
              <Avatar src={comment.user?.profile_image} name={comment.user?.name ?? comment.user_name} size="sm" />
              <div className="min-w-0">
                <p className="text-sm">
                  <span className="font-semibold">{comment.user?.name ?? comment.user_name ?? 'Member'}</span>{' '}
                  <span className="text-xs text-muted">{timeAgo(comment.created_at)}</span>
                </p>
                <p className="whitespace-pre-wrap break-words text-sm text-muted">{comment.text ?? comment.content}</p>
              </div>
            </li>
          ))}
        </ul>
      </DataState>

      {!notAvailable && (
        <form onSubmit={submit} className="mt-5 flex gap-2 border-t border-border pt-4">
          <input
            value={text}
            onChange={(event) => setText(event.target.value)}
            placeholder="Add a comment"
            aria-label="Add a comment"
            className="h-11 min-w-0 flex-1 rounded-xl border border-border bg-surface-2/60 px-3.5 text-sm focus:border-brand focus:outline-none focus:ring-2 focus:ring-brand/30"
          />
          <Button type="submit" size="icon" loading={sending} disabled={!text.trim()} aria-label="Post comment">
            <Send className="h-4 w-4" />
          </Button>
        </form>
      )}
    </Modal>
  );
}
