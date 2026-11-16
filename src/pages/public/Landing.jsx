import { BannerStrip } from '../../components/shared/Announcements';
import { useEffect, useMemo, useState } from 'react';
import { api, assetUrl, errorMessage, safeHref } from '../../lib/api';
import { ROLE_HOME, useAuth } from '../../lib/auth';
import { Highlighted, liveValue, useSite } from '../../lib/site';
import { Link, useNavigate } from '../../lib/router';
import { useToast } from '../../lib/toast';
import Icon from '../../components/Icon';
import { Logo, Spinner } from '../../components/ui';

/* A link coming from the CMS: internal paths use the SPA router, everything else a normal anchor. */
export function CmsLink({ href, children, className, onClick }) {
  const h = safeHref(href);
  if (!h) return <span className={className}>{children}</span>;
  if (h.startsWith('/') && !h.startsWith('/#')) return <Link to={h} className={className} onClick={onClick}>{children}</Link>;
  const external = /^https?:/i.test(h);
  return <a href={h} className={className} onClick={onClick} {...(external ? { target: '_blank', rel: 'noopener noreferrer' } : {})}>{children}</a>;
}

function usePerPage() {
  const calc = () => (typeof window === 'undefined' ? 3 : window.innerWidth < 640 ? 1 : window.innerWidth < 1000 ? 2 : 3);
  const [n, setN] = useState(calc);
  useEffect(() => {
    const f = () => setN(calc());
    window.addEventListener('resize', f);
    return () => window.removeEventListener('resize', f);
  }, []);
  return n;
}

export function SiteNav({ site, transparent }) {
  const { user } = useAuth();
  const [open, setOpen] = useState(false);
  const nav = site.nav;
  const home = user ? ROLE_HOME[user.role] : null;
  useEffect(() => {
    document.body.classList.toggle('modal-open', open);
    return () => document.body.classList.remove('modal-open');
  }, [open]);
  const close = () => setOpen(false);
  const gated = (href) => (!user && /^\/(jobs|companies)/.test(href) ? `/login?next=${encodeURIComponent(href)}` : href);
  return (
    <header className={`lp-nav ${transparent ? 'lp-nav-flat' : ''}`}>
      <div className="lp-nav-in">
        <Link to="/" className="lp-brand" aria-label={site.brand.name}><Logo size={34} src={site.brand.logo_url} name={site.brand.name} /></Link>
        <nav className="lp-links" aria-label="Main">
          {nav.links.map((l, i) => <CmsLink key={i} href={gated(l.href)} className="lp-link">{l.label}</CmsLink>)}
        </nav>
        <div className="lp-actions">
          {nav.employer_label && !user && <CmsLink href={nav.employer_href} className="btn btn-secondary lp-employer">{nav.employer_label}</CmsLink>}
          {home ? (
            <Link className="btn btn-primary" to={home}>Dashboard</Link>
          ) : (
            <>
              <Link className="btn btn-secondary lp-login" to="/login">{nav.login_label}</Link>
              <Link className="btn btn-primary lp-signup" to="/register">{nav.signup_label}</Link>
            </>
          )}
        </div>
        <button className="lp-burger" aria-label={open ? 'Close menu' : 'Open menu'} aria-expanded={open} onClick={() => setOpen(!open)}>
          <Icon name={open ? 'x' : 'menu'} size={24} />
        </button>
      </div>
      {open && (
        <div className="lp-drawer" role="dialog" aria-label="Menu">
          {nav.links.map((l, i) => <CmsLink key={i} href={gated(l.href)} className="lp-drawer-link" onClick={close}>{l.label}</CmsLink>)}
          {nav.employer_label && !user && <CmsLink href={nav.employer_href} className="lp-drawer-link" onClick={close}>{nav.employer_label}</CmsLink>}
          <div className="lp-drawer-cta">
            {home ? <Link className="btn btn-primary btn-block" to={home} onClick={close}>Dashboard</Link> : (
              <>
                <Link className="btn btn-secondary btn-block" to="/login" onClick={close}>{nav.login_label}</Link>
                <Link className="btn btn-primary btn-block" to="/register" onClick={close}>{nav.signup_label}</Link>
              </>
            )}
          </div>
        </div>
      )}
    </header>
  );
}

const SOCIAL_LABEL = { linkedin: 'LinkedIn', twitter: 'X / Twitter', instagram: 'Instagram', youtube: 'YouTube', facebook: 'Facebook' };

