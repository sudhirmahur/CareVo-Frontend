import { useState } from 'react';
import { api, errorMessage } from '../../lib/api';
import { formatDate } from '../../lib/format';
import { useAsync } from '../../lib/hooks';
import { useToast } from '../../lib/toast';
import { Badge, Button, DataState, Input, Modal, Select, Textarea } from '../../components/ui';
import { CRITERIA, REC_LABEL, REC_TONE } from './util';

function Stars({ value, onChange, label }) {
  return (
    <div className="r-stars" role="radiogroup" aria-label={label}>
      {[1, 2, 3, 4, 5].map((n) => (
        <button key={n} type="button" role="radio" aria-checked={value === n} aria-label={`${label} ${n}`} className={`r-star ${n <= (value || 0) ? 'on' : ''}`} onClick={() => onChange(value === n ? 0 : n)}>★</button>
      ))}
    </div>
  );
}

/** Evaluation form + history for one application (rendered inside the candidate modal). */
export function EvaluationPanel({ appId, teamNames = [] }) {
  const toast = useToast();
  const { data, loading, error, reload } = useAsync(() => api.get('/recruiter/evaluations', { application_id: appId }), [appId]);
  const [ratings, setRatings] = useState({});
  const [f, setF] = useState({ recommendation: '', comment: '', private_note: '', reviewer: '' });
  const [errs, setErrs] = useState('');
  const [busy, setBusy] = useState(false);
  const set = (k) => (e) => setF((s) => ({ ...s, [k]: e.target.value }));

  const submit = async (e) => {
    e.preventDefault();
    const given = Object.fromEntries(Object.entries(ratings).filter(([, v]) => v > 0));
    if (!Object.keys(given).length) return setErrs('Rate at least one criterion.');
    if (!f.recommendation) return setErrs('Choose a recommendation.');
    setErrs('');
    setBusy(true);
    try {
      await api.post('/recruiter/evaluations', { application_id: appId, ratings: given, recommendation: f.recommendation, comment: f.comment.trim() || null, private_note: f.private_note.trim() || null, reviewer: f.reviewer.trim() || null });
      toast.success('Evaluation saved');
      setRatings({}); setF({ recommendation: '', comment: '', private_note: '', reviewer: '' });
      await reload();
    } catch (e2) { setErrs(errorMessage(e2)); } finally { setBusy(false); }
  };
  const remove = async (id) => {
    try { await api.delete(`/recruiter/evaluations/${id}`); toast.success('Evaluation deleted'); await reload(); } catch (e2) { toast.error(errorMessage(e2)); }
  };

  return (
    <div className="stack" data-testid="eval-panel">
      <form className="stack-sm" onSubmit={submit} noValidate>
        <h4>Add evaluation</h4>
        {errs && <p className="form-error" role="alert">{errs}</p>}
        <div className="r-criteria">
          {CRITERIA.map(([k, label]) => (
            <div key={k} className="r-criterion"><span>{label}</span><Stars label={label} value={ratings[k]} onChange={(v) => setRatings((r) => ({ ...r, [k]: v }))} /></div>
          ))}
        </div>
        <div className="form-grid">
          <Select label="Recommendation" value={f.recommendation} onChange={set('recommendation')} placeholder="Choose…" options={Object.entries(REC_LABEL).map(([value, label]) => ({ value, label }))} />
          <div>
            <Input label="Reviewer (team member)" list="r-team-names" value={f.reviewer} onChange={set('reviewer')} placeholder="You" maxLength={80} />
            <datalist id="r-team-names">{teamNames.map((n) => <option key={n} value={n} />)}</datalist>
          </div>
          <div className="full"><Textarea label="Feedback" rows={2} value={f.comment} onChange={set('comment')} maxLength={2000} /></div>
          <div className="full"><Textarea label="Private note (only your team)" rows={2} value={f.private_note} onChange={set('private_note')} maxLength={2000} /></div>
        </div>
        <div><Button type="submit" loading={busy}>Save evaluation</Button></div>
      </form>
      <div>
        <h4>History {data?.overall != null && <Badge tone="info">Overall {data.overall}/5</Badge>}</h4>
        <DataState loading={loading} error={error} onRetry={reload} hasData={!!data} isEmpty={(data?.items || []).length === 0} empty={{ icon: 'star', title: 'No evaluations yet', description: 'Add the first one above.' }}>
          <ul className="r-evals">
            {(data?.items || []).map((ev) => (
              <li key={ev.id} data-testid="eval-item">
                <div className="row-wrap"><strong>{ev.reviewer}</strong><Badge tone={REC_TONE[ev.recommendation]}>{REC_LABEL[ev.recommendation]}</Badge><Badge tone="neutral">{ev.average}/5</Badge><span className="muted small">{formatDate(ev.created_at, true)}</span>
                  <button type="button" className="btn btn-ghost btn-sm" onClick={() => remove(ev.id)} aria-label={`Delete evaluation by ${ev.reviewer}`}>Delete</button></div>
                <p className="small muted">{Object.entries(ev.ratings).map(([k, v]) => `${k.replace('_', ' ')} ${v}`).join(' · ')}</p>
                {ev.comment && <p className="small">{ev.comment}</p>}
                {ev.private_note && <p className="small muted"><em>Private: {ev.private_note}</em></p>}
              </li>
            ))}
          </ul>
        </DataState>
      </div>
    </div>
  );
}

export function CompareModal({ ids, onClose }) {
  const { data, loading, error, reload } = useAsync(() => api.get('/recruiter/evaluations/compare', { application_ids: ids.join(',') }), [ids.join(',')]);
  const best = Math.max(...(data?.items || []).map((i) => i.overall ?? 0), 0);
  return (
    <Modal open size="lg" title="Compare candidates" description="Average of all evaluations per criterion (1-5)." onClose={onClose}>
      <DataState loading={loading} error={error} onRetry={reload} hasData={!!data}>
        <div className="table-wrap">
          <table className="table" data-testid="compare-table">
            <thead><tr><th>Criterion</th>{(data?.items || []).map((i) => <th key={i.application_id}>{i.candidate?.name}<div className="muted small">{i.job_title}</div></th>)}</tr></thead>
            <tbody>
              {CRITERIA.map(([k, label]) => <tr key={k}><td>{label}</td>{(data?.items || []).map((i) => <td key={i.application_id}>{i.criteria[k] ?? '-'}</td>)}</tr>)}
              <tr><td><strong>Overall</strong></td>{(data?.items || []).map((i) => <td key={i.application_id}><strong>{i.overall ?? '-'}</strong>{i.overall != null && i.overall === best && <Badge tone="success"> Top</Badge>}</td>)}</tr>
              <tr><td>Evaluations</td>{(data?.items || []).map((i) => <td key={i.application_id}>{i.evaluations}</td>)}</tr>
              <tr><td>Status</td>{(data?.items || []).map((i) => <td key={i.application_id}>{i.status}</td>)}</tr>
            </tbody>
          </table>
        </div>
      </DataState>
    </Modal>
  );
}
