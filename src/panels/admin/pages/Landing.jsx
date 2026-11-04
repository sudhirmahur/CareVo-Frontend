import { useEffect, useMemo, useState } from 'react';
import { api, errorMessage } from '../../../lib/api';
import { resetSiteCache } from '../../../lib/site';
import { formatDate } from '../../../lib/format';
import { useAsync } from '../../../lib/hooks';
import { useToast } from '../../../lib/toast';
import Icon, { ICON_NAMES } from '../../../components/Icon';
import MediaUpload from '../../../components/shared/MediaUpload';
import { Badge, Button, Card, ConfirmDialog, DataState, Input, PageHeader, Pagination, Select, Textarea } from '../../../components/ui';
import { SECTIONS } from './landingSpec';

const clone = (v) => JSON.parse(JSON.stringify(v));

function FieldEditor({ spec, value, onChange, depth = 0 }) {
  const id = `f-${spec.k}-${depth}`;
  switch (spec.type) {
    case 'text':
      return <Input label={spec.label} value={value ?? ''} maxLength={spec.max} onChange={(e) => onChange(e.target.value)} />;
    case 'link':
      return <Input label={spec.label} value={value ?? ''} onChange={(e) => onChange(e.target.value)} placeholder="/jobs, https://… or mailto:…" hint="Starts with /, #, https://, http:// or mailto:" />;
    case 'area':
      return <Textarea label={spec.label} rows={spec.rows || 3} value={value ?? ''} maxLength={spec.max} onChange={(e) => onChange(e.target.value)} />;
    case 'rating':
      return <Select label={spec.label} value={String(value ?? 5)} onChange={(e) => onChange(Number(e.target.value))} options={[5, 4, 3, 2, 1].map((n) => ({ value: String(n), label: `${n} star${n > 1 ? 's' : ''}` }))} />;
    case 'select':
      return <Select label={spec.label} value={value ?? ''} onChange={(e) => onChange(e.target.value)} options={spec.options.map((o) => ({ value: o, label: o }))} />;
    case 'icon':
      return <Select label={spec.label} value={value ?? ''} onChange={(e) => onChange(e.target.value)} options={ICON_NAMES.map((o) => ({ value: o, label: o }))} />;
    case 'image':
      return (
        <div className="field">
          <label htmlFor={id}>{spec.label}</label>
          <MediaUpload purpose="landing" kind="image" value={value || ''} onChange={(u) => onChange(u || '')} label="Upload image" size={64} hint={spec.hint} />
          <input id={id} className="input" style={{ marginTop: 6 }} value={value ?? ''} onChange={(e) => onChange(e.target.value)} placeholder="…or paste an image URL" aria-label={`${spec.label} URL`} />
        </div>
      );
    case 'list': {
      const items = Array.isArray(value) ? value : [];
      const move = (i, d) => { const n = [...items]; const j = i + d; if (j < 0 || j >= n.length) return; [n[i], n[j]] = [n[j], n[i]]; onChange(n); };
      return (
        <div className="le-list">
          <div className="row between"><strong>{spec.label} <span className="muted small">({items.length}/{spec.max})</span></strong>
            <Button size="sm" variant="secondary" icon="plus" disabled={items.length >= spec.max} onClick={() => onChange([...items, clone(spec.blank)])}>Add</Button></div>
          {items.length === 0 && <p className="muted small">Nothing here yet.</p>}
          {items.map((it, i) => (
            <fieldset className="le-item" key={i}>
              <legend>{i + 1}. {String(it[spec.itemLabel] || 'Item').slice(0, 40)}</legend>
              <div className="le-grid">
                {spec.fields.map((f) => (
                  <div key={f.k} className={['area', 'list', 'image'].includes(f.type) ? 'full' : ''}>
                    <FieldEditor spec={f} depth={depth + 1} value={it[f.k]} onChange={(v) => onChange(items.map((x, n) => (n === i ? { ...x, [f.k]: v } : x)))} />
                  </div>
                ))}
              </div>
              <div className="row-wrap">
                <Button size="sm" variant="ghost" icon="chevronUp" onClick={() => move(i, -1)} disabled={i === 0} aria-label="Move up">Up</Button>
                <Button size="sm" variant="ghost" icon="chevronDown" onClick={() => move(i, 1)} disabled={i === items.length - 1} aria-label="Move down">Down</Button>
                <Button size="sm" variant="ghost" icon="trash" onClick={() => onChange(items.filter((_, n) => n !== i))} aria-label={`Remove item ${i + 1}`}>Remove</Button>
              </div>
            </fieldset>
          ))}
        </div>
      );
    }
    default:
      return null;
  }
}

function Newsletter() {
  const toast = useToast();
  const [page, setPage] = useState(1);
  const { data, loading, error, reload } = useAsync(() => api.get('/admin/newsletter', { page, limit: 20 }), [page]);
  const items = data?.items || [];
  const del = async (s) => { try { await api.delete(`/admin/newsletter/${s.id}`); toast.success('Removed'); reload(); } catch (e) { toast.error(errorMessage(e)); } };
  return (
    <Card title="Newsletter subscribers" subtitle={data ? `${data.total} subscriber${data.total === 1 ? '' : 's'}` : ''} padded={false}>
      <DataState loading={loading} error={error} onRetry={reload} hasData={!!data} isEmpty={items.length === 0} empty={{ icon: 'mail', title: 'No subscribers yet', description: 'Emails from the footer form show up here.' }}>
        <div className="table-wrap"><table className="table rtable" data-testid="newsletter-table"><thead><tr><th>Email</th><th>Joined</th><th /></tr></thead>
          <tbody>{items.map((s) => <tr key={s.id}><td data-label="Email">{s.email}</td><td data-label="Joined">{formatDate(s.created_at)}</td><td><Button size="sm" variant="ghost" icon="trash" onClick={() => del(s)} aria-label={`Remove ${s.email}`}>Remove</Button></td></tr>)}</tbody></table></div>
        <Pagination page={data?.page || 1} pages={data?.pages} onChange={setPage} />
      </DataState>
    </Card>
  );
}

