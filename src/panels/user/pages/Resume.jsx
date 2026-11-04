import { useRef, useState } from 'react';
import { api, errorMessage, openResume } from '../../../lib/api';
import { formatDate } from '../../../lib/format';
import { useAsync } from '../../../lib/hooks';
import { useToast } from '../../../lib/toast';
import Icon from '../../../components/Icon';
import { Badge, Button, Card, ConfirmDialog, DataState, PageHeader, SkeletonList, SkillChips } from '../../../components/ui';

const MAX = 5 * 1024 * 1024;
const OK = ['.pdf', '.doc', '.docx'];

function Score({ value }) {
  const tone = value >= 75 ? '#16a34a' : value >= 50 ? '#d97706' : '#dc2626';
  return (
    <div className="u-score" style={{ '--p': value, '--c': tone }} role="img" aria-label={`Resume score ${value} out of 100`}>
      <span>{Math.round(value)}</span>
    </div>
  );
}

function Analysis({ r }) {
  if (r.ai_score == null) return null;
  const pd = r.parsed_data || {};
  return (
    <div className="u-analysis" data-testid="analysis">
      <div className="row" style={{ alignItems: 'center' }}>
        <Score value={r.ai_score} />
        <div><strong>AI resume score</strong><p className="muted small">{pd.word_count ? `${pd.word_count} words read` : ''}{pd.sections?.length ? ` · sections: ${pd.sections.join(', ')}` : ''}</p></div>
      </div>
      {pd.skills_found?.length > 0 && <div><p className="small"><strong>Skills detected</strong></p><SkillChips skills={pd.skills_found} /></div>}
      {r.suggestions?.length > 0 && (
        <div><p className="small"><strong>Suggestions</strong></p><ul className="u-bullets">{r.suggestions.map((s) => <li key={s}>{s}</li>)}</ul></div>
      )}
    </div>
  );
}

export default function Resume() {
  const toast = useToast();
  const inputRef = useRef(null);
  const { data, loading, error, reload } = useAsync(() => api.get('/resumes'), []);
  const [uploading, setUploading] = useState(false);
  const [fileError, setFileError] = useState('');
  const [busyId, setBusyId] = useState(null);
  const [del, setDel] = useState(null);
  const [drag, setDrag] = useState(false);
  const list = data || [];

  const upload = async (file) => {
    setFileError('');
    if (!file) return;
    const ext = `.${file.name.split('.').pop().toLowerCase()}`;
    if (!OK.includes(ext)) return setFileError('Only PDF, DOC and DOCX files are allowed.');
    if (file.size > MAX) return setFileError('File is too large. Maximum size is 5 MB.');
    if (file.size === 0) return setFileError('The file is empty.');
    setUploading(true);
    try {
      await api.upload('/resumes', file);
      toast.success('Resume uploaded');
      await reload();
    } catch (e) {
      setFileError(errorMessage(e));
    } finally {
      setUploading(false);
      if (inputRef.current) inputRef.current.value = '';
    }
  };
  const run = async (id, fn, okMsg) => {
    setBusyId(id);
    try { await fn(); if (okMsg) toast.success(okMsg); await reload(); } catch (e) { toast.error(errorMessage(e)); } finally { setBusyId(null); }
  };
  const analyze = (r) => run(r.id, () => api.post(`/resumes/${r.id}/analyze`), 'Analysis complete');

  return (
    <>
      <PageHeader title="My resumes" description="Upload your resume, set a default and get AI feedback." />
      <div
        className={`u-drop ${drag ? 'drag' : ''}`}
        onDragOver={(e) => { e.preventDefault(); setDrag(true); }}
        onDragLeave={() => setDrag(false)}
        onDrop={(e) => { e.preventDefault(); setDrag(false); upload(e.dataTransfer.files?.[0]); }}
      >
        <span className="empty-icon"><Icon name="upload" size={26} /></span>
        <strong>Drop your resume here</strong>
        <span className="muted small">PDF, DOC or DOCX · max 5 MB</span>
        <input ref={inputRef} id="resume-file" type="file" accept=".pdf,.doc,.docx" className="sr-only" onChange={(e) => upload(e.target.files?.[0])} />
        <label htmlFor="resume-file" className={`btn btn-primary ${uploading ? 'disabled' : ''}`} role="button" tabIndex={0} onKeyDown={(e) => (e.key === 'Enter' || e.key === ' ') && inputRef.current?.click()}>
          {uploading ? 'Uploading…' : 'Choose file'}
        </label>
        {fileError && <p className="form-error" role="alert">{fileError}</p>}
      </div>
      <DataState loading={loading} error={error} onRetry={reload} hasData={!!data} skeleton={<SkeletonList count={2} />} isEmpty={list.length === 0} empty={{ icon: 'file', title: 'No resume uploaded', description: 'Upload one to apply to jobs faster.' }}>
        <div className="stack" style={{ marginTop: 18 }}>
          {list.map((r) => (
            <Card key={r.id} data-testid="resume-card">
              <div className="row" style={{ alignItems: 'flex-start', flexWrap: 'wrap' }}>
                <span className="u-file-icon"><Icon name="file" size={22} /></span>
                <div className="grow">
                  <h3 className="truncate">{r.name} {r.is_default && <Badge tone="success">Default</Badge>}</h3>
                  <p className="muted small">Uploaded {formatDate(r.created_at)}</p>
                </div>
                <div className="row-wrap">
                  <Button size="sm" variant="secondary" icon="download" onClick={() => openResume(r.id).catch((e) => toast.error(errorMessage(e)))}>Download</Button>
                  {!r.is_default && <Button size="sm" variant="secondary" loading={busyId === r.id} onClick={() => run(r.id, () => api.patch(`/resumes/${r.id}/default`), 'Default resume updated')}>Make default</Button>}
                  <Button size="sm" variant="soft" icon="sparkles" loading={busyId === r.id} onClick={() => analyze(r)}>Analyze with AI</Button>
                  <Button size="sm" variant="ghost" icon="trash" onClick={() => setDel(r)} aria-label={`Delete ${r.name}`}>Delete</Button>
                </div>
              </div>
              <Analysis r={r} />
            </Card>
          ))}
        </div>
      </DataState>
      <ConfirmDialog open={!!del} title="Delete resume?" message={`"${del?.name}" will be permanently removed. Past applications are kept.`} confirmLabel="Delete" danger onConfirm={async () => { const r = del; setDel(null); await run(r.id, () => api.delete(`/resumes/${r.id}`), 'Resume deleted'); }} onCancel={() => setDel(null)} />
    </>
  );
}
