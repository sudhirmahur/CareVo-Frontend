import { api, errorMessage } from '../../../lib/api';
import { timeAgo } from '../../../lib/format';
import { useAsync } from '../../../lib/hooks';
import { Link } from '../../../lib/router';
import { useToast } from '../../../lib/toast';
import { Avatar, Badge, Button, Card, DataState, PageHeader, SkeletonList } from '../../../components/ui';

export default function Following() {
  const toast = useToast();
  const { data, loading, error, reload, setData } = useAsync(() => api.get('/me/following/companies'), []);
  const items = data?.items || [];
  const unfollow = async (x) => {
    try {
      await api.delete(`/follow/${x.id}`);
      setData((d) => ({ ...d, total: d.total - 1, items: d.items.filter((i) => i.id !== x.id) }));
      toast.success(`Unfollowed ${x.name}`);
    } catch (e) { toast.error(errorMessage(e)); }
  };
  return (
    <>
      <PageHeader title="Following" description="Companies you follow and their latest openings." />
      <DataState loading={loading} error={error} onRetry={reload} hasData={!!data} skeleton={<SkeletonList count={3} lines={2} />} isEmpty={items.length === 0}
        empty={{ icon: 'heart', title: 'You are not following any company yet', description: 'Follow companies to get notified when they post jobs.', action: <Link className="btn btn-primary" to="/companies">Browse companies</Link> }}>
        <div className="stack" data-testid="follow-list">{items.map((c) => (
          <Card key={c.id}>
            <div className="row" style={{ alignItems: 'flex-start' }}>
              <Avatar name={c.name} src={c.logo_url} size={48} />
              <div className="grow">
                <strong><Link to={`/companies/${c.id}`}>{c.name}</Link></strong>
                <p className="muted small">{[c.industry, c.location].filter(Boolean).join(' · ') || 'Company'}</p>
              </div>
              <Badge tone={c.open_jobs ? 'success' : 'neutral'}>{c.open_jobs} open job{c.open_jobs === 1 ? '' : 's'}</Badge>
              <Button size="sm" variant="secondary" onClick={() => unfollow(c)}>Unfollow</Button>
            </div>
            {c.latest_jobs.length > 0 && <ul className="u-list follow-jobs">{c.latest_jobs.map((j) => <li key={j.id}><div className="grow"><Link to={`/jobs/${j.id}`}>{j.title}</Link><p className="muted small">{j.location || 'Anywhere'}</p></div><span className="muted small">{timeAgo(j.created_at)}</span></li>)}</ul>}
          </Card>
        ))}</div>
      </DataState>
    </>
  );
}
