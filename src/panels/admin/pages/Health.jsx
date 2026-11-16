import { useEffect, useState } from 'react';
import { api, errorMessage } from '../../../lib/api';
import { formatDate } from '../../../lib/format';
import { useAsync } from '../../../lib/hooks';
import { useToast } from '../../../lib/toast';
import { Badge, Button, Card, DataState, PageHeader, StatCard, Switch } from '../../../components/ui';

const TONE = { ok: 'success', degraded: 'warning', down: 'danger' };
const up = (s) => { const d = Math.floor(s / 86400); const h = Math.floor((s % 86400) / 3600); const m = Math.floor((s % 3600) / 60); return d ? `${d}d ${h}h` : h ? `${h}h ${m}m` : `${m}m`; };

export default function Health() {
  const toast = useToast();
  const [auto, setAuto] = useState(false);
  const h = useAsync(() => api.get('/admin/health'), []);
  const hist = useAsync(() => api.get('/admin/health/history', { limit: 20 }), []);
  const errs = useAsync(() => api.get('/admin/health/errors', { limit: 20 }), []);
  const refresh = () => { h.reload(); hist.reload(); errs.reload(); };
  useEffect(() => { if (!auto) return undefined; const t = setInterval(refresh, 15000); return () => clearInterval(t); }, [auto]); // eslint-disable-line
  const s = h.data;
  const clear = async () => { try { await api.delete('/admin/health/errors'); toast.success('Error log cleared'); errs.reload(); h.reload(); } catch (e) { toast.error(errorMessage(e)); } };
  return (
    <>
      <PageHeader title="System health" description="API, database and service status." actions={<><Switch checked={auto} onChange={setAuto} label="Auto-refresh" /><Button variant="secondary" icon="refresh" onClick={refresh}>Refresh</Button></>} />
      <DataState loading={h.loading} error={h.error} onRetry={h.reload} hasData={!!s}>
        {s && (
          <div className="stack">
            <Card><div className="row" style={{ gap: 12 }} data-testid="health-status"><Badge tone={TONE[s.status]} dot>{s.status === 'ok' ? 'All systems operational' : s.status}</Badge><span className="muted small">Checked {formatDate(s.at, true)}</span></div></Card>
            <div className="grid grid-4 ad-stats">
              <StatCard icon="zap" tone="success" label="API uptime" value={up(s.api.uptime_seconds)} hint={`Python ${s.api.python}`} />
              <StatCard icon="layers" tone={s.database.status === 'ok' ? 'success' : 'danger'} label="Database" value={s.database.status === 'ok' ? `${s.database.latency_ms} ms` : 'Down'} />
              <StatCard icon="inbox" label="Disk used" value={s.disk.used_pct != null ? `${s.disk.used_pct}%` : 'n/a'} hint={s.disk.total_gb ? `${s.disk.total_gb} GB total` : ''} />
              <StatCard icon="alert" tone={s.errors_24h ? 'warning' : 'success'} label="Errors (24h)" value={s.errors_24h} />
            </div>
            <Card title="Alerts">
              {s.alerts.length === 0 ? <p className="muted">No alerts.</p> : <ul className="stack" data-testid="health-alerts">{s.alerts.map((a, i) => <li key={i}><Badge tone={a.level === 'critical' ? 'danger' : a.level === 'warning' ? 'warning' : 'info'}>{a.level}</Badge> {a.message}</li>)}</ul>}
            </Card>
            <Card title="Services"><ul className="stack small" data-testid="health-services">{Object.entries(s.services).map(([k, v]) => <li key={k}><strong>{k}</strong>: {v}</li>)}</ul><p className="muted small">Last backup: {s.last_backup ? formatDate(s.last_backup, true) : 'never'}</p></Card>
            <Card title="Recent server errors" actions={<Button size="sm" variant="ghost" onClick={clear}>Clear log</Button>}>
              {(errs.data?.items || []).length === 0 ? <p className="muted">No errors recorded.</p> : <div className="table-wrap"><table className="table rtable" data-testid="error-log"><thead><tr><th>When</th><th>Request</th><th>Error</th></tr></thead><tbody>{errs.data.items.map((e) => <tr key={e.id}><td data-label="When">{formatDate(e.at, true)}</td><td data-label="Request">{e.method} {e.path}</td><td data-label="Error">{e.error}: {e.message}</td></tr>)}</tbody></table></div>}
            </Card>
            <Card title="Status history"><ul className="small stack">{(hist.data?.items || []).map((x) => <li key={x.id}>{formatDate(x.at, true)} - <Badge tone={TONE[x.status]}>{x.status}</Badge> · db {x.database?.latency_ms ?? '-'} ms</li>)}</ul></Card>
          </div>
        )}
      </DataState>
    </>
  );
}
