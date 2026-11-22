import { useState } from 'react';
import { useAsync } from '../../../lib/hooks';
import { api } from '../../../lib/api';
import { formatDate, titleCase } from '../../../lib/format';
import { Badge, Button, ConfirmDialog, Modal, PageHeader } from '../../../components/ui';
import VideoPlayer from '../../../components/shared/VideoPlayer';
import { ActionBtn, ListShell, useDo, usePagedList, useSearch } from '../common';

export default function Videos() {
  const [q, setQ, dq] = useSearch();
  const res = usePagedList('/admin/videos', { search: dq }, 12);
  const [run, busy] = useDo(res.reload);
  const [watch, setWatch] = useState(null);
  const [del, setDel] = useState(null);
  const diag = useAsync(() => api.get('/admin/media/diagnostics'), []);
  const d = diag.data;
  return (
    <>
      <PageHeader title="Videos" description="Moderate company reels. Removed videos are hidden from every feed." />
      {d && (d.advice || d.missing.length > 0) && (
        <div className="alert alert-warn" role="alert" data-testid="media-warning" style={{ marginBottom: 14 }}>
          {d.advice && <p style={{ margin: 0 }}><strong>Storage:</strong> {d.advice}</p>}
          {d.missing.length > 0 && (
            <>
              <p style={{ margin: '6px 0 0' }}><strong>{d.missing.length} video file(s) are missing on the server</strong> and cannot play. Ask the recruiter to upload them again:</p>
              <ul style={{ margin: '4px 0 0 18px' }}>{d.missing.slice(0, 8).map((m) => <li key={m.id}>{m.title}</li>)}</ul>
            </>
          )}
        </div>
      )}
      <ListShell res={res} search={q} onSearch={setQ} searchPlaceholder="Search videos" empty={{ icon: 'video', title: 'No videos yet', description: 'Recruiters publish reels from their panel.' }}>
        {(items) => (
          <div className="table-wrap">
            <table className="table rtable" data-testid="videos-table">
              <thead><tr><th>Video</th><th>Author</th><th>Type</th><th>Engagement</th><th>Status</th><th>Posted</th><th /></tr></thead>
              <tbody>
                {items.map((v) => (
                  <tr key={v.id}>
                    <td data-label="Video"><div className="strong">{v.title}</div><div className="muted small truncate" style={{ maxWidth: 260 }}>{v.company_name || ''}</div></td>
                    <td data-label="Author">{v.author?.name || '-'}</td>
                    <td data-label="Type"><Badge tone="neutral">{titleCase(v.type)}</Badge></td>
                    <td data-label="Engagement" className="small">{v.views_count} views · {v.likes_count} likes · {v.comments_count} comments</td>
                    <td data-label="Status">{v.is_removed ? <Badge tone="danger" dot>Removed</Badge> : <Badge tone="success" dot>Live</Badge>}</td>
                    <td data-label="Posted">{formatDate(v.created_at)}</td>
                    <td className="cell-actions"><div className="actions">
                      <ActionBtn icon="play" label={`Watch ${v.title}`} onClick={() => setWatch(v)} />
                      {v.is_removed
                        ? <ActionBtn icon="refresh" label={`Restore ${v.title}`} onClick={() => run(() => api.patch(`/admin/videos/${v.id}/moderate`, { is_removed: false }), 'Video restored')} />
                        : <ActionBtn icon="ban" label={`Remove ${v.title}`} onClick={() => run(() => api.patch(`/admin/videos/${v.id}/moderate`, { is_removed: true }), 'Video removed from feeds')} />}
                      <ActionBtn icon="trash" tone="danger" label={`Delete ${v.title}`} onClick={() => setDel(v)} />
                    </div></td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </ListShell>
      {watch && <Modal title={watch.title} size="lg" onClose={() => setWatch(null)} footer={<Button variant="ghost" onClick={() => setWatch(null)}>Close</Button>}><VideoPlayer url={watch.video_url} playbackUrl={watch.playback_url} poster={watch.poster_url || watch.thumbnail_url} title={watch.title} /><p className="muted" style={{ marginTop: 10 }}>{watch.description}</p></Modal>}
      <ConfirmDialog open={!!del} danger title="Delete video?" message={del && `"${del.title}" with its likes, saves and comments will be deleted permanently.`} confirmLabel="Delete video" loading={busy}
        onCancel={() => setDel(null)} onConfirm={async () => { if (await run(() => api.delete(`/admin/videos/${del.id}`), 'Video deleted')) setDel(null); }} />
    </>
  );
}
