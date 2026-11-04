import { useEffect, useState } from 'react';
import { api, errorMessage } from '../../lib/api';
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
