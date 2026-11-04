import { createContext, createElement, useContext, useEffect, useState } from 'react';
import { api } from './api';

/** Public, admin-editable landing/login content (GET /api/public/site-content). Cached for the session. */
let cache = null;
let inflight = null;

export function loadSite(force = false) {
  if (cache && !force) return Promise.resolve(cache);
  if (!inflight || force) {
    inflight = api
      .get('/public/site-content', undefined, { auth: false })
      .then((d) => { cache = d; return d; })
      .finally(() => { inflight = null; });
  }
  return inflight;
}
export const resetSiteCache = () => { cache = null; };

export function useSite() {
  const [state, setState] = useState({ data: cache, error: '', loading: !cache });
  const load = (force = false) => {
    setState((s) => ({ ...s, loading: true, error: '' }));
    loadSite(force)
      .then((data) => setState({ data, error: '', loading: false }))
      .catch((e) => setState({ data: null, error: e.message || 'Could not load the page.', loading: false }));
  };
  useEffect(() => {
    if (!cache) load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);
  return { ...state, reload: () => load(true) };
}

/** "Find Your Next Opportunity with CareVo" + highlight "CareVo" -> [text, <span>CareVo</span>] */
export function Highlighted({ text, highlight, className = 'lp-hl' }) {
  const t = String(text || '');
  const h = String(highlight || '');
  const i = h ? t.lastIndexOf(h) : -1;
  if (i < 0) return t;
  return [t.slice(0, i), createElement('span', { key: 'h', className }, h), t.slice(i + h.length)];
}

export function liveValue(item, live) {
  if (item.source && item.source !== 'manual' && live && live[item.source] !== undefined) {
    const n = Number(live[item.source]) || 0;
    return n >= 1000 ? `${(n / 1000).toFixed(n >= 10000 ? 0 : 1).replace(/\.0$/, '')}K+` : String(n);
  }
  return item.value;
}

const Ctx = createContext(null);
export const SiteContext = Ctx;
export const useSiteCtx = () => useContext(Ctx);
