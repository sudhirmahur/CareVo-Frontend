import { useEffect, useId, useRef, useState } from 'react';
import Icon from './Icon';
import { initials, STATUS_TONE, titleCase } from '../lib/format';
import { assetUrl } from '../lib/api';

const cx = (...a) => a.filter(Boolean).join(' ');
export { cx };

export function Spinner({ size = 20, label }) {
  return (
    <span className="spinner-wrap" role="status" aria-live="polite">
      <span className="spinner" style={{ width: size, height: size }} />
      <span className="sr-only">{label || 'Loading'}</span>
    </span>
  );
}

export function Button({ variant = 'primary', size = 'md', icon, loading, children, className, type = 'button', disabled, ...rest }) {
  return (
    <button type={type} className={cx('btn', `btn-${variant}`, size !== 'md' && `btn-${size}`, className)} disabled={disabled || loading} {...rest}>
      {loading ? <Spinner size={16} /> : icon ? <Icon name={icon} size={size === 'sm' ? 15 : 18} /> : null}
      {children != null && <span>{children}</span>}
    </button>
  );
}

export function IconButton({ icon, label, variant = 'ghost', size = 18, className, ...rest }) {
  return (
    <button type="button" className={cx('icon-btn', `icon-btn-${variant}`, className)} aria-label={label} title={label} {...rest}>
      <Icon name={icon} size={size} />
    </button>
  );
}

export function Field({ label, hint, error, children, htmlFor, required }) {
  return (
    <div className={cx('field', error && 'has-error')}>
      {label && (
        <label htmlFor={htmlFor}>
          {label}
          {required && <span className="req" aria-hidden="true"> *</span>}
        </label>
      )}
      {children}
      {error ? <p className="field-error" role="alert">{error}</p> : hint ? <p className="field-hint">{hint}</p> : null}
    </div>
  );
}

export function Input({ label, hint, error, className, required, id, ...rest }) {
  const auto = useId();
  const fid = id || auto;
  return (
    <Field label={label} hint={hint} error={error} htmlFor={fid} required={required}>
      <input id={fid} className={cx('input', className)} required={required} aria-invalid={error ? 'true' : undefined} {...rest} />
    </Field>
  );
}

export function Textarea({ label, hint, error, className, required, id, rows = 4, ...rest }) {
  const auto = useId();
  const fid = id || auto;
  return (
    <Field label={label} hint={hint} error={error} htmlFor={fid} required={required}>
      <textarea id={fid} rows={rows} className={cx('input textarea', className)} required={required} aria-invalid={error ? 'true' : undefined} {...rest} />
    </Field>
  );
}

export function Select({ label, hint, error, options = [], placeholder, className, required, id, ...rest }) {
  const auto = useId();
  const fid = id || auto;
  return (
    <Field label={label} hint={hint} error={error} htmlFor={fid} required={required}>
      <select id={fid} className={cx('input select', className)} required={required} {...rest}>
        {placeholder !== undefined && <option value="">{placeholder}</option>}
        {options.map((o) => (
          <option key={o.value} value={o.value}>
            {o.label}
          </option>
        ))}
      </select>
    </Field>
  );
}

export function SearchInput({ value, onChange, placeholder = 'Search...', className, ...rest }) {
  return (
    <div className={cx('search-input', className)}>
      <Icon name="search" size={18} />
      <input type="search" value={value} onChange={(e) => onChange(e.target.value)} placeholder={placeholder} aria-label={placeholder} {...rest} />
    </div>
  );
}

export function Switch({ checked, onChange, label, disabled }) {
  return (
    <label className={cx('switch', disabled && 'disabled')}>
      <input type="checkbox" role="switch" checked={!!checked} disabled={disabled} onChange={(e) => onChange(e.target.checked)} />
      <span className="switch-track" aria-hidden="true" />
      {label && <span className="switch-label">{label}</span>}
    </label>
  );
}

export function Badge({ tone = 'neutral', children, className, dot }) {
  return (
    <span className={cx('badge', `badge-${tone}`, className)}>
      {dot && <span className="badge-dot" />}
      {children}
    </span>
  );
}

export function StatusBadge({ status }) {
  if (!status) return null;
  return (
    <Badge tone={STATUS_TONE[status] || 'neutral'} dot>
      {titleCase(status)}
    </Badge>
  );
}

export function Avatar({ name, src, size = 40, className }) {
  const url = src ? assetUrl(src) : '';
  return (
    <span className={cx('avatar', className)} style={{ width: size, height: size, fontSize: Math.max(11, size * 0.38) }} aria-hidden="true">
      {url ? <img src={url} alt="" loading="lazy" onError={(e) => (e.currentTarget.style.display = 'none')} /> : null}
      <span className="avatar-initials">{initials(name)}</span>
    </span>
  );
}   

