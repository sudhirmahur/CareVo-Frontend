import { useCallback, useMemo, useState } from 'react';
import { Plus, Sparkles } from 'lucide-react';
import { getErrorMessage } from '../../api/errors';
import { skillApi } from '../../api/skill.api';
import DataState from '../../components/common/DataState';
import PageHeader from '../../components/common/PageHeader';
import SkillBadge from '../../components/profile/SkillBadge';
import Button from '../../components/ui/Button';
import Card, { CardTitle } from '../../components/ui/Card';
import SearchBar from '../../components/ui/SearchBar';
import Select from '../../components/ui/Select';
import { SkeletonList } from '../../components/ui/Skeleton';
import useApi from '../../hooks/useApi';
import useDebounce from '../../hooks/useDebounce';
import useToast from '../../hooks/useToast';
import { PROFICIENCY_LEVELS } from '../../utils/constants';
import { unwrapList } from '../../utils/helpers';
import { normalizeCatalogSkill, normalizeUserSkill } from '../../utils/normalizers';

export default function Skills() {
  const toast = useToast();
  const [search, setSearch] = useState('');
  const [proficiency, setProficiency] = useState('intermediate');
  const [busyId, setBusyId] = useState(null);
  const debouncedSearch = useDebounce(search, 300);

  const mineRequest = useCallback(() => skillApi.listMine(), []);
  const mine = useApi(mineRequest);
  const mySkills = useMemo(() => unwrapList(mine.data).map(normalizeUserSkill), [mine.data]);

  const catalogRequest = useCallback(() => skillApi.list({ search: debouncedSearch }), [debouncedSearch]);
  const catalog = useApi(catalogRequest);
  const ownedIds = useMemo(() => new Set(mySkills.map((skill) => skill.id)), [mySkills]);

  // The backend may or may not filter by `search`, so filter again locally.
  const results = useMemo(() => {
    const term = debouncedSearch.trim().toLowerCase();
    return unwrapList(catalog.data)
      .map(normalizeCatalogSkill)
      .filter((skill) => !ownedIds.has(skill.id) && (!term || skill.name.toLowerCase().includes(term)))
      .slice(0, 30);
  }, [catalog.data, debouncedSearch, ownedIds]);

  const addSkill = async (skill) => {
    setBusyId(skill.id);
    try {
      await skillApi.add({ skillId: skill.id, proficiency });
      toast.success(`${skill.name} added`);
      await mine.reload();
    } catch (err) {
      toast.error(getErrorMessage(err));
    } finally {
      setBusyId(null);
    }
  };

  const removeSkill = async (skill) => {
    setBusyId(skill.id);
    try {
      await skillApi.remove(skill.id);
      toast.success(`${skill.name} removed`);
      await mine.reload();
    } catch (err) {
      toast.error(getErrorMessage(err));
    } finally {
      setBusyId(null);
    }
  };

  return (
    <>
      <PageHeader title="Skills" description="Show recruiters what you are good at." />
      <div className="grid gap-5 lg:grid-cols-2">
        <Card>
          <CardTitle title="Your skills" />
          <DataState
            loading={mine.loading}
            error={mine.error}
            onRetry={mine.reload}
            skeleton={<SkeletonList count={1} lines={2} />}
            isEmpty={mySkills.length === 0}
            empty={{ icon: Sparkles, title: 'No skills yet', description: 'Search the catalogue and add your first skill.', className: 'py-8' }}
          >
            <div className="flex flex-wrap gap-2">
              {mySkills.map((skill) => (
                <SkillBadge
                  key={skill.id}
                  name={skill.name}
                  proficiency={skill.proficiency}
                  removing={busyId === skill.id}
                  onRemove={() => removeSkill(skill)}
                />
              ))}
            </div>
          </DataState>
        </Card>

        <Card className="space-y-4">
          <CardTitle title="Add a skill" className="mb-0" />
          <div className="grid gap-3 sm:grid-cols-[1fr_10rem]">
            <SearchBar value={search} onChange={setSearch} placeholder="Search skills" />
            <Select aria-label="Proficiency" options={PROFICIENCY_LEVELS} value={proficiency} onChange={(event) => setProficiency(event.target.value)} />
          </div>
          <DataState
            loading={catalog.loading}
            error={catalog.error}
            onRetry={catalog.reload}
            skeleton={<SkeletonList count={1} lines={2} />}
            isEmpty={results.length === 0}
            empty={{ title: 'No matching skills', description: 'Try a different search term.', className: 'py-8' }}
          >
            <ul className="max-h-80 divide-y divide-border overflow-y-auto rounded-xl border border-border">
              {results.map((skill) => (
                <li key={skill.id} className="flex items-center justify-between gap-3 px-3.5 py-2.5">
                  <span className="text-sm">{skill.name}</span>
                  <Button size="sm" variant="secondary" leftIcon={Plus} loading={busyId === skill.id} onClick={() => addSkill(skill)}>
                    Add
                  </Button>
                </li>
              ))}
            </ul>
          </DataState>
        </Card>
      </div>
    </>
  );
}