export function SiteFooter({ site }) {
  const f = site.footer;
  const toast = useToast();
  const [email, setEmail] = useState('');
  const [busy, setBusy] = useState(false);
  const submit = async (e) => {
    e.preventDefault();
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/.test(email.trim())) return toast.error('Enter a valid email address.');
    setBusy(true);
    try {
      const r = await api.post('/public/newsletter', { email: email.trim() }, { auth: false });
      toast.success(r.message || 'Thanks for subscribing!');
      setEmail('');
    } catch (err) {
      toast.error(errorMessage(err));
    } finally {
      setBusy(false);
    }
  };
  return (
    <footer className="lp-footer" id="contact">
      <div className="lp-wrap lp-foot-grid">
        <div className="lp-foot-brand">
          <Logo size={34} src={site.brand.logo_url} name={site.brand.name} className="lp-foot-logo" />
          <p>{f.tagline}</p>
          {f.socials.length > 0 && (
            <div className="lp-socials">
              {f.socials.map((s, i) => (
                <a key={i} href={safeHref(s.url) || '#'} target="_blank" rel="noopener noreferrer" aria-label={SOCIAL_LABEL[s.kind] || s.kind}><Icon name={s.kind} size={16} /></a>
              ))}
            </div>
          )}
        </div>
        {f.columns.map((c, i) => (
          <div key={i} className="lp-foot-col">
            <h4>{c.title}</h4>
            <ul>{c.links.map((l, j) => <li key={j}><CmsLink href={l.href}>{l.label}</CmsLink></li>)}</ul>
          </div>
        ))}
        <div className="lp-foot-news">
          <h4>{f.newsletter_title}</h4>
          <p>{f.newsletter_text}</p>
          <form onSubmit={submit} noValidate>
            <input type="email" aria-label="Email address" placeholder="Enter your email" value={email} onChange={(e) => setEmail(e.target.value)} autoComplete="email" />
            <button type="submit" disabled={busy}>{busy ? '…' : f.newsletter_button}</button>
          </form>
          <div className="lp-legal">{f.legal_links.map((l, i) => <CmsLink key={i} href={l.href}>{l.label}</CmsLink>)}</div>
        </div>
      </div>
      <div className="lp-wrap lp-copy">{f.copyright}</div>
    </footer>
  );
}

export function SiteLoading({ error, onRetry }) {
  return (
    <div className="full-loader" style={{ flexDirection: 'column', gap: 12 }}>
      {error ? (
        <>
          <Icon name="alert" size={32} />
          <p>{error}</p>
          <button className="btn btn-primary" onClick={onRetry}>Try again</button>
        </>
      ) : <Spinner size={34} label="Loading" />}
    </div>
  );
}

function Hero({ site }) {
  const h = site.hero;
  const { user } = useAuth();
  const navigate = useNavigate();
  const [q, setQ] = useState('');
  const [loc, setLoc] = useState('');
  const submit = (e) => {
    e.preventDefault();
    const sp = new URLSearchParams();
    if (q.trim()) sp.set('q', q.trim());
    if (loc.trim()) sp.set('location', loc.trim());
    const target = `/jobs${sp.toString() ? `?${sp}` : ''}`;
    navigate(user && user.role === 'user' ? target : user ? ROLE_HOME[user.role] : `/login?next=${encodeURIComponent(target)}`);
  };
  return (
    <section className="lp-hero">
      <div className="lp-wrap lp-hero-grid">
        <div className="lp-hero-copy">
          {h.badge && <span className="lp-badge"><Icon name="sparkles" size={14} /> {h.badge}</span>}
          <h1><Highlighted text={h.title} highlight={h.highlight} /></h1>
          <p className="lp-sub">{h.subtitle}</p>
          <form className="lp-search" onSubmit={submit} role="search">
            <label className="lp-search-field"><Icon name="search" size={18} /><input value={q} onChange={(e) => setQ(e.target.value)} placeholder={h.search_job_placeholder} aria-label="Job title or keyword" maxLength={100} /></label>
            <label className="lp-search-field"><Icon name="mapPin" size={18} /><input value={loc} onChange={(e) => setLoc(e.target.value)} placeholder={h.search_location_placeholder} aria-label="Location" maxLength={100} /></label>
            <button type="submit" className="btn btn-primary lp-search-btn">{h.search_button}</button>
          </form>
        </div>
        <div className="lp-hero-art">
          {h.image_url && <img src={assetUrl(h.image_url)} alt="" loading="eager" />}
        </div>
      </div>
    </section>
  );
}

