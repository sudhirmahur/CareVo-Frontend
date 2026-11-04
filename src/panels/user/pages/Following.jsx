import { api, errorMessage } from '../../../lib/api';
import { useAsync } from '../../../lib/hooks';
import { Link } from '../../../lib/router';
import { useToast } from '../../../lib/toast';
import { Avatar, Button, Card, DataState, PageHeader, SkeletonList } from '../../../components/ui';

export default function Following() {
  const toast = useToast();
  const { data, loading, error, reload, setData } = useAsync(() => api.get('/follow/following'), []);
  const items = data?.items || [];
  const unfollow = async (x) => {
    try {
      await api.delete(`/follow/${x.id}`);
      setData((d) => ({ ...d, items: d.items.filter((i) => i.id !== x.id) }));
      toast.success(`Unfollowed ${x.name}`);
    } catch (e) { toast.error(errorMessage(e)); }
  };
  return (
    <>
      <PageHeader title="Following" description="Companies and people you follow." />
      <DataState loading={loading} error={error} onRetry={reload} hasData={!!data} skeleton={<SkeletonList count={3} lines={2} />} isEmpty={items.length === 0}
        empty={{ icon: 'heart', title: 'You are not following anyone yet', description: 'Follow companies to see them here.', action: <Link className="btn btn-primary" to="/companies">Browse companies</Link> }}>
        <Card padded={false}>
          <ul className="u-list">{items.map((x) => (
            <li key={x.id}>
              <Avatar name={x.name} src={x.logo_url} size={44} />
              <div className="grow"><strong>{x.type === 'company' ? <Link to={`/companies/${x.id}`}>{x.name}</Link> : x.name}</strong><p className="muted small">{x.type === 'company' ? 'Company' : 'Person'}</p></div>
              <Button size="sm" variant="secondary" onClick={() => unfollow(x)}>Unfollow</Button>
            </li>
          ))}</ul>
        </Card>
      </DataState>
    </>
  );
}
