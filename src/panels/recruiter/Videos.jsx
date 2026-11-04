import { useState } from 'react';
import { api, errorMessage } from '../../lib/api';
import { formatDate, titleCase } from '../../lib/format';
import { useAsync } from '../../lib/hooks';
import { useToast } from '../../lib/toast';
import MediaUpload from '../../components/shared/MediaUpload';
import VideoPlayer from '../../components/shared/VideoPlayer';
import { Badge, Button, Card, ConfirmDialog, DataState, Input, Modal, PageHeader, Select, SkeletonList, TagInput, Textarea } from '../../components/ui';
import Icon from '../../components/Icon';

const TYPES = [{ value: 'company', label: 'Company culture' }, { value: 'job', label: 'Job opening' }, { value: 'tip', label: 'Career tip' }, { value: 'announcement', label: 'Announcement' }];

function VideoForm({ onClose, onDone }) {
  const toast = useToast();
  const jobs = useAsync(() => api.get('/recruiter/jobs', { status: 'approved', limit: 50 }), []);
  const [f, setF] = useState({ title: '', description: '', type: 'company', video_url: '', thumbnail_url: '', job_id: '', tags: [] });
  const [errors, setErrors] = useState({});
  const [formError, setFormError] = useState('');
  const [busy, setBusy] = useState(false);
  const set = (k) => (e) => setF((s) => ({ ...s, [k]: e.target.value }));
  const submit = async (e) => {
    e.preventDefault();
    const er = {};
    if (f.title.trim().length < 3) er.title = 'Title must be at least 3 characters.';
    const url = f.video_url.trim();
    if (!(/^https?:\/\/\S+$/i.test(url) || url.startsWith('/uploads/'))) er.video_url = 'Upload a video file or paste a video link (http/https).';
    setErrors(er);
    setFormError('');
    if (Object.keys(er).length) return;
    setBusy(true);
    try {
      await api.post('/videos', { title: f.title.trim(), description: f.description.trim(), type: f.type, video_url: url, thumbnail_url: f.thumbnail_url || null, job_id: f.job_id || null, tags: f.tags, is_public: true });
      toast.success('Video published.');
      onDone();
    } catch (err) { setFormError(errorMessage(err)); } finally { setBusy(false); }
  };
  const jobOpts = [{ value: '', label: 'Not linked to a job' }, ...((jobs.data?.items || []).map((j) => ({ value: j.id, label: j.title })))];
  return (
    <Modal open size="lg" title="Add a video" description="Show candidates what it is like to work with you." onClose={onClose} footer={<><Button variant="ghost" onClick={onClose}>Cancel</Button><Button type="submit" form="video-form" loading={busy}>Publish</Button></>}>
      <form id="video-form" className="stack" onSubmit={submit} noValidate>
        {formError && <p className="form-error" role="alert">{formError}</p>}
        <div className="form-grid">
          <div className="full"><Input label="Title" value={f.title} onChange={set('title')} error={errors.title} required /></div>
          <Select label="Type" value={f.type} onChange={set('type')} options={TYPES} />
          <Select label="Link to a job (shows an Apply card in Reels)" value={f.job_id} onChange={set('job_id')} options={jobOpts} />
          <div className="full"><Textarea label="Description" rows={3} value={f.description} onChange={set('description')} /></div>
          <div className="full field">
            <label>Video file (MP4, MOV or WebM, up to 50 MB)</label>
            <MediaUpload purpose="video" kind="video" value={f.video_url.startsWith('/uploads/') || /res\.cloudinary\.com/.test(f.video_url) ? f.video_url : ''} onChange={(u) => setF((s) => ({ ...s, video_url: u || '' }))} label="Upload video" />
          </div>
          <div className="full"><Input label="…or a video link" type="url" value={f.video_url} onChange={set('video_url')} error={errors.video_url} placeholder="https://… (mp4, YouTube or Vimeo)" /></div>
          <div className="full field">
            <label>Thumbnail (optional)</label>
            <MediaUpload purpose="thumbnail" kind="image" value={f.thumbnail_url} onChange={(u) => setF((s) => ({ ...s, thumbnail_url: u || '' }))} label="Upload thumbnail" size={64} />
          </div>
          <div className="full"><TagInput label="Tags" value={f.tags} onChange={(tags) => setF((s) => ({ ...s, tags }))} /></div>
        </div>
      </form>
    </Modal>
  );
}

export default function Videos() {
  const toast = useToast();
  const { data, loading, error, reload } = useAsync(() => api.get('/videos/mine'), []);
  const [adding, setAdding] = useState(false);
  const [playing, setPlaying] = useState(null);
  const [del, setDel] = useState(null);
  const [busy, setBusy] = useState(false);
  const items = data?.items || [];
  const remove = async () => {
    setBusy(true);
    try { await api.delete(`/videos/${del.id}`); toast.success('Video deleted.'); setDel(null); reload(); } catch (e) { toast.error(errorMessage(e)); } finally { setBusy(false); }
  };
  return (
    <>
      <PageHeader title="Company videos" description="Reels shown to job seekers in their video feed." actions={<Button icon="plus" onClick={() => setAdding(true)}>Add video</Button>} />
      <DataState loading={loading} error={error} onRetry={reload} hasData={!!data} skeleton={<SkeletonList count={3} />} isEmpty={items.length === 0} empty={{ icon: 'video', title: 'No videos yet', description: 'Share your culture, open roles or hiring tips.', action: <Button icon="plus" onClick={() => setAdding(true)}>Add your first video</Button> }}>
        <div className="grid grid-auto">
          {items.map((v) => (
            <Card key={v.id} className="r-video">
              {playing === v.id ? <VideoPlayer url={v.video_url} poster={v.thumbnail_url} title={v.title} /> : (
                <button type="button" className="r-video-thumb" onClick={() => setPlaying(v.id)} aria-label={`Play ${v.title}`}><Icon name="play" size={34} /></button>
              )}
              <div className="row between" style={{ marginTop: 12, alignItems: 'flex-start' }}>
                <div className="grow"><strong className="truncate" style={{ display: 'block' }}>{v.title}</strong><span className="muted small">{formatDate(v.created_at)}</span></div>
                <Badge tone="brand">{titleCase(v.type)}</Badge>
              </div>
              <div className="r-video-meta"><span><Icon name="eye" size={14} /> {v.views_count}</span><span><Icon name="heart" size={14} /> {v.likes_count}</span><span><Icon name="message" size={14} /> {v.comments_count}</span>
                <Button className="r-video-del" size="sm" variant="ghost" icon="trash" onClick={() => setDel(v)} aria-label={`Delete ${v.title}`}>Delete</Button></div>
            </Card>
          ))}
        </div>
      </DataState>
      {adding && <VideoForm onClose={() => setAdding(false)} onDone={() => { setAdding(false); reload(); }} />}
      <ConfirmDialog open={!!del} danger loading={busy} title="Delete this video?" message={del ? `"${del.title}" and its likes and comments will be removed.` : ''} confirmLabel="Delete video" onConfirm={remove} onCancel={() => setDel(null)} />
    </>
  );
}
