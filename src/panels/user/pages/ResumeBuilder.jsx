import { useEffect, useState } from 'react';
import { api, errorMessage, safeHref } from '../../../lib/api';
import { useAsync } from '../../../lib/hooks';
import { Link } from '../../../lib/router';
import { useToast } from '../../../lib/toast';
import Icon from '../../../components/Icon';
import { Button, Card, DataState, Input, PageHeader, SkeletonList, TagInput, Textarea } from '../../../components/ui';

const BLANK = {
  experience: { role: '', company: '', start: '', end: '', details: '' },
  education: { degree: '', school: '', start: '', end: '' },
  projects: { name: '', link: '', details: '' },
};

function ListEditor({ title, kind, items, onChange, fields, max }) {
  const set = (i, k, v) => onChange(items.map((it, n) => (n === i ? { ...it, [k]: v } : it)));
  return (
    <Card title={title} actions={items.length < max && <Button size="sm" variant="secondary" icon="plus" onClick={() => onChange([...items, { ...BLANK[kind] }])}>Add</Button>}>
      {items.length === 0 && <p className="muted small">Nothing added yet.</p>}
      <div className="stack">
        {items.map((it, i) => (
          <div className="rb-item" key={i}>
            <div className="form-grid">
              {fields.map(([k, label, opts = {}]) => (
                <div className={opts.full ? 'full' : ''} key={k}>
                  {opts.area
                    ? <Textarea label={label} rows={3} value={it[k]} maxLength={opts.max || 1500} onChange={(e) => set(i, k, e.target.value)} />
                    : <Input label={label} value={it[k]} maxLength={opts.max || 120} onChange={(e) => set(i, k, e.target.value)} />}
                </div>
              ))}
            </div>
            <Button size="sm" variant="ghost" icon="trash" onClick={() => onChange(items.filter((_, n) => n !== i))} aria-label={`Remove ${title} entry ${i + 1}`}>Remove</Button>
          </div>
        ))}
      </div>
    </Card>
  );
}

