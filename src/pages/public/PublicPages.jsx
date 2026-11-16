import { useEffect, useId, useState } from 'react';
import { api, errorMessage } from '../../lib/api';
import { ROLE_HOME, useAuth } from '../../lib/auth';
import { isEmail } from '../../lib/format';
import { Highlighted, useSite } from '../../lib/site';
import { Link, Navigate, useNavigate, useSearchParams } from '../../lib/router';
import { useToast } from '../../lib/toast';
import Icon from '../../components/Icon';
import { Button, Field, Input, Logo, Spinner } from '../../components/ui';
import Landing, { SiteFooter, SiteLoading, SiteNav } from './Landing';

export { Landing };

/* ------------------------------------------------------------------ shared */

const GoogleG = () => (
  <svg width="18" height="18" viewBox="0 0 48 48" aria-hidden="true"><path fill="#EA4335" d="M24 9.5c3.5 0 6.6 1.2 9.1 3.6l6.8-6.8C35.8 2.4 30.3 0 24 0 14.6 0 6.5 5.4 2.6 13.2l7.9 6.1C12.4 13.6 17.7 9.5 24 9.5z" /><path fill="#4285F4" d="M46.5 24.5c0-1.6-.1-3.1-.4-4.5H24v9h12.7c-.6 3-2.3 5.5-4.8 7.2l7.5 5.8c4.4-4.1 7.1-10.1 7.1-17.5z" /><path fill="#FBBC05" d="M10.5 28.7A14.5 14.5 0 0 1 9.5 24c0-1.6.3-3.2.8-4.7l-7.9-6.1A24 24 0 0 0 0 24c0 3.9.9 7.5 2.6 10.8l7.9-6.1z" /><path fill="#34A853" d="M24 48c6.5 0 11.9-2.1 15.9-5.8l-7.5-5.8c-2.1 1.4-4.8 2.3-8.4 2.3-6.3 0-11.6-4.1-13.5-9.8l-7.9 6.1C6.5 42.6 14.6 48 24 48z" /></svg>
);
const LinkedInIn = () => (
  <svg width="18" height="18" viewBox="0 0 24 24" aria-hidden="true"><rect width="24" height="24" rx="4" fill="#0A66C2" /><path fill="#fff" d="M7.1 9.6H4.6V19h2.5V9.6zM5.8 5.1a1.5 1.5 0 1 0 0 3 1.5 1.5 0 0 0 0-3zM19.4 19v-5.2c0-2.5-1.3-3.7-3.1-3.7-1.4 0-2.1.8-2.4 1.3V9.6h-2.5V19h2.5v-5.2c0-.6.1-1.2.9-1.2s1 .6 1 1.3V19h2.6z" /></svg>
);

let gsiPromise = null;
function loadGoogleScript() {
  if (window.google?.accounts?.oauth2) return Promise.resolve();
  if (!gsiPromise) {
    gsiPromise = new Promise((resolve, reject) => {
      const s = document.createElement('script');
      s.src = 'https://accounts.google.com/gsi/client';
      s.async = true;
      s.onload = resolve;
      s.onerror = () => { gsiPromise = null; reject(new Error('Could not load Google sign-in.')); };
      document.head.appendChild(s);
    });
  }
  return gsiPromise;
}

function SocialButtons({ clientId, remember, role }) {
  const { loginWithGoogle } = useAuth();
  const toast = useToast();
  const [busy, setBusy] = useState(false);
  const google = async () => {
    if (!clientId) return toast.info('Google sign-in is not enabled yet. Please use email and password.');
    setBusy(true);
    try {
      await loadGoogleScript();
      const client = window.google.accounts.oauth2.initTokenClient({
        client_id: clientId,
        scope: 'openid email profile',
        callback: async (resp) => {
          try {
            if (resp.error || !resp.access_token) throw new Error(resp.error_description || 'Google sign-in was cancelled.');
            await loginWithGoogle(resp.access_token, remember, role);
          } catch (e) {
            toast.error(errorMessage(e));
          } finally {
            setBusy(false);
          }
        },
        error_callback: () => setBusy(false),
      });
      client.requestAccessToken();
    } catch (e) {
      toast.error(errorMessage(e));
      setBusy(false);
    }
  };
  return (
    <div className="au-social">
      <button type="button" className="au-social-btn" onClick={google} disabled={busy}><GoogleG /> Continue with Google</button>
      <button type="button" className="au-social-btn" onClick={() => toast.info('LinkedIn sign-in is not enabled yet. Please use email and password.')}><LinkedInIn /> Continue with LinkedIn</button>
    </div>
  );
}

