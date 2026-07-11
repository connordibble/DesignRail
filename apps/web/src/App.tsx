import { useQuery } from '@apollo/client/react';
import { BUTTON_EXAMPLE_ID } from '@designrail/shared';
import type { ReactElement } from 'react';
import { useEffect, useMemo } from 'react';

import { EXAMPLES_QUERY, type ExamplesQuery } from './graphql/operations.js';
import { ReviewWorkspaceShell } from './review-workspace/ReviewWorkspaceShell.js';
import { workspaceTabToView, workspaceViewToTab } from './review-workspace/url-state.js';
import { useWorkspaceUrlState } from './review-workspace/use-workspace-url-state.js';

export function App(): ReactElement {
  const { data } = useQuery<ExamplesQuery, Record<string, never>>(EXAMPLES_QUERY);
  const examples = useMemo(() => data?.examples ?? [], [data]);
  const { view, exampleId, selectView, selectExample, replaceExample } = useWorkspaceUrlState();

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

  return (
    <ReviewWorkspaceShell
      activeTab={workspaceViewToTab(view)}
      exampleId={activeExampleId}
      examples={examples}
      onSelectExample={selectExample}
      onSelectTab={(tab) => selectView(workspaceTabToView(tab))}
      selectedExampleId={activeExampleId}
    />
  );
}
