import { useState } from 'react';
import { api, errorMessage } from '../../../lib/api';
import { useAuth } from '../../../lib/auth';
import { formatDate } from '../../../lib/format';
import { useAsync } from '../../../lib/hooks';
import { useToast } from '../../../lib/toast';
import Icon from '../../../components/Icon';
import ChangePasswordForm from '../../../components/shared/ChangePasswordForm';
import MediaUpload from '../../../components/shared/MediaUpload';
import { Badge, Button, Card, Input, PageHeader } from '../../../components/ui';

function PremiumCard() {
  const toast = useToast();
  const { data, reload } = useAsync(() => api.get('/users/me/premium'), []);
  const [busy, setBusy] = useState(false);
  const { refreshUser } = useAuth();
  const request = async () => {
    setBusy(true);
    try { const r = await api.post('/users/me/premium/request'); toast.success(r.message); await reload(); await refreshUser(); } catch (e) { toast.error(errorMessage(e)); } finally { setBusy(false); }
  };
  return (
    <Card title="Premium membership" actions={data?.is_premium ? <Badge tone="success" dot>Active</Badge> : <Badge tone="neutral">Free plan</Badge>} id="premium">
      <ul className="u-lock-list">
        <li><Icon name="check" size={15} /> Apply to jobs straight from Job Reels</li>
        <li><Icon name="check" size={15} /> View recruiter profiles</li>
      </ul>
      {!data ? null : data.is_premium ? (
        <p className="muted">{data.premium_until ? `Premium is active until ${formatDate(data.premium_until)}.` : 'Premium is active on your account.'}</p>
      ) : !data.gating_enabled ? (
        <p className="muted">Premium features are currently open to everyone.</p>
      ) : data.request_pending ? (
        <p className="form-ok" role="status">Your request is with our team. We will activate Premium for you soon.</p>
      ) : (
        <div><Button icon="crown" loading={busy} onClick={request}>Request Premium</Button></div>
      )}
    </Card>
  );
}

export default function Settings() {
  const toast = useToast();
  const { user, refreshUser } = useAuth();
  const [name, setName] = useState(user.name || '');
  const [phone, setPhone] = useState(user.phone || '');
  const [busy, setBusy] = useState(false);

  const saveAccount = async (e) => {
    e.preventDefault();
    if (name.trim().length < 2) return toast.error('Enter your full name.');
    setBusy(true);
    try { await api.put('/users/me', { name: name.trim(), phone: phone.trim() || null }); await refreshUser(); toast.success('Account updated'); } catch (err) { toast.error(errorMessage(err)); } finally { setBusy(false); }
  };
  const setPhoto = async (url) => {
    try { await api.put('/users/me', { profile_image: url || null }); await refreshUser(); toast.success(url ? 'Photo updated' : 'Photo removed'); } catch (err) { toast.error(errorMessage(err)); }
  };

  return (
    <>
      <PageHeader title="Settings" description="Manage your account, photo, password and membership." />
      <div className="u-two">
        <div className="stack">
          <Card title="Profile photo">
            <MediaUpload purpose="avatar" kind="image" value={user.profile_image || ''} onChange={setPhoto} label="Upload photo" round size={84} hint="JPG, PNG or WebP up to 8 MB." />
          </Card>
          <Card title="Account">
            <form className="stack" onSubmit={saveAccount} noValidate>
              <Input label="Full name" value={name} onChange={(e) => setName(e.target.value)} maxLength={100} />
              <Input label="Email" value={user.email} disabled hint="Your email cannot be changed." />
              <Input label="Phone" type="tel" value={phone} onChange={(e) => setPhone(e.target.value)} />
              <div><Button type="submit" loading={busy}>Save changes</Button></div>
            </form>
          </Card>
        </div>
        <div className="stack">
          <PremiumCard />
          <Card title="Change password"><ChangePasswordForm /></Card>
        </div>
      </div>
    </>
  );
}
