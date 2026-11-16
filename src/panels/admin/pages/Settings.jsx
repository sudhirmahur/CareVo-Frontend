import { useEffect, useState } from 'react';
import { api } from '../../../lib/api';
import { formatDate } from '../../../lib/format';
import { useAsync } from '../../../lib/hooks';
import { Button, Card, ConfirmDialog, DataState, Input, PageHeader, Switch } from '../../../components/ui';
import { useDo } from '../common';

const TOGGLES = [
  ['allow_registration', 'Allow new registrations', 'When off, nobody new can sign up.'],
  ['auto_approve_jobs', 'Auto-approve recruiter jobs', 'Jobs from approved companies go live without review.'],
  ['auto_approve_companies', 'Auto-approve companies', 'New company profiles are approved immediately.'],
  ['premium_gating', 'Premium gating for Job Reels', 'When on, candidates need Premium to apply from Reels and view recruiter profiles. Turn off to open these to everyone.'],
  ['maintenance_mode', 'Maintenance mode', 'Only admins can sign in while this is on.'],
];

export default function Settings() {
  const { data, loading, error, reload } = useAsync(() => api.get('/admin/settings'), []);
  const [form, setForm] = useState(null);
  const [run, busy] = useDo();
  const [confirm, setConfirm] = useState(false);
  useEffect(() => { if (data) setForm({ ...data }); }, [data]);
  const dirty = data && form && JSON.stringify({ ...data, updated_at: 0 }) !== JSON.stringify({ ...form, updated_at: 0 });

  const save = async () => {
    const payload = { site_name: form.site_name, support_email: form.support_email, allow_registration: form.allow_registration, auto_approve_jobs: form.auto_approve_jobs, auto_approve_companies: form.auto_approve_companies, premium_gating: form.premium_gating, maintenance_mode: form.maintenance_mode };
    const ok = await run(() => api.put('/admin/settings', payload), 'Settings saved');
    if (ok) await reload();
    setConfirm(false);
  };
  return (
    <>
      <PageHeader title="Settings" description="Platform-wide behaviour." />
      <DataState loading={loading} error={error} onRetry={reload} hasData={!!form}>
        {form && (
          <Card className="ad-narrow" data-testid="settings">
            <div className="stack">
              <Input label="Site name" value={form.site_name || ''} onChange={(e) => setForm({ ...form, site_name: e.target.value })} />
              <Input label="Support email" value={form.support_email || ''} onChange={(e) => setForm({ ...form, support_email: e.target.value })} />
              <hr className="divider" style={{ margin: '4px 0' }} />
              {TOGGLES.map(([key, label, hint]) => (
                <div className="ad-toggle" key={key}>
                  <div><strong>{label}</strong><p className="muted small">{hint}</p></div>
                  <Switch checked={form[key]} onChange={(v) => setForm({ ...form, [key]: v })} label={<span className="sr-only">{label}</span>} />
                </div>
              ))}
              <div className="row between" style={{ flexWrap: 'wrap' }}>
                <span className="muted small">{data?.updated_at ? `Last saved ${formatDate(data.updated_at, true)}` : 'Using defaults'}</span>
                <Button disabled={!dirty} loading={busy} onClick={() => (form.maintenance_mode && !data.maintenance_mode ? setConfirm(true) : save())}>Save changes</Button>
              </div>
            </div>
          </Card>
        )}
      </DataState>
      <ConfirmDialog open={confirm} danger title="Turn on maintenance mode?" message="All candidates and recruiters will be unable to sign in until you turn it off again." confirmLabel="Enable maintenance" loading={busy} onCancel={() => setConfirm(false)} onConfirm={save} />
    </>
  );
}
