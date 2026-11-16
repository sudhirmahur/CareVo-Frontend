import { useState } from 'react';
import { api, errorMessage } from '../../../lib/api';
import { titleCase } from '../../../lib/format';
import { useAsync } from '../../../lib/hooks';
import { useToast } from '../../../lib/toast';
import { Badge, Button, Card, ConfirmDialog, DataState, Input, Modal, PageHeader, Select, Switch, Tabs, Textarea } from '../../../components/ui';
import { ActionBtn, ListShell, useDo, usePagedList, useSearch } from '../common';

const DIFFS = ['easy', 'medium', 'hard'].map((v) => ({ value: v, label: titleCase(v) }));

function PrepForm({ item, onClose, onDone }) {
  const [f, setF] = useState(item || { category: '', difficulty: 'medium', question: '', answer: '', is_active: true });
  const [err, setErr] = useState({});
  const [run, busy] = useDo();
  const set = (k) => (e) => setF({ ...f, [k]: e.target.value });
  const submit = async () => {
    const er = {};
    if (f.category.trim().length < 2) er.category = 'Enter a category.';
    if (f.question.trim().length < 5) er.question = 'Question is too short (min 5 characters).';
    if (f.answer.trim().length < 5) er.answer = 'Answer is too short (min 5 characters).';
    setErr(er);
    if (Object.keys(er).length) return;
    const body = { category: f.category.trim(), difficulty: f.difficulty, question: f.question.trim(), answer: f.answer.trim(), is_active: f.is_active };
    const ok = await run(() => (item ? api.put(`/admin/prep/${item.id}`, body) : api.post('/admin/prep', body)), item ? 'Question updated' : 'Question added');
    if (ok) { onDone(); onClose(); }
  };
  return (
    <Modal title={item ? 'Edit question' : 'New question'} onClose={onClose} footer={<><Button variant="ghost" onClick={onClose}>Cancel</Button><Button loading={busy} onClick={submit}>Save</Button></>}>
      <div className="stack">
        <Input label="Category" value={f.category} onChange={set('category')} error={err.category} maxLength={60} placeholder="e.g. Python, HR & Behavioral" />
        <Select label="Difficulty" value={f.difficulty} onChange={set('difficulty')} options={DIFFS} />
        <Textarea label="Question" rows={2} value={f.question} onChange={set('question')} error={err.question} maxLength={400} />
        <Textarea label="Model answer" rows={5} value={f.answer} onChange={set('answer')} error={err.answer} maxLength={4000} />
        <Switch checked={f.is_active} onChange={(v) => setF({ ...f, is_active: v })} label="Visible to candidates" />
      </div>
    </Modal>
  );
}

function PrepAdmin() {
  const [q, setQ, dq] = useSearch();
  const res = usePagedList('/admin/prep', { q: dq });
  const [run] = useDo(res.reload);
  const [edit, setEdit] = useState(null);
  const [del, setDel] = useState(null);
  return (
    <>
      <div className="row between" style={{ marginBottom: 12 }}><span /><Button icon="plus" onClick={() => setEdit({})}>New question</Button></div>
      <ListShell res={res} search={q} onSearch={setQ} searchPlaceholder="Search questions" empty={{ icon: 'book', title: 'No questions', description: 'Add the first interview question.' }}>
        {(items) => (
          <div className="table-wrap"><table className="table rtable" data-testid="prep-table"><thead><tr><th>Question</th><th>Category</th><th>Level</th><th>Status</th><th /></tr></thead>
            <tbody>{items.map((i) => (
              <tr key={i.id}>
                <td data-label="Question"><span className="strong">{i.question}</span></td>
                <td data-label="Category">{i.category}</td>
                <td data-label="Level"><Badge tone={{ easy: 'success', medium: 'warning', hard: 'danger' }[i.difficulty]}>{titleCase(i.difficulty)}</Badge></td>
                <td data-label="Status">{i.is_active ? <Badge tone="success" dot>Visible</Badge> : <Badge tone="neutral" dot>Hidden</Badge>}</td>
                <td className="cell-actions"><div className="actions"><ActionBtn icon="edit" label={`Edit ${i.question}`} onClick={() => setEdit(i)} /><ActionBtn icon="trash" tone="danger" label={`Delete ${i.question}`} onClick={() => setDel(i)} /></div></td>
              </tr>))}</tbody></table></div>
        )}
      </ListShell>
      {edit && <PrepForm item={edit.id ? edit : null} onClose={() => setEdit(null)} onDone={res.reload} />}
      <ConfirmDialog open={!!del} danger title="Delete question?" message="Candidates' progress on this question is removed too." confirmLabel="Delete" onCancel={() => setDel(null)} onConfirm={async () => { const d = del; setDel(null); await run(() => api.delete(`/admin/prep/${d.id}`), 'Question deleted'); }} />
    </>
  );
}

