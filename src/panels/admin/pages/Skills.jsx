import { useState } from 'react';
import { api } from '../../../lib/api';
import { useAsync } from '../../../lib/hooks';
import { Button, Card, ConfirmDialog, DataState, Input, PageHeader, SearchInput, Select } from '../../../components/ui';
import Icon from '../../../components/Icon';
import { useDo } from '../common';

export default function Skills() {
  const { data, loading, error, reload } = useAsync(() => api.get('/admin/skills'), []);
  const [run, busy] = useDo(reload);
  const [catName, setCatName] = useState('');
  const [skillName, setSkillName] = useState('');
  const [skillCat, setSkillCat] = useState('');
  const [filter, setFilter] = useState('');
  const [del, setDel] = useState(null); // {kind,id,name}
  const cats = data?.categories || [];
  const skills = (data?.items || []).filter((s) => s.name.toLowerCase().includes(filter.toLowerCase()));

  const addCat = async (e) => {
    e.preventDefault();
    if (!catName.trim()) return;
    if (await run(() => api.post('/admin/skill-categories', { name: catName.trim() }), 'Category added')) setCatName('');
  };
  const addSkill = async (e) => {
    e.preventDefault();
    if (!skillName.trim()) return;
    if (await run(() => api.post('/admin/skills', { name: skillName.trim(), category_id: skillCat || null }), 'Skill added')) setSkillName('');
  };
  return (
    <>
      <PageHeader title="Skills & categories" description="The taxonomy candidates pick from and jobs are tagged with." />
      <DataState loading={loading} error={error} onRetry={reload} hasData={!!data}>
        <div className="grid grid-2 ad-skills">
          <Card title="Categories" subtitle={`${cats.length} categories`}>
            <form className="row ad-addrow" onSubmit={addCat}>
              <input className="input" aria-label="New category name" placeholder="New category" value={catName} onChange={(e) => setCatName(e.target.value)} maxLength={60} />
              <Button type="submit" icon="plus" loading={busy}>Add category</Button>
            </form>
            <ul className="ad-list" data-testid="categories-list">
              {cats.map((c) => (
                <li key={c.id}><span>{c.name}</span><button type="button" className="icon-btn icon-btn-danger" aria-label={`Delete category ${c.name}`} onClick={() => setDel({ kind: 'category', id: c.id, name: c.name })}><Icon name="trash" size={16} /></button></li>
              ))}
              {cats.length === 0 && <li className="muted">No categories yet.</li>}
            </ul>
          </Card>
          <Card title="Skills" subtitle={`${(data?.items || []).length} skills`}>
            <form className="ad-skillform" onSubmit={addSkill}>
              <input className="input" aria-label="New skill name" placeholder="New skill" value={skillName} onChange={(e) => setSkillName(e.target.value)} maxLength={60} />
              <Select aria-label="Skill category" value={skillCat} onChange={(e) => setSkillCat(e.target.value)} placeholder="No category" options={cats.map((c) => ({ value: c.id, label: c.name }))} />
              <Button type="submit" icon="plus" loading={busy}>Add skill</Button>
            </form>
            <SearchInput value={filter} onChange={setFilter} placeholder="Filter skills" className="ad-skillfilter" />
            <ul className="ad-list ad-list-scroll" data-testid="skills-list">
              {skills.map((s) => (
                <li key={s.id}><span>{s.name} <span className="muted small">{s.category ? `· ${s.category}` : ''}</span></span><button type="button" className="icon-btn icon-btn-danger" aria-label={`Delete skill ${s.name}`} onClick={() => setDel({ kind: 'skill', id: s.id, name: s.name })}><Icon name="trash" size={16} /></button></li>
              ))}
              {skills.length === 0 && <li className="muted">No skills match.</li>}
            </ul>
          </Card>
        </div>
      </DataState>
      <ConfirmDialog open={!!del} danger title={`Delete ${del?.kind}?`} message={del && (del.kind === 'skill' ? `"${del.name}" is removed from all candidate profiles and jobs.` : `"${del.name}" is deleted. Its skills stay but become uncategorised.`)} confirmLabel="Delete" loading={busy}
        onCancel={() => setDel(null)} onConfirm={async () => { if (await run(() => api.delete(del.kind === 'skill' ? `/admin/skills/${del.id}` : `/admin/skill-categories/${del.id}`), `${del.kind === 'skill' ? 'Skill' : 'Category'} deleted`)) setDel(null); }} />
    </>
  );
}
