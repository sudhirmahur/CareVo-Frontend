import { api } from '../../../lib/api';
import { formatDate, titleCase } from '../../../lib/format';
import { useAsync } from '../../../lib/hooks';
import Icon from '../../../components/Icon';
import { Badge, Card, DataState, PageHeader, SkeletonList, StatusBadge } from '../../../components/ui';

function IvCard({ iv }) {
  const d = new Date(iv.scheduled_at);
  return (
    <Card className="u-iv" data-testid="interview">
      <div className="u-iv-date"><strong>{d.toLocaleString('en-IN', { day: '2-digit' })}</strong><span>{d.toLocaleString('en-IN', { month: 'short' })}</span></div>
      <div className="grow">
        <h3>{iv.job_title || 'Interview'}</h3>
        <p className="muted">{iv.company_name} · {formatDate(iv.scheduled_at, true)}</p>
        <div className="row-wrap" style={{ marginTop: 8 }}>
          <Badge tone="brand">{titleCase(iv.mode)}</Badge>
          <StatusBadge status={iv.status} />
          {iv.location && <span className="small muted"><Icon name="mapPin" size={13} /> {iv.location}</span>}
        </div>
        {iv.feedback && <p className="small muted" style={{ marginTop: 8 }}>Feedback: {iv.feedback}</p>}
      </div>
      {iv.meeting_link && iv.status === 'scheduled' && (
        <a className="btn btn-primary btn-sm" href={iv.meeting_link} target="_blank" rel="noopener noreferrer"><Icon name="video" size={15} /> Join meeting</a>
      )}
    </Card>
  );
}

export default function Interviews() {
  const { data, loading, error, reload } = useAsync(() => api.get('/interviews'), []);
  const items = data?.items || [];
  const upcoming = items.filter((i) => i.status === 'scheduled');
  const past = items.filter((i) => i.status !== 'scheduled');
  return (
    <>
      <PageHeader title="Interviews" description="Your scheduled and past interviews." />
      <DataState loading={loading} error={error} onRetry={reload} hasData={!!data} skeleton={<SkeletonList count={2} />} isEmpty={items.length === 0}
        empty={{ icon: 'calendar', title: 'No interviews yet', description: 'When a recruiter schedules an interview it appears here.' }}>
        <div className="stack">
          {upcoming.length > 0 && <><h2>Upcoming</h2>{upcoming.map((i) => <IvCard key={i.id} iv={i} />)}</>}
          {past.length > 0 && <><h2>Past &amp; cancelled</h2>{past.map((i) => <IvCard key={i.id} iv={i} />)}</>}
        </div>
      </DataState>
    </>
  );
}
