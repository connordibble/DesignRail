import { useCallback, useEffect, useState } from 'react';

import {
  parseWorkspaceSearch,
  serializeWorkspaceSearch,
  type WorkspaceUrlState,
  type WorkspaceView,
} from './url-state.js';

interface UseWorkspaceUrlStateResult {
  view: WorkspaceView;
  exampleId: string | null;
  selectView: (view: WorkspaceView) => void;
  selectExample: (exampleId: string) => void;
  /** Change the view and example as one browser-history transition. */
  selectWorkspace: (next: WorkspaceUrlState) => void;
  /** Correct an invalid example without adding a history entry. */
  replaceExample: (exampleId: string | null) => void;
}

// The URL is the source of truth: handlers read it directly and write it exactly once,
// keeping the callbacks stable and StrictMode-safe (no side effects inside updaters).
function commit(next: WorkspaceUrlState, mode: 'push' | 'replace'): void {
  const url = `${window.location.pathname}${serializeWorkspaceSearch(next)}`;

  if (mode === 'push') {
    window.history.pushState(null, '', url);
  } else {
    window.history.replaceState(null, '', url);
  }
}

/**
 * Owns the workspace's `?view=&example=` URL contract: state initializes from the
 * current URL, user selections push history entries so back/forward and shared
 * links restore the same workspace, and popstate re-parses the URL.
 */
export function useWorkspaceUrlState(): UseWorkspaceUrlStateResult {
  const [state, setState] = useState<WorkspaceUrlState>(() =>
    parseWorkspaceSearch(window.location.search),
  );

  useEffect(() => {
    function handlePopState(): void {
      setState(parseWorkspaceSearch(window.location.search));
    }

    window.addEventListener('popstate', handlePopState);

    return () => {
      window.removeEventListener('popstate', handlePopState);
    };
  }, []);

  const selectView = useCallback((view: WorkspaceView) => {
    const current = parseWorkspaceSearch(window.location.search);

    if (view === current.view) {
      return;
    }

    const next = { ...current, view };
    commit(next, 'push');
    setState(next);
  }, []);

  const selectExample = useCallback((exampleId: string) => {
    const current = parseWorkspaceSearch(window.location.search);

    if (exampleId === current.exampleId) {
      return;
    }

    const next = { ...current, exampleId };
    commit(next, 'push');
    setState(next);
  }, []);

  const selectWorkspace = useCallback((next: WorkspaceUrlState) => {
    const current = parseWorkspaceSearch(window.location.search);

    if (next.view === current.view && next.exampleId === current.exampleId) {
      return;
    }

    commit(next, 'push');
    setState(next);
  }, []);

  const replaceExample = useCallback((exampleId: string | null) => {
    const current = parseWorkspaceSearch(window.location.search);

    if (exampleId === current.exampleId) {
      return;
    }

    const next = { ...current, exampleId };
    commit(next, 'replace');
    setState(next);
  }, []);

  return {
    view: state.view,
    exampleId: state.exampleId,
    selectView,
    selectExample,
    selectWorkspace,
    replaceExample,
  };
}
