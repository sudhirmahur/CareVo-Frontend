import { useState } from 'react';
import { api } from '../../../lib/api';
import { formatDate, isHttpUrl } from '../../../lib/format';
import { useAsync } from '../../../lib/hooks';
import { Badge, Button, Card, ConfirmDialog, DataState, Input, Modal, PageHeader, Switch } from '../../../components/ui';
import MediaUpload from '../../../components/shared/MediaUpload';
import { ActionBtn, useDo } from '../common';

export default function Banners() {
  const { data, loading, error, reload } = useAsync(() => api.get('/admin/banners'), []);
  const [run, busy] = useDo(reload);
  const [creating, setCreating] = useState(false);
  const [f, setF] = useState({ title: '', image_url: '', link_url: '' });
  const [err, setErr] = useState({});
  const [del, setDel] = useState(null);
  const items = data?.items || [];
  const set = (k) => (e) => setF({ ...f, [k]: e.target.value });
  const save = async () => {
    const er = {};
    if (f.title.trim().length < 2) er.title = 'Enter a title (min 2 characters).';
    if (f.image_url.trim() && !isHttpUrl(f.image_url) && !f.image_url.startsWith('/uploads/')) er.image_url = 'Upload an image or use a link starting with http:// or https://';
    if (f.link_url.trim() && !isHttpUrl(f.link_url)) er.link_url = 'Must start with http:// or https://';
    setErr(er);
    if (Object.keys(er).length) return;
    const ok = await run(() => api.post('/admin/banners', { title: f.title.trim(), image_url: f.image_url.trim() || null, link_url: f.link_url.trim() || null, is_active: true }), 'Banner created');
    if (ok) { setCreating(false); setF({ title: '', image_url: '', link_url: '' }); }
  };
  return (
    <>
      <PageHeader title="Banners" description="Promotional banners shown to candidates." actions={<Button icon="plus" onClick={() => setCreating(true)}>New banner</Button>} />
      <Card padded={false}>
        <DataState loading={loading} error={error} onRetry={reload} hasData={!!data} isEmpty={items.length === 0} empty={{ icon: 'layers', title: 'No banners yet', description: 'Create one to promote featured jobs or campaigns.' }}>
          <div className="table-wrap">
            <table className="table rtable" data-testid="banners-table">
              <thead><tr><th>Banner</th><th>Link</th><th>Created</th><th>Active</th><th /></tr></thead>
              <tbody>
                {items.map((b) => (
                  <tr key={b.id}>
                    <td data-label="Banner"><span className="strong">{b.title}</span></td>
                    <td data-label="Link">{b.link_url ? <a href={b.link_url} target="_blank" rel="noopener noreferrer" className="truncate" style={{ maxWidth: 240, display: 'inline-block' }}>{b.link_url}</a> : <span className="muted">-</span>}</td>
                    <td data-label="Created">{formatDate(b.created_at)}</td>
                    <td data-label="Active"><Switch checked={b.is_active} label={b.is_active ? 'Active' : 'Hidden'} onChange={() => run(() => api.patch(`/admin/banners/${b.id}`), (r) => (r.is_active ? 'Banner activated' : 'Banner hidden'))} /></td>
                    <td className="cell-actions"><div className="actions"><ActionBtn icon="trash" tone="danger" label={`Delete banner ${b.title}`} onClick={() => setDel(b)} /></div></td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </DataState>
      </Card>
      {creating && (
        <Modal title="New banner" onClose={() => setCreating(false)} footer={<><Button variant="ghost" onClick={() => setCreating(false)}>Cancel</Button><Button loading={busy} onClick={save}>Create banner</Button></>}>
          <div className="stack">
            <Input label="Title" value={f.title} onChange={set('title')} error={err.title} required />
            <div className="field"><label>Banner image (optional)</label>
              <MediaUpload purpose="banner" kind="image" value={f.image_url} onChange={(u) => setF({ ...f, image_url: u || '' })} label="Upload image" size={64} />
              <Input aria-label="Image URL" value={f.image_url} onChange={set('image_url')} error={err.image_url} placeholder="…or paste an https:// image link" /></div>
            <Input label="Link URL (optional)" value={f.link_url} onChange={set('link_url')} error={err.link_url} placeholder="https://…" />
          </div>
        </Modal>
      )}
      <ConfirmDialog open={!!del} danger title="Delete banner?" message={del && `"${del.title}" will be removed.`} confirmLabel="Delete banner" loading={busy}
        onCancel={() => setDel(null)} onConfirm={async () => { if (await run(() => api.delete(`/admin/banners/${del.id}`), 'Banner deleted')) setDel(null); }} />
    </>
  );
}
