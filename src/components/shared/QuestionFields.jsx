import { useState } from 'react';
import { api, errorMessage } from '../../lib/api';
import { Field, Input, Select, Textarea } from '../ui';
import { cleanAnswers, validateAnswers } from '../../lib/questions';

export { cleanAnswers, validateAnswers };

export const QUESTION_TYPES = [
  { value: 'text', label: 'Short text' },
  { value: 'long_text', label: 'Long text' },
  { value: 'choice', label: 'Single choice' },
  { value: 'multiple', label: 'Multiple choice' },
  { value: 'yesno', label: 'Yes / No' },
  { value: 'number', label: 'Number' },
  { value: 'email', label: 'Email' },
  { value: 'file', label: 'File upload' },
];
export const MAX_FILE_MB = 8;
/**
 * Renders a job's application questions. Used by the candidate Apply form and by the recruiter's preview.
 * props: questions, answers, onChange(id, value), errors, jobId (needed for file uploads), preview (no uploads)
 */
export default function QuestionFields({ questions, answers, onChange, errors = {}, jobId, preview = false }) {
  const [files, setFiles] = useState({}); // id -> { name, busy, error }
  const upload = async (q, file) => {
    if (!file) return;
    if (file.size > MAX_FILE_MB * 1024 * 1024) { setFiles((s) => ({ ...s, [q.id]: { error: `File is too large (max ${MAX_FILE_MB} MB)` } })); return; }
    if (preview) { setFiles((s) => ({ ...s, [q.id]: { name: file.name } })); onChange(q.id, 'preview-file'); return; }
    setFiles((s) => ({ ...s, [q.id]: { name: file.name, busy: true } }));
    try {
      const form = new FormData();
      form.append('file', file);
      const res = await api.post(`/jobs/${jobId}/answer-file`, undefined, { form });
      setFiles((s) => ({ ...s, [q.id]: { name: res.name } }));
      onChange(q.id, res.file_id);
    } catch (e) {
      setFiles((s) => ({ ...s, [q.id]: { error: errorMessage(e) } }));
      onChange(q.id, '');
    }
  };

  return (questions || []).map((q) => {
    const err = errors[q.id];
    const label = `${q.question}${q.required !== false ? ' *' : ''}`;
    const v = answers[q.id];
    const set = (x) => onChange(q.id, x);
    switch (q.type) {
      case 'long_text':
        return <Textarea key={q.id} label={label} rows={5} maxLength={4000} value={v || ''} onChange={(e) => set(e.target.value)} error={err} />;
      case 'number':
        return <Input key={q.id} label={label} type="number" inputMode="decimal" step="any" value={v ?? ''} onChange={(e) => set(e.target.value)} error={err} />;
      case 'email':
        return <Input key={q.id} label={label} type="email" autoComplete="off" maxLength={254} value={v || ''} onChange={(e) => set(e.target.value)} error={err} />;
      case 'multiple': {
        const picked = Array.isArray(v) ? v : [];
        return (
          <Field key={q.id} label={label} error={err}>
            <div className="q-options" role="group" aria-label={q.question}>
              {(q.options || []).map((o) => (
                <label key={o} className="q-option">
                  <input type="checkbox" checked={picked.includes(o)} onChange={(e) => set(e.target.checked ? [...picked, o] : picked.filter((x) => x !== o))} /> {o}
                </label>
              ))}
            </div>
          </Field>
        );
      }
      case 'file': {
        const f = files[q.id] || {};
        return (
          <Field key={q.id} label={label} error={err || f.error} hint={`PDF, DOC, DOCX, PNG or JPG, up to ${MAX_FILE_MB} MB`}>
            <input type="file" data-testid={`q-file-${q.id}`} accept=".pdf,.doc,.docx,.png,.jpg,.jpeg" aria-label={q.question} onChange={(e) => upload(q, e.target.files?.[0])} />
            {f.busy && <p className="muted small">Uploading {f.name}…</p>}
            {!f.busy && f.name && !f.error && <p className="small">Attached: {f.name}</p>}
          </Field>
        );
      }
      case 'choice':
      case 'yesno': {
        const opts = q.type === 'yesno' ? ['Yes', 'No'] : q.options || [];
        return <Select key={q.id} label={label} value={v || ''} onChange={(e) => set(e.target.value)} error={err} options={[{ value: '', label: 'Select an answer' }, ...opts.map((o) => ({ value: o, label: o }))]} />;
      }
      default:
        return <Textarea key={q.id} label={label} rows={2} maxLength={1000} value={v || ''} onChange={(e) => set(e.target.value)} error={err} />;
    }
  });
}
