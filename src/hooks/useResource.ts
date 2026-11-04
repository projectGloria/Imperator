import { useCallback, useEffect, useRef, useState } from "react";
import type { AppError } from "../types/errors";

export interface Resource<T> {
  data: T | null;
  error: AppError | null;
  /** True only before the first successful load → drives skeletons. */
  loading: boolean;
  /** True while a refetch runs with stale data still on screen → spinner, no blanking. */
  refreshing: boolean;
  refresh: () => void;
  retry: () => void;
}

/**
 * Minimal async-resource hook. `fetcher` MUST be referentially stable (module-level
 * function): it's an effect dependency, and an inline lambda would refetch every render.
 *
 * One state object instead of four `useState`s so each transition is a single
 * render (and the fields can never disagree mid-update).
 */
export function useResource<T>(fetcher: (force: boolean) => Promise<T>): Resource<T> {
  const [state, setState] = useState<{ data: T | null; error: AppError | null; pending: boolean }>({
    data: null,
    error: null,
    pending: true,
  });
  // Monotonic request id: if the user spams Refresh, only the latest response wins.
  // A ref, not state — bumping it must not trigger a render.
  const reqId = useRef(0);

  const run = useCallback(
    (force: boolean) => {
      const id = ++reqId.current;
      setState((s) => ({ ...s, pending: true }));
      fetcher(force).then(
        (data) => id === reqId.current && setState({ data, error: null, pending: false }),
        // Keep stale data on error so a failed refresh doesn't wipe the screen;
        // the page decides whether to show a full error screen or a banner.
        (error: AppError) => id === reqId.current && setState((s) => ({ data: s.data, error, pending: false })),
      );
    },
    [fetcher],
  );

  useEffect(() => {
    run(false);
    // Invalidate in-flight responses on unmount / fetcher change (StrictMode double-mount too).
    return () => void ++reqId.current;
  }, [run]);

  return {
    data: state.data,
    error: state.error,
    loading: state.pending && state.data === null,
    refreshing: state.pending && state.data !== null,
    refresh: useCallback(() => run(true), [run]),
    retry: useCallback(() => run(false), [run]),
  };
}