export function Card({ title, subtitle, actions, children, className, padded = true, as: Tag = 'section', ...rest }) {
  return (
    <Tag className={cx('card', !padded && 'card-flush', className)} {...rest}>
      {(title || actions) && (
        <header className="card-head">
          <div>
            {title && <h2 className="card-title">{title}</h2>}
            {subtitle && <p className="card-sub">{subtitle}</p>}
          </div>
          {actions && <div className="card-actions">{actions}</div>}
        </header>
      )}
      {children}
    </Tag>
  );
}

export function PageHeader({ title, description, actions }) {
  return (
    <div className="page-header">
      <div>
        <h1>{title}</h1>
        {description && <p className="muted">{description}</p>}
      </div>
      {actions && <div className="page-actions">{actions}</div>}
    </div>
  );
}

export function EmptyState({ icon = 'inbox', title, description, action }) {
  return (
    <div className="empty-state">
      <span className="empty-icon">
        <Icon name={icon} size={28} />
      </span>
      <h3>{title}</h3>
      {description && <p className="muted">{description}</p>}
      {action}
    </div>
  );
}

export function ErrorState({ message, onRetry }) {
  return (
    <div className="empty-state error-state" role="alert">
      <span className="empty-icon">
        <Icon name="alert" size={28} />
      </span>
      <h3>Couldn't load this</h3>
      <p className="muted">{message}</p>
      {onRetry && (
        <Button variant="secondary" icon="refresh" onClick={onRetry}>
          Try again
        </Button>
      )}
    </div>
  );
}

export function Skeleton({ lines = 3, className }) {
  return (
    <div className={cx('skeleton-block', className)} aria-hidden="true">
      {Array.from({ length: lines }).map((_, i) => (
        <span key={i} className="skeleton" style={{ width: `${100 - (i % 3) * 18}%` }} />
      ))}
    </div>
  );
}

export function SkeletonList({ count = 3, lines = 3 }) {
  return (
    <div className="skeleton-list" role="status" aria-label="Loading">
      {Array.from({ length: count }).map((_, i) => (
        <div className="card" key={i}>
          <Skeleton lines={lines} />
        </div>
      ))}
    </div>
  );
}

/** Loading / error / empty / content switch used by every list page. */
export function DataState({ loading, error, onRetry, isEmpty, empty, skeleton, hasData = true, children }) {
  if (loading && !hasData) return skeleton || <SkeletonList />;
  if (error && !hasData) return <ErrorState message={error} onRetry={onRetry} />;
  if (isEmpty) return <EmptyState {...empty} />;
  return children;
}

export function Pagination({ page, pages, onChange }) {
  if (!pages || pages <= 1) return null;
  const items = [];
  const add = (n) => items.push(n);
  for (let i = 1; i <= pages; i += 1) {
    if (i === 1 || i === pages || Math.abs(i - page) <= 1) add(i);
    else if (items[items.length - 1] !== '…') add('…');
  }
  return (
    <nav className="pagination" aria-label="Pagination">
      <button type="button" className="page-btn" disabled={page <= 1} onClick={() => onChange(page - 1)} aria-label="Previous page">
        <Icon name="chevronLeft" size={16} />
      </button>
      {items.map((n, i) =>
        n === '…' ? (
          <span key={`e${i}`} className="page-ellipsis">…</span>
        ) : (
          <button key={n} type="button" className={cx('page-btn', n === page && 'active')} aria-current={n === page ? 'page' : undefined} onClick={() => onChange(n)}>
            {n}
          </button>
        ),
      )}
      <button type="button" className="page-btn" disabled={page >= pages} onClick={() => onChange(page + 1)} aria-label="Next page">
        <Icon name="chevronRight" size={16} />
      </button>
    </nav>
  );
}

export function Tabs({ tabs, value, onChange, className }) {
  return (
    <div className={cx('tabs', className)} role="tablist">
      {tabs.map((t) => (
        <button key={t.value} type="button" role="tab" aria-selected={value === t.value} className={cx('tab', value === t.value && 'active')} onClick={() => onChange(t.value)}>
          {t.label}
          {t.count != null && <span className="tab-count">{t.count}</span>}
        </button>
      ))}
    </div>
  );
}

export function Modal({ open = true, title, onClose, children, footer, size = 'md', description }) {
  const ref = useRef(null);
  const titleId = useId();
  useEffect(() => {
    if (!open) return undefined;
    const prev = document.activeElement;
    const onKey = (e) => e.key === 'Escape' && onClose?.();
    document.addEventListener('keydown', onKey);
    document.body.classList.add('modal-open');
    const first = ref.current?.querySelector('input,select,textarea,button:not(.modal-x)');
    first?.focus();
    return () => {
      document.removeEventListener('keydown', onKey);
      document.body.classList.remove('modal-open');
      prev?.focus?.();
    };
  }, [open, onClose]);
  if (!open) return null;
  return (
    <div className="modal-overlay" onMouseDown={(e) => e.target === e.currentTarget && onClose?.()}>
      <div className={cx('modal', `modal-${size}`)} role="dialog" aria-modal="true" aria-labelledby={titleId} ref={ref}>
        <header className="modal-head">
          <div>
            <h2 id={titleId}>{title}</h2>
            {description && <p className="muted">{description}</p>}
          </div>
          <button type="button" className="modal-x icon-btn icon-btn-ghost" onClick={onClose} aria-label="Close dialog">
            <Icon name="x" size={18} />
          </button>
        </header>
        <div className="modal-body">{children}</div>
        {footer && <footer className="modal-foot">{footer}</footer>}
      </div>
    </div>
  );
}

