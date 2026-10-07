import { useCallback, useEffect, useRef, useState } from 'react';
import { isNotAvailable } from '../api/errors';

/**
 * Runs an API call and exposes the four states every page must handle:
 * loading, success (data), empty (decided by the page), error.
 * `notAvailable` is true when the backend module is not implemented yet
 * (404/405/501) so pages can show a "coming soon" state instead of an error.
 *
 * @param {() => Promise<any>} request  stable via useCallback in the caller
 * @param {{ immediate?: boolean }} options
 */
export default function useApi(request, { immediate = true } = {}) {
  const [state, setState] = useState({
    data: null,
    error: null,
    loading: immediate,
    notAvailable: false,
  });
  const requestId = useRef(0);

  const run = useCallback(async () => {
    requestId.current += 1;
    const current = requestId.current;
    setState((prev) => ({ ...prev, loading: true, error: null, notAvailable: false }));
    try {
      const data = await request();
      if (current === requestId.current) setState({ data, error: null, loading: false, notAvailable: false });
      return data;
    } catch (error) {
      if (current === requestId.current) {
        setState({ data: null, error, loading: false, notAvailable: isNotAvailable(error) });
      }
      return undefined;
    }
  }, [request]);

  useEffect(() => {
    if (immediate) run();
    return () => {
      requestId.current += 1; // ignore late responses after unmount / param change
    };
  }, [run, immediate]);

  return { ...state, reload: run, setData: (data) => setState((prev) => ({ ...prev, data })) };
}