function Preview({ d }) {
  const links = (d.links || []).filter(Boolean);
  const contact = [d.email, d.phone, d.location].filter(Boolean);
  return (
    <article className={`rb-paper rb-${d.template}`} aria-label="Resume preview" id="rb-preview">
      <header>
        <h1>{d.full_name || 'Your Name'}</h1>
        {d.headline && <p className="rb-headline">{d.headline}</p>}
        <p className="rb-contact">{contact.join('  •  ')}</p>
        {links.length > 0 && <p className="rb-contact">{links.map((l, i) => { const h = safeHref(l); return <span key={i}>{i > 0 && '  •  '}{h ? <a href={h} target="_blank" rel="noopener noreferrer">{l.replace(/^https?:\/\//, '')}</a> : l}</span>; })}</p>}
      </header>
      {d.summary && <section><h2>Summary</h2><p>{d.summary}</p></section>}
      {d.skills?.length > 0 && <section><h2>Skills</h2><p>{d.skills.join(', ')}</p></section>}
      {d.experience?.some((e) => e.role || e.company) && (
        <section><h2>Experience</h2>
          {d.experience.filter((e) => e.role || e.company).map((e, i) => (
            <div key={i} className="rb-entry"><div className="rb-row"><strong>{e.role}{e.role && e.company ? ' - ' : ''}{e.company}</strong><span>{[e.start, e.end].filter(Boolean).join(' - ')}</span></div>{e.details && <p>{e.details}</p>}</div>
          ))}
        </section>
      )}
      {d.projects?.some((p) => p.name) && (
        <section><h2>Projects</h2>
          {d.projects.filter((p) => p.name).map((p, i) => <div key={i} className="rb-entry"><div className="rb-row"><strong>{p.name}</strong>{p.link && <span>{p.link.replace(/^https?:\/\//, '')}</span>}</div>{p.details && <p>{p.details}</p>}</div>)}
        </section>
      )}
      {d.education?.some((e) => e.degree || e.school) && (
        <section><h2>Education</h2>
          {d.education.filter((e) => e.degree || e.school).map((e, i) => <div key={i} className="rb-entry"><div className="rb-row"><strong>{e.degree}{e.degree && e.school ? ' - ' : ''}{e.school}</strong><span>{[e.start, e.end].filter(Boolean).join(' - ')}</span></div></div>)}
        </section>
      )}
    </article>
  );
}

export default function ResumeBuilder() {
  const toast = useToast();
  const { data, loading, error, reload } = useAsync(() => api.get('/resume-builder'), []);
  const [d, setD] = useState(null);
  const [busy, setBusy] = useState(false);
  const [dirty, setDirty] = useState(false);
  useEffect(() => { if (data) { setD(data.data); setDirty(false); } }, [data]);
  const set = (k) => (e) => { setD((s) => ({ ...s, [k]: e.target.value })); setDirty(true); };
  const upd = (k) => (v) => { setD((s) => ({ ...s, [k]: v })); setDirty(true); };

  const save = async () => {
    setBusy(true);
    try {
      await api.put('/resume-builder', { ...d, links: (d.links || []).map((l) => l.trim()).filter(Boolean) });
      toast.success('Resume saved');
      setDirty(false);
    } catch (e) { toast.error(errorMessage(e)); } finally { setBusy(false); }
  };

  return (
    <>
      <PageHeader title="Resume Builder" description="Build a clean resume here, then print it or save it as a PDF."
        actions={<><Link className="btn btn-secondary" to="/resume"><Icon name="upload" size={16} /> Uploaded resumes</Link><Button variant="secondary" icon="printer" onClick={() => window.print()}>Print / Save PDF</Button><Button icon="check" loading={busy} onClick={save} disabled={!dirty && data?.saved}>Save</Button></>} />
      <DataState loading={loading} error={error} onRetry={reload} hasData={!!d} skeleton={<SkeletonList count={3} lines={4} />}>
        {d && (
          <div className="rb-layout">
            <div className="stack rb-form">
              <Card title="Basics">
                <div className="form-grid">
                  <Input label="Full name" value={d.full_name} maxLength={100} onChange={set('full_name')} />
                  <Input label="Headline" value={d.headline} maxLength={120} onChange={set('headline')} placeholder="e.g. Frontend Developer" />
                  <Input label="Email" type="email" value={d.email} maxLength={254} onChange={set('email')} />
                  <Input label="Phone" type="tel" value={d.phone} maxLength={30} onChange={set('phone')} />
                  <div className="full"><Input label="Location" value={d.location} maxLength={100} onChange={set('location')} /></div>
                  <div className="full"><TagInput label="Links" value={d.links || []} onChange={upd('links')} placeholder="Paste a link and press Enter" hint="LinkedIn, GitHub, portfolio" /></div>
                  <div className="full"><Textarea label="Summary" rows={4} value={d.summary} maxLength={1500} onChange={set('summary')} /></div>
                  <div className="full"><TagInput label="Skills" value={d.skills || []} onChange={upd('skills')} placeholder="Add a skill and press Enter" /></div>
                  <div className="full">
                    <label className="field-label" htmlFor="rb-tpl">Template</label>
                    <select id="rb-tpl" className="input select" value={d.template} onChange={set('template')}><option value="modern">Modern</option><option value="classic">Classic</option></select>
                  </div>
                </div>
              </Card>
              <ListEditor title="Experience" kind="experience" items={d.experience} onChange={upd('experience')} max={10}
                fields={[['role', 'Role'], ['company', 'Company'], ['start', 'Start'], ['end', 'End'], ['details', 'Details', { area: true, full: true }]]} />
              <ListEditor title="Projects" kind="projects" items={d.projects} onChange={upd('projects')} max={8}
                fields={[['name', 'Name'], ['link', 'Link', { max: 300 }], ['details', 'Details', { area: true, full: true, max: 800 }]]} />
              <ListEditor title="Education" kind="education" items={d.education} onChange={upd('education')} max={6}
                fields={[['degree', 'Degree'], ['school', 'School'], ['start', 'Start'], ['end', 'End']]} />
            </div>
            <div className="rb-preview-col"><Preview d={d} /></div>
          </div>
        )}
      </DataState>
    </>
  );
}
