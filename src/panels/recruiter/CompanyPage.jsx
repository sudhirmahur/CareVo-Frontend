import { useEffect, useState } from 'react';
import { api, errorMessage } from '../../lib/api';
import { useAsync } from '../../lib/hooks';
import { useToast } from '../../lib/toast';
import { isHttpUrl, titleCase } from '../../lib/format';
import { Avatar, Badge, Button, Card, Input, PageHeader, Select, Textarea, StatusBadge } from '../../components/ui';
import Icon from '../../components/Icon';
import MediaUpload from '../../components/shared/MediaUpload';
import { useCompany } from './context';

const SIZES = [{ value: 'startup', label: 'Startup (1-50)' }, { value: 'sme', label: 'Small / Medium (50-500)' }, { value: 'enterprise', label: 'Enterprise (500+)' }];
const EMPTY = { name: '', description: '', logo_url: '', website: '', industry: '', size: 'startup', location: '' };

export default function CompanyPage() {
  const toast = useToast();
  const { company, loading, reload } = useCompany();
  const [f, setF] = useState(EMPTY);
  const [errors, setErrors] = useState({});
  const [formError, setFormError] = useState('');
  const [busy, setBusy] = useState(false);
  const full = useAsync(() => (company ? api.get('/recruiter/company') : Promise.resolve(null)), [company?.id]);

  useEffect(() => {
    if (company) setF({ ...EMPTY, ...Object.fromEntries(Object.entries(company).filter(([k]) => k in EMPTY).map(([k, v]) => [k, v ?? ''])) });
  }, [company?.id, company?.updated_at]);

  const set = (k) => (e) => setF((s) => ({ ...s, [k]: e.target.value }));
  const submit = async (e) => {
    e.preventDefault();
    const er = {};
    if (f.name.trim().length < 2) er.name = 'Company name must be at least 2 characters.';
    if (f.logo_url.trim() && !isHttpUrl(f.logo_url) && !f.logo_url.startsWith('/uploads/')) er.logo_url = 'Use a full link starting with http(s)://';
    if (f.website.trim() && !isHttpUrl(f.website)) er.website = 'Use a full link starting with http(s)://';
    setErrors(er);
    setFormError('');
    if (Object.keys(er).length) return;
    setBusy(true);
    const payload = { name: f.name.trim(), description: f.description.trim(), logo_url: f.logo_url.trim() || null, website: f.website.trim() || null, industry: f.industry.trim(), size: f.size, location: f.location.trim() };
    try {
      if (company) await api.put('/recruiter/company', payload);
      else await api.post('/recruiter/company', payload);
      toast.success(company ? 'Company profile updated.' : 'Company profile created. Waiting for admin approval.');
      await reload();
      full.reload();
    } catch (err) {
      setFormError(errorMessage(err));
    } finally {
      setBusy(false);
    }
  };

  const data = full.data || company;
  return (
    <>
      <PageHeader title={company ? 'Company profile' : 'Create your company'} description="This is what candidates see on every job you post." />
      <div className="r-two-col">
        <Card title="Company details">
          <form className="stack" onSubmit={submit} noValidate>
            {formError && <p className="form-error" role="alert">{formError}</p>}
            <div className="form-grid">
              <div className="full"><Input label="Company name" value={f.name} onChange={set('name')} error={errors.name} required /></div>
              <Input label="Industry" value={f.industry} onChange={set('industry')} placeholder="e.g. Software" />
              <Select label="Company size" value={f.size} onChange={set('size')} options={SIZES} />
              <Input label="Location" value={f.location} onChange={set('location')} placeholder="City, Country" />
              <Input label="Website" type="url" value={f.website} onChange={set('website')} error={errors.website} placeholder="https://company.com" />
              <div className="full field"><label>Company logo</label>
                <MediaUpload purpose="logo" kind="image" value={f.logo_url} onChange={(u) => setF((s) => ({ ...s, logo_url: u || '' }))} label="Upload logo" size={72} hint="JPG, PNG or WebP up to 8 MB." />
                <Input aria-label="Logo URL" type="url" value={f.logo_url} onChange={set('logo_url')} error={errors.logo_url} placeholder="…or paste a link to your logo" /></div>
              <div className="full"><Textarea label="About the company" rows={5} value={f.description} onChange={set('description')} /></div>
            </div>
            <div><Button type="submit" loading={busy}>{company ? 'Save changes' : 'Create company'}</Button></div>
          </form>
        </Card>
        {company && (
          <Card title="Status">
            <div className="r-company-card">
              <Avatar name={company.name} src={company.logo_url} size={64} />
              <div>
                <strong>{company.name}</strong>
                <div className="row-wrap" style={{ marginTop: 6 }}>
                  <StatusBadge status={company.status} />
                  {company.is_verified ? <Badge tone="brand"><Icon name="shield" size={12} /> Verified</Badge> : <Badge tone="neutral">Not verified</Badge>}
                </div>
              </div>
            </div>
            <hr className="divider" />
            <dl className="r-facts">
              <div><dt>Followers</dt><dd>{data?.followers_count ?? 0}</dd></div>
              <div><dt>Jobs posted</dt><dd>{data?.jobs_count ?? 0}</dd></div>
              <div><dt>Size</dt><dd>{titleCase(company.size || '')}</dd></div>
            </dl>
            {company.status === 'pending' && <p className="muted small" style={{ marginTop: 12 }}>An admin will review your profile shortly. You will get a notification.</p>}
          </Card>
        )}
      </div>
      {loading && null}
    </>
  );
}
