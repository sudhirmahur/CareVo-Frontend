import { useState } from 'react';
import { api, errorMessage } from '../../lib/api';
import { useAsync } from '../../lib/hooks';
import { useToast } from '../../lib/toast';
import { BarChart, Button, Card, DataState, Input, PageHeader, StatCard } from '../../components/ui';
import { downloadFile } from './util';

const iso = (d) => d.toISOString().slice(0, 10);
export default function Analytics() {
  const toast = useToast();
  const [range, setRange] = useState({ from: iso(new Date(Date.now() - 29 * 864e5)), to: iso(new Date()) });
  const params = { from: `${range.from}T00:00:00Z`, to: `${range.to}T23:59:59Z` };
  const bad = range.from > range.to;
  const { data, loading, error, reload } = useAsync(() => (bad ? Promise.resolve(null) : api.get('/recruiter/analytics/jobs', params)), [range.from, range.to]);
  const t = data?.totals;
  return (
    <>
      <PageHeader title="Job performance" description="Views, applications and conversion for your jobs." actions={<Button variant="secondary" icon="download" onClick={() => downloadFile('/recruiter/analytics/jobs/export', 'job-performance.csv', params).catch((e) => toast.error(errorMessage(e)))}>Export CSV</Button>} />
      <div className="row wrap" style={{ gap: 12, marginBottom: 12 }}>
        <Input label="From" type="date" value={range.from} max={range.to} onChange={(e) => setRange((r) => ({ ...r, from: e.target.value }))} />
        <Input label="To" type="date" value={range.to} onChange={(e) => setRange((r) => ({ ...r, to: e.target.value }))} />
      </div>
      {bad && <p className="form-error" role="alert">The start date must be before the end date.</p>}
      <DataState loading={loading && !bad} error={error} onRetry={reload} hasData={!!data} isEmpty={!bad && data && data.jobs.length === 0} empty={{ icon: 'chart', title: 'No jobs yet', description: 'Post a job to see how it performs.' }}>
        {data && (
          <div className="stack">
            <div className="grid grid-4" data-testid="an-totals">
              <StatCard icon="eye" label="Views" value={t.views} />
              <StatCard icon="clipboard" label="Applications" value={t.applications} />
              <StatCard icon="zap" tone="success" label="Conversion" value={`${t.conversion}%`} hint="applications / views" />
              <StatCard icon="check" label="Shortlisted / Rejected" value={`${t.shortlisted} / ${t.rejected}`} />
            </div>
            <Card title="Traffic sources" subtitle="Where job views came from (add ?src=name to shared links)">
              {data.sources.length ? <BarChart data={data.sources.map((s) => ({ label: s.source, value: s.views }))} ariaLabel="Views by source" /> : <p className="muted">No views in this period.</p>}
            </Card>
            <Card title="By job">
              <div className="table-wrap"><table className="table rtable" data-testid="an-table">
                <thead><tr><th>Job</th><th>Views</th><th>Applications</th><th>Conversion</th><th>Shortlisted</th><th>Rejected</th></tr></thead>
                <tbody>{data.jobs.map((j) => <tr key={j.job_id}><td data-label="Job"><strong>{j.title}</strong></td><td data-label="Views">{j.views}</td><td data-label="Applications">{j.applications}</td><td data-label="Conversion">{j.conversion}%</td><td data-label="Shortlisted">{j.shortlisted}</td><td data-label="Rejected">{j.rejected}</td></tr>)}</tbody>
              </table></div>
            </Card>
          </div>
        )}
      </DataState>
    </>
  );
}
