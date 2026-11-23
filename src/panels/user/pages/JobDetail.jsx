import { useState } from 'react';
import { api } from '../../../lib/api';
import { formatDate, jobTypeLabel, salaryRange } from '../../../lib/format';
import { useAsync } from '../../../lib/hooks';
import { Link, useNavigate, useParams } from '../../../lib/router';
import { useToast } from '../../../lib/toast';
import { API_BASE, errorMessage } from '../../../lib/api';
import Icon from '../../../components/Icon';
import ReportModal from '../../../components/shared/ReportModal';
import { Avatar, Badge, Button, Card, DataState, SkeletonList, SkillChips } from '../../../components/ui';
import { ApplyControl, useApply, WORK_MODE } from '../parts';

function Bullets({ title, items }) {
  if (!items?.length) return null;
  return (
    <Card title={title}>
      <ul className="u-bullets">{items.map((i) => <li key={i}>{i}</li>)}</ul>
    </Card>
  );
}

export default function JobDetail() {
  const { id } = useParams();
  const navigate = useNavigate();
  const toast = useToast();
  const { data: job, loading, error, reload, setData } = useAsync(() => api.get(`/jobs/${id}`), [id]);
  const [reporting, setReporting] = useState(false);
  const { apply, busyId, node } = useApply({ onApplied: () => setData((j) => ({ ...j, has_applied: true, application_status: 'applied' })) });

  const shareJob = async () => {
    // the share link opens a small page with preview tags (title, company, description) and then forwards to this job
    const url = `${API_BASE}/public/share/jobs/${job.id}`;
    try {
      if (navigator.share) await navigator.share({ title: `${job.title} at ${job.company_name || 'CareVo'}`, url });
      else { await navigator.clipboard.writeText(url); toast.success('Share link copied'); }
    } catch (e) {
      if (e && e.name === 'AbortError') return;
      toast.info(url);
    }
  };

  const toggleSave = async () => {
    const next = !job.is_saved;
    setData((j) => ({ ...j, is_saved: next }));
    try {
      if (next) await api.post(`/jobs/${job.id}/save`);
      else await api.delete(`/jobs/${job.id}/save`);
      toast.success(next ? 'Job saved' : 'Removed from saved jobs');
    } catch (e) {
      setData((j) => ({ ...j, is_saved: !next }));
      toast.error(errorMessage(e));
    }
  };

  return (
    <>
      <Link to="/jobs" className="u-back"><Icon name="chevronLeft" size={16} /> Back to jobs</Link>
      <DataState loading={loading} error={error} onRetry={reload} hasData={!!job} skeleton={<SkeletonList count={2} lines={4} />}>
        {job && (
          <div className="u-detail">
            <div className="stack">
              <Card className="u-detail-head">
                <div className="row" style={{ alignItems: 'flex-start' }}>
                  <Avatar name={job.company_name || job.title} src={job.company_logo} size={64} className="u-logo" />
                  <div className="grow">
                    <h1>{job.title}</h1>
                    <p className="muted">{job.company_name || 'Company'}</p>
                  </div>
                </div>
                <ul className="u-meta u-meta-lg">
                  {job.location && <li><Icon name="mapPin" size={15} /> {job.location}</li>}
                  <li><Icon name="briefcase" size={15} /> {jobTypeLabel(job.job_type)}</li>
                  {job.work_mode && <li data-testid="work-mode"><Icon name="globe" size={15} /> {WORK_MODE[job.work_mode] || job.work_mode}</li>}
                  {salaryRange(job.salary_min, job.salary_max) && <li><Icon name="dollar" size={15} /> {salaryRange(job.salary_min, job.salary_max)}</li>}
                  {job.application_deadline && <li><Icon name="clock" size={15} /> Apply by {formatDate(job.application_deadline)}</li>}
                  <li><Icon name="eye" size={15} /> {job.views_count} views</li>
                </ul>
                {job.apply_type === 'external' && (
                  <p className="apply-banner"><Icon name="link" size={18} /><span>This employer takes applications on their own website. Click Apply: we record it in your history, then take you to their page.</span></p>
                )}
              </Card>
              <Card title="About this role"><p className="u-pre">{job.description}</p></Card>
              <Bullets title="Responsibilities" items={job.responsibilities} />
              <Bullets title="Requirements" items={job.requirements} />
              {job.skills?.length > 0 && <Card title="Skills"><SkillChips skills={job.skills} /></Card>}
            </div>
            <aside className="u-detail-side">
              <Card className="u-sticky stack">
                <ApplyControl job={job} onApply={apply} busy={busyId === job.id} />
                <Button variant="secondary" icon="bookmark" onClick={toggleSave} aria-pressed={!!job.is_saved}>{job.is_saved ? 'Saved' : 'Save job'}</Button>
                <Button variant="secondary" icon="share" onClick={shareJob}>Share</Button>
                {job.recruiter_id && <Button variant="secondary" icon="message" onClick={() => navigate(`/messages?with=${job.recruiter_id}`)}>Message recruiter</Button>}
                <Button variant="ghost" icon="flag" onClick={() => setReporting(true)}>Report this job</Button>
                {job.company && (
                  <Link to={`/companies/${job.company.id}`} className="u-company-mini">
                    <Avatar name={job.company.name} src={job.company.logo_url} size={40} />
                    <span className="grow"><strong>{job.company.name}</strong><br /><span className="muted small">{job.company.industry || 'View company'}</span></span>
                    {job.company.is_verified && <Badge tone="success">Verified</Badge>}
                  </Link>
                )}
              </Card>
            </aside>
          </div>
        )}
      </DataState>
      {job && <ReportModal open={reporting} onClose={() => setReporting(false)} contentType="job" contentId={job.id} label="job" />}
      {node}
    </>
  );
}