function AuthShell({ site, social, title, subtitle, children, footer, wide }) {
  const a = site.auth_page;
  return (
    <div className="au">
      <aside className="au-promo">
        <Link to="/" className="au-logo"><Logo size={36} src={site.brand.logo_url} name={site.brand.name} /></Link>
        <div className="au-promo-body">
          {a.badge && <span className="lp-badge"><Icon name="sparkles" size={14} /> {a.badge}</span>}
          <h2><Highlighted text={a.title} highlight={a.highlight} /></h2>
          <p>{a.subtitle}</p>
          <ul className="au-features">
            {a.features.map((f, i) => (
              <li key={i}>
                <span><Icon name={f.icon} size={20} /></span>
                <div><strong>{f.title}</strong><small>{f.text}</small></div>
              </li>
            ))}
          </ul>
        </div>
        {a.quote && (
          <blockquote className="au-quote">
            <Icon name="quote" size={20} />
            <p>{a.quote}</p>
            {a.quote_author && <cite>- {a.quote_author}</cite>}
          </blockquote>
        )}
      </aside>
      <main className="au-main">
        <div className="au-mobile-top">
          <Link to="/" className="au-logo-m"><Logo size={34} src={site.brand.logo_url} name={site.brand.name} /></Link>
          {a.mobile_quote && <p className="au-mobile-quote">{a.mobile_quote}</p>}
        </div>
        <div className={`au-card ${wide ? 'au-card-wide' : ''}`}>
          <h1>{title}</h1>
          <p className="au-sub">{subtitle}</p>
          {social}
          <div className="au-body">{children}</div>
          {footer && <p className="au-foot">{footer}</p>}
          <p className="au-terms">By continuing, you agree to our <Link to="/terms">Terms of Service</Link> and <Link to="/privacy">Privacy Policy</Link>.</p>
        </div>
      </main>
    </div>
  );
}

function useRedirectIfAuthed() {
  const { user, loading } = useAuth();
  const [params] = useSearchParams();
  if (loading) return 'loading';
  if (user) {
    const next = params.get('next');
    const allowed = next && next.startsWith('/') && !next.startsWith('//') && (user.role === 'admin' ? next.startsWith('/admin') : user.role === 'recruiter' ? next.startsWith('/recruiter') : !next.startsWith('/admin') && !next.startsWith('/recruiter'));
    return allowed ? next : ROLE_HOME[user.role];
  }
  return null;
}

function PasswordInput({ label, error, hint, id, required, ...rest }) {
  const [show, setShow] = useState(false);
  const auto = useId();
  const fid = id || auto;
  return (
    <Field label={label} hint={hint} error={error} htmlFor={fid} required={required}>
      <div className="au-pw">
        <input id={fid} className="input" type={show ? 'text' : 'password'} aria-invalid={error ? 'true' : undefined} {...rest} />
        <button type="button" className="au-eye" onClick={() => setShow(!show)} aria-label={show ? 'Hide password' : 'Show password'} aria-pressed={show}>
          <Icon name={show ? 'eyeOff' : 'eye'} size={18} />
        </button>
      </div>
    </Field>
  );
}

function Divider() { return <div className="au-or"><span>or</span></div>; }

/** Shared gate: waits for CMS + session state, redirects signed-in users. */
function useAuthPage() {
  const site = useSite();
  const redirect = useRedirectIfAuthed();
  useEffect(() => {
    if (site.data) document.title = `${site.data.content.brand.name} - Sign in`;
  }, [site.data]);
  return { site, redirect };
}

/* ------------------------------------------------------------------- login */

