import { useCallback, useEffect, useRef, useState } from 'react';
import { api, assetUrl, uploadMedia } from '../../lib/api';
import { useAsync, usePolling } from '../../lib/hooks';
import { useSearchParams } from '../../lib/router';
import { useToast } from '../../lib/toast';
import { errorMessage } from '../../lib/api';
import { timeAgo, titleCase } from '../../lib/format';
import { Avatar, Button, ConfirmDialog, DataState, EmptyState, IconButton, Spinner } from '../ui';
import { kindOf } from './MediaUpload';
import Icon from '../Icon';
import ReportModal from './ReportModal';

/** 1-to-1 chat. Open a thread directly with  /messages?with=<userId>. Polls every 8s. */
export default function ChatView({ myId }) {
  const toast = useToast();
  const [params, setParams] = useSearchParams();
  const peerId = params.get('with') || '';
  const convs = useAsync(() => api.get('/messages/conversations'), []);
  const [thread, setThread] = useState([]);
  const [peer, setPeer] = useState(null);
  const [text, setText] = useState('');
  const [sending, setSending] = useState(false);
  const [reportOpen, setReportOpen] = useState(false);
  const [confirmBlock, setConfirmBlock] = useState(false);
  const bodyRef = useRef(null);
  const fileRef = useRef(null);
  const [attach, setAttach] = useState(null);
  const [uploading, setUploading] = useState(false);

  const pickFile = async (e) => {
    const file = e.target.files?.[0];
    e.target.value = '';
    if (!file) return;
    const kind = kindOf(file);
    const limit = { image: 8, audio: 15, video: 50 }[kind];
    if (!['image', 'audio', 'video'].includes((file.type || '').split('/')[0])) return toast.error('Choose an image, audio or video file.');
    if (file.size > limit * 1024 * 1024) return toast.error(`${kind[0].toUpperCase()}${kind.slice(1)} files must be ${limit} MB or smaller.`);
    setUploading(true);
    try {
      const r = await uploadMedia(file, 'chat');
      setAttach({ url: r.url, kind: r.kind, name: r.name });
    } catch (err) {
      toast.error(errorMessage(err));
    } finally {
      setUploading(false);
    }
  };

  const loadThread = useCallback(async () => {
    if (!peerId) return;
    try {
      const [t, p] = await Promise.all([api.get(`/messages/with/${peerId}`), api.get(`/messages/peer/${peerId}`)]);
      setThread(t.items);
      setPeer(p);
    } catch (e) {
      toast.error(errorMessage(e));
    }
  }, [peerId, toast]);

  useEffect(() => {
    setThread([]);
    setPeer(null);
    loadThread().then(() => convs.reload());
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [peerId]);
  usePolling(() => { loadThread(); convs.reload(); }, 8000, true);
  useEffect(() => {
    if (bodyRef.current) bodyRef.current.scrollTop = bodyRef.current.scrollHeight;
  }, [thread.length]);

  const send = async (e) => {
    e.preventDefault();
    const msg = text.trim();
    if ((!msg && !attach) || !peerId) return;
    setSending(true);
    try {
      const m = await api.post('/messages', { receiver_id: peerId, message: msg, attachment: attach || undefined });
      setThread((t) => [...t, m]);
      setText('');
      setAttach(null);
      convs.reload();
    } catch (err) {
      toast.error(errorMessage(err));
    } finally {
      setSending(false);
    }
  };

  const blockPeer = async () => {
    try {
      await api.post('/account/blocks', { user_id: peerId });
      toast.success(`${peer?.name || 'User'} is blocked. They can no longer message you.`);
      setConfirmBlock(false);
      setParams({ with: '' }, { keepScroll: true });
      convs.reload();
    } catch (err) {
      toast.error(errorMessage(err));
    }
  };

  const items = convs.data?.items || [];
  // a brand-new thread (not in the list yet) still shows the header via /peer
  return (
    <div className={`chat ${peerId ? 'has-peer' : ''}`}>
      <aside className="chat-list" aria-label="Conversations">
        <DataState loading={convs.loading} error={convs.error} onRetry={convs.reload} hasData={!!convs.data} isEmpty={items.length === 0 && !peerId} empty={{ icon: 'message', title: 'No conversations yet', description: 'Message a recruiter or candidate from a job or application.' }}>
          {items.map((c) => (
            <button key={c.peer.id} type="button" className={`chat-item ${c.peer.id === peerId ? 'active' : ''}`} onClick={() => setParams({ with: c.peer.id }, { keepScroll: true })}>
              <Avatar name={c.peer.name} src={c.peer.profile_image} size={42} />
              <span className="grow">
                <span className="row between"><span className="name truncate">{c.peer.name}</span><span className="muted small">{timeAgo(c.last_at)}</span></span>
                <span className="row between">
                  <span className="muted small truncate">{c.last_from_me ? 'You: ' : ''}{c.last_message}</span>
                  {c.unread > 0 && <span className="chat-unread">{c.unread}</span>}
                </span>
              </span>
            </button>
          ))}
        </DataState>
      </aside>
      <section className="chat-main">
        {!peerId ? (
          <EmptyState icon="message" title="Select a conversation" description="Pick someone from the list to start chatting." />
        ) : (
          <>
            <div className="chat-head">
              <IconButton icon="chevronLeft" label="Back to conversations" className="chat-back" onClick={() => setParams({ with: '' }, { keepScroll: true })} />
              <Avatar name={peer?.name || '?'} src={peer?.profile_image} size={38} />
              <div>
                <strong>{peer?.name || 'Loading…'}</strong>
                <p className="muted small">{peer ? `${titleCase(peer.role)}${peer.company_name ? ` · ${peer.company_name}` : ''}` : ''}</p>
              </div>
              <div className="chat-head-actions">
                <IconButton icon="flag" label="Report this conversation" onClick={() => setReportOpen(true)} />
                <IconButton icon="ban" label="Block this user" onClick={() => setConfirmBlock(true)} />
              </div>
            </div>
            <div className="chat-body" ref={bodyRef} aria-live="polite">
              {thread.length === 0 && <p className="muted small" style={{ margin: 'auto' }}>No messages yet. Say hello!</p>}
              {thread.map((m) => (
                <div key={m.id} className={`bubble ${m.sender_id === myId ? 'mine' : ''}`}>
                  {m.attachment && (
                    <div className="bubble-media">
                      {m.attachment.kind === 'image' && <a href={assetUrl(m.attachment.url)} target="_blank" rel="noopener noreferrer"><img src={assetUrl(m.attachment.url)} alt={m.attachment.name || 'Image attachment'} loading="lazy" /></a>}
                      {m.attachment.kind === 'audio' && <audio src={assetUrl(m.attachment.url)} controls preload="none" aria-label="Audio message" />}
                      {m.attachment.kind === 'video' && <video src={assetUrl(m.attachment.url)} controls preload="metadata" playsInline aria-label="Video message" />}
                    </div>
                  )}
                  {m.message}
                  <small>{timeAgo(m.created_at)}</small>
                </div>
              ))}
            </div>
            {(attach || uploading) && (
              <div className="chat-attach" role="status">
                {uploading ? <><Spinner size={16} /> Uploading…</> : <><Icon name={attach.kind === 'image' ? 'file' : attach.kind === 'audio' ? 'volume' : 'video'} size={16} /> <span className="truncate">{attach.name || attach.kind}</span><IconButton icon="x" label="Remove attachment" onClick={() => setAttach(null)} /></>}
              </div>
            )}
            <form className="chat-compose" onSubmit={send}>
              <input ref={fileRef} type="file" className="sr-only" accept="image/jpeg,image/png,image/webp,image/gif,audio/mpeg,audio/wav,audio/ogg,audio/mp4,audio/aac,video/mp4,video/quicktime,video/webm" onChange={pickFile} aria-label="Attach a file" />
              <IconButton icon="upload" label="Attach image, audio or video" onClick={() => fileRef.current?.click()} disabled={uploading} />
              <input className="input" value={text} onChange={(e) => setText(e.target.value)} placeholder="Type a message…" aria-label="Message" maxLength={4000} />
              <Button type="submit" loading={sending} disabled={!text.trim() && !attach} aria-label="Send message"><Icon name="send" size={16} /></Button>
            </form>
          </>
        )}
      </section>
      <ReportModal open={reportOpen} onClose={() => setReportOpen(false)} contentType="message" contentId={[...thread].reverse().find((m) => m.sender_id !== myId)?.id || peerId} label={`conversation with ${peer?.name || 'this user'}`} />
      <ConfirmDialog open={confirmBlock} danger title={`Block ${peer?.name || 'this user'}?`} message="They will not be able to message you and you will not be able to message them. You can unblock them any time in Account & security." confirmLabel="Block" onConfirm={blockPeer} onCancel={() => setConfirmBlock(false)} />
    </div>
  );
}
