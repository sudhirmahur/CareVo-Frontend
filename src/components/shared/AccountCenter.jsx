import { useState } from 'react';
import '../../styles/account.css';
import { API_BASE, api, errorMessage, tokenStore } from '../../lib/api';
import { useAuth } from '../../lib/auth';
import { formatDate } from '../../lib/format';
import { useAsync } from '../../lib/hooks';
import { useToast } from '../../lib/toast';
import { Badge, Button, Card, ConfirmDialog, DataState, Input, Modal, PageHeader, Select, Switch, Tabs, Textarea } from '../ui';
import ChangePasswordForm from './ChangePasswordForm';

const ACTIVITY_LABEL = {
  login: 'Signed in', logout: 'Signed out', reactivated: 'Account reactivated', password_changed: 'Password changed', password_reset: 'Password reset', '2fa_enabled': 'Two-step verification turned on', '2fa_disabled': 'Two-step verification turned off',
  '2fa_failed': 'Wrong verification code', sessions_ended: 'Signed out other devices', privacy_changed: 'Privacy settings changed', data_exported: 'Data exported', deactivated: 'Account deactivated',
};
const CAT_LABEL = { jobs: 'Jobs & alerts', applications: 'Applications', interviews: 'Interviews', messages: 'Messages', system: 'Account & system', promotions: 'Tips & promotions' };

function useAct() {
  const toast = useToast();
  const [busy, setBusy] = useState(false);
  const run = async (fn, ok) => {
    setBusy(true);
    try { const r = await fn(); if (ok) toast.success(typeof ok === 'function' ? ok(r) : ok); return r ?? true; } catch (e) { toast.error(errorMessage(e)); return false; } finally { setBusy(false); }
  };
  return [run, busy];
}

/* ---------------------------------------------------------------- 2FA */
function TwoFactor() {
  const st = useAsync(() => api.get('/auth/2fa'), []);
  const [mode, setMode] = useState(null); // 'email' | 'totp'
  const [setup, setSetup] = useState(null);
  const [code, setCode] = useState('');
  const [pw, setPw] = useState('');
  const [offOpen, setOffOpen] = useState(false);
  const [run, busy] = useAct();
  const reset = () => { setMode(null); setSetup(null); setCode(''); };
  const d = st.data;

  const startEmail = async () => {
    const r = await run(() => api.post('/auth/2fa/email/send'), 'Code sent to your email');
    if (r) { setMode('email'); setSetup(r); }
  };
  const startTotp = async () => {
    const r = await run(() => api.post('/auth/2fa/totp/setup'));
    if (r) { setMode('totp'); setSetup(r); }
  };
  const confirm = async () => {
    const path = mode === 'email' ? '/auth/2fa/email/enable' : '/auth/2fa/totp/enable';
    const ok = await run(() => api.post(path, { code: code.trim(), challenge_id: setup?.challenge_id }), 'Two-step verification is on');
    if (ok) { reset(); st.reload(); }
  };
  const disable = async () => {
    const ok = await run(() => api.post('/auth/2fa/disable', { password: pw }), 'Two-step verification is off');
    if (ok) { setOffOpen(false); setPw(''); st.reload(); }
  };

  return (
    <Card title="Two-step verification" subtitle="Ask for a one-time code every time you sign in." data-testid="twofa-card">
      <DataState loading={st.loading} error={st.error} onRetry={st.reload} hasData={!!d}>
        {d && (d.enabled ? (
          <div className="ac-row">
            <div><Badge tone="success" dot>On</Badge> <strong>{d.method === 'totp' ? 'Authenticator app' : 'Email code'}</strong><p className="muted small">You will be asked for a code after your password.</p></div>
            <Button variant="danger" onClick={() => setOffOpen(true)}>Turn off</Button>
          </div>
        ) : !mode ? (
          <div className="stack">
            <p className="muted">Two-step verification is <strong>off</strong>. Choose how you want to receive codes:</p>
            <div className="ac-pill-row">
              <Button variant="secondary" icon="mail" loading={busy} onClick={startEmail}>Email code</Button>
              <Button variant="secondary" icon="shield" loading={busy} onClick={startTotp}>Authenticator app</Button>
            </div>
          </div>
        ) : (
          <div className="stack" data-testid="twofa-setup">
            {mode === 'totp' ? (
              <>
                <p>Add this key to Google Authenticator, Authy or any TOTP app, then enter the 6-digit code it shows.</p>
                <p className="ac-secret" data-testid="totp-secret">{setup?.secret}</p>
                {setup?.otpauth_uri && <p className="small muted">Or open on your phone: <a href={setup.otpauth_uri} className="break">authenticator link</a></p>}
              </>
            ) : (
              <p>We sent a 6-digit code to your email. Enter it below.{setup?.dev_code && <span className="muted small"> (Dev mode code: <code data-testid="dev-code">{setup.dev_code}</code>)</span>}</p>
            )}
            <Input className="ac-code" label="Verification code" inputMode="numeric" maxLength={8} value={code} onChange={(e) => setCode(e.target.value.replace(/\D/g, ''))} />
            <div className="ac-pill-row"><Button loading={busy} onClick={confirm} disabled={code.length < 4}>Verify and turn on</Button><Button variant="ghost" onClick={reset}>Cancel</Button></div>
          </div>
        ))}
      </DataState>
      <Modal open={offOpen} onClose={() => setOffOpen(false)} title="Turn off two-step verification" size="sm"
        footer={<><Button variant="ghost" onClick={() => setOffOpen(false)}>Cancel</Button><Button variant="danger" loading={busy} onClick={disable} disabled={!pw}>Turn off</Button></>}>
        <Input label="Confirm with your password" type="password" autoComplete="current-password" value={pw} onChange={(e) => setPw(e.target.value)} />
      </Modal>
    </Card>
  );
}

