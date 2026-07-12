import { useQuery } from '@apollo/client/react';
import { BUTTON_EXAMPLE_ID } from '@designrail/shared';
import type { ReactElement } from 'react';
import { useEffect, useMemo } from 'react';

import { EXAMPLES_QUERY, type ExamplesQuery } from './graphql/operations.js';
import {
  ReviewWorkspaceShell,
  type WorkspaceTab,
} from './review-workspace/ReviewWorkspaceShell.js';
import { workspaceTabToView, workspaceViewToTab } from './review-workspace/url-state.js';
import { useWorkspaceUrlState } from './review-workspace/use-workspace-url-state.js';
import { useTrackUiEvent } from './use-track-ui-event.js';

export function App(): ReactElement {
  const { data } = useQuery<ExamplesQuery, Record<string, never>>(EXAMPLES_QUERY);
  const examples = useMemo(() => data?.examples ?? [], [data]);
  const { view, exampleId, selectView, selectExample, selectWorkspace, replaceExample } =
    useWorkspaceUrlState();
  const trackUiEvent = useTrackUiEvent();

  // Default to the first ready example; fall back to Button so the workspace loads before the
  // example list resolves.
  const fallbackExampleId =
    examples.find((example) => example.status === 'READY')?.id ??
    examples[0]?.id ??
    BUTTON_EXAMPLE_ID;
  const activeExampleId = exampleId ?? fallbackExampleId;

  // Validated fallback: once the example list is known, an unknown ?example= is corrected in
  // place (no extra history entry) so refresh and shared links land on a real workspace.
  useEffect(() => {
    if (exampleId === null || examples.length === 0) {
      return;
    }

    if (!examples.some((example) => example.id === exampleId)) {
      replaceExample(null);
    }
  }, [examples, exampleId, replaceExample]);

  function handleSelectTab(tab: WorkspaceTab): void {
    const nextView = workspaceTabToView(tab);

    if (nextView !== view) {
      trackUiEvent('ui.view_changed', {
        exampleId: activeExampleId,
        metadata: { view: nextView },
      });
    }

    selectView(nextView);
  }

  function handleSelectExample(nextExampleId: string): void {
    if (nextExampleId !== activeExampleId) {
      trackUiEvent('ui.example_selected', { exampleId: nextExampleId });
    }

    selectExample(nextExampleId);
  }

  function handleLoadDemoScenario(): void {
    if (activeExampleId !== BUTTON_EXAMPLE_ID) {
      trackUiEvent('ui.example_selected', { exampleId: BUTTON_EXAMPLE_ID });
    }

    if (view !== 'review') {
      trackUiEvent('ui.view_changed', {
        exampleId: BUTTON_EXAMPLE_ID,
        metadata: { view: 'review' },
      });
    }

    selectWorkspace({ view: 'review', exampleId: BUTTON_EXAMPLE_ID });
  }

  return (
    <ReviewWorkspaceShell
      activeTab={workspaceViewToTab(view)}
      exampleId={activeExampleId}
      examples={examples}
      onLoadDemoScenario={handleLoadDemoScenario}
      onSelectExample={handleSelectExample}
      onSelectTab={handleSelectTab}
      selectedExampleId={activeExampleId}
    />
  );
}
