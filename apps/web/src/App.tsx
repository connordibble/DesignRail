import { useQuery } from '@apollo/client/react';
import { BUTTON_EXAMPLE_ID } from '@designrail/shared';
import type { ReactElement } from 'react';
import { useState } from 'react';

import { EXAMPLES_QUERY, type ExamplesQuery } from './graphql/operations.js';
import { ReviewWorkspaceShell } from './review-workspace/ReviewWorkspaceShell.js';

export function App(): ReactElement {
  const { data } = useQuery<ExamplesQuery, Record<string, never>>(EXAMPLES_QUERY);
  const examples = data?.examples ?? [];
  const [selectedExampleId, setSelectedExampleId] = useState<string | null>(null);
  // Default to the first ready example; fall back to Button so the workspace loads before the
  // example list resolves.
  const activeExampleId =
    selectedExampleId ??
    examples.find((example) => example.status === 'READY')?.id ??
    examples[0]?.id ??
    BUTTON_EXAMPLE_ID;

  return (
    <ReviewWorkspaceShell
      exampleId={activeExampleId}
      examples={examples}
      onSelectExample={setSelectedExampleId}
      selectedExampleId={activeExampleId}
    />
  );
}
