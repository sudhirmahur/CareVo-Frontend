import { useEffect, useState } from 'react';
import { api, errorMessage } from '../../../lib/api';
import { jobTypeLabel, salaryRange, timeAgo } from '../../../lib/format';
import { useAsync } from '../../../lib/hooks';
import { Link } from '../../../lib/router';
import { useToast } from '../../../lib/toast';
import { Badge, Button, Card, DataState, Input, PageHeader, Select, Switch, TagInput } from '../../../components/ui';

const TYPES = ['fulltime', 'parttime', 'internship', 'contract', 'freelance'];
const MODES = [['remote', 'Remote'], ['hybrid', 'Hybrid'], ['onsite', 'On-site']];

function Toggle({ list, value, onChange, label }) {
  const on = list.includes(value);
  return (
    <button type="button" className={`pill-toggle ${on ? 'on' : ''}`} aria-pressed={on} onClick={() => onChange(on ? list.filter((x) => x !== value) : [...list, value])}>{label}</button>
  );
}

export default function Alerts() {
  const toast = useToast();
  const prefs = useAsync(() => api.get('/me/preferences'), []);
  const matches = useAsync(() => api.get('/me/job-matches', { days: 30, limit: 10 }), []);
  const [f, setF] = useState(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  useEffect(() => { if (prefs.data && !f) setF({ ...prefs.data, salary_min: prefs.data.salary_min ?? '', salary_max: prefs.data.salary_max ?? '' }); }, [prefs.data, f]);
  const set = (k, v) => setF((x) => ({ ...x, [k]: v }));

  const save = async (e) => {
    e.preventDefault();
    setError('');
    const num = (v) => (v === '' || v == null ? null : Number(v));
    const min = num(f.salary_min), max = num(f.salary_max);
    if ((min != null && (Number.isNaN(min) || min < 0)) || (max != null && (Number.isNaN(max) || max < 0))) return setError('Salary must be a positive number');
    if (min != null && max != null && max < min) return setError('Maximum salary must be at least the minimum');
    setBusy(true);
    try {
      const saved = await api.put('/me/preferences', { titles: f.titles, industries: f.industries, locations: f.locations, salary_min: min, salary_max: max, job_types: f.job_types, work_modes: f.work_modes, alerts_enabled: f.alerts_enabled, frequency: f.frequency });
      setF({ ...saved, salary_min: saved.salary_min ?? '', salary_max: saved.salary_max ?? '' });
      toast.success('Job alert preferences saved');
      matches.reload();
    } catch (err) { setError(errorMessage(err)); } finally { setBusy(false); }
  };

  const items = matches.data?.items || [];
  return (
    <>
      <PageHeader title="Job alerts & preferences" description="Tell us what you are looking for. We match new jobs and notify you daily or weekly." />
      <div className="u-two">
        <DataState loading={prefs.loading} error={prefs.error} onRetry={prefs.reload} hasData={!!f}>
          {f && (
            <form onSubmit={save} noValidate data-testid="alerts-form">
              <Card className="stack">
                <Switch label="Send me job alerts" checked={!!f.alerts_enabled} onChange={(e) => set('alerts_enabled', e.target.checked)} />
                <Select label="How often" value={f.frequency} onChange={(e) => set('frequency', e.target.value)} options={[{ value: 'daily', label: 'Daily digest' }, { value: 'weekly', label: 'Weekly digest' }]} />
                <TagInput label="Job titles" value={f.titles} onChange={(v) => set('titles', v)} placeholder="e.g. React Developer" />
                <TagInput label="Industries" value={f.industries} onChange={(v) => set('industries', v)} placeholder="e.g. Fintech" />
                <TagInput label="Locations" value={f.locations} onChange={(v) => set('locations', v)} placeholder="e.g. Pune, Remote" />
                <div className="grid grid-2">
                  <Input label="Minimum salary (yearly)" inputMode="numeric" value={f.salary_min} onChange={(e) => set('salary_min', e.target.value)} />
                  <Input label="Maximum salary (yearly)" inputMode="numeric" value={f.salary_max} onChange={(e) => set('salary_max', e.target.value)} />
                </div>
                <div><p className="label-like">Job types</p><div className="pill-row">{TYPES.map((t) => <Toggle key={t} list={f.job_types} value={t} label={jobTypeLabel(t)} onChange={(v) => set('job_types', v)} />)}</div></div>
                <div><p className="label-like">Work style</p><div className="pill-row">{MODES.map(([v, l]) => <Toggle key={v} list={f.work_modes} value={v} label={l} onChange={(x) => set('work_modes', x)} />)}</div></div>
                {error && <p className="form-error" role="alert">{error}</p>}
                <div><Button type="submit" loading={busy}>Save preferences</Button></div>
              </Card>
            </form>
          )}
        </DataState>
        <Card title="Recent matches" subtitle="New jobs from the last 30 days" data-testid="alert-matches">
          <DataState loading={matches.loading} error={matches.error} onRetry={matches.reload} hasData={!!matches.data} isEmpty={items.length === 0}
            empty={{ icon: 'sparkles', title: matches.data?.configured === false ? 'Set your preferences' : 'No matches yet', description: matches.data?.configured === false ? 'Save at least one preference to see matching jobs.' : 'We will notify you when something fits.' }}>
            <ul className="u-list">{items.map((j) => (
              <li key={j.id}><div className="grow"><strong><Link to={`/jobs/${j.id}`}>{j.title}</Link></strong><p className="muted small">{j.company_name} · {j.location || 'Anywhere'} · {salaryRange(j.salary_min, j.salary_max) || 'Salary not shown'}</p></div><span className="muted small">{timeAgo(j.created_at)}</span></li>
            ))}</ul>
          </DataState>
        </Card>
      </div>
    </>
  );
}
