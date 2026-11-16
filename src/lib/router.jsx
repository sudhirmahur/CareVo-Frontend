/* Tiny history-API router (no external dependency). */
import { createContext, useCallback, useContext, useEffect, useMemo, useState } from 'react';

const RouterContext = createContext(null);
const ParamsContext = createContext({});

/** Match "/jobs/:id" or "/admin/*" against a pathname. Returns params object or null. */
export function matchPath(pattern, pathname) {
  const clean = (s) => s.replace(/\/+$/, '') || '/';
  const pat = clean(pattern);
  const path = clean(pathname);
  if (pat.endsWith('/*')) {
    const base = pat.slice(0, -2) || '';
    if (path === (base || '/') || path.startsWith(base + '/')) return { '*': path.slice(base.length) || '/' };
    return null;
  }
  const a = pat.split('/');
  const b = path.split('/');
  if (a.length !== b.length) return null;
  const params = {};
  for (let i = 0; i < a.length; i += 1) {
    if (a[i].startsWith(':')) {
      try {
        params[a[i].slice(1)] = decodeURIComponent(b[i]);
      } catch {
        return null;
      }
    } else if (a[i] !== b[i]) return null;
  }
  return params;
}

export function Router({ children }) {
  const [loc, setLoc] = useState(() => ({ pathname: window.location.pathname, search: window.location.search }));

  useEffect(() => {
    const onPop = () => setLoc({ pathname: window.location.pathname, search: window.location.search });
    window.addEventListener('popstate', onPop);
    return () => window.removeEventListener('popstate', onPop);
  }, []);

  const navigate = useCallback((to, opts = {}) => {
    const url = new URL(to, window.location.origin);
    const next = url.pathname + url.search + url.hash;
    if (next === window.location.pathname + window.location.search + window.location.hash) return;
    if (opts.replace) window.history.replaceState({}, '', next);
    else window.history.pushState({}, '', next);
    setLoc({ pathname: url.pathname, search: url.search });
    if (!opts.keepScroll) window.scrollTo(0, 0);
  }, []);

  const value = useMemo(() => ({ ...loc, navigate }), [loc, navigate]);
  return <RouterContext.Provider value={value}>{children}</RouterContext.Provider>;
}

export function useRouter() {
  const ctx = useContext(RouterContext);
  if (!ctx) throw new Error('useRouter must be used inside <Router>');
  return ctx;
}
export const useNavigate = () => useRouter().navigate;
export const useLocation = () => {
  const { pathname, search } = useRouter();
  return { pathname, search };
};
export const useParams = () => useContext(ParamsContext);

/** Read/write URL query params:  const [q, setQ] = useSearchParams() */
export function useSearchParams() {
  const { search, pathname, navigate } = useRouter();
  const params = useMemo(() => new URLSearchParams(search), [search]);
  const set = useCallback(
    (updates, opts = { replace: true, keepScroll: true }) => {
      const next = new URLSearchParams(window.location.search);
      Object.entries(updates).forEach(([k, v]) => {
        if (v === undefined || v === null || v === '') next.delete(k);
        else next.set(k, String(v));
      });
      const qs = next.toString();
      navigate(pathname + (qs ? `?${qs}` : ''), opts);
    },
    [navigate, pathname],
  );
  return [params, set];
}

export function Link({ to, replace, children, onClick, ...rest }) {
  const { navigate } = useRouter();
  const external = /^(https?:)?\/\//.test(to);
  const handle = (e) => {
    onClick?.(e);
    if (e.defaultPrevented || external || e.button !== 0 || e.metaKey || e.ctrlKey || e.shiftKey || e.altKey) return;
    if (rest.target && rest.target !== '_self') return;
    e.preventDefault();
    navigate(to, { replace });
  };
  return (
    <a href={to} onClick={handle} {...rest}>
      {children}
    </a>
  );
}

export function NavLink({ to, end = false, className, activeClassName = 'active', children, ...rest }) {
  const { pathname } = useRouter();
  const target = to.split('?')[0];
  const active = end ? pathname.replace(/\/+$/, '') === target.replace(/\/+$/, '') : pathname === target || pathname.startsWith(target.replace(/\/+$/, '') + '/');
  const cls = [typeof className === 'function' ? className({ isActive: active }) : className, active ? activeClassName : '']
    .filter(Boolean)
    .join(' ');
  return (
    <Link to={to} className={cls} aria-current={active ? 'page' : undefined} {...rest}>
      {typeof children === 'function' ? children({ isActive: active }) : children}
    </Link>
  );
}

export function Navigate({ to, replace = true }) {
  const { navigate } = useRouter();
  useEffect(() => navigate(to, { replace }), [navigate, to, replace]);
  return null;
}

/** routes: [{ path, element }]  (first match wins).  `fallback` renders when nothing matches. */
export function Routes({ routes, fallback = null }) {
  const { pathname } = useRouter();
  for (const route of routes) {
    const params = matchPath(route.path, pathname);
    if (params) {
      return <ParamsContext.Provider value={params}>{route.element}</ParamsContext.Provider>;
    }
  }
  return fallback;
}