/* ----------------------------------------------------------- sessions + activity */
function Sessions() {
  const s = useAsync(() => api.get('/account/sessions'), []);
  const [run, busy] = useAct();
  const items = s.data?.items || [];
  return (
    <Card title="Where you are signed in" subtitle="Sign out devices you do not recognise." data-testid="sessions-card"
      actions={items.length > 1 && <Button variant="secondary" size="sm" loading={busy} onClick={async () => { if (await run(() => api.delete('/account/sessions'), (r) => r.message)) s.reload(); }}>Sign out all other devices</Button>}>
      <DataState loading={s.loading} error={s.error} onRetry={s.reload} hasData={!!s.data} isEmpty={items.length === 0} empty={{ icon: 'lock', title: 'No active sessions' }}>
        <ul className="ac-list">
          {items.map((x) => (
            <li key={x.id} className="ac-row" data-testid="session-row">
              <div><strong>{x.device || 'Unknown device'}</strong> {x.current && <Badge tone="success">This device</Badge>}<p className="muted small">{x.ip || ''} · last active {formatDate(x.last_seen, true)}</p></div>
              {!x.current && <Button variant="ghost" size="sm" aria-label={`End session ${x.device || ''}`} onClick={async () => { if (await run(() => api.delete(`/account/sessions/${x.id}`), 'Session ended')) s.reload(); }}>End session</Button>}
            </li>
          ))}
        </ul>
      </DataState>
    </Card>
  );
}

function Activity() {
  const a = useAsync(() => api.get('/account/activity', { limit: 20 }), []);
  const items = a.data?.items || [];
  return (
    <Card title="Recent account activity" data-testid="activity-card">
      <DataState loading={a.loading} error={a.error} onRetry={a.reload} hasData={!!a.data} isEmpty={items.length === 0} empty={{ icon: 'clock', title: 'No activity yet' }}>
        <ul className="ac-list">
          {items.map((x) => (
            <li key={x.id} className="ac-row"><div><strong>{ACTIVITY_LABEL[x.kind] || x.kind}</strong><p className="muted small">{x.device || ''} {x.ip ? `· ${x.ip}` : ''} {x.detail ? `· ${x.detail}` : ''}</p></div><span className="muted small">{formatDate(x.created_at, true)}</span></li>
          ))}
        </ul>
      </DataState>
    </Card>
  );
}

