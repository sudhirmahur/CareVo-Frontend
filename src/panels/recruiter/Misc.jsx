import { useEffect, useState } from 'react';
import { api, errorMessage } from '../../lib/api';
import { useAuth } from '../../lib/auth';
import { formatDate } from '../../lib/format';
import { useAsync } from '../../lib/hooks';
import { Link } from '../../lib/router';
import { useToast } from '../../lib/toast';
import ChangePasswordForm from '../../components/shared/ChangePasswordForm';
import { Avatar, Button, Card, DataState, Input, PageHeader, SkeletonList } from '../../components/ui';

export function Followers() {
  const { data, loading, error, reload } = useAsync(() => api.get('/recruiter/followers'), []);
  const items = data?.items || [];
  return (
    <>
      <PageHeader title="Followers" description={`${data?.total ?? 0} people follow your company.`} />
      <DataState loading={loading} error={error} onRetry={reload} hasData={!!data} skeleton={<SkeletonList count={3} lines={1} />} isEmpty={items.length === 0} empty={{ icon: 'users', title: 'No followers yet', description: 'Post jobs and videos to grow your audience.' }}>
        <Card padded={false}>
          <ul className="r-followers">
            {items.map((p) => (
              <li key={p.id}><Avatar name={p.name} size={40} /><div className="grow"><strong>{p.name}</strong><p className="muted small">Followed {formatDate(p.followed_at)}</p></div>
                <Link className="btn btn-secondary btn-sm" to={`/recruiter/messages?with=${p.id}`}>Message</Link></li>
            ))}
          </ul>
        </Card>
      </DataState>
    </>
  );
}

export function Account() {
  const { user, refreshUser } = useAuth();
  const toast = useToast();
  const [f, setF] = useState({ name: user.name || '', phone: user.phone || '' });
  const [err, setErr] = useState('');
  const [busy, setBusy] = useState(false);
  useEffect(() => setF({ name: user.name || '', phone: user.phone || '' }), [user.name, user.phone]);
  const submit = async (e) => {
    e.preventDefault();
    if (f.name.trim().length < 2) return setErr('Name must be at least 2 characters.');
    setErr('');
    setBusy(true);
    try {
      await api.put('/users/me', { name: f.name.trim(), phone: f.phone.trim() || null });
      await refreshUser();
      toast.success('Account updated.');
    } catch (e2) { setErr(errorMessage(e2)); } finally { setBusy(false); }
  };
  return (
    <>
      <PageHeader title="Account & security" />
      <div className="r-two-col">
        <Card title="Your details">
          <form className="stack" onSubmit={submit} noValidate>
            {err && <p className="form-error" role="alert">{err}</p>}
            <Input label="Full name" value={f.name} onChange={(e) => setF({ ...f, name: e.target.value })} required />
            <Input label="Email" value={user.email} disabled hint="Email cannot be changed." readOnly />
            <Input label="Phone" type="tel" value={f.phone} onChange={(e) => setF({ ...f, phone: e.target.value })} />
            <div><Button type="submit" loading={busy}>Save changes</Button></div>
          </form>
        </Card>
        <Card title="Change password"><ChangePasswordForm /></Card>
      </div>
    </>
  );
}