export function Login() {
  const { login, verify2fa } = useAuth();
  const { site, redirect } = useAuthPage();
  const [params] = useSearchParams();
  const [challenge, setChallenge] = useState(null);
  const [code, setCode] = useState('');
  const navigate = useNavigate();
  const [f, setF] = useState({ email: '', password: '' });
  const [remember, setRemember] = useState(true);
  const [errors, setErrors] = useState({});
  const [formError, setFormError] = useState('');
  const [busy, setBusy] = useState(false);

  if (redirect === 'loading') return <div className="full-loader"><Spinner size={32} /></div>;
  if (redirect) return <Navigate to={redirect} />;
  if (!site.data) return <SiteLoading error={site.error} onRetry={site.reload} />;

  const submit = async (e) => {
    e.preventDefault();
    const er = {};
    if (!isEmail(f.email)) er.email = 'Enter a valid email address.';
    if (!f.password) er.password = 'Enter your password.';
    setErrors(er);
    setFormError('');
    if (Object.keys(er).length) return;
    setBusy(true);
    try {
      const r = await login(f.email.trim(), f.password, remember);
      if (r && r.requires_2fa) { setChallenge(r); setCode(''); return; }
      const next = params.get('next');
      if (next) navigate(next, { replace: true });
    } catch (err) {
      setFormError(errorMessage(err));
    } finally {
      setBusy(false);
    }
  };

  const submitCode = async (e) => {
    e.preventDefault();
    setFormError('');
    if (!/^\d{4,8}$/.test(code.trim())) return setFormError('Enter the 6-digit code.');
    setBusy(true);
    try {
      await verify2fa(challenge.challenge_token, code, remember);
      const next = params.get('next');
      if (next) navigate(next, { replace: true });
    } catch (err) {
      setFormError(errorMessage(err));
      if (/expired|start again|Too many/i.test(errorMessage(err))) setChallenge(null);
    } finally {
      setBusy(false);
    }
  };

  if (challenge) {
    return (
      <AuthShell site={site.data.content} title="Two-step verification" subtitle={challenge.method === 'totp' ? 'Open your authenticator app and enter the 6-digit code.' : 'We sent a 6-digit code to your email.'}
        footer={<button type="button" className="linklike" onClick={() => { setChallenge(null); setFormError(''); }}>Back to login</button>}>
        <form className="stack" onSubmit={submitCode} noValidate data-testid="2fa-form">
          {formError && <p className="form-error" role="alert">{formError}</p>}
          <Input label="Verification code" inputMode="numeric" autoComplete="one-time-code" maxLength={8} value={code} onChange={(e) => setCode(e.target.value.replace(/\D/g, ''))} placeholder="123456" />
          <Button type="submit" size="lg" loading={busy} className="btn-block au-submit">Verify and sign in</Button>
        </form>
      </AuthShell>
    );
  }

  return (
    <AuthShell
      site={site.data.content}
      social={<><SocialButtons clientId={site.data.social_login?.google_client_id} remember={remember} /><Divider /></>}
      title="Welcome back"
      subtitle="Login to continue to your account"
      footer={<>Don't have an account? <Link to="/register">Sign Up</Link></>}
    >
      <form className="stack" onSubmit={submit} noValidate>
        {formError && <p className="form-error" role="alert">{formError}</p>}
        <Input label="Email Address" type="email" autoComplete="email" value={f.email} onChange={(e) => setF({ ...f, email: e.target.value })} error={errors.email} placeholder="Enter your email" />
        <PasswordInput label="Password" autoComplete="current-password" value={f.password} onChange={(e) => setF({ ...f, password: e.target.value })} error={errors.password} placeholder="Enter your password" />
        <div className="row between au-row">
          <label className="au-check"><input type="checkbox" checked={remember} onChange={(e) => setRemember(e.target.checked)} /> Remember me</label>
          <Link to="/forgot-password" className="small">Forgot password?</Link>
        </div>
        <Button type="submit" size="lg" loading={busy} className="btn-block au-submit">Login</Button>
      </form>
    </AuthShell>
  );
}

/* ---------------------------------------------------------------- register */

export function Register() {
  const { register } = useAuth();
  const { site, redirect } = useAuthPage();
  const [qs] = useSearchParams();
  const refCode = (qs.get('ref') || '').trim().toUpperCase().replace(/[^A-Z0-9]/g, '').slice(0, 20);
  const [f, setF] = useState({ name: '', email: '', phone: '', password: '', role: qs.get('as') === 'recruiter' ? 'recruiter' : 'user' });
  const [errors, setErrors] = useState({});
  const [formError, setFormError] = useState('');
  const [busy, setBusy] = useState(false);

  if (redirect === 'loading') return <div className="full-loader"><Spinner size={32} /></div>;
  if (redirect) return <Navigate to={redirect} />;
  if (!site.data) return <SiteLoading error={site.error} onRetry={site.reload} />;

  const submit = async (e) => {
    e.preventDefault();
    const er = {};
    if (f.name.trim().length < 2) er.name = 'Enter your full name.';
    if (!isEmail(f.email)) er.email = 'Enter a valid email address.';
    if (f.password.length < 8 || !/[A-Za-z]/.test(f.password) || !/\d/.test(f.password)) er.password = 'Use at least 8 characters with a letter and a number.';
    setErrors(er);
    setFormError('');
    if (Object.keys(er).length) return;
    setBusy(true);
    try {
      await register({ name: f.name.trim(), email: f.email.trim(), phone: f.phone.trim() || undefined, password: f.password, role: f.role, referral_code: refCode || undefined });
    } catch (err) {
      setFormError(errorMessage(err));
    } finally {
      setBusy(false);
    }
  };

  return (
    <AuthShell
      site={site.data.content}
      social={<><SocialButtons clientId={site.data.social_login?.google_client_id} remember role={f.role} /><Divider /></>}
      title="Create your account"
      subtitle="It takes less than a minute"
      footer={<>Already have an account? <Link to="/login">Login</Link></>}
    >
      <form className="stack" onSubmit={submit} noValidate>
        {formError && <p className="form-error" role="alert">{formError}</p>}
        {refCode && <p className="form-ok" role="status" data-testid="ref-hint">You were invited with code <strong>{refCode}</strong>. Your friend gets a reward when you join.</p>}
        <div className="role-pick" role="radiogroup" aria-label="I am a">
          {[['user', 'briefcase', 'Job seeker', 'Find and apply to jobs'], ['recruiter', 'building', 'Recruiter', 'Post jobs and hire']].map(([v, ic, t, d]) => (
            <label key={v} className={`role-card ${f.role === v ? 'active' : ''}`}>
              <input type="radio" name="role" value={v} checked={f.role === v} onChange={() => setF({ ...f, role: v })} />
              <Icon name={ic} size={22} /><strong>{t}</strong><span>{d}</span>
            </label>
          ))}
        </div>
        <Input label="Full name" autoComplete="name" value={f.name} onChange={(e) => setF({ ...f, name: e.target.value })} error={errors.name} />
        <Input label="Email Address" type="email" autoComplete="email" value={f.email} onChange={(e) => setF({ ...f, email: e.target.value })} error={errors.email} />
        <Input label="Phone (optional)" type="tel" autoComplete="tel" value={f.phone} onChange={(e) => setF({ ...f, phone: e.target.value })} />
        <PasswordInput label="Password" autoComplete="new-password" value={f.password} onChange={(e) => setF({ ...f, password: e.target.value })} error={errors.password} hint="At least 8 characters, with a letter and a number" />
        <Button type="submit" size="lg" loading={busy} className="btn-block au-submit">Create account</Button>
      </form>
    </AuthShell>
  );
}

/* --------------------------------------------------------- forgot / reset */

export function ForgotPassword() {
  const { site, redirect } = useAuthPage();
  const [email, setEmail] = useState('');
  const [error, setError] = useState('');
  const [done, setDone] = useState(null);
  const [busy, setBusy] = useState(false);
  if (redirect === 'loading') return <div className="full-loader"><Spinner size={32} /></div>;
  if (redirect) return <Navigate to={redirect} />;
  if (!site.data) return <SiteLoading error={site.error} onRetry={site.reload} />;
  const submit = async (e) => {
    e.preventDefault();
    if (!isEmail(email)) return setError('Enter a valid email address.');
    setError('');
    setBusy(true);
    try {
      setDone(await api.post('/auth/forgot-password', { email: email.trim() }, { auth: false }));
    } catch (err) {
      setError(errorMessage(err));
    } finally {
      setBusy(false);
    }
  };
  return (
    <AuthShell site={site.data.content} title="Forgot password?" subtitle="Enter your email and we'll send you a reset link." footer={<Link to="/login">Back to login</Link>}>
      {done ? (
        <div className="stack">
          <p className="form-ok" role="status">{done.message}</p>
          {done.reset_token && <p className="small muted">Dev mode: <Link to={`/reset-password?token=${done.reset_token}`}>open reset page</Link></p>}
        </div>
      ) : (
        <form className="stack" onSubmit={submit} noValidate>
          {error && <p className="form-error" role="alert">{error}</p>}
          <Input label="Email Address" type="email" value={email} onChange={(e) => setEmail(e.target.value)} />
          <Button type="submit" size="lg" loading={busy} className="btn-block au-submit">Send reset link</Button>
        </form>
      )}
    </AuthShell>
  );
}

export function ResetPassword() {
  const { site } = useAuthPage();
  const [params] = useSearchParams();
  const token = params.get('token') || '';
  const [pw, setPw] = useState('');
  const [pw2, setPw2] = useState('');
  const [error, setError] = useState('');
  const [ok, setOk] = useState(false);
  const [busy, setBusy] = useState(false);
  if (!site.data) return <SiteLoading error={site.error} onRetry={site.reload} />;
  const submit = async (e) => {
    e.preventDefault();
    if (pw.length < 8 || !/[A-Za-z]/.test(pw) || !/\d/.test(pw)) return setError('Use at least 8 characters with a letter and a number.');
    if (pw !== pw2) return setError('Passwords do not match.');
    setError('');
    setBusy(true);
    try {
      await api.post('/auth/reset-password', { token, password: pw }, { auth: false });
      setOk(true);
    } catch (err) {
      setError(errorMessage(err));
    } finally {
      setBusy(false);
    }
  };
  return (
    <AuthShell site={site.data.content} title="Set a new password" subtitle="Choose a strong password you have not used before." footer={<Link to="/login">Back to login</Link>}>
      {!token ? (
        <p className="form-error" role="alert">This reset link is missing its token. Request a new one.</p>
      ) : ok ? (
        <div className="stack"><p className="form-ok" role="status">Password updated. You can log in now.</p><Link className="btn btn-primary" to="/login">Go to login</Link></div>
      ) : (
        <form className="stack" onSubmit={submit} noValidate>
          {error && <p className="form-error" role="alert">{error}</p>}
          <PasswordInput label="New password" autoComplete="new-password" value={pw} onChange={(e) => setPw(e.target.value)} />
          <PasswordInput label="Confirm password" autoComplete="new-password" value={pw2} onChange={(e) => setPw2(e.target.value)} />
          <Button type="submit" size="lg" loading={busy} className="btn-block au-submit">Update password</Button>
        </form>
      )}
    </AuthShell>
  );
}

/* ------------------------------------------------------------ legal pages */

export function LegalPage({ kind }) {
  const { data, error, reload } = useSite();
  useEffect(() => {
    window.scrollTo(0, 0);
  }, [kind]);
  if (!data) return <SiteLoading error={error} onRetry={reload} />;
  const site = data.content;
  const text = site.legal[kind] || '';
  return (
    <div className="lp">
      <SiteNav site={site} />
      <main className="lp-wrap lp-legal-page">
        <h1>{kind === 'terms' ? 'Terms of Service' : 'Privacy Policy'}</h1>
        {text.split(/\n{2,}/).map((p, i) => <p key={i}>{p}</p>)}
      </main>
      <SiteFooter site={site} />
    </div>
  );
}
