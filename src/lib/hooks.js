import { useCallback, useEffect, useRef, useState } from 'react';
import { errorMessage } from './api';

/**
 * Run an async loader and track {data, loading, error}.
 *   const { data, loading, error, reload, setData } = useAsync(() => api.get('/jobs'), [deps]);
 * Stale responses (older than the latest call) are ignored.
 */
export function useAsync(loader, deps = [], { immediate = true } = {}) {
  const [state, setState] = useState({ data: null, loading: immediate, error: null });
  const callId = useRef(0);
  const loaderRef = useRef(loader);
  loaderRef.current = loader;

  const run = useCallback(async () => {
    callId.current += 1;
    const id = callId.current;
    setState((s) => ({ ...s, loading: true, error: null }));
    try {
      const data = await loaderRef.current();
      if (id === callId.current) setState({ data, loading: false, error: null });
      return data;
    } catch (e) {
      if (id === callId.current) setState((s) => ({ data: s.data, loading: false, error: errorMessage(e) }));
      return null;
    }
  }, []);

  useEffect(() => {
    if (immediate) run();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, deps);

  const setData = useCallback((updater) => setState((s) => ({ ...s, data: typeof updater === 'function' ? updater(s.data) : updater })), []);
  return { ...state, reload: run, setData };
}

export function useDebounce(value, delay = 350) {
  const [debounced, setDebounced] = useState(value);
  useEffect(() => {
    const t = setTimeout(() => setDebounced(value), delay);
    return () => clearTimeout(t);
  }, [value, delay]);
  return debounced;
}

/** Wrap an async action: tracks `busy`, shows errors through `onError`. */
export function useAction(fn, { onError } = {}) {
  const [busy, setBusy] = useState(false);
  const run = useCallback(
    async (...args) => {
      setBusy(true);
      try {
        return await fn(...args);
      } catch (e) {
        if (onError) onError(e);
        else throw e;
        return undefined;
      } finally {
        setBusy(false);
      }
    },
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [fn, onError],
  );
  return [run, busy];
}

/** Poll a loader while the tab is visible. */
export function usePolling(fn, ms = 15000, enabled = true) {
  const ref = useRef(fn);
  ref.current = fn;
  useEffect(() => {
    if (!enabled) return undefined;
    const t = setInterval(() => {
      if (document.visibilityState === 'visible') ref.current();
    }, ms);
    return () => clearInterval(t);
  }, [ms, enabled]);
}