const BLANK_Q = { q: '', options: ['', '', '', ''], answer: 0, explanation: '' };

function AssessmentForm({ item, onClose, onDone }) {
  const [f, setF] = useState(item ? { ...item, questions: item.questions.map((q) => ({ ...q })) } : { title: '', skill: '', description: '', pass_percent: 60, is_active: true, questions: [JSON.parse(JSON.stringify(BLANK_Q))] });
  const [error, setError] = useState('');
  const [run, busy] = useDo();
  const setQ = (i, patch) => setF((s) => ({ ...s, questions: s.questions.map((q, n) => (n === i ? { ...q, ...patch } : q)) }));
  const submit = async () => {
    if (f.title.trim().length < 3) return setError('Enter a title (min 3 characters).');
    if (!f.skill.trim()) return setError('Enter the skill this assessment verifies.');
    if (f.questions.length === 0) return setError('Add at least one question.');
    for (let i = 0; i < f.questions.length; i += 1) {
      const q = f.questions[i];
      if (q.q.trim().length < 5) return setError(`Question ${i + 1}: text is too short.`);
      if (q.options.filter((o) => o.trim()).length < 2) return setError(`Question ${i + 1}: add at least two options.`);
      if (!q.options[q.answer]?.trim()) return setError(`Question ${i + 1}: the correct answer must be one of the filled options.`);
    }
    setError('');
    // drop empty trailing options but keep the correct-answer index pointing at the right text
    const questions = f.questions.map((q) => {
      const keep = q.options.map((o, idx) => [o.trim(), idx]).filter(([o]) => o);
      return { q: q.q.trim(), options: keep.map(([o]) => o), answer: keep.findIndex(([, idx]) => idx === q.answer), explanation: (q.explanation || '').trim() };
    });
    const body = { title: f.title.trim(), skill: f.skill.trim(), description: (f.description || '').trim(), pass_percent: Number(f.pass_percent), is_active: f.is_active, questions };
    const ok = await run(() => (item ? api.put(`/admin/assessments/${item.id}`, body) : api.post('/admin/assessments', body)), item ? 'Assessment updated' : 'Assessment created');
    if (ok) { onDone(); onClose(); }
  };
  return (
    <Modal size="lg" title={item ? 'Edit assessment' : 'New assessment'} onClose={onClose} footer={<><Button variant="ghost" onClick={onClose}>Cancel</Button><Button loading={busy} onClick={submit}>Save assessment</Button></>}>
      <div className="stack">
        {error && <p className="form-error" role="alert">{error}</p>}
        <div className="form-grid">
          <Input label="Title" value={f.title} maxLength={100} onChange={(e) => setF({ ...f, title: e.target.value })} />
          <Input label="Skill verified" value={f.skill} maxLength={60} onChange={(e) => setF({ ...f, skill: e.target.value })} />
          <div className="full"><Input label="Description" value={f.description} maxLength={300} onChange={(e) => setF({ ...f, description: e.target.value })} /></div>
          <Input label="Pass mark (%)" type="number" min="1" max="100" value={f.pass_percent} onChange={(e) => setF({ ...f, pass_percent: e.target.value })} />
          <div style={{ alignSelf: 'end' }}><Switch checked={f.is_active} onChange={(v) => setF({ ...f, is_active: v })} label="Visible to candidates" /></div>
        </div>
        <h3>Questions ({f.questions.length}/50)</h3>
        {f.questions.map((q, i) => (
          <fieldset className="le-item" key={i}>
            <legend>Question {i + 1}</legend>
            <Textarea label="Question" rows={2} value={q.q} maxLength={400} onChange={(e) => setQ(i, { q: e.target.value })} />
            {q.options.map((o, k) => (
              <div className="row" key={k}>
                <input type="radio" name={`ans-${i}`} checked={q.answer === k} onChange={() => setQ(i, { answer: k })} aria-label={`Option ${k + 1} is correct`} />
                <input className="input" value={o} maxLength={200} placeholder={`Option ${k + 1}`} aria-label={`Question ${i + 1} option ${k + 1}`} onChange={(e) => setQ(i, { options: q.options.map((x, n) => (n === k ? e.target.value : x)) })} />
              </div>
            ))}
            <p className="muted small">Select the radio button next to the correct option.</p>
            <Input label="Explanation (shown after submitting)" value={q.explanation || ''} maxLength={500} onChange={(e) => setQ(i, { explanation: e.target.value })} />
            <div><Button size="sm" variant="ghost" icon="trash" onClick={() => setF((s) => ({ ...s, questions: s.questions.filter((_, n) => n !== i) }))} disabled={f.questions.length === 1}>Remove question</Button></div>
          </fieldset>
        ))}
        <div><Button variant="secondary" icon="plus" disabled={f.questions.length >= 50} onClick={() => setF((s) => ({ ...s, questions: [...s.questions, JSON.parse(JSON.stringify(BLANK_Q))] }))}>Add question</Button></div>
      </div>
    </Modal>
  );
}