export default function Landing() {
  const toast = useToast();
  const { data, loading, error, reload } = useAsync(() => api.get('/admin/site-content'), []);
  const [draft, setDraft] = useState(null); // section -> edited value
  const [saved, setSaved] = useState(null); // section -> last saved value
  const [active, setActive] = useState('hero');
  const [busy, setBusy] = useState(false);
  const [confirmReset, setConfirmReset] = useState(false);

  useEffect(() => {
    if (data) { setDraft(clone(data.content)); setSaved(clone(data.content)); }
  }, [data]);

  const section = SECTIONS.find((s) => s.key === active);
  const dirtyKeys = useMemo(() => (draft && saved ? SECTIONS.filter((s) => JSON.stringify(draft[s.key]) !== JSON.stringify(saved[s.key])).map((s) => s.key) : []), [draft, saved]);

  const setField = (k) => (v) => setDraft((d) => ({ ...d, [active]: { ...d[active], [k]: v } }));

  const save = async (keys) => {
    setBusy(true);
    try {
      const body = Object.fromEntries(keys.map((k) => [k, draft[k]]));
      const r = await api.put('/admin/site-content', body);
      resetSiteCache();
      setSaved((s) => ({ ...s, ...clone(Object.fromEntries(keys.map((k) => [k, r.content[k]]))) }));
      setDraft((d) => ({ ...d, ...clone(Object.fromEntries(keys.map((k) => [k, r.content[k]]))) }));
      toast.success(keys.length > 1 ? 'All changes published' : 'Section published');
    } catch (e) { toast.error(errorMessage(e)); } finally { setBusy(false); }
  };

  const reset = async () => {
    setConfirmReset(false);
    setBusy(true);
    try {
      const r = await api.post('/admin/site-content/reset', [active]);
      resetSiteCache();
      setDraft((d) => ({ ...d, [active]: clone(r.content[active]) }));
      setSaved((s) => ({ ...s, [active]: clone(r.content[active]) }));
      toast.success('Section restored to default');
    } catch (e) { toast.error(errorMessage(e)); } finally { setBusy(false); }
  };

  return (
    <>
      <PageHeader title="Landing page" description="Edit everything visitors see on the home page and the login page. Changes go live when you press Publish."
        actions={<><a className="btn btn-secondary" href="/" target="_blank" rel="noopener noreferrer"><Icon name="external" size={16} /> View site</a><Button icon="check" loading={busy} disabled={dirtyKeys.length === 0} onClick={() => save(dirtyKeys)}>Publish all{dirtyKeys.length ? ` (${dirtyKeys.length})` : ''}</Button></>} />
      <DataState loading={loading} error={error} onRetry={reload} hasData={!!draft}>
        {draft && (
          <div className="le-layout">
            <nav className="le-nav" aria-label="Sections">
              {SECTIONS.map((s) => (
                <button key={s.key} type="button" className={`le-tab ${active === s.key ? 'active' : ''}`} onClick={() => setActive(s.key)} aria-current={active === s.key ? 'true' : undefined} data-testid={`le-tab-${s.key}`}>
                  <Icon name={s.icon} size={17} /><span>{s.label}</span>{dirtyKeys.includes(s.key) && <span className="le-dot" aria-label="Unsaved changes" />}
                </button>
              ))}
              <button type="button" className={`le-tab ${active === 'newsletter' ? 'active' : ''}`} onClick={() => setActive('newsletter')}><Icon name="mail" size={17} /><span>Newsletter list</span></button>
            </nav>
            <div className="le-main">
              {active === 'newsletter' ? <Newsletter /> : section && draft[active] && (
                <Card title={section.label} subtitle={section.help} actions={dirtyKeys.includes(active) ? <Badge tone="warning" dot>Unpublished changes</Badge> : <Badge tone="success" dot>Live</Badge>}>
                  <div className="stack" data-testid="le-form">
                    {section.fields.map((f) => <FieldEditor key={f.k} spec={f} value={draft[active][f.k]} onChange={setField(f.k)} />)}
                  </div>
                  <div className="row-wrap le-foot">
                    <Button icon="check" loading={busy} disabled={!dirtyKeys.includes(active)} onClick={() => save([active])}>Publish section</Button>
                    <Button variant="ghost" disabled={!dirtyKeys.includes(active)} onClick={() => setDraft((d) => ({ ...d, [active]: clone(saved[active]) }))}>Discard changes</Button>
                    <Button variant="ghost" icon="refresh" onClick={() => setConfirmReset(true)}>Restore default</Button>
                  </div>
                </Card>
              )}
            </div>
          </div>
        )}
      </DataState>
      <ConfirmDialog open={confirmReset} title="Restore default?" message={`The "${section?.label}" section will go back to the built-in default content.`} confirmLabel="Restore" onConfirm={reset} onCancel={() => setConfirmReset(false)} />
    </>
  );
}