const COLORS = { blue: '#2563eb', red: '#ef4444', purple: '#8b5cf6', green: '#10b981', orange: '#f97316', indigo: '#4f46e5', pink: '#ec4899', teal: '#0d9488' };

function Categories({ site }) {
  const c = site.categories;
  const { user } = useAuth();
  const dest = (q) => {
    const t = `/jobs?q=${encodeURIComponent(q)}`;
    return user ? (user.role === 'user' ? t : ROLE_HOME[user.role]) : `/login?next=${encodeURIComponent(t)}`;
  };
  if (!c.items.length) return null;
  return (
    <section className="lp-section lp-cats-sec">
      <div className="lp-wrap">
        <div className="lp-cats-head">
          <h2>{c.title}</h2>
          <Link to={user && user.role === 'user' ? '/jobs' : '/login?next=%2Fjobs'} className="lp-viewall">{c.view_all_label} <Icon name="chevronRight" size={16} /></Link>
        </div>
        <div className="lp-cats">
          {c.items.map((it, i) => (
            <Link key={i} to={dest(it.query || it.name)} className="lp-cat">
              <span className="lp-cat-ico" style={{ '--c': COLORS[it.color] || COLORS.blue }}><Icon name={it.icon} size={22} /></span>
              <strong>{it.name}</strong>
              <small>{it.count_label}</small>
            </Link>
          ))}
        </div>
      </div>
    </section>
  );
}

function Trusted({ site }) {
  const t = site.trusted;
  if (!t.items.length) return null;
  return (
    <section className="lp-section lp-trusted">
      <div className="lp-wrap">
        <h2 className="lp-center"><Highlighted text={t.title} highlight={t.highlight} /></h2>
        {t.subtitle && <p className="lp-center lp-muted">{t.subtitle}</p>}
        <ul className="lp-logos">
          {t.items.map((it, i) => (
            <li key={i}>{it.logo_url ? <img src={assetUrl(it.logo_url)} alt={it.name} loading="lazy" /> : <span>{it.name}</span>}</li>
          ))}
        </ul>
      </div>
    </section>
  );
}

const STEP_COLORS = ['#2563eb', '#10b981', '#f97316', '#8b5cf6', '#ec4899', '#0d9488'];

function How({ site }) {
  const h = site.how;
  const { user } = useAuth();
  return (
    <section className="lp-section" id="how-it-works">
      <div className="lp-wrap lp-how">
        <div className="lp-how-intro">
          <h2><Highlighted text={h.title} highlight={h.highlight} /></h2>
          <p className="lp-muted">{h.subtitle}</p>
          <Link className="btn btn-primary btn-lg" to={user ? ROLE_HOME[user.role] : '/register'}>{h.cta_label} <Icon name="chevronRight" size={16} /></Link>
        </div>
        <ol className="lp-steps">
          {h.items.map((s, i) => (
            <li key={i} style={{ '--c': STEP_COLORS[i % STEP_COLORS.length] }}>
              <span className="lp-step-ico"><Icon name={s.icon} size={26} /><b>{i + 1}</b></span>
              <strong>{s.title}</strong>
              <p>{s.text}</p>
            </li>
          ))}
        </ol>
      </div>
    </section>
  );
}

function StatsBand({ site, live }) {
  const items = site.stats.items;
  const p = site.promo;
  if (!items.length && !p.text) return null;
  return (
    <section className="lp-section lp-statsband">
      <div className="lp-wrap lp-stats-grid">
        <ul className="lp-stats">
          {items.map((s, i) => (
            <li key={i} style={{ '--c': STEP_COLORS[i % STEP_COLORS.length] }}>
              <span className="lp-stat-ico"><Icon name={s.icon} size={24} /></span>
              <div><strong>{liveValue(s, live)}</strong><span>{s.label}</span></div>
            </li>
          ))}
        </ul>
        {(p.text || p.image_url) && (
          <div className="lp-promo">
            {p.text && <div className="lp-promo-card">{p.text}</div>}
            {p.image_url && <img src={assetUrl(p.image_url)} alt="" loading="lazy" />}
          </div>
        )}
      </div>
    </section>
  );
}

