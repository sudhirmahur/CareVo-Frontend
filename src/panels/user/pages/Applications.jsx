import { useState } from 'react';
import { api, errorMessage } from '../../../lib/api';
import { formatDate, titleCase } from '../../../lib/format';
import { useAsync } from '../../../lib/hooks';
import { Link } from '../../../lib/router';
import { useToast } from '../../../lib/toast';
import Icon from '../../../components/Icon';
import { Badge, Button, Card, ConfirmDialog, DataState, PageHeader, Pagination, SkeletonList, StatusBadge, Tabs } from '../../../components/ui';

const TABS = [['', 'All'], ['applied', 'Applied'], ['shortlisted', 'Shortlisted'], ['accepted', 'Accepted'], ['rejected', 'Rejected'], ['withdrawn', 'Withdrawn']].map(([value, label]) => ({ value, label }));

function Timeline({ history }) {
  return (
    <ol className="u-timeline" aria-label="Status history">
      {history.map((h, i) => (
        <li key={i} className={i === history.length - 1 ? 'current' : ''}>
          <span className="dot" />
          <div><strong>{titleCase(h.status)}</strong> <span className="muted small">{formatDate(h.at, true)}</span>{h.note && <p className="muted small">{h.note}</p>}</div>
        </li>
      ))}
    </ol>
  );
}

export default function Applications() {
  const toast = useToast();
  const [tab, setTab] = useState('');
  const [page, setPage] = useState(1);
  const [withdraw, setWithdraw] = useState(null);
  const [busy, setBusy] = useState(false);
  const { data, loading, error, reload } = useAsync(() => api.get('/applications', { status: tab, page, limit: 8 }), [tab, page]);
  const items = data?.items || [];

  const doWithdraw = async () => {
    setBusy(true);
    try {
      await api.post(`/applications/${withdraw.id}/withdraw`);
      toast.success('Application withdrawn');
      setWithdraw(null);
      reload();
    } catch (e) {
      toast.error(errorMessage(e));
    } finally {
      setBusy(false);
    }
  };

  return (
    <>
      <PageHeader title="My applications" description="Every job you applied to - including those you finished on the company's website." />
      <Tabs tabs={TABS} value={tab} onChange={(v) => { setTab(v); setPage(1); }} />
      <DataState loading={loading} error={error} onRetry={reload} hasData={!!data} skeleton={<SkeletonList count={3} lines={4} />} isEmpty={items.length === 0}
        empty={{ icon: 'clipboard', title: tab ? `No ${tab} applications` : 'No applications yet', description: 'Find a job you like and hit Apply - it will show up here.', action: <Link className="btn btn-primary" to="/jobs">Browse jobs</Link> }}>
        <div className="stack">
          {items.map((a) => {
            const canWithdraw = !['accepted', 'rejected', 'withdrawn'].includes(a.status);
            return (
              <Card key={a.id} className="u-app" >
                <div className="row between u-app-head">
                  <div className="grow">
                    <h3><Link to={a.job.status === 'removed' ? '/applications' : `/jobs/${a.job.id}`}>{a.job_title || 'Job'}</Link></h3>
                    <p className="muted">{a.company_name || 'Company'} · Applied {formatDate(a.applied_at)}</p>
                  </div>
                  <div className="row-wrap">
                    <Badge tone={a.source === 'external' ? 'brand' : 'neutral'}>{a.source === 'external' ? 'Company site' : 'Carevo'}</Badge>
                    <StatusBadge status={a.status} />
                  </div>
                </div>
                <div className="u-app-body">
                  <Timeline history={a.status_history || []} />
                  <div className="stack-sm">
                    {a.interviews?.length > 0 && (
                      <div className="u-iv-mini">
                        <strong><Icon name="calendar" size={15} /> Interview</strong>
                        {a.interviews.map((iv) => <p key={iv.id} className="small">{formatDate(iv.scheduled_at, true)} · {titleCase(iv.mode)} · {titleCase(iv.status)}</p>)}
                      </div>
                    )}
                    {a.cover_letter && <div><strong className="small">Cover letter</strong><p className="muted small u-pre">{a.cover_letter}</p></div>}
                  </div>
                </div>
                <div className="row-wrap u-app-actions">
                  {a.apply_url && <a className="btn btn-secondary btn-sm" href={a.apply_url} target="_blank" rel="noopener noreferrer"><Icon name="external" size={15} /> Open company site</a>}
                  {a.job.status !== 'removed' && <Link className="btn btn-ghost btn-sm" to={`/jobs/${a.job.id}`}>View job</Link>}
                  {canWithdraw && <Button size="sm" variant="ghost" icon="x" onClick={() => setWithdraw(a)}>Withdraw</Button>}
                </div>
              </Card>
            );
          })}
        </div>
        <Pagination page={data?.page || 1} pages={data?.pages} onChange={setPage} />
      </DataState>
      <ConfirmDialog open={!!withdraw} title="Withdraw application?" message={`You will withdraw your application for ${withdraw?.job_title || 'this job'}. This cannot be undone.`} confirmLabel="Withdraw" danger loading={busy} onConfirm={doWithdraw} onCancel={() => setWithdraw(null)} />
    </>
  );
}
