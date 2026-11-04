import { useState } from 'react';
import { api, errorMessage } from '../../../lib/api';
import { useAuth } from '../../../lib/auth';
import { useToast } from '../../../lib/toast';
import { Button, Card, Input, PageHeader } from '../../../components/ui';
import ChangePasswordForm from '../../../components/shared/ChangePasswordForm';

export default function Account() {
  const { user, refreshUser } = useAuth();
  const toast = useToast();
  const [name, setName] = useState(user.name);
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);
  const save = async (e) => {
    e.preventDefault();
    if (name.trim().length < 2) return setError('Name must be at least 2 characters.');
    setError('');
    setBusy(true);
    try {
      await api.put('/users/me', { name: name.trim() });
      await refreshUser();
      toast.success('Profile updated');
    } catch (err) {
      setError(errorMessage(err));
    } finally {
      setBusy(false);
    }
  };
  return (
    <>
      <PageHeader title="My account" description={user.email} />
      <div className="grid grid-2">
        <Card title="Profile">
          <form className="stack" onSubmit={save} noValidate>
            {error && <p className="form-error" role="alert">{error}</p>}
            <Input label="Name" value={name} onChange={(e) => setName(e.target.value)} />
            <Input label="Email" value={user.email} disabled readOnly />
            <div><Button type="submit" loading={busy} disabled={name.trim() === user.name}>Save</Button></div>
          </form>
        </Card>
        <Card title="Change password"><ChangePasswordForm /></Card>
      </div>
    </>
  );
}
