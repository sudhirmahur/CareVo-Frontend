import { api } from '../../../lib/api';
import { useAsync } from '../../../lib/hooks';
import { Link, useParams } from '../../../lib/router';
import Icon from '../../../components/Icon';
import { Avatar, Button, Card, DataState, EmptyState, PageHeader, SkeletonList } from '../../../components/ui';
import { JobCard, SectionTitle, useApply, usePatchJobs, useSaveToggle } from '../parts';
import { PremiumProvider, usePremium } from '../premium';

function Inner() {
  const { id } = useParams();
  const premium = usePremium();
  const { data, loading, error, reload, setData } = useAsync(() => api.get(`/recruiters/${id}`), [id]);
  const patch = usePatchJobs(setData, 'jobs');
  const toggleSave = useSaveToggle(patch);
  const { apply, busyId, node } = useApply({ onApplied: (job) => patch(job.id, { has_applied: true }) });
  const restricted = error && /premium/i.test(error);

  return (
    <>
      <PageHeader title="Recruiter profile" actions={<Link className="btn btn-secondary" to="/videos"><Icon name="video" size={16} /> Back to reels</Link>} />
      {restricted ? (
        <EmptyState icon="lock" title="Recruiter Profile is Restricted" description="Recruiter profiles are available to Premium members."
          action={<Button icon="crown" onClick={() => premium.show('recruiter')}>Upgrade to Premium</Button>} />
      ) : (
        <DataState loading={loading} error={error} onRetry={reload} hasData={!!data} skeleton={<SkeletonList count={2} />}>
          {data && (
            <>
              <Card className="u-rprof">
                <Avatar name={data.name} src={data.profile_image} size={84} />
                <div className="grow">
                  <h2>{data.name}</h2>
                  <p className="muted">{data.headline}</p>
                  <ul className="u-meta">
                    {data.company && <li><Icon name="building" size={14} /> <Link to={`/companies/${data.company.id}`}>{data.company.name}</Link></li>}
                    {data.location && <li><Icon name="mapPin" size={14} /> {data.location}</li>}
                    <li><Icon name="users" size={14} /> {data.followers_count} follower{data.followers_count === 1 ? '' : 's'}</li>
                    <li><Icon name="video" size={14} /> {data.videos_count} reel{data.videos_count === 1 ? '' : 's'}</li>
                  </ul>
                  {data.bio && <p style={{ marginTop: 12 }}>{data.bio}</p>}
                </div>
              </Card>
              <SectionTitle>Open positions</SectionTitle>
              {data.jobs.length === 0 ? <p className="muted">No open positions right now.</p> : (
                <div className="u-grid">{data.jobs.map((j) => <JobCard key={j.id} job={j} onApply={apply} onToggleSave={toggleSave} busy={busyId} />)}</div>
              )}
            </>
          )}
        </DataState>
      )}
      {node}
    </>
  );
}

export default function RecruiterProfile() {
  return <PremiumProvider><Inner /></PremiumProvider>;
}
