import { api } from '../../lib/api';
import { useAsync } from '../../lib/hooks';
import { Link } from '../../lib/router';
import { BarChart, Button, Card, DataState, PageHeader, StatCard, SkeletonList } from '../../components/ui';
import Icon from '../../components/Icon';
import { shortDay } from './util';
import { useCompany } from './context';

const STAGES = [['applied', 'Applied', 'info'], ['shortlisted', 'Shortlisted', 'warning'], ['accepted', 'Accepted', 'success'], ['rejected', 'Rejected', 'danger']];

export default function Dashboard() {
  const { data, loading, error, reload } = useAsync(() => api.get('/recruiter/dashboard'), []);
  const { company, loading: cLoading } = useCompany();
  const by = data?.applications_by_status || {};
  const total = data?.applications_total || 0;

  return (
    <>
      <PageHeader title="Hiring overview" description="Everything happening across your jobs and candidates." actions={<Link className="btn btn-primary" to="/recruiter/jobs/new"><Icon name="plus" size={18} /><span>Post a job</span></Link>} />
      {!cLoading && !company && (
        <div className="r-onboard" data-testid="onboarding">
          <span className="r-onboard-icon"><Icon name="building" size={28} /></span>
          <div className="grow">
            <h2>Create your company profile</h2>
            <p>Set up your company first - candidates see it on every job, and an admin approves it before your jobs can go live.</p>
          </div>
          <Link className="btn btn-primary btn-lg" to="/recruiter/company">Create company profile</Link>
        </div>
      )}
      {company?.status === 'pending' && <div className="r-banner info" role="status"><Icon name="clock" size={18} /><span>Your company profile is <strong>awaiting admin approval</strong>. You can post jobs meanwhile - they go live once an admin approves them.</span></div>}
      {company?.status === 'rejected' && <div className="r-banner warn" role="alert"><Icon name="alert" size={18} /><span>Your company profile was <strong>rejected</strong> by an admin. <Link to="/recruiter/company">Update your details</Link> or contact support.</span></div>}

      <DataState loading={loading} error={error} onRetry={reload} hasData={!!data} skeleton={<SkeletonList count={3} />}>
        {data && (
          <div className="stack" style={{ gap: 20 }}>
            <div className="grid grid-4">
              <StatCard icon="briefcase" label="Active jobs" value={data.jobs_active} hint={`${data.jobs_total} total · ${data.jobs_pending} pending`} />
              <StatCard icon="eye" label="Job views" value={data.views_total} tone="info" />
              <StatCard icon="clipboard" label="Applications" value={data.applications_total} tone="warning" />
              <StatCard icon="calendar" label="Upcoming interviews" value={data.interviews_upcoming} tone="success" hint={`${data.followers} followers · ${data.videos} videos`} />
            </div>
            <Card title="Hiring pipeline" subtitle="Where your candidates are right now">
              <div className="r-pipeline">
                {STAGES.map(([k, label, tone]) => (
                  <div className={`r-stage tone-${tone}`} key={k}>
                    <div className="row between"><span>{label}</span><strong>{by[k] || 0}</strong></div>
                    <div className="progress"><span style={{ width: `${total ? ((by[k] || 0) / total) * 100 : 0}%` }} /></div>
                  </div>
                ))}
              </div>
              <div className="row" style={{ marginTop: 14 }}><Link to="/recruiter/applications" className="small">Open the candidate board →</Link></div>
            </Card>
            <div className="grid grid-2">
              <Card title="Applications - last 7 days"><BarChart data={data.applications_last_7_days.map((d) => ({ label: shortDay(d.date), value: d.count }))} ariaLabel="Applications in the last 7 days" /></Card>
              <Card title="Top jobs" subtitle="By applications">
                {data.top_jobs.length === 0 ? <p className="muted">Post your first job to see performance here.</p> : (
                  <ul className="r-toplist">
                    {data.top_jobs.map((j) => (
                      <li key={j.id}><Link to={`/recruiter/jobs/${j.id}/edit`} className="truncate">{j.title}</Link><span className="muted small">{j.views} views</span><Badge2 n={j.applications} /></li>
                    ))}
                  </ul>
                )}
              </Card>
            </div>
          </div>
        )}
      </DataState>
    </>
  );
}
const Badge2 = ({ n }) => <span className="chip">{n} applied</span>;
