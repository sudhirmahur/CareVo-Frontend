import { useEffect, useState } from 'react';
import Icon from '../Icon';
import { api, assetUrl, safeHref } from '../../lib/api';
import { useAuth } from '../../lib/auth';

const read = (store, k) => { try { return window[store].getItem(k); } catch { return null; } };
const write = (store, k, v) => { try { window[store].setItem(k, v); } catch { /* storage blocked: fine */ } };

/** Per-visitor list fetched from the public API (audience + schedule are decided by the server). */
function useFeed(path) {
  const { user } = useAuth();
  const [items, setItems] = useState([]);
  useEffect(() => {
    let off = false;
    api.get(path).then((r) => { if (!off) setItems(Array.isArray(r) ? r : []); }).catch(() => { if (!off) setItems([]); });
    return () => { off = true; };
  }, [path, user?.id]);
  return items;
}

const external = (href) => /^https?:\/\//i.test(href);

/** Slim promotional banners created in Admin > Banners. Dismissal lasts for the browser session. */
export function BannerStrip({ className = '' }) {
  const items = useFeed('/banners');
  const [gone, setGone] = useState(() => new Set());
  const shown = items.filter((b) => !gone.has(b.id) && !read('sessionStorage', `ann-b-${b.id}`)).slice(0, 3);
  if (!shown.length) return null;
  const close = (id) => { write('sessionStorage', `ann-b-${id}`, '1'); setGone((s) => new Set(s).add(id)); };
  return (
    <section className={`ann-strip ${className}`} aria-label="Announcements" data-testid="banner-strip">
      {shown.map((b) => {
        const href = safeHref(b.link_url);
        const body = (
          <>
            {b.image_url && <img src={assetUrl(b.image_url)} alt="" className="ann-img" loading="lazy" />}
            <span className="ann-text"><strong>{b.title}</strong>{b.text && <span> {b.text}</span>}</span>
            {href && <span className="ann-cta">Learn more <Icon name="chevronRight" size={14} /></span>}
          </>
        );
        return (
          <div key={b.id} className={`ann-banner ann-${b.style || 'promo'}`} data-testid="banner">
            {href
              ? <a className="ann-main" href={href} {...(external(href) ? { target: '_blank', rel: 'noopener noreferrer' } : {})}>{body}</a>
              : <div className="ann-main">{body}</div>}
            <button type="button" className="ann-x" aria-label={`Dismiss ${b.title}`} onClick={() => close(b.id)}><Icon name="x" size={16} /></button>
          </div>
        );
      })}
    </section>
  );
}

const DAY = 24 * 3600 * 1000;
const eligible = (p) => {
  const k = `ann-p-${p.id}`;
  if (p.frequency === 'always') return !read('sessionStorage', k);
  const last = Number(read('localStorage', k) || 0);
  if (!last) return true;
  return p.frequency === 'daily' && Date.now() - last > DAY;
};

/** One scheduled popup at a time, shown after its delay; respects once / daily / every-visit frequency. */
export function PopupHost() {
  const items = useFeed('/popups');
  const [open, setOpen] = useState(null);
  const next = items.find(eligible);
  const nextId = next?.id;
  useEffect(() => {
    if (!next) return undefined;
    const t = setTimeout(() => setOpen(next), Math.max(0, next.delay_seconds || 0) * 1000);
    return () => clearTimeout(t);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [nextId]);
  useEffect(() => {
    if (!open) return undefined;
    const onKey = (e) => e.key === 'Escape' && close();
    document.addEventListener('keydown', onKey);
    return () => document.removeEventListener('keydown', onKey);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open]);
  if (!open) return null;
  function close() {
    write(open.frequency === 'always' ? 'sessionStorage' : 'localStorage', `ann-p-${open.id}`, String(Date.now()));
    setOpen(null);
  }
  const href = safeHref(open.button_link);
  return (
    <div className="ann-overlay" onMouseDown={(e) => e.target === e.currentTarget && close()}>
      <div className="ann-popup" role="dialog" aria-modal="true" aria-labelledby="ann-pop-title" data-testid="popup">
        <button type="button" className="ann-pop-x" aria-label="Close popup" onClick={close}><Icon name="x" size={18} /></button>
        {open.image_url && <img src={assetUrl(open.image_url)} alt="" className="ann-pop-img" />}
        <div className="ann-pop-body">
          <h2 id="ann-pop-title">{open.title}</h2>
          <p>{open.message}</p>
          <div className="ann-pop-actions">
            {href && open.button_label && (
              <a className="btn btn-primary" href={href} onClick={close} {...(external(href) ? { target: '_blank', rel: 'noopener noreferrer' } : {})}>{open.button_label}</a>
            )}
            <button type="button" className="btn btn-ghost" onClick={close}>{href ? 'Maybe later' : 'Got it'}</button>
          </div>
        </div>
      </div>
    </div>
  );
}
