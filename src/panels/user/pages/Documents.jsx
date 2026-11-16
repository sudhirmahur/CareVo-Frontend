import { useRef, useState } from 'react';
import { api, errorMessage } from '../../../lib/api';
import { formatDate } from '../../../lib/format';
import { useAsync } from '../../../lib/hooks';
import { useToast } from '../../../lib/toast';
import Icon from '../../../components/Icon';
import { Badge, Button, Card, ConfirmDialog, DataState, Input, Modal, PageHeader, Select, Tabs } from '../../../components/ui';
import { MAX_DOC_MB, checkDocFile, signedUrl } from './_files';

const CATS = [['resume', 'Resume'], ['certificate', 'Certificate'], ['education', 'Education'], ['experience', 'Experience'], ['other', 'Other']];
const catLabel = (c) => (CATS.find((x) => x[0] === c) || [0, c])[1];
const size = (b) => (b > 1048576 ? `${(b / 1048576).toFixed(1)} MB` : `${Math.max(1, Math.round(b / 1024))} KB`);

function UploadModal({ onClose, onDone }) {
  const toast = useToast();
  const [file, setFile] = useState(null);
  const [category, setCategory] = useState('certificate');
  const [title, setTitle] = useState('');
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);
  const pick = (f) => { setFile(f); setError(f ? checkDocFile(f) : ''); };
  const submit = async () => {
    const msg = checkDocFile(file);
    if (msg) return setError(msg);
    setBusy(true);
    try {
      const form = new FormData();
      form.append('file', file); form.append('category', category); form.append('title', title.trim());
      await api.post('/me/documents', undefined, { form });
      toast.success('Document uploaded');
      onDone();
    } catch (e) { setError(errorMessage(e)); } finally { setBusy(false); }
  };
  return (
    <Modal title="Upload a document" onClose={onClose} size="sm" footer={<><Button variant="ghost" onClick={onClose}>Cancel</Button><Button loading={busy} onClick={submit}>Upload</Button></>}>
      <div className="stack">
        <div className="field"><label htmlFor="doc-file">File</label><input id="doc-file" data-testid="doc-file" type="file" className="input" accept=".pdf,.doc,.docx,.png,.jpg,.jpeg" onChange={(e) => pick(e.target.files?.[0] || null)} /><p className="field-hint">PDF, DOC, DOCX, PNG or JPG, up to {MAX_DOC_MB} MB.</p></div>
        <Select label="Category" value={category} onChange={(e) => setCategory(e.target.value)} options={CATS.map(([value, label]) => ({ value, label }))} />
        <Input label="Title (optional)" value={title} onChange={(e) => setTitle(e.target.value)} maxLength={120} />
        {error && <p className="form-error" role="alert">{error}</p>}
      </div>
    </Modal>
  );
}

function EditModal({ doc, onClose, onDone }) {
  const toast = useToast();
  const [title, setTitle] = useState(doc.title);
  const [category, setCategory] = useState(doc.category);
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);
  const save = async () => {
    if (!title.trim()) return setError('Title is required');
    setBusy(true);
    try { await api.patch(`/me/documents/${doc.id}`, { title: title.trim(), category }); toast.success('Document updated'); onDone(); } catch (e) { setError(errorMessage(e)); } finally { setBusy(false); }
  };
  return (
    <Modal title="Edit document" onClose={onClose} size="sm" footer={<><Button variant="ghost" onClick={onClose}>Cancel</Button><Button loading={busy} onClick={save}>Save</Button></>}>
      <div className="stack">
        <Input label="Title" value={title} onChange={(e) => setTitle(e.target.value)} maxLength={120} />
        <Select label="Category" value={category} onChange={(e) => setCategory(e.target.value)} options={CATS.map(([value, label]) => ({ value, label }))} />
        {error && <p className="form-error" role="alert">{error}</p>}
      </div>
    </Modal>
  );
}

