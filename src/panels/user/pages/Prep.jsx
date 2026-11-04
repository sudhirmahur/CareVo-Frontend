import { useState } from 'react';
import { api, errorMessage } from '../../../lib/api';
import { titleCase } from '../../../lib/format';
import { useAsync, useDebounce } from '../../../lib/hooks';
import { useToast } from '../../../lib/toast';
import Icon from '../../../components/Icon';
import { Badge, Button, DataState, PageHeader, Pagination, SearchInput, Select, SkeletonList } from '../../../components/ui';

const DIFF_TONE = { easy: 'success', medium: 'warning', hard: 'danger' };

export default function Prep() {
  const toast = useToast();
  const [category, setCategory] = useState('');
  const [difficulty, setDifficulty] = useState('');
  const [status, setStatus] = useState('');
  const [q, setQ] = useState('');
  const [page, setPage] = useState(1);
  const [open, setOpen] = useState(null);
  const dq = useDebounce(q, 350);
  const cats = useAsync(() => api.get('/prep/categories'), []);
  const { data, loading, error, reload, setData } = useAsync(
    () => api.get('/prep', { category, difficulty, status, q: dq, page, limit: 10 }),
    [category, difficulty, status, dq, page],
  );
  const items = data?.items || [];
  const prog = data?.progress;

  const mark = async (item, next) => {
    const value = item.my_status === next ? 'none' : next;
    setData((d) => ({ ...d, items: d.items.map((x) => (x.id === item.id ? { ...x, my_status: value } : x)) }));
    try {
      await api.put(`/prep/${item.id}/progress`, { status: value });
      reload();
    } catch (e) {
      setData((d) => ({ ...d, items: d.items.map((x) => (x.id === item.id ? { ...x, my_status: item.my_status } : x)) }));
      toast.error(errorMessage(e));
    }
  };
  const pct = prog && prog.total ? Math.round((prog.known / prog.total) * 100) : 0;

  return (
    <>
      <PageHeader title="Interview Prep" description="Practice common questions, mark what you know and revisit the rest." />
      {prog && (
        <div className="u-card u-prog">
          <div className="grow">
            <strong>{prog.known} of {prog.total} questions mastered</strong>
            <div className="u-bar" role="progressbar" aria-valuenow={pct} aria-valuemin={0} aria-valuemax={100} aria-label="Prep progress"><span style={{ width: `${pct}%` }} /></div>
          </div>
          <Badge tone="warning">{prog.review} to review</Badge>
        </div>
      )}
      <div className="u-filterbar">
        <SearchInput value={q} onChange={(v) => { setQ(v); setPage(1); }} placeholder="Search questions" />
        <div className="u-prep-filters">
          <Select aria-label="Category" value={category} onChange={(e) => { setCategory(e.target.value); setPage(1); }} placeholder="All categories" options={(cats.data?.items || []).map((c) => ({ value: c, label: c }))} />
          <Select aria-label="Difficulty" value={difficulty} onChange={(e) => { setDifficulty(e.target.value); setPage(1); }} placeholder="Any difficulty" options={['easy', 'medium', 'hard'].map((v) => ({ value: v, label: titleCase(v) }))} />
          <Select aria-label="Status" value={status} onChange={(e) => { setStatus(e.target.value); setPage(1); }} placeholder="All questions" options={[{ value: 'known', label: 'I know this' }, { value: 'review', label: 'Need review' }, { value: 'none', label: 'Not started' }]} />
        </div>
      </div>
      <DataState loading={loading} error={error} onRetry={reload} hasData={!!data} skeleton={<SkeletonList count={4} lines={2} />} isEmpty={items.length === 0} empty={{ icon: 'book', title: 'No questions found', description: 'Try another category or search.' }}>
        <ul className="u-qlist">
          {items.map((it) => {
            const isOpen = open === it.id;
            return (
              <li key={it.id} className={`u-q ${it.my_status}`} data-testid="prep-item">
                <button type="button" className="u-q-head" aria-expanded={isOpen} onClick={() => setOpen(isOpen ? null : it.id)}>
                  <span className="grow"><strong>{it.question}</strong><span className="row-wrap"><Badge tone="brand">{it.category}</Badge><Badge tone={DIFF_TONE[it.difficulty]}>{titleCase(it.difficulty)}</Badge>{it.my_status === 'known' && <Badge tone="success" dot>Known</Badge>}{it.my_status === 'review' && <Badge tone="warning" dot>Review</Badge>}</span></span>
                  <Icon name={isOpen ? 'chevronUp' : 'chevronDown'} size={20} />
                </button>
                {isOpen && (
                  <div className="u-q-body">
                    <p>{it.answer}</p>
                    <div className="row-wrap">
                      <Button size="sm" variant={it.my_status === 'known' ? 'soft' : 'secondary'} icon="check" onClick={() => mark(it, 'known')} aria-pressed={it.my_status === 'known'}>I know this</Button>
                      <Button size="sm" variant={it.my_status === 'review' ? 'soft' : 'secondary'} icon="refresh" onClick={() => mark(it, 'review')} aria-pressed={it.my_status === 'review'}>Review later</Button>
                    </div>
                  </div>
                )}
              </li>
            );
          })}
        </ul>
        <Pagination page={data?.page || 1} pages={data?.pages} onChange={setPage} />
      </DataState>
    </>
  );
}