export function ConfirmDialog({ open, title, message, confirmLabel = 'Confirm', danger, loading, onConfirm, onCancel }) {
  return (
    <Modal
      open={open}
      title={title}
      onClose={onCancel}
      size="sm"
      footer={
        <>
          <Button variant="ghost" onClick={onCancel}>Cancel</Button>
          <Button variant={danger ? 'danger' : 'primary'} loading={loading} onClick={onConfirm}>
            {confirmLabel}
          </Button>
        </>
      }
    >
      <p>{message}</p>
    </Modal>
  );
}

export function StatCard({ icon, label, value, hint, tone = 'brand' }) {
  return (
    <div className={cx('stat-card', `tone-${tone}`)}>
      {icon && (
        <span className="stat-icon">
          <Icon name={icon} size={20} />
        </span>
      )}
      <div>
        <p className="stat-label">{label}</p>
        <p className="stat-value">{value ?? '-'}</p>
        {hint && <p className="stat-hint">{hint}</p>}
      </div>
    </div>
  );
}

/** Dependency-free bar chart. data: [{label, value}] */
export function BarChart({ data, height = 140, color = 'var(--brand)', ariaLabel = 'Bar chart' }) {
  const max = Math.max(1, ...data.map((d) => d.value));
  return (
    <div className="bar-chart" style={{ height }} role="img" aria-label={ariaLabel}>
      {data.map((d) => (
        <div className="bar-col" key={d.label} title={`${d.label}: ${d.value}`}>
          <span className="bar-val">{d.value || ''}</span>
          <span className="bar" style={{ height: `${(d.value / max) * 100}%`, background: color, minHeight: d.value ? 4 : 2, opacity: d.value ? 1 : 0.25 }} />
          <span className="bar-label">{d.label}</span>
        </div>
      ))}
    </div>
  );
}

export function SkillChips({ skills = [], max }) {
  const list = max ? skills.slice(0, max) : skills;
  if (!list.length) return null;
  return (
    <div className="chips">
      {list.map((s) => (
        <span className="chip" key={s}>{s}</span>
      ))}
      {max && skills.length > max && <span className="chip chip-more">+{skills.length - max}</span>}
    </div>
  );
}

/** Comma/Enter separated tag input for skills etc. */
export function TagInput({ label, value = [], onChange, placeholder = 'Type and press Enter', hint }) {
  const id = useId();
  const add = (raw) => {
    const parts = raw.split(',').map((s) => s.trim()).filter(Boolean);
    if (!parts.length) return;
    const next = [...value];
    parts.forEach((p) => {
      if (!next.some((x) => x.toLowerCase() === p.toLowerCase())) next.push(p);
    });
    onChange(next);
  };
  return (
    <Field label={label} hint={hint} htmlFor={id}>
      <div className="tag-input">
        {value.map((t) => (
          <span className="chip chip-removable" key={t}>
            {t}
            <button type="button" aria-label={`Remove ${t}`} onClick={() => onChange(value.filter((x) => x !== t))}>
              <Icon name="x" size={12} />
            </button>
          </span>
        ))}
        <input
          id={id}
          placeholder={value.length ? '' : placeholder}
          onKeyDown={(e) => {
            if (e.key === 'Enter' || e.key === ',') {
              e.preventDefault();
              add(e.currentTarget.value);
              e.currentTarget.value = '';
            } else if (e.key === 'Backspace' && !e.currentTarget.value && value.length) onChange(value.slice(0, -1));
          }}
          onBlur={(e) => {
            add(e.currentTarget.value);
            e.currentTarget.value = '';
          }}
        />
      </div>
    </Field>
  );
}

/** Brand logo. `src` lets the admin-edited logo (CMS) override the bundled artwork. */
export function Logo({ size = 32, text = true, className, src, name = 'CareVo' }) {
  const [broken, setBroken] = useState(false);
  const url = !broken && src ? assetUrl(src) : '/logo.png';
  return (
    <span className={cx('logo', className)}>
      {text ? (
        <img className="logo-img" src={url} alt={name} height={Math.round(size * 1.15)} onError={() => setBroken(true)} style={{ height: Math.round(size * 1.15) }} />
      ) : (
        <img className="logo-img" src="/logo-icon.png" alt={name} height={size} style={{ height: size }} />
      )}
    </span>
  );
}
