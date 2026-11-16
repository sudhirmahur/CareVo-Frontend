import { useMemo, useState } from 'react';
import { api, errorMessage } from '../../../lib/api';
import { titleCase } from '../../../lib/format';
import { useAsync } from '../../../lib/hooks';
import { useToast } from '../../../lib/toast';
import Icon from '../../../components/Icon';
import { Badge, Card, DataState, PageHeader, Select, SkeletonList } from '../../../components/ui';

export default function Skills() {
  const toast = useToast();
  const all = useAsync(() => api.get('/skills'), []);
  const cats = useAsync(() => api.get('/skills/categories'), []);
  const mine = useAsync(() => api.get('/skills/users/me/skills'), []);
  const [prof, setProf] = useState('intermediate');
  const [busy, setBusy] = useState(null);

  const mineIds = useMemo(() => new Set((mine.data || []).map((m) => m.skill_id)), [mine.data]);
  const grouped = useMemo(() => {
    const byCat = new Map((cats.data || []).map((c) => [c.id, { name: c.name, skills: [] }]));
    const other = { name: 'Other', skills: [] };
    (all.data || []).forEach((s) => (byCat.get(s.category_id) || other).skills.push(s));
    return [...byCat.values(), other].filter((g) => g.skills.length);
  }, [all.data, cats.data]);

  const add = async (s) => {
    setBusy(s.id);
    try { await api.post('/skills/users/me/skills', { skill_id: s.id, proficiency: prof }); toast.success(`${s.name} added`); await mine.reload(); } catch (e) { toast.error(errorMessage(e)); } finally { setBusy(null); }
  };
  const remove = async (m) => {
    setBusy(m.skill_id);
    try { await api.delete(`/skills/users/me/skills/${m.skill_id}`); toast.success(`${m.name} removed`); await mine.reload(); } catch (e) { toast.error(errorMessage(e)); } finally { setBusy(null); }
  };

  return (
    <>
      <PageHeader title="My skills" description="Pick the skills you have - we use them to recommend jobs." />
      <Card title="Your skills" subtitle={`${mine.data?.length || 0} added`} className="u-skill-mine">
        <DataState loading={mine.loading} error={mine.error} onRetry={mine.reload} hasData={!!mine.data} skeleton={<SkeletonList count={1} />} isEmpty={(mine.data || []).length === 0} empty={{ icon: 'sparkles', title: 'No skills yet', description: 'Choose some from the list below.' }}>
          <div className="chips" data-testid="my-skills">
            {(mine.data || []).map((m) => (
              <span key={m.id} className="u-skill-chip">
                {m.name} <Badge tone="brand">{titleCase(m.proficiency)}</Badge>
                <button type="button" aria-label={`Remove ${m.name}`} onClick={() => remove(m)} disabled={busy === m.skill_id}><Icon name="x" size={13} /></button>
              </span>
            ))}
          </div>
        </DataState>
      </Card>
      <div className="row-wrap" style={{ margin: '22px 0 12px', justifyContent: 'space-between' }}>
        <h2>Add skills</h2>
        <div style={{ minWidth: 200 }}><Select aria-label="Proficiency for new skills" value={prof} onChange={(e) => setProf(e.target.value)} options={[{ value: 'beginner', label: 'Beginner' }, { value: 'intermediate', label: 'Intermediate' }, { value: 'advanced', label: 'Advanced' }]} /></div>
      </div>
      <DataState loading={all.loading} error={all.error} onRetry={all.reload} hasData={!!all.data} skeleton={<SkeletonList count={2} />}>
        <div className="stack">
          {grouped.map((g) => (
            <Card key={g.name} title={g.name}>
              <div className="chips">
                {g.skills.map((s) => (
                  <button key={s.id} type="button" className={`u-pick ${mineIds.has(s.id) ? 'on' : ''}`} disabled={mineIds.has(s.id) || busy === s.id} onClick={() => add(s)} aria-label={mineIds.has(s.id) ? `${s.name} (added)` : `Add ${s.name}`}>
                    {mineIds.has(s.id) ? <Icon name="check" size={13} /> : <Icon name="plus" size={13} />} {s.name}
                  </button>
                ))}
              </div>
            </Card>
          ))}
        </div>
      </DataState>
    </>
  );
}
