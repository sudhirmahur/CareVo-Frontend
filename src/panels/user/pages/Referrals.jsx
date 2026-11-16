import { useState } from 'react';
import { api, errorMessage } from '../../../lib/api';
import { formatDate } from '../../../lib/format';
import { useAsync } from '../../../lib/hooks';
import { useToast } from '../../../lib/toast';
import Icon from '../../../components/Icon';
import { Badge, Button, Card, DataState, PageHeader, StatCard, TagInput } from '../../../components/ui';

export default function Referrals() {
  const toast = useToast();
  const { data, loading, error, reload } = useAsync(() => api.get('/me/referrals'), []);
  const [emails, setEmails] = useState([]);
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState('');
  const copy = async (text, what) => {
    try { await navigator.clipboard.writeText(text); toast.success(`${what} copied`); } catch { toast.error('Copy failed - select and copy manually'); }
  };
  const invite = async () => {
    setErr('');
    const bad = emails.find((e) => !/^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(e));
    if (!emails.length) return setErr('Add at least one email address');
    if (bad) return setErr(`"${bad}" is not a valid email`);
    setBusy(true);
    try {
      const r = await api.post('/me/referrals/invite', { emails });
      toast.success(r.message + (r.skipped.length ? ` (${r.skipped.length} skipped - already members or invited)` : ''));
      setEmails([]); reload();
    } catch (e) { setErr(errorMessage(e)); } finally { setBusy(false); }
  };
  return (
    <>
      <PageHeader title="Refer & earn" description="Invite friends. You earn 50 points per friend who joins, plus Premium days at milestones." />
      <DataState loading={loading} error={error} onRetry={reload} hasData={!!data}>
        {data && (
          <div className="stack">
            <div className="grid grid-3">
              <StatCard icon="users" label="Friends joined" value={data.total} />
              <StatCard icon="award" tone="success" label="Points" value={data.points} />
              <StatCard icon="send" tone="warning" label="Invites sent" value={data.invited} hint={data.report.conversion_rate != null ? `${data.report.conversion_rate}% joined` : undefined} />
            </div>
            <Card title="Your referral link">
              <div className="ref-box">
                <div><p className="muted small">Code</p><strong data-testid="ref-code" className="ref-code">{data.code}</strong></div>
                <div className="grow"><p className="muted small">Link</p><code className="ref-link truncate" data-testid="ref-link">{data.link}</code></div>
                <Button variant="secondary" icon="link" onClick={() => copy(data.link, 'Link')}>Copy link</Button>
                <Button variant="ghost" onClick={() => copy(data.code, 'Code')}>Copy code</Button>
              </div>
            </Card>
            <Card title="Rewards">
              <ul className="ref-miles" data-testid="ref-rewards">{data.rewards.map((r) => (
                <li key={r.need} className={r.unlocked ? 'done' : ''}>
                  <span className="ref-dot">{r.unlocked ? <Icon name="check" size={14} /> : r.need}</span>
                  <div className="grow"><strong>{r.label}</strong><p className="muted small">{r.unlocked ? 'Unlocked' : `${r.remaining} more referral${r.remaining === 1 ? '' : 's'} to go`}</p></div>
                  {r.unlocked && <Badge tone="success">Unlocked</Badge>}
                </li>
              ))}</ul>
            </Card>
            <Card title="Invite friends by email">
              <div className="stack">
                <TagInput label="Email addresses" value={emails} onChange={setEmails} placeholder="friend@example.com, press Enter" hint="Up to 10 at a time." />
                {err && <p className="form-error" role="alert">{err}</p>}
                <div><Button icon="send" loading={busy} onClick={invite}>Send invites</Button></div>
              </div>
            </Card>
            <Card title="Friends who joined" padded={false}>
              {data.history.length === 0 ? <p className="muted" style={{ padding: 18 }}>Nobody has joined with your code yet.</p> : (
                <ul className="u-list" data-testid="ref-history">{data.history.map((h, i) => <li key={i}><div className="grow"><strong>{h.name}</strong><p className="muted small">Joined {formatDate(h.joined_at)}</p></div><Badge tone="success">+{h.points} pts</Badge></li>)}</ul>
              )}
            </Card>
          </div>
        )}
      </DataState>
    </>
  );
}