function Testimonials({ site }) {
  const t = site.testimonials;
  const per = usePerPage();
  const [page, setPage] = useState(0);
  const pages = Math.max(1, Math.ceil(t.items.length / per));
  useEffect(() => { if (page > pages - 1) setPage(0); }, [pages, page]);
  const shown = useMemo(() => t.items.slice(page * per, page * per + per), [t.items, page, per]);
  if (!t.items.length) return null;
  return (
    <section className="lp-section lp-testi">
      <div className="lp-wrap lp-testi-grid">
        <div className="lp-testi-intro">
          <h2><Highlighted text={t.title} highlight={t.highlight} /></h2>
          <p className="lp-muted">{t.subtitle}</p>
        </div>
        <div className="lp-testi-body">
          <div className="lp-testi-cards" style={{ '--per': per }}>
            {shown.map((x, i) => (
              <figure key={`${page}-${i}`} className="lp-testi-card">
                <div className="lp-testi-who">
                  {x.avatar_url ? <img src={assetUrl(x.avatar_url)} alt="" loading="lazy" /> : <span className="lp-av">{x.name.slice(0, 1)}</span>}
                  <div>
                    <strong>{x.name}</strong><small>{x.role}</small>
                    <div className="lp-stars" aria-label={`${x.rating} out of 5`}>{Array.from({ length: x.rating }, (_, k) => <Icon key={k} name="star" size={14} />)}</div>
                  </div>
                </div>
                <blockquote><Icon name="quote" size={14} /> {x.quote}</blockquote>
              </figure>
            ))}
          </div>
          {pages > 1 && (
            <div className="lp-testi-ctrl">
              <div className="lp-dots">{Array.from({ length: pages }, (_, i) => <button key={i} className={i === page ? 'on' : ''} onClick={() => setPage(i)} aria-label={`Page ${i + 1}`} />)}</div>
              <div className="lp-arrows">
                <button onClick={() => setPage((page - 1 + pages) % pages)} aria-label="Previous"><Icon name="chevronLeft" size={18} /></button>
                <button onClick={() => setPage((page + 1) % pages)} aria-label="Next"><Icon name="chevronRight" size={18} /></button>
              </div>
            </div>
          )}
        </div>
      </div>
    </section>
  );
}

function Resources({ site }) {
  const r = site.resources;
  if (!r.items.length) return null;
  return (
    <section className="lp-section" id="resources">
      <div className="lp-wrap lp-res">
        <div className="lp-res-intro">
          <h2><Highlighted text={r.title} highlight={r.highlight} /></h2>
          <p className="lp-muted">{r.subtitle}</p>
          {r.cta_label && r.cta_href && <CmsLink href={r.cta_href} className="btn btn-secondary">{r.cta_label} <Icon name="chevronRight" size={14} /></CmsLink>}
        </div>
        <div className="lp-articles">
          {r.items.map((a, i) => {
            const body = (
              <>
                {a.image_url ? <img src={assetUrl(a.image_url)} alt="" loading="lazy" /> : <span className="lp-art-ph"><Icon name="file" size={28} /></span>}
                <div>
                  <strong>{a.title}</strong>
                  {a.tag && <em>{a.tag}</em>}
                  {a.date && <small>{a.date}</small>}
                </div>
              </>
            );
            return a.href ? <CmsLink key={i} href={a.href} className="lp-article">{body}</CmsLink> : <article key={i} className="lp-article">{body}</article>;
          })}
        </div>
      </div>
    </section>
  );
}

function CtaBand({ site }) {
  const c = site.cta;
  const { user } = useAuth();
  return (
    <section className="lp-wrap lp-cta-wrap" id="cta">
      <div className="lp-cta">
        <span className="lp-cta-ico"><Icon name="send" size={28} /></span>
        <div><h2>{c.title}</h2><p>{c.subtitle}</p></div>
        {user ? <Link className="btn lp-cta-btn" to={ROLE_HOME[user.role]}>Open dashboard</Link> : <CmsLink href={c.button_href} className="btn lp-cta-btn">{c.button_label} <Icon name="chevronRight" size={16} /></CmsLink>}
      </div>
    </section>
  );
}

export default function Landing() {
  const { data, error, loading, reload } = useSite();
  useEffect(() => {
    if (data) document.title = data.content.seo.title;
  }, [data]);
  if (!data) return <SiteLoading error={error} onRetry={reload} />;
  const site = data.content;
  void loading;
  return (
    <div className="lp">
      <BannerStrip className="lp-ann" />
      <SiteNav site={site} />
      <main>
        <Hero site={site} />
        <Categories site={site} />
        <Trusted site={site} />
        <How site={site} />
        <StatsBand site={site} live={data.live_stats} />
        <Testimonials site={site} />
        <Resources site={site} />
        <CtaBand site={site} />
      </main>
      <SiteFooter site={site} />
    </div>
  );
}
