import { BUTTON_EXAMPLE_ID } from '@designrail/shared';
import type { ReactElement } from 'react';

import { ReviewWorkspaceShell } from './review-workspace/ReviewWorkspaceShell.js';

export function App(): ReactElement {
  return <ReviewWorkspaceShell exampleId={BUTTON_EXAMPLE_ID} />;
}