function AssessmentsAdmin() {
  const { data, loading, error, reload } = useAsync(() => api.get('/admin/assessments'), []);
  const [run] = useDo(reload);
  const [edit, setEdit] = useState(null);
  const [del, setDel] = useState(null);
  const items = data?.items || [];
  return (
    <>
      <div className="row between" style={{ marginBottom: 12 }}><span /><Button icon="plus" onClick={() => setEdit({})}>New assessment</Button></div>
      <Card padded={false}>
        <DataState loading={loading} error={error} onRetry={reload} hasData={!!data} isEmpty={items.length === 0} empty={{ icon: 'award', title: 'No assessments', description: 'Create the first quiz.' }}>
          <div className="table-wrap"><table className="table rtable" data-testid="assessments-table"><thead><tr><th>Assessment</th><th>Skill</th><th>Questions</th><th>Attempts</th><th>Status</th><th /></tr></thead>
            <tbody>{items.map((a) => (
              <tr key={a.id}>
                <td data-label="Assessment"><span className="strong">{a.title}</span></td><td data-label="Skill">{a.skill}</td><td data-label="Questions">{a.questions_count}</td><td data-label="Attempts">{a.attempts}</td>
                <td data-label="Status">{a.is_active ? <Badge tone="success" dot>Visible</Badge> : <Badge tone="neutral" dot>Hidden</Badge>}</td>
                <td className="cell-actions"><div className="actions"><ActionBtn icon="edit" label={`Edit ${a.title}`} onClick={() => setEdit(a)} /><ActionBtn icon="trash" tone="danger" label={`Delete ${a.title}`} onClick={() => setDel(a)} /></div></td>
              </tr>))}</tbody></table></div>
        </DataState>
      </Card>
      {edit && <AssessmentForm item={edit.id ? edit : null} onClose={() => setEdit(null)} onDone={reload} />}
      <ConfirmDialog open={!!del} danger title="Delete assessment?" message="All results for it are removed too." confirmLabel="Delete" onCancel={() => setDel(null)} onConfirm={async () => { const d = del; setDel(null); await run(() => api.delete(`/admin/assessments/${d.id}`), 'Assessment deleted'); }} />
    </>
  );
}

export default function Learning() {
  const [tab, setTab] = useState('prep');
  return (
    <>
      <PageHeader title="Interview prep & assessments" description="Manage the question bank and skill quizzes candidates see." />
      <Tabs tabs={[{ value: 'prep', label: 'Interview prep' }, { value: 'assessments', label: 'Skill assessments' }]} value={tab} onChange={setTab} />
      {tab === 'prep' ? <PrepAdmin /> : <AssessmentsAdmin />}
    </>
  );
}