/* ------------------------------------------------------------ notifications */
function NotificationPrefs() {
  const p = useAsync(() => api.get('/account/notification-preferences'), []);
  const [draft, setDraft] = useState(null);
  const [run, busy] = useAct();
  const v = draft || p.data;
  const set = (patch) => setDraft({ ...v, ...patch });
  const setCat = (c, ch, val) => setDraft({ ...v, categories: { ...v.categories, [c]: { ...v.categories[c], [ch]: val } } });
  const save = async () => {
    const r = await run(() => api.put('/account/notification-preferences', { email_enabled: v.email_enabled, in_app_enabled: v.in_app_enabled, categories: v.categories, interview_reminders: v.interview_reminders, job_reminders: v.job_reminders }), 'Preferences saved');
    if (r && r !== true) { p.setData(r); setDraft(null); }
  };
  return (
    <Card title="Notification preferences" subtitle="Choose what reaches you, and where." data-testid="notif-card">
      <DataState loading={p.loading} error={p.error} onRetry={p.reload} hasData={!!v}>
        {v && (
          <div className="stack">
            <Switch label="Show notifications in the app" checked={v.in_app_enabled} onChange={(x) => set({ in_app_enabled: x })} />
            <Switch label="Send me emails" checked={v.email_enabled} onChange={(x) => set({ email_enabled: x })} />
            <Switch label="Interview reminders" checked={v.interview_reminders} onChange={(x) => set({ interview_reminders: x })} />
            <Switch label="Job and event reminders" checked={v.job_reminders} onChange={(x) => set({ job_reminders: x })} />
            <div className="ac-cats">
              <div className="ac-cat ac-cat-h"><span>Category</span><span>In-app</span><span>Email</span></div>
              {Object.keys(CAT_LABEL).map((c) => (
                <div className="ac-cat" key={c}>
                  <span>{CAT_LABEL[c]}</span>
                  <Switch label={<span className="sr-only">{CAT_LABEL[c]} in-app</span>} checked={v.categories[c].in_app} disabled={!v.in_app_enabled} onChange={(x) => setCat(c, 'in_app', x)} />
                  <Switch label={<span className="sr-only">{CAT_LABEL[c]} email</span>} checked={v.categories[c].email} disabled={!v.email_enabled} onChange={(x) => setCat(c, 'email', x)} />
                </div>
              ))}
            </div>
            <p className="muted small">Security alerts (like a new sign-in code) are always delivered.</p>
            <div><Button loading={busy} onClick={save} disabled={!draft}>Save preferences</Button></div>
          </div>
        )}
      </DataState>
    </Card>
  );
}

/* ------------------------------------------------------------------ privacy */
function download(blob, name) {
  const url = URL.createObjectURL(blob);
  const a = Object.assign(document.createElement('a'), { href: url, download: name });
  document.body.appendChild(a); a.click(); a.remove(); URL.revokeObjectURL(url);
}

