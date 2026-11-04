import { useState } from 'react';
import { api, errorMessage } from '../../../lib/api';
import { formatDate } from '../../../lib/format';
import { useAsync } from '../../../lib/hooks';
import { Link, useNavigate, useParams } from '../../../lib/router';
import { useToast } from '../../../lib/toast';
import Icon from '../../../components/Icon';
import { Badge, Button, Card, DataState, PageHeader, SkeletonList } from '../../../components/ui';

export default function Assessments() {
  const list = useAsync(() => api.get('/assessments'), []);
  const mine = useAsync(() => api.get('/assessments/results/mine'), []);
  const items = list.data?.items || [];
  const results = mine.data?.items || [];
  return (
    <>
      <PageHeader title="Skill Assessments" description="Take a short quiz. Pass it and the skill shows as verified on your profile." actions={<Link className="btn btn-secondary" to="/skills"><Icon name="sparkles" size={16} /> My skills</Link>} />
      <DataState loading={list.loading} error={list.error} onRetry={list.reload} hasData={!!list.data} skeleton={<SkeletonList count={3} />} isEmpty={items.length === 0} empty={{ icon: 'award', title: 'No assessments yet', description: 'Check back soon.' }}>
        <div className="u-grid u-asg">
          {items.map((a) => (
            <article className="u-job" key={a.id} data-testid="assessment-card">
              <div className="u-job-top">
                <span className="u-file-icon"><Icon name="award" size={22} /></span>
                <div className="grow"><h3 className="u-job-title">{a.title}</h3><p className="muted small">{a.skill}</p></div>
                {a.best?.passed && <Badge tone="success" dot>Verified</Badge>}
              </div>
              {a.description && <p className="muted small">{a.description}</p>}
              <ul className="u-meta"><li><Icon name="clipboard" size={14} /> {a.questions_count} questions</li><li><Icon name="check" size={14} /> Pass at {a.pass_percent}%</li>{a.best && <li><Icon name="star" size={14} /> Best {a.best.percent}%</li>}</ul>
              <div className="u-job-foot"><span /><Link className="btn btn-primary btn-sm" to={`/assessments/${a.id}`}>{a.best ? 'Retake' : 'Start'}</Link></div>
            </article>
          ))}
        </div>
      </DataState>
      {results.length > 0 && (
        <>
          <h2 style={{ margin: '28px 0 12px' }}>Your results</h2>
          <Card padded={false}>
            <ul className="u-list">
              {results.slice(0, 8).map((r, i) => (
                <li key={i}><span className="u-date-chip"><Icon name={r.passed ? 'check' : 'x'} size={18} /></span>
                  <div className="grow"><strong>{r.title || r.skill || 'Assessment'}</strong><p className="muted small">{formatDate(r.created_at)}</p></div>
                  <Badge tone={r.passed ? 'success' : 'danger'}>{r.percent}% {r.passed ? 'Passed' : 'Not passed'}</Badge></li>
              ))}
            </ul>
          </Card>
        </>
      )}
    </>
  );
}

export function AssessmentTake() {
  const { id } = useParams();
  const toast = useToast();
  const navigate = useNavigate();
  const { data, loading, error, reload } = useAsync(() => api.get(`/assessments/${id}`), [id]);
  const [answers, setAnswers] = useState({});
  const [busy, setBusy] = useState(false);
  const [result, setResult] = useState(null);
  const qs = data?.questions || [];
  const answered = Object.keys(answers).length;

  const submit = async () => {
    setBusy(true);
    try {
      setResult(await api.post(`/assessments/${id}/submit`, { answers: qs.map((_, i) => (answers[i] ?? null)) }));
      window.scrollTo(0, 0);
    } catch (e) { toast.error(errorMessage(e)); } finally { setBusy(false); }
  };

  return (
    <>
      <PageHeader title={data?.title || 'Assessment'} description={data ? `${data.skill} · ${qs.length} questions · pass at ${data.pass_percent}%` : ''} actions={<Link className="btn btn-secondary" to="/assessments">All assessments</Link>} />
      <DataState loading={loading} error={error} onRetry={reload} hasData={!!data} skeleton={<SkeletonList count={3} lines={4} />}>
        {result ? (
          <div className="stack">
            <Card className={`u-result ${result.passed ? 'pass' : 'fail'}`} data-testid="assessment-result">
              <span className="u-result-ico"><Icon name={result.passed ? 'award' : 'refresh'} size={30} /></span>
              <div>
                <h2>{result.passed ? 'You passed!' : 'Not quite there yet'}</h2>
                <p>You scored <strong>{result.score}/{result.total}</strong> ({result.percent}%). {result.passed ? `${data.skill} is now verified on your profile.` : `You need ${result.pass_percent}% to pass. Review the answers below and try again.`}</p>
              </div>
              <div className="row-wrap"><Button variant="secondary" onClick={() => { setResult(null); setAnswers({}); }}>Retake</Button><Button onClick={() => navigate('/assessments')}>Done</Button></div>
            </Card>
            {result.review.map((r, i) => (
              <Card key={i} className={`u-rev ${r.correct ? 'ok' : 'bad'}`}>
                <p><strong>{i + 1}. {r.q}</strong></p>
                <ul className="u-opts">
                  {r.options.map((o, k) => (
                    <li key={k} className={k === r.correct_answer ? 'right' : k === r.your_answer ? 'wrong' : ''}>
                      <Icon name={k === r.correct_answer ? 'check' : k === r.your_answer ? 'x' : 'chevronRight'} size={14} /> {o}
                      {k === r.your_answer && <small> (your answer)</small>}
                    </li>
                  ))}
                </ul>
                {r.your_answer === null && <p className="muted small">You skipped this question.</p>}
                {r.explanation && <p className="muted small"><Icon name="info" size={13} /> {r.explanation}</p>}
              </Card>
            ))}
          </div>
        ) : (
          <div className="stack">
            {qs.map((q, i) => (
              <Card key={i} data-testid="assessment-question">
                <fieldset className="u-fs">
                  <legend><strong>{i + 1}. {q.q}</strong></legend>
                  {q.options.map((o, k) => (
                    <label key={k} className={`u-opt ${answers[i] === k ? 'on' : ''}`}>
                      <input type="radio" name={`q${i}`} checked={answers[i] === k} onChange={() => setAnswers((a) => ({ ...a, [i]: k }))} />
                      <span>{o}</span>
                    </label>
                  ))}
                </fieldset>
              </Card>
            ))}
            <div className="u-submitbar">
              <span className="muted">{answered} of {qs.length} answered</span>
              <Button size="lg" loading={busy} disabled={answered < qs.length} onClick={submit}>Submit answers</Button>
            </div>
          </div>
        )}
      </DataState>
    </>
  );
}
