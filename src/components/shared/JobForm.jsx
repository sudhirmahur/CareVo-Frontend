import { useState } from 'react';
import { JOB_TYPES, fromLocalInput, isHttpUrl, toLocalInput } from '../../lib/format';
import { Button, Input, Select, TagInput, Textarea } from '../ui';
import Icon from '../Icon';

const TYPES = [...JOB_TYPES, ...(JOB_TYPES.some((t) => t.value === 'freelance') ? [] : [{ value: 'freelance', label: 'Freelance' }])];
const MODES = [{ value: 'onsite', label: 'On-site' }, { value: 'hybrid', label: 'Hybrid' }, { value: 'remote', label: 'Remote' }];
const KINDS = [{ value: 'general', label: 'General' }, { value: 'experience', label: 'Experience' }, { value: 'qualification', label: 'Qualification' }];
let qSeq = 0;
const newQ = (q = {}) => ({ key: `q${(qSeq += 1)}`, id: q.id, type: q.type || 'text', question: q.question || '', options: (q.options || []).join(', '), required: q.required ?? true, kind: q.kind || 'general' });

const lines = (arr) => (arr || []).join('\n');
const toLines = (s) => s.split('\n').map((x) => x.trim()).filter(Boolean);

/**
 * Shared create/edit job form (recruiter + admin).
 * props: initial (job), companies (admin only -> shows company picker), onSubmit(payload), submitting, submitLabel
 */
