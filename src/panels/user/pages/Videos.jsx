import { useState } from 'react';
import { api, errorMessage } from '../../../lib/api';
import { useAuth } from '../../../lib/auth';
import { compactNumber, timeAgo, titleCase } from '../../../lib/format';
import { useAsync, useDebounce } from '../../../lib/hooks';
import { useToast } from '../../../lib/toast';
import Icon from '../../../components/Icon';
import ReportModal from '../../../components/shared/ReportModal';
import VideoPlayer from '../../../components/shared/VideoPlayer';
import { assetUrl } from '../../../lib/api';
import { Avatar, Badge, Button, ConfirmDialog, DataState, IconButton, Modal, PageHeader, Pagination, SearchInput, SkeletonList, Spinner, Tabs } from '../../../components/ui';

const TYPES = [['', 'All'], ['company', 'Company'], ['job', 'Jobs'], ['tip', 'Tips'], ['announcement', 'News']].map(([value, label]) => ({ value, label }));

export function CommentsModal({ video, onClose, onPatch }) {
  return <VideoModal video={video} onClose={onClose} onPatch={onPatch} commentsOnly />;
}

function VideoModal({ video, onClose, onPatch, commentsOnly = false }) {
  const toast = useToast();
  const { user } = useAuth();
  const [text, setText] = useState('');
  const [busy, setBusy] = useState(false);
  const [reporting, setReporting] = useState(false);
  const [delId, setDelId] = useState(null);
  const comments = useAsync(() => api.get(`/videos/${video.id}/comments`), [video.id]);

  const toggle = async (kind) => {
    const on = kind === 'like' ? video.is_liked : video.is_saved;
    const key = kind === 'like' ? 'is_liked' : 'is_saved';
    const patch = { [key]: !on };
    if (kind === 'like') patch.likes_count = video.likes_count + (on ? -1 : 1);
    onPatch(video.id, patch);
    try {
      if (on) await api.delete(`/videos/${video.id}/${kind}`);
      else await api.post(`/videos/${video.id}/${kind}`);
    } catch (e) {
      onPatch(video.id, { [key]: on, likes_count: video.likes_count });
      toast.error(errorMessage(e));
    }
  };
  const post = async (e) => {
    e.preventDefault();
    if (!text.trim()) return;
    setBusy(true);
    try {
      const c = await api.post(`/videos/${video.id}/comments`, { comment: text.trim() });
      comments.setData((d) => ({ ...d, items: [c, ...(d?.items || [])] }));
      onPatch(video.id, { comments_count: video.comments_count + 1 });
      setText('');
    } catch (err) { toast.error(errorMessage(err)); } finally { setBusy(false); }
  };
  const del = async () => {
    try {
      await api.delete(`/videos/comments/${delId}`);
      comments.setData((d) => ({ ...d, items: d.items.filter((c) => c.id !== delId) }));
      onPatch(video.id, { comments_count: Math.max(0, video.comments_count - 1) });
      toast.success('Comment deleted');
    } catch (err) { toast.error(errorMessage(err)); }
    setDelId(null);
  };
  const items = comments.data?.items || [];
  return (
    <Modal title={video.title} description={[video.company_name, titleCase(video.type)].filter(Boolean).join(' · ')} size="lg" onClose={onClose}>
      {!commentsOnly && <VideoPlayer url={video.video_url} playbackUrl={video.playback_url} poster={video.poster_url || video.thumbnail_url} title={video.title} />}
      {!commentsOnly && video.description && <p className="muted" style={{ marginTop: 10 }}>{video.description}</p>}
      <div className="row-wrap u-vactions">
        <Button variant={video.is_liked ? 'soft' : 'secondary'} icon="heart" onClick={() => toggle('like')} aria-pressed={!!video.is_liked}>{video.is_liked ? 'Liked' : 'Like'} · {video.likes_count}</Button>
        <Button variant={video.is_saved ? 'soft' : 'secondary'} icon="bookmark" onClick={() => toggle('save')} aria-pressed={!!video.is_saved}>{video.is_saved ? 'Saved' : 'Save'}</Button>
        <Button variant="ghost" icon="flag" onClick={() => setReporting(true)}>Report</Button>
      </div>
      <h3 style={{ margin: '16px 0 8px' }}>Comments ({video.comments_count})</h3>
      <form className="row" onSubmit={post}>
        <input className="input" value={text} onChange={(e) => setText(e.target.value)} placeholder="Add a comment…" aria-label="Add a comment" maxLength={1000} />
        <Button type="submit" loading={busy} disabled={!text.trim()}>Post</Button>
      </form>
      <div className="u-comments">
        {comments.loading && !comments.data ? <div className="u-center"><Spinner /></div> : comments.error ? <p className="form-error">{comments.error}</p> : items.length === 0 ? <p className="muted small">No comments yet. Be the first.</p> : items.map((c) => (
          <div className="u-comment" key={c.id}>
            <Avatar name={c.author?.name} src={c.author?.profile_image} size={32} />
            <div className="grow"><strong className="small">{c.author?.name}</strong> <span className="muted small">{timeAgo(c.created_at)}</span><p>{c.comment}</p></div>
            {(c.can_delete || c.author?.id === user.id) && <IconButton icon="trash" label="Delete comment" className="icon-btn-danger" onClick={() => setDelId(c.id)} />}
          </div>
        ))}
      </div>
      <ReportModal open={reporting} onClose={() => setReporting(false)} contentType="video" contentId={video.id} label="video" />
      <ConfirmDialog open={!!delId} title="Delete comment?" message="This comment will be removed." confirmLabel="Delete" danger onConfirm={del} onCancel={() => setDelId(null)} />
    </Modal>
  );
}