function Privacy({ role }) {
  const toast = useToast();
  const { logout } = useAuth();
  const pr = useAsync(() => api.get('/account/privacy'), []);
  const bl = useAsync(() => api.get('/account/blocks'), []);
  const del = useAsync(() => api.get('/account/deletion-request'), []);
  const [draft, setDraft] = useState(null);
  const [run, busy] = useAct();
  const [dlg, setDlg] = useState(null); // 'deactivate' | 'delete'
  const [pw, setPw] = useState('');
  const [reason, setReason] = useState('');
  const v = draft || pr.data;
  const set = (patch) => setDraft({ ...v, ...patch });
  const isUser = role === 'user';

  const save = async () => {
    const r = await run(() => api.put('/account/privacy', v), 'Privacy settings saved');
    if (r && r !== true) { pr.setData(r); setDraft(null); }
  };
  const exportData = async () => {
    try {
      const res = await fetch(`${API_BASE}/account/export`, { headers: { Authorization: `Bearer ${tokenStore.get()}` } });
      if (!res.ok) throw new Error('Export failed. Please try again.');
      download(await res.blob(), 'carevo-my-data.json');
      toast.success('Your data was downloaded.');
    } catch (e) { toast.error(errorMessage(e)); }
  };
  const confirmDialog = async () => {
    if (dlg === 'deactivate') {
      const ok = await run(() => api.post('/account/deactivate', { password: pw, reason: reason || undefined }), 'Account deactivated');
      if (ok) { setDlg(null); logout(); }
    } else {
      const ok = await run(() => api.post('/account/deletion-request', { password: pw, reason: reason || undefined }), (r) => r.message);
      if (ok) { setDlg(null); setPw(''); setReason(''); del.reload(); }
    }
  };

  return (
    <div className="stack">
      <Card title="Privacy" subtitle="Control who can see and contact you." data-testid="privacy-card">
        <DataState loading={pr.loading} error={pr.error} onRetry={pr.reload} hasData={!!v}>
          {v && (
            <div className="stack">
              {isUser && <Select label="Who can see my profile" value={v.profile_visibility} onChange={(e) => set({ profile_visibility: e.target.value })} options={[{ value: 'public', label: 'Everyone' }, { value: 'recruiters', label: 'Recruiters only' }, { value: 'private', label: 'Only me' }]} />}
              <Select label="Who can message me" value={v.allow_messages} onChange={(e) => set({ allow_messages: e.target.value })} options={[{ value: 'everyone', label: 'Everyone' }, { value: 'applied', label: 'Only people I applied to / who applied to me' }, { value: 'none', label: 'Nobody' }]} />
              {isUser && <Switch label="Show my email on my profile" checked={v.show_email} onChange={(x) => set({ show_email: x })} />}
              {isUser && <Switch label="Show my phone on my profile" checked={v.show_phone} onChange={(x) => set({ show_phone: x })} />}
              <Switch label="Product tips and marketing emails" checked={v.marketing_emails} onChange={(x) => set({ marketing_emails: x })} />
              <div><Button loading={busy} onClick={save} disabled={!draft}>Save privacy settings</Button></div>
            </div>
          )}
        </DataState>
      </Card>

      <Card title="Blocked people" subtitle="They cannot message you and you cannot message them." data-testid="blocks-card">
        <DataState loading={bl.loading} error={bl.error} onRetry={bl.reload} hasData={!!bl.data} isEmpty={(bl.data?.items || []).length === 0} empty={{ icon: 'ban', title: 'You have not blocked anyone' }}>
          <ul className="ac-list">
            {(bl.data?.items || []).map((b) => (
              <li key={b.user_id} className="ac-row" data-testid="block-row"><div><strong>{b.name}</strong> <Badge>{b.role}</Badge><p className="muted small">Blocked {formatDate(b.blocked_at)}</p></div>
                <Button variant="secondary" size="sm" aria-label={`Unblock ${b.name}`} onClick={async () => { if (await run(() => api.delete(`/account/blocks/${b.user_id}`), `${b.name} unblocked`)) bl.reload(); }}>Unblock</Button></li>
            ))}
          </ul>
        </DataState>
      </Card>

      <Card title="Your data" subtitle="Download a copy of everything we store about you." data-testid="data-card">
        <Button variant="secondary" icon="download" onClick={exportData}>Download my data (JSON)</Button>
      </Card>

      {role !== 'admin' && (
        <Card title="Deactivate or delete" data-testid="danger-card">
          <div className="stack ac-danger">
            <div className="ac-row"><div><strong>Deactivate account</strong><p className="muted small">Hide your account. Sign in again any time to bring it back.</p></div><Button variant="secondary" onClick={() => { setPw(''); setReason(''); setDlg('deactivate'); }}>Deactivate</Button></div>
            <div className="ac-row"><div><strong>Delete account and data</strong>
              <p className="muted small">{del.data?.pending ? 'Your deletion request is with our team.' : 'Our team will permanently delete your account after you request it.'}</p></div>
              {del.data?.pending ? <Button variant="secondary" onClick={async () => { if (await run(() => api.delete('/account/deletion-request'), 'Request cancelled')) del.reload(); }}>Cancel request</Button> : <Button variant="danger" onClick={() => { setPw(''); setReason(''); setDlg('delete'); }}>Request deletion</Button>}</div>
          </div>
        </Card>
      )}

      <Modal open={!!dlg} onClose={() => setDlg(null)} title={dlg === 'deactivate' ? 'Deactivate your account?' : 'Request account deletion?'} size="sm"
        footer={<><Button variant="ghost" onClick={() => setDlg(null)}>Cancel</Button><Button variant="danger" loading={busy} onClick={confirmDialog} disabled={!pw}>{dlg === 'deactivate' ? 'Deactivate' : 'Send request'}</Button></>}>
        <div className="stack">
          <Input label="Confirm with your password" type="password" autoComplete="current-password" value={pw} onChange={(e) => setPw(e.target.value)} />
          <Textarea label="Reason (optional)" rows={2} maxLength={300} value={reason} onChange={(e) => setReason(e.target.value)} />
        </div>
      </Modal>
    </div>
  );
}

/* -------------------------------------------------------------------- shell */
export default function AccountCenter({ role = 'user' }) {
  const [tab, setTab] = useState('security');
  return (
    <div className="ac" data-testid="account-center">
      <PageHeader title="Account & security" description="Sign-in security, notifications, privacy and your data." />
      <Tabs value={tab} onChange={setTab} tabs={[{ value: 'security', label: 'Security' }, { value: 'notifications', label: 'Notifications' }, { value: 'privacy', label: 'Privacy & data' }, { value: 'password', label: 'Password' }]} />
      {tab === 'security' && <><TwoFactor /><Sessions /><Activity /></>}
      {tab === 'notifications' && <NotificationPrefs />}
      {tab === 'privacy' && <Privacy role={role} />}
      {tab === 'password' && <Card title="Change password"><ChangePasswordForm /></Card>}
    </div>
  );
}
