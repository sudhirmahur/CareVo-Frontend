import { useState } from 'react';
import { api, errorMessage, tokenStore } from '../../lib/api';
import { useToast } from '../../lib/toast';
import { Button, Input } from '../ui';

export default function ChangePasswordForm() {
  const toast = useToast();
  const [f, setF] = useState({ current_password: '', new_password: '', confirm: '' });
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);
  const set = (k) => (e) => setF((s) => ({ ...s, [k]: e.target.value }));
  const submit = async (e) => {
    e.preventDefault();
    setError('');
    if (f.new_password.length < 8 || !/[A-Za-z]/.test(f.new_password) || !/\d/.test(f.new_password)) return setError('New password needs at least 8 characters, including a letter and a number.');
    if (f.new_password !== f.confirm) return setError('New passwords do not match.');
    setBusy(true);
    try {
      const res = await api.post('/auth/change-password', { current_password: f.current_password, new_password: f.new_password });
      if (res && res.access_token) tokenStore.refresh(res.access_token); // old sessions are invalidated by the server
      toast.success('Password updated.');
      setF({ current_password: '', new_password: '', confirm: '' });
    } catch (err) {
      setError(errorMessage(err));
    } finally {
      setBusy(false);
    }
  };
  return (
    <form className="stack" onSubmit={submit} noValidate>
      {error && <p className="form-error" role="alert">{error}</p>}
      <Input label="Current password" type="password" autoComplete="current-password" value={f.current_password} onChange={set('current_password')} required />
      <Input label="New password" type="password" autoComplete="new-password" value={f.new_password} onChange={set('new_password')} required />
      <Input label="Confirm new password" type="password" autoComplete="new-password" value={f.confirm} onChange={set('confirm')} required />
      <div><Button type="submit" loading={busy}>Update password</Button></div>
    </form>
  );
}