export default function Videos() {
  const [tab, setTab] = useState('feed');
  const [type, setType] = useState('');
  const [q, setQ] = useState('');
  const [page, setPage] = useState(1);
  const [openId, setOpenId] = useState(null);
  const dq = useDebounce(q, 350);
  const { data, loading, error, reload, setData } = useAsync(
    () => (tab === 'saved' ? api.get('/videos/saved') : api.get('/videos', { type, search: dq, page, limit: 9 })),
    [tab, type, dq, page],
  );
  const items = data?.items || [];
  const patch = (id, p) => setData((d) => (d ? { ...d, items: d.items.map((v) => (v.id === id ? { ...v, ...p } : v)) } : d));
  const open = items.find((v) => v.id === openId);

  return (
    <>
      <PageHeader title="Reels" description="Short videos from companies and recruiters." />
      <Tabs tabs={[{ value: 'feed', label: 'Feed' }, { value: 'saved', label: 'Saved' }]} value={tab} onChange={(v) => { setTab(v); setPage(1); }} />
      {tab === 'feed' && (
        <div className="u-filterbar">
          <SearchInput value={q} onChange={(v) => { setQ(v); setPage(1); }} placeholder="Search videos" />
          <Tabs className="u-chips-tabs" tabs={TYPES} value={type} onChange={(v) => { setType(v); setPage(1); }} />
        </div>
      )}
      <DataState loading={loading} error={error} onRetry={reload} hasData={!!data} skeleton={<SkeletonList count={3} />} isEmpty={items.length === 0}
        empty={{ icon: 'video', title: tab === 'saved' ? 'No saved videos' : 'No videos found', description: tab === 'saved' ? 'Save a video to watch it later.' : 'Try another category or search.' }}>
        <div className="u-grid u-vgrid">
          {items.map((v) => (
            <button type="button" className="u-vcard" key={v.id} onClick={() => setOpenId(v.id)} aria-label={`Play ${v.title}`} data-testid="video-card">
              <span className="u-vthumb" style={v.thumbnail_url ? { backgroundImage: `url(${assetUrl(v.thumbnail_url)})` } : undefined}>
                <span className="u-play"><Icon name="play" size={22} /></span>
                <Badge tone="brand" className="u-vtype">{titleCase(v.type)}</Badge>
              </span>
              <span className="u-vbody">
                <strong>{v.title}</strong>
                <span className="muted small">{v.company_name || v.author?.name} · {timeAgo(v.created_at)}</span>
                <span className="u-vstats small"><span><Icon name="heart" size={13} /> {compactNumber(v.likes_count)}</span><span><Icon name="message" size={13} /> {compactNumber(v.comments_count)}</span><span><Icon name="eye" size={13} /> {compactNumber(v.views_count)}</span></span>
              </span>
            </button>
          ))}
        </div>
        {tab === 'feed' && <Pagination page={data?.page || 1} pages={data?.pages} onChange={setPage} />}
      </DataState>
      {open && <VideoModal video={open} onClose={() => { setOpenId(null); if (tab === 'saved') reload(); }} onPatch={patch} />}
    </>
  );
}