export default function JobForm({ initial, companies, onSubmit, submitting, submitLabel = 'Save job', onCancel }) {
  const [f, setF] = useState(() => ({
    title: initial?.title || '',
    description: initial?.description || '',
    company_id: initial?.company_id || '',
    location: initial?.location || '',
    job_type: initial?.job_type || 'fulltime',
    salary_min: initial?.salary_min ?? '',
    salary_max: initial?.salary_max ?? '',
    skills: initial?.skills || [],
    requirements: lines(initial?.requirements),
    responsibilities: lines(initial?.responsibilities),
    apply_url: initial?.apply_url || '',
    application_deadline: toLocalInput(initial?.application_deadline),
    work_mode: initial?.work_mode || '',
  }));
  const [qs, setQs] = useState(() => (initial?.screening_questions || []).map(newQ));
  const upQ = (key, patch) => setQs((a) => a.map((q) => (q.key === key ? { ...q, ...patch } : q)));
  const moveQ = (i, d) => setQs((a) => { const b = [...a]; const j = i + d; if (j < 0 || j >= b.length) return a; [b[i], b[j]] = [b[j], b[i]]; return b; });
  const [errors, setErrors] = useState({});
  const set = (k) => (e) => setF((s) => ({ ...s, [k]: e.target.value }));

  const submit = (e) => {
    e.preventDefault();
    const er = {};
    if (f.title.trim().length < 3) er.title = 'Title must be at least 3 characters.';
    if (f.description.trim().length < 10) er.description = 'Describe the role in at least 10 characters.';
    if (companies && !f.company_id) er.company_id = 'Choose a company.';
    if (f.apply_url.trim() && !isHttpUrl(f.apply_url)) er.apply_url = 'Enter a full link starting with http:// or https://';
    const lo = f.salary_min === '' ? null : Number(f.salary_min);
    const hi = f.salary_max === '' ? null : Number(f.salary_max);
    if ((lo !== null && (Number.isNaN(lo) || lo < 0)) || (hi !== null && (Number.isNaN(hi) || hi < 0))) er.salary_min = 'Salary must be a positive number.';
    else if (lo !== null && hi !== null && hi < lo) er.salary_max = 'Max salary must be at least the min salary.';
    const qErr = {};
    qs.forEach((q) => {
      if (q.question.trim().length < 3) qErr[q.key] = 'Write the question (3+ characters).';
      else if (q.type === 'choice' && q.options.split(',').map((o) => o.trim()).filter(Boolean).length < 2) qErr[q.key] = 'Add at least two options, separated by commas.';
    });
    if (Object.keys(qErr).length) er.questions = qErr;
    setErrors(er);
    if (Object.keys(er).length) return;
    const payload = {
      title: f.title.trim(),
      description: f.description.trim(),
      location: f.location.trim(),
      job_type: f.job_type,
      salary_min: lo,
      salary_max: hi,
      skills: f.skills,
      requirements: toLines(f.requirements),
      responsibilities: toLines(f.responsibilities),
      apply_url: f.apply_url.trim() || null,
      application_deadline: fromLocalInput(f.application_deadline),
      work_mode: f.work_mode || null,
      screening_questions: qs.map((q) => ({ ...(q.id ? { id: q.id } : {}), type: q.type, question: q.question.trim(), options: q.type === 'choice' ? q.options.split(',').map((o) => o.trim()).filter(Boolean) : [], required: q.required, kind: q.kind })),
    };
    if (companies) payload.company_id = f.company_id;
    if (initial && !payload.apply_url) payload.clear_apply_url = true;
    onSubmit(payload);
  };

  return (
    <form className="job-form stack" onSubmit={submit} noValidate>
      <div className="form-grid">
        <div className="full"><Input label="Job title" value={f.title} onChange={set('title')} error={errors.title} required placeholder="e.g. Senior React Developer" /></div>
        {companies && (
          <div className="full">
            <Select label="Company" value={f.company_id} onChange={set('company_id')} error={errors.company_id} required placeholder="Select company" options={companies.map((c) => ({ value: c.id, label: c.name }))} disabled={!!initial} />
          </div>
        )}
        <Input label="Location" value={f.location} onChange={set('location')} placeholder="City or Remote" />
        <Select label="Job type" value={f.job_type} onChange={set('job_type')} options={TYPES} />
        <Select label="Work mode" value={f.work_mode} onChange={set('work_mode')} placeholder="Not specified" options={MODES} />
        <Input label="Min salary (₹ / year or month)" type="number" min="0" value={f.salary_min} onChange={set('salary_min')} error={errors.salary_min} />
        <Input label="Max salary" type="number" min="0" value={f.salary_max} onChange={set('salary_max')} error={errors.salary_max} />
        <div className="full"><Textarea label="Description" rows={6} value={f.description} onChange={set('description')} error={errors.description} required /></div>
        <div className="full"><TagInput label="Skills" value={f.skills} onChange={(skills) => setF((s) => ({ ...s, skills }))} placeholder="React, Node.js… press Enter" /></div>
        <Textarea label="Responsibilities" hint="One per line" rows={4} value={f.responsibilities} onChange={set('responsibilities')} />
        <Textarea label="Requirements" hint="One per line" rows={4} value={f.requirements} onChange={set('requirements')} />
        <div className="full">
          <Input label="Company job link (optional)" type="url" value={f.apply_url} onChange={set('apply_url')} error={errors.apply_url} placeholder="https://company.com/careers/job-123" />
        </div>
        <div className="full apply-banner">
          <Icon name="link" size={18} />
          <span>{f.apply_url.trim() ? 'When a candidate clicks Apply, the application is saved in their Carevo history and they are sent to this link to finish on your site.' : 'No link set: candidates apply inside Carevo with their resume.'}</span>
        </div>
        <Input label="Application deadline (optional)" type="datetime-local" value={f.application_deadline} onChange={set('application_deadline')} />
      </div>
      <fieldset className="screening-box" data-testid="screening-editor">
        <legend>Screening questions</legend>
        <p className="muted small">Candidates answer these when they apply. You can filter applicants by their answers.</p>
        {qs.map((q, i) => (
          <div className="screening-q" key={q.key} data-testid="screening-q">
            <div className="form-grid">
              <div className="full"><Input label={`Question ${i + 1}`} value={q.question} onChange={(e) => upQ(q.key, { question: e.target.value })} error={errors.questions?.[q.key]} maxLength={300} /></div>
              <Select label="Answer type" value={q.type} onChange={(e) => upQ(q.key, { type: e.target.value })} options={[{ value: 'text', label: 'Text' }, { value: 'choice', label: 'Multiple choice' }, { value: 'yesno', label: 'Yes / No' }]} />
              <Select label="Category" value={q.kind} onChange={(e) => upQ(q.key, { kind: e.target.value })} options={KINDS} />
              {q.type === 'choice' && <div className="full"><Input label="Options (comma separated)" value={q.options} onChange={(e) => upQ(q.key, { options: e.target.value })} placeholder="Immediate, 30 days, 60 days" /></div>}
            </div>
            <div className="row-wrap">
              <label className="small"><input type="checkbox" checked={q.required} onChange={(e) => upQ(q.key, { required: e.target.checked })} /> Required</label>
              <Button variant="ghost" size="sm" onClick={() => moveQ(i, -1)} disabled={i === 0} aria-label={`Move question ${i + 1} up`}>Up</Button>
              <Button variant="ghost" size="sm" onClick={() => moveQ(i, 1)} disabled={i === qs.length - 1} aria-label={`Move question ${i + 1} down`}>Down</Button>
              <Button variant="ghost" size="sm" icon="trash" onClick={() => setQs((a) => a.filter((x) => x.key !== q.key))} aria-label={`Remove question ${i + 1}`}>Remove</Button>
            </div>
          </div>
        ))}
        {qs.length < 10 && <Button variant="secondary" size="sm" icon="plus" onClick={() => setQs((a) => [...a, newQ()])}>Add question</Button>}
      </fieldset>
      <div className="row" style={{ justifyContent: 'flex-end' }}>
        {onCancel && <Button variant="ghost" onClick={onCancel}>Cancel</Button>}
        <Button type="submit" loading={submitting}>{submitLabel}</Button>
      </div>
    </form>
  );
}
