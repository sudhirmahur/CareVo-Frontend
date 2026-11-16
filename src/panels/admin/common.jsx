import { useEffect, useState } from 'react';
import { API_BASE, api, errorMessage, tokenStore } from '../../lib/api';
import { useAsync, useDebounce } from '../../lib/hooks';
import { useSearchParams } from '../../lib/router';
import { useToast } from '../../lib/toast';
import { Avatar, Badge, Button, DataState, Pagination, SearchInput, Tabs } from '../../components/ui';

/** Paged GET list that resets to page 1 whenever filters change. */
export function usePagedList(path, filters = {}, limit = 15) {
  const [page, setPage] = useState(1);
  const key = JSON.stringify(filters);
  useEffect(() => setPage(1), [key]);
  const res = useAsync(() => api.get(path, { ...filters, page, limit }), [path, key, page]);
  return { ...res, page, setPage };
}

/** Debounced text search state:  const [q, setQ, dq] = useSearch() */
export function useSearch(initial = '') {
  const [q, setQ] = useState(initial);
  const dq = useDebounce(q, 350);
  return [q, setQ, dq.trim()];
}

/** Status filter kept in the URL (?status=pending) so dashboard shortcuts deep-link. */
export function useUrlFilter(name, fallback = '') {
  const [params, setParams] = useSearchParams();
  const value = params.get(name) || fallback;
  return [value, (v) => setParams({ [name]: v || '' })];
}

/** Run a mutation with toast feedback, then reload. */
export function useDo(reload) {
  const toast = useToast();
  const [busy, setBusy] = useState(false);
  const run = async (fn, msg = 'Done') => {
    setBusy(true);
    try {
      const r = await fn();
      toast.success(typeof msg === 'function' ? msg(r) : msg);
      if (reload) await reload();
      return true;
    } catch (e) {
      toast.error(errorMessage(e));
      return false;
    } finally {
      setBusy(false);
    }
  };
  return [run, busy];
}

export function Filters({ children }) {
  return <div className="ad-filters">{children}</div>;
}

export function ListShell({ res, tabs, tab, onTab, search, onSearch, searchPlaceholder, extraFilters, empty, children, filtersRight }) {
  const items = res.data?.items || [];
  return (
    <>
      {tabs && <Tabs tabs={tabs} value={tab} onChange={onTab} />}
      {(onSearch || extraFilters || filtersRight) && (
        <Filters>
          {onSearch && <SearchInput className="grow" value={search} onChange={onSearch} placeholder={searchPlaceholder || 'Search…'} />}
          {extraFilters}
          {filtersRight}
        </Filters>
      )}
      <div className="card card-flush">
        <DataState loading={res.loading} error={res.error} onRetry={res.reload} hasData={!!res.data} isEmpty={items.length === 0} empty={empty}>
          {children(items)}
        </DataState>
      </div>
      <div className="ad-foot muted small">{res.data ? `${res.data.total} total` : ''}</div>
      <Pagination page={res.page} pages={res.data?.pages} onChange={res.setPage} />
    </>
  );
}

export const PersonCell = ({ name, email, image, sub }) => (
  <div className="row" style={{ gap: 10 }}>
    <Avatar name={name} src={image} size={34} />
    <div style={{ minWidth: 0 }}>
      <div className="truncate strong">{name}</div>
      <div className="truncate muted small">{email || sub}</div>
    </div>
  </div>
);

export const RoleBadge = ({ role }) => <Badge tone={role === 'admin' ? 'brand' : role === 'recruiter' ? 'info' : 'neutral'}>{role}</Badge>;

export function ActionBtn({ icon, label, tone, ...rest }) {
  return (
    <button type="button" className={`icon-btn ${tone === 'danger' ? 'icon-btn-danger' : ''}`} aria-label={label} title={label} {...rest}>
      <IconSvg name={icon} />
    </button>
  );
}
import Icon from '../../components/Icon';
const IconSvg = ({ name }) => <Icon name={name} size={17} />;

export { Button };

/** Authenticated file download (CSV / XLSX / PDF): fetch with the bearer token, then save the blob. */
export async function downloadFile(path, filename, params = {}) {
  const qs = new URLSearchParams(Object.entries(params).filter(([, v]) => v !== '' && v != null)).toString();
  const res = await fetch(`${API_BASE}${path}${qs ? `?${qs}` : ''}`, { headers: { Authorization: `Bearer ${tokenStore.get()}` } });
  if (!res.ok) {
    let msg = `Download failed (${res.status})`;
    try { const j = await res.json(); if (typeof j.detail === 'string') msg = j.detail; } catch { /* keep default */ }
    throw new Error(msg);
  }
  const url = URL.createObjectURL(await res.blob());
  const a = Object.assign(document.createElement('a'), { href: url, download: filename });
  document.body.appendChild(a); a.click(); a.remove(); URL.revokeObjectURL(url);
}

/** Download button with toast feedback. */
export function DownloadBtn({ path, filename, params, children, icon = 'download', variant = 'secondary', ...rest }) {
  const toast = useToast();
  const [busy, setBusy] = useState(false);
  return (
    <Button variant={variant} icon={icon} loading={busy} onClick={async () => { setBusy(true); try { await downloadFile(path, filename, params); toast.success('Download started'); } catch (e) { toast.error(e.message); } finally { setBusy(false); } }} {...rest}>{children}</Button>
  );
}

/** Dependency-free SVG line chart. series: [{name, values, color}], labels: string[] */
export function LineChart({ labels, series, height = 180, ariaLabel = 'Line chart', format = (v) => v }) {
  const W = 600, H = height, P = { l: 8, r: 8, t: 14, b: 22 };
  const max = Math.max(1, ...series.flatMap((s) => s.values));
  const n = Math.max(1, labels.length - 1);
  const x = (i) => P.l + (i / n) * (W - P.l - P.r);
  const y = (v) => H - P.b - (v / max) * (H - P.t - P.b);
  const step = Math.max(1, Math.ceil(labels.length / 6));
  return (
    <div className="ad-line" role="img" aria-label={ariaLabel}>
      <svg viewBox={`0 0 ${W} ${H}`} preserveAspectRatio="none" style={{ width: '100%', height }}>
        {[0, 0.5, 1].map((t) => <line key={t} x1={P.l} x2={W - P.r} y1={y(max * t)} y2={y(max * t)} stroke="var(--border)" strokeWidth="1" />)}
        {series.map((s) => (
          <polyline key={s.name} fill="none" stroke={s.color || 'var(--brand)'} strokeWidth="2.2" strokeLinejoin="round" points={s.values.map((v, i) => `${x(i)},${y(v)}`).join(' ')} />
        ))}
        {labels.map((l, i) => (i % step === 0 ? <text key={l} x={x(i)} y={H - 6} fontSize="10" textAnchor="middle" fill="var(--muted)">{l.slice(5) || l}</text> : null))}
      </svg>
      <div className="ad-line-legend">
        {series.map((s) => <span key={s.name}><i style={{ background: s.color || 'var(--brand)' }} />{s.name}: <b>{format(s.values.reduce((a, b) => a + b, 0))}</b></span>)}
      </div>
    </div>
  );
}
