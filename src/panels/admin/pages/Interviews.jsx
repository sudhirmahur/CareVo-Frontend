import { api } from '../../../lib/api';
import { formatDate } from '../../../lib/format';
import { useAsync } from '../../../lib/hooks';
import { Badge, Card, DataState, PageHeader, StatusBadge, Button } from '../../../components/ui';

export default function Interviews() {
  const { data, loading, error, reload } = useAsync(() => api.get('/admin/interviews'), []);
  const items = data?.items || [];
  return (
    <>
      <PageHeader title="Interviews" description="All scheduled, completed and cancelled interviews (read-only)." actions={<Button variant="secondary" icon="refresh" onClick={reload}>Refresh</Button>} />
      <Card padded={false}>
        <DataState loading={loading} error={error} onRetry={reload} hasData={!!data} isEmpty={items.length === 0} empty={{ icon: 'calendar', title: 'No interviews yet', description: 'Recruiters schedule interviews from their applications.' }}>
          <div className="table-wrap">
            <table className="table rtable" data-testid="interviews-table">
              <thead><tr><th>Candidate</th><th>Job</th><th>When</th><th>Mode</th><th>Status</th></tr></thead>
              <tbody>
                {items.map((i) => (
                  <tr key={i.id}>
                    <td data-label="Candidate"><div className="strong">{i.candidate?.name || '-'}</div><div className="muted small">{i.candidate?.email}</div></td>
                    <td data-label="Job"><div>{i.job_title}</div><div className="muted small">{i.company_name}</div></td>
                    <td data-label="When">{formatDate(i.scheduled_at, true)}</td>
                    <td data-label="Mode"><Badge tone="neutral">{i.mode}</Badge>{i.meeting_link && <> <a className="small" href={i.meeting_link} target="_blank" rel="noopener noreferrer">link</a></>}</td>
                    <td data-label="Status"><StatusBadge status={i.status} /></td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </DataState>
      </Card>
    </>
  );
}