export default function Documents() {
  const toast = useToast();
  const [cat, setCat] = useState('');
  const { data, loading, error, reload } = useAsync(() => api.get('/me/documents', { category: cat }), [cat]);
  const all = useAsync(() => api.get('/me/documents'), []);
  const [upload, setUpload] = useState(false);
  const [edit, setEdit] = useState(null);
  const [del, setDel] = useState(null);
  const [preview, setPreview] = useState(null);
  const replaceRef = useRef(null);
  const [replaceFor, setReplaceFor] = useState(null);
  const refresh = () => { reload(); all.reload(); };

  const link = async (d, download) => (await api.get(`/me/documents/${d.id}/link`, { download })).url;
  const open = async (d) => {
    try {
      if (['png', 'jpg', 'jpeg'].includes(d.ext)) return setPreview({ doc: d, url: signedUrl(await link(d, false)) });
      const w = window.open('', '_blank');
      try { const url = signedUrl(await link(d, false)); if (w) { w.opener = null; w.location.href = url; } else window.location.href = url; } catch (e) { w?.close(); throw e; }
    } catch (e) { toast.error(errorMessage(e)); }
  };
  const download = async (d) => { try { window.location.href = signedUrl(await link(d, true)); } catch (e) { toast.error(errorMessage(e)); } };
  const replace = async (file) => {
    const d = replaceFor; setReplaceFor(null);
    if (!file || !d) return;
    const msg = checkDocFile(file);
    if (msg) return toast.error(msg);
    try { const form = new FormData(); form.append('file', file); await api.put(`/me/documents/${d.id}/file`, undefined, { form }); toast.success('File replaced'); refresh(); } catch (e) { toast.error(errorMessage(e)); }
  };
  const remove = async () => {
    try { await api.delete(`/me/documents/${del.id}`); toast.success('Document deleted'); setDel(null); refresh(); } catch (e) { toast.error(errorMessage(e)); }
  };

  const counts = all.data?.counts || {};
  const total = Object.values(counts).reduce((a, b) => a + b, 0);
  const items = data?.items || [];
  return (
    <>
      <PageHeader title="My documents" description="A private vault for your certificates, resumes and other files." actions={<Button icon="upload" onClick={() => setUpload(true)}>Upload document</Button>} />
      <Tabs value={cat} onChange={setCat} tabs={[{ value: '', label: 'All', count: total }, ...CATS.map(([value, label]) => ({ value, label, count: counts[value] || 0 }))]} />
      <input ref={replaceRef} type="file" hidden data-testid="doc-replace" accept=".pdf,.doc,.docx,.png,.jpg,.jpeg" onChange={(e) => { replace(e.target.files?.[0]); e.target.value = ''; }} />
      <DataState loading={loading} error={error} onRetry={reload} hasData={!!data} isEmpty={items.length === 0}
        empty={{ icon: 'file', title: 'No documents here', description: 'Upload certificates, IDs or experience letters so they are always at hand.', action: <Button onClick={() => setUpload(true)}>Upload document</Button> }}>
        <Card padded={false}>
          <ul className="u-list" data-testid="doc-list">{items.map((d) => (
            <li key={d.id} className="doc-row">
              <span className="doc-ic"><Icon name="file" size={22} /></span>
              <div className="grow"><strong className="truncate">{d.title}</strong><p className="muted small">{d.filename} · {size(d.size)} · {formatDate(d.updated_at)}</p></div>
              <Badge tone="info">{catLabel(d.category)}</Badge>
              <div className="doc-actions">
                <Button size="sm" variant="secondary" icon="eye" onClick={() => open(d)} aria-label={`Preview ${d.title}`}>Preview</Button>
                <Button size="sm" variant="secondary" icon="download" onClick={() => download(d)} aria-label={`Download ${d.title}`}>Download</Button>
                <Button size="sm" variant="ghost" icon="edit" onClick={() => setEdit(d)} aria-label={`Edit ${d.title}`} />
                <Button size="sm" variant="ghost" icon="refresh" onClick={() => { setReplaceFor(d); replaceRef.current?.click(); }} aria-label={`Replace file of ${d.title}`} />
                <Button size="sm" variant="ghost" icon="trash" onClick={() => setDel(d)} aria-label={`Delete ${d.title}`} />
              </div>
            </li>
          ))}</ul>
        </Card>
      </DataState>
      {upload && <UploadModal onClose={() => setUpload(false)} onDone={() => { setUpload(false); refresh(); }} />}
      {edit && <EditModal doc={edit} onClose={() => setEdit(null)} onDone={() => { setEdit(null); refresh(); }} />}
      {preview && <Modal title={preview.doc.title} onClose={() => setPreview(null)}><img src={preview.url} alt={preview.doc.title} style={{ maxWidth: '100%', borderRadius: 8 }} /></Modal>}
      <ConfirmDialog open={!!del} danger title="Delete document" message={`Delete "${del?.title}"? This cannot be undone.`} confirmLabel="Delete" onConfirm={remove} onCancel={() => setDel(null)} />
    </>
  );
}
