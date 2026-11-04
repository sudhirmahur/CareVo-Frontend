import { api } from '../../../lib/api';
import { useAsync } from '../../../lib/hooks';
import { Link } from '../../../lib/router';
import { BarChart, Card, DataState, PageHeader, SkeletonList, StatCard, Button } from '../../../components/ui';
import Icon from '../../../components/Icon';

const short = (d) => d.slice(8);

export default function Dashboard() {
  const { data: s, loading, error, reload } = useAsync(() => api.get('/admin/stats'), []);
  return (
    <>
      <PageHeader title="Platform overview" description="Live numbers across candidates, recruiters, jobs and content." actions={<Button variant="secondary" icon="refresh" onClick={reload}>Refresh</Button>} />
      <DataState loading={loading} error={error} onRetry={reload} hasData={!!s} skeleton={<SkeletonList count={4} lines={2} />}>
        {s && (
          <div className="stack" data-testid="dashboard">
            <div className="grid grid-4 ad-stats">
              <StatCard icon="users" label="Total users" value={s.users_total} hint={`${s.users_blocked} blocked`} />
              <StatCard icon="user" tone="info" label="Candidates" value={s.users_by_role.user} />
              <StatCard icon="building" tone="success" label="Recruiters" value={s.users_by_role.recruiter} hint={`${s.companies_total} companies`} />
              <StatCard icon="shield" tone="warning" label="Admins" value={s.users_by_role.admin} />
              <StatCard icon="briefcase" label="Jobs" value={s.jobs_total} hint={`${s.jobs_approved} live · ${s.jobs_featured} featured`} />
              <StatCard icon="clipboard" tone="info" label="Applications" value={s.applications_total} hint={Object.entries(s.applications_by_status).map(([k, v]) => `${v} ${k}`).join(' · ') || 'none yet'} />
              <StatCard icon="calendar" tone="success" label="Interviews" value={s.interviews_total} />
              <StatCard icon="video" tone="warning" label="Videos" value={s.videos_total} />
            </div>

            <Card title="Needs your attention" subtitle="Pending approvals and reports">
              <div className="grid grid-3 ad-todo">
                <Link to="/admin/jobs?status=pending" className="todo-item"><Icon name="briefcase" /><span><strong>{s.jobs_pending}</strong> jobs awaiting approval</span><Icon name="chevronRight" size={16} /></Link>
                <Link to="/admin/companies?status=pending" className="todo-item"><Icon name="building" /><span><strong>{s.companies_pending}</strong> companies awaiting approval</span><Icon name="chevronRight" size={16} /></Link>
                <Link to="/admin/reports" className="todo-item"><Icon name="flag" /><span><strong>{s.reports_pending}</strong> reports to review</span><Icon name="chevronRight" size={16} /></Link>
              </div>
            </Card>

            <div className="grid grid-2">
              <Card title="New sign-ups" subtitle="Last 14 days">
                <BarChart ariaLabel="Sign-ups per day" data={s.signups_last_14_days.map((d) => ({ label: short(d.date), value: d.count }))} color="#6366f1" />
              </Card>
              <Card title="Applications" subtitle="Last 14 days">
                <BarChart ariaLabel="Applications per day" data={s.applications_last_14_days.map((d) => ({ label: short(d.date), value: d.count }))} color="#22c55e" />
              </Card>
            </div>

            <Card title="Top jobs" subtitle="By number of applications" padded={false}>
              {s.top_jobs.length === 0 ? <p className="muted" style={{ padding: '0 20px 20px' }}>No jobs yet.</p> : (
                <div className="table-wrap">
                  <table className="table rtable">
                    <thead><tr><th>Job</th><th>Applications</th><th>Views</th></tr></thead>
                    <tbody>
                      {s.top_jobs.map((j) => (
                        <tr key={j.id}><td data-label="Job"><Link to={`/admin/jobs?search=${encodeURIComponent(j.title)}`}>{j.title}</Link></td><td data-label="Applications">{j.applications}</td><td data-label="Views">{j.views}</td></tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </Card>
          </div>
        )}
      </DataState>
    </>
  );
}
