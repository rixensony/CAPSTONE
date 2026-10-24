import { useCallback, useEffect, useRef, useState } from 'react';

const MAX_DEPS = 32;

export function useAsync(fn, deps = [], options = {}) {
  const { immediate = true } = options;
  const [tick, setTick] = useState(0);
  const [state, setState] = useState({ data: null, loading: immediate, error: null });
  const seqRef = useRef(0);
  const mountedRef = useRef(true);

  useEffect(() => {
    mountedRef.current = true;
    return () => {
      mountedRef.current = false;
    };
  }, []);

  const shouldLoad = immediate || tick > 0;

  useEffect(() => {
    if (!shouldLoad) return undefined;
    const seq = ++seqRef.current;
    let alive = true;
    setState((prev) => ({ ...prev, loading: true, error: null }));
    Promise.resolve()
      .then(() => fn())
      .then((result) => {
        if (!alive || !mountedRef.current || seq !== seqRef.current) return;
        setState({ data: result, loading: false, error: null });
      })
      .catch((err) => {
        if (!alive || !mountedRef.current || seq !== seqRef.current) return;
        if (err && (err.name === 'AbortError' || err.code === 'ABORT_ERR')) return;
        setState({ data: null, loading: false, error: err });
      });
    return () => {
      alive = false;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [...deps.slice(0, MAX_DEPS), tick, shouldLoad]);

  const retry = useCallback(() => {
    setTick((current) => current + 1);
  }, []);

  const setData = useCallback((value) => {
    setState((prev) => ({
      ...prev,
      data: typeof value === 'function' ? value(prev.data) : value,
    }));
  }, []);

  return { data: state.data, loading: state.loading, error: state.error, retry, setData };
}

export default useAsync;
