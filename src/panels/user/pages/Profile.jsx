import { useEffect, useState } from 'react';
import { api, errorMessage } from '../../../lib/api';
import { useAuth } from '../../../lib/auth';
import { isHttpUrl } from '../../../lib/format';
import { useAsync } from '../../../lib/hooks';
import { useToast } from '../../../lib/toast';
import ChangePasswordForm from '../../../components/shared/ChangePasswordForm';
import { Avatar, Button, Card, DataState, Input, PageHeader, SkeletonList, TagInput, Textarea } from '../../../components/ui';

export default function Profile() {
  const toast = useToast();
  const { user, refreshUser } = useAuth();
  const { data, loading, error, reload } = useAsync(() => api.get('/users/me/profile'), []);
  const [f, setF] = useState(null);
  const [errors, setErrors] = useState({});
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    if (data) setF({ name: user.name || '', phone: user.phone || '', bio: data.bio || '', current_position: data.current_position || '', experience_years: data.experience_years ?? 0, location: data.location || '', github_url: data.github_url || '', linkedin_url: data.linkedin_url || '', portfolio_url: data.portfolio_url || '', skills: data.skills || [] });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [data]);
  const set = (k) => (e) => setF((s) => ({ ...s, [k]: e.target.value }));

  const save = async (e) => {
    e.preventDefault();
    const er = {};
    if (f.name.trim().length < 2) er.name = 'Enter your full name.';
    ['github_url', 'linkedin_url', 'portfolio_url'].forEach((k) => { if (f[k].trim() && !isHttpUrl(f[k])) er[k] = 'Enter a full link starting with http:// or https://'; });
    const exp = Number(f.experience_years);
    if (Number.isNaN(exp) || exp < 0 || exp > 60) er.experience_years = 'Enter years between 0 and 60.';
    setErrors(er);
    if (Object.keys(er).length) return;
    setBusy(true);
    try {
      await api.put('/users/me', { name: f.name.trim(), phone: f.phone.trim() || null });
      await api.put('/users/me/profile', { bio: f.bio, current_position: f.current_position, experience_years: exp, location: f.location, github_url: f.github_url.trim() || '', linkedin_url: f.linkedin_url.trim() || '', portfolio_url: f.portfolio_url.trim() || '', skills: f.skills });
      await refreshUser();
      toast.success('Profile saved');
      reload();
    } catch (err) { toast.error(errorMessage(err)); } finally { setBusy(false); }
  };

  return (
    <>
      <PageHeader title="My profile" description="A complete profile gets you better matches and more recruiter attention." />
      <DataState loading={loading} error={error} onRetry={reload} hasData={!!f} skeleton={<SkeletonList count={2} lines={5} />}>
        {f && (
          <div className="u-two u-profile">
            <form onSubmit={save} noValidate>
              <Card title="Personal details" className="stack">
                <div className="row"><Avatar name={user.name} src={user.profile_image} size={64} /><div><strong>{user.name}</strong><p className="muted small">{user.email}</p></div></div>
                <div className="form-grid">
                  <Input label="Full name" value={f.name} onChange={set('name')} error={errors.name} required />
                  <Input label="Phone" type="tel" value={f.phone} onChange={set('phone')} />
                  <Input label="Current position" value={f.current_position} onChange={set('current_position')} placeholder="e.g. Frontend Developer" />
                  <Input label="Years of experience" type="number" min="0" max="60" value={f.experience_years} onChange={set('experience_years')} error={errors.experience_years} />
                  <div className="full"><Input label="Location" value={f.location} onChange={set('location')} placeholder="City, Country" /></div>
                  <div className="full"><Textarea label="About you" value={f.bio} onChange={set('bio')} maxLength={2000} placeholder="Tell recruiters about yourself" /></div>
                  <div className="full"><TagInput label="Skills" value={f.skills} onChange={(skills) => setF((s) => ({ ...s, skills }))} placeholder="Add a skill and press Enter" hint="Used to recommend jobs for you." /></div>
                  <Input label="GitHub" type="url" value={f.github_url} onChange={set('github_url')} error={errors.github_url} placeholder="https://github.com/you" />
                  <Input label="LinkedIn" type="url" value={f.linkedin_url} onChange={set('linkedin_url')} error={errors.linkedin_url} placeholder="https://linkedin.com/in/you" />
                  <div className="full"><Input label="Portfolio" type="url" value={f.portfolio_url} onChange={set('portfolio_url')} error={errors.portfolio_url} placeholder="https://yoursite.com" /></div>
                </div>
                <div><Button type="submit" loading={busy}>Save profile</Button></div>
              </Card>
            </form>
            <Card title="Change password"><ChangePasswordForm /></Card>
          </div>
        )}
      </DataState>
    </>
  );
}
