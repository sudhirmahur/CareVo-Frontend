import { useState } from 'react';
import { api } from '../../../lib/api';
import { useAsync } from '../../../lib/hooks';
import { Card, DataState, PageHeader, Select, StatCard, Tabs } from '../../../components/ui';
import { DownloadBtn, LineChart } from '../common';

const inr = (n) => `₹${Number(n || 0).toLocaleString('en-IN', { maximumFractionDigits: 0 })}`;
const pct = (v) => (v == null ? 'n/a' : `${v > 0 ? '+' : ''}${v}%`);

export default function Revenue() {
  const [period, setPeriod] = useState('daily');
  const [days, setDays] = useState('30');
  const { data: r, loading, error, reload } = useAsync(() => api.get('/admin/analytics/revenue', { period, days }), [period, days]);
  const t = r?.totals;
  return (
    <>
      <PageHeader title="Revenue & growth" description="Revenue, sign-ups and platform activity over time." actions={<DownloadBtn path="/admin/analytics/revenue/export" filename={`revenue-${period}.csv`} params={{ period, days }}>Download report</DownloadBtn>} />
      <div className="row between wrap" style={{ gap: 8, marginBottom: 12 }}>
        <Tabs value={period} onChange={setPeriod} tabs={[{ value: 'daily', label: 'Daily' }, { value: 'weekly', label: 'Weekly' }, { value: 'monthly', label: 'Monthly' }]} />
        <Select aria-label="Range" value={days} onChange={(e) => setDays(e.target.value)} options={[['7', 'Last 7 days'], ['30', 'Last 30 days'], ['90', 'Last 90 days'], ['365', 'Last year']].map(([value, label]) => ({ value, label }))} />
      </div>
      <DataState loading={loading} error={error} onRetry={reload} hasData={!!r}>
        {r && (
          <div className="stack">
            <div className="grid grid-4 ad-stats" data-testid="rev-kpis">
              <StatCard icon="dollar" tone="success" label="Revenue" value={inr(t.revenue)} hint={`${pct(r.growth.revenue_pct)} vs previous`} />
              <StatCard icon="users" label="New sign-ups" value={t.new_users} hint={`${pct(r.growth.users_pct)} vs previous`} />
              <StatCard icon="crown" label="Active subscribers" value={t.active_subscribers} hint={`${t.conversion_rate}% of candidates`} />
              <StatCard icon="zap" label="ARPU" value={inr(t.arpu)} hint={`${t.orders} orders · ${inr(t.refunds)} refunded`} />
            </div>
            <Card title="Revenue trend"><LineChart labels={r.labels} series={[{ name: 'Revenue', values: r.series.revenue }]} ariaLabel="Revenue trend" format={inr} /></Card>
            <Card title="Growth"><LineChart labels={r.labels} series={[{ name: 'Candidates', values: r.series.users, color: 'var(--brand)' }, { name: 'Recruiters', values: r.series.recruiters, color: '#e08a1e' }, { name: 'Jobs', values: r.series.jobs, color: '#2e9e6b' }, { name: 'Applications', values: r.series.applications, color: '#7a5af5' }]} ariaLabel="Growth trend" /></Card>
          </div>
        )}
      </DataState>
    </>
  );
}
