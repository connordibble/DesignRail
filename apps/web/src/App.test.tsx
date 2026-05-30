import type { MockedResponse } from '@apollo/client/testing';
import { MockedProvider } from '@apollo/client/testing/react';
import {
  BUTTON_EXAMPLE_ID,
  buttonComponentIntentFixture,
  buttonComponentMappingFixture,
  buttonComplianceFindingFixture,
  buttonExampleFixture,
  createEmptyDashboardMetrics,
  htmlExportFixture,
} from '@designrail/shared';
import { render, screen, within } from '@testing-library/react';
import { userEvent } from '@testing-library/user-event';
import { describe, expect, it } from 'vitest';

import { App } from './App.js';
import {
  EXPORT_MAPPING_MUTATION,
  REVIEW_WORKSPACE_QUERY,
  SAVE_REVIEW_DECISION_MUTATION,
  type ExportMappingMutation,
  type ExportMappingMutationVariables,
  type ExportResult,
  type ReviewDecisionResult,
  type ReviewWorkspace,
  type ReviewWorkspaceQuery,
  type ReviewWorkspaceQueryVariables,
  type SaveReviewDecisionInput,
  type SaveReviewDecisionMutation,
  type SaveReviewDecisionMutationVariables,
} from './graphql/operations.js';

const REVIEW_WORKSPACE_VARIABLES = {
  exampleId: BUTTON_EXAMPLE_ID,
};

const POPULATED_WORKSPACE: ReviewWorkspace = {
  example: buttonExampleFixture,
  intent: {
    ...buttonComponentIntentFixture,
    sourceRefs: buttonComponentIntentFixture.sourceRefs.map((sourceRef) => ({
      ...sourceRef,
      name: sourceRef.name ?? null,
    })),
    tokenRefs: buttonComponentIntentFixture.tokenRefs.map((tokenRef) => ({
      ...tokenRef,
      value: tokenRef.value ?? null,
      target: tokenRef.target ?? null,
    })),
    accessibility: {
      label: buttonComponentIntentFixture.accessibility.label ?? null,
      role: buttonComponentIntentFixture.accessibility.role ?? null,
      description: buttonComponentIntentFixture.accessibility.description ?? null,
      required: buttonComponentIntentFixture.accessibility.required,
    },
  },
  mapping: {
    ...buttonComponentMappingFixture,
    mappedTokens: buttonComponentMappingFixture.mappedTokens.map((tokenRef) => ({
      ...tokenRef,
      value: tokenRef.value ?? null,
      target: tokenRef.target ?? null,
    })),
    fallbackNotes: buttonComponentMappingFixture.fallbackNotes ?? null,
  },
  complianceFindings: [
    {
      ...buttonComplianceFindingFixture,
      path: buttonComplianceFindingFixture.path ?? null,
    },
  ],
  latestDecision: null,
  exports: [],
};

const POPULATED_RESULT: ReviewWorkspaceQuery = {
  reviewWorkspace: POPULATED_WORKSPACE,
  dashboardMetrics: {
    ...createEmptyDashboardMetrics(),
    commonComplianceWarnings: [{ message: 'Token alias missing', count: 2 }],
  },
};

describe('<App />', () => {
  it('renders the loading workspace state', () => {
    renderApp([createWorkspaceMock(POPULATED_RESULT, { delay: 50 })]);

    expect(screen.getByRole('status')).toBeInTheDocument();
    expect(screen.getByRole('heading', { level: 1, name: 'Workspace' })).toBeInTheDocument();
    expect(screen.queryByRole('heading', { level: 1, name: 'Button' })).not.toBeInTheDocument();
    expect(screen.getByText(BUTTON_EXAMPLE_ID)).toBeInTheDocument();
  });

  it('renders the error workspace state', async () => {
    renderApp([createWorkspaceMock(new Error('GraphQL unavailable'))]);

    expect(await screen.findByRole('alert')).toHaveTextContent('GraphQL unavailable');
  });

  it('renders the empty workspace state', async () => {
    renderApp([
      createWorkspaceMock({
        reviewWorkspace: null,
        dashboardMetrics: createEmptyDashboardMetrics(),
      }),
    ]);

    expect(await screen.findByText('No workspace found')).toBeInTheDocument();
    expect(screen.getAllByText(BUTTON_EXAMPLE_ID)).not.toHaveLength(0);
  });

  it('renders Button intent, mapping, and compliance content from GraphQL data', async () => {
    renderApp([createWorkspaceMock(POPULATED_RESULT)]);

    expect(await screen.findByText(buttonComponentIntentFixture.summary)).toBeInTheDocument();
    expect(screen.getAllByText(buttonComponentMappingFixture.targetComponent)).not.toHaveLength(0);
    expect(screen.getByText(buttonComplianceFindingFixture.category)).toBeInTheDocument();
    expect(screen.getByText(buttonComplianceFindingFixture.message)).toBeInTheDocument();
  });

  it('navigates between dashboard, review, exports, and schema tabs', async () => {
    const user = userEvent.setup();
    renderApp([
      createWorkspaceMock({
        reviewWorkspace: {
          ...POPULATED_WORKSPACE,
          exports: [htmlExportFixture],
        },
        dashboardMetrics: {
          ...createEmptyDashboardMetrics(),
          acceptedMappings: 1,
          exportsCreated: 1,
        },
      }),
    ]);

    expect(await screen.findByText(buttonComponentIntentFixture.summary)).toBeInTheDocument();

    const reviewTab = screen.getByRole('tab', { name: 'Review' });
    const dashboardTab = screen.getByRole('tab', { name: 'Dashboard' });

    expect(reviewTab).toHaveAttribute('aria-controls', 'workspace-panel-review');
    expect(dashboardTab).not.toHaveAttribute('aria-controls');

    reviewTab.focus();
    await user.keyboard('{ArrowLeft}');
    expect(dashboardTab).toHaveAttribute('aria-selected', 'true');
    expect(dashboardTab).toHaveFocus();
    expect(dashboardTab).toHaveAttribute('aria-controls', 'workspace-panel-dashboard');
    expect(reviewTab).not.toHaveAttribute('aria-controls');

    await user.click(screen.getByRole('tab', { name: 'Dashboard' }));
    expect(
      within(screen.getByRole('tabpanel')).getByRole('heading', { name: 'Dashboard' }),
    ).toBeInTheDocument();
    expect(screen.getByText('Accepted')).toBeInTheDocument();

    await user.click(screen.getByRole('tab', { name: 'Exports' }));
    expect(
      within(screen.getByRole('tabpanel')).getByRole('heading', { name: 'Export History' }),
    ).toBeInTheDocument();
    expect(screen.getByText(htmlExportFixture.content)).toBeInTheDocument();

    await user.click(screen.getByRole('tab', { name: 'Schema' }));
    expect(
      within(screen.getByRole('tabpanel')).getByRole('heading', { name: 'Intent Contract' }),
    ).toBeInTheDocument();
    expect(screen.getByText('targetComponent')).toBeInTheDocument();

    await user.click(screen.getByRole('tab', { name: 'Review' }));
    expect(
      within(screen.getByRole('tabpanel')).getByRole('heading', { name: 'Source Intent' }),
    ).toBeInTheDocument();
  });

  it('saves an accepted decision and enables exports', async () => {
    const user = userEvent.setup();
    const acceptedDecision = createDecision('ACCEPTED');

    renderApp([
      createWorkspaceMock(POPULATED_RESULT),
      createSaveDecisionMock({
        input: {
          mappingId: buttonComponentMappingFixture.id,
          status: 'ACCEPTED',
          reviewerLabel: 'Local reviewer',
        },
        decision: acceptedDecision,
      }),
      createWorkspaceMock(
        createWorkspaceResult({
          latestDecision: acceptedDecision,
          metrics: { acceptedMappings: 1 },
        }),
      ),
    ]);

    expect(await screen.findByText(buttonComponentIntentFixture.summary)).toBeInTheDocument();

    await user.click(screen.getByRole('button', { name: 'Accept' }));
    expect(await screen.findAllByText('ACCEPTED')).not.toHaveLength(0);

    await user.click(screen.getByRole('tab', { name: 'Exports' }));

    expect(screen.getByRole('button', { name: 'HTML' })).toBeEnabled();
    expect(screen.getByText('READY')).toBeInTheDocument();
  });

  it('saves a rejected decision and keeps exports locked', async () => {
    const user = userEvent.setup();
    const rejectedDecision = createDecision('REJECTED');

    renderApp([
      createWorkspaceMock(POPULATED_RESULT),
      createSaveDecisionMock({
        input: {
          mappingId: buttonComponentMappingFixture.id,
          status: 'REJECTED',
          reviewerLabel: 'Local reviewer',
        },
        decision: rejectedDecision,
      }),
      createWorkspaceMock(
        createWorkspaceResult({
          latestDecision: rejectedDecision,
          metrics: { rejectedMappings: 1 },
        }),
      ),
    ]);

    expect(await screen.findByText(buttonComponentIntentFixture.summary)).toBeInTheDocument();

    await user.click(screen.getByRole('button', { name: 'Reject' }));
    expect(await screen.findAllByText('REJECTED')).not.toHaveLength(0);

    await user.click(screen.getByRole('tab', { name: 'Exports' }));

    expect(screen.getByRole('button', { name: 'HTML' })).toBeDisabled();
    expect(screen.getByText('LOCKED')).toBeInTheDocument();
  });

  it('saves edited Button controls and exports edited output', async () => {
    const user = userEvent.setup();
    const editedMapping = {
      mappedProps: {
        variant: 'warning',
        size: 'large',
        disabled: true,
      },
      mappedSlots: {
        default: 'Publish changes',
      },
      confidence: 'HIGH' as const,
      rationale: buttonComponentMappingFixture.rationale,
    };
    const editedDecision = createDecision('EDITED', { editedMapping });
    const editedExport: ExportResult = {
      id: 'export.button.edited.html',
      mappingId: buttonComponentMappingFixture.id,
      format: 'HTML',
      content: '<sl-button variant="warning" size="large" disabled>Publish changes</sl-button>',
      createdAt: '2026-01-01T00:00:02.000Z',
    };

    renderApp([
      createWorkspaceMock(POPULATED_RESULT),
      createSaveDecisionMock({
        input: {
          mappingId: buttonComponentMappingFixture.id,
          status: 'EDITED',
          reviewerLabel: 'Local reviewer',
          editedMapping,
        },
        decision: editedDecision,
      }),
      createWorkspaceMock(
        createWorkspaceResult({
          latestDecision: editedDecision,
          metrics: { editedMappings: 1 },
        }),
      ),
      createExportMock({
        input: {
          mappingId: buttonComponentMappingFixture.id,
          format: 'HTML',
        },
        result: editedExport,
      }),
      createWorkspaceMock(
        createWorkspaceResult({
          exports: [editedExport],
          latestDecision: editedDecision,
          metrics: { editedMappings: 1, exportsCreated: 1 },
        }),
      ),
    ]);

    expect(await screen.findByText(buttonComponentIntentFixture.summary)).toBeInTheDocument();

    await user.clear(screen.getByLabelText('Label'));
    await user.type(screen.getByLabelText('Label'), 'Publish changes');
    await user.selectOptions(screen.getByLabelText('Variant'), 'warning');
    await user.selectOptions(screen.getByLabelText('Size'), 'large');
    await user.click(screen.getByLabelText('Disabled'));
    await user.click(screen.getByRole('button', { name: 'Edit' }));
    expect(await screen.findAllByText('EDITED')).not.toHaveLength(0);

    await user.click(screen.getByRole('tab', { name: 'Exports' }));
    await user.click(screen.getByRole('button', { name: 'HTML' }));

    expect(await screen.findByText(editedExport.content)).toBeInTheDocument();
  });

  it('shows export errors and allows retry', async () => {
    const user = userEvent.setup();
    const acceptedDecision = createDecision('ACCEPTED');
    const successfulExport: ExportResult = {
      id: 'export.button.retry.html',
      mappingId: buttonComponentMappingFixture.id,
      format: 'HTML',
      content: htmlExportFixture.content,
      createdAt: '2026-01-01T00:00:03.000Z',
    };

    renderApp([
      createWorkspaceMock(
        createWorkspaceResult({
          latestDecision: acceptedDecision,
          metrics: { acceptedMappings: 1 },
        }),
      ),
      createExportMock({
        input: {
          mappingId: buttonComponentMappingFixture.id,
          format: 'HTML',
        },
        error: new Error('Temporary export failure'),
      }),
      createExportMock({
        input: {
          mappingId: buttonComponentMappingFixture.id,
          format: 'HTML',
        },
        result: successfulExport,
      }),
      createWorkspaceMock(
        createWorkspaceResult({
          exports: [successfulExport],
          latestDecision: acceptedDecision,
          metrics: { acceptedMappings: 1, exportsCreated: 1 },
        }),
      ),
    ]);

    expect(await screen.findByText(buttonComponentIntentFixture.summary)).toBeInTheDocument();

    await user.click(screen.getByRole('tab', { name: 'Exports' }));
    await user.click(screen.getByRole('button', { name: 'HTML' }));

    expect(await screen.findByRole('alert')).toHaveTextContent('Temporary export failure');

    await user.click(screen.getByRole('button', { name: 'HTML' }));

    expect(await screen.findByText(successfulExport.content)).toBeInTheDocument();
  });
});

function renderApp(mocks: ReadonlyArray<MockedResponse>): void {
  render(
    <MockedProvider mocks={mocks} showWarnings={false}>
      <App />
    </MockedProvider>,
  );
}

function createWorkspaceMock(
  resultOrError: ReviewWorkspaceQuery | Error,
  options: { delay?: number } = {},
): MockedResponse<ReviewWorkspaceQuery, ReviewWorkspaceQueryVariables> {
  const request = {
    query: REVIEW_WORKSPACE_QUERY,
    variables: REVIEW_WORKSPACE_VARIABLES,
  };

  if (resultOrError instanceof Error) {
    return {
      request,
      error: resultOrError,
      ...(options.delay === undefined ? {} : { delay: options.delay }),
    };
  }

  return {
    request,
    result: { data: resultOrError },
    ...(options.delay === undefined ? {} : { delay: options.delay }),
  };
}

function createWorkspaceResult({
  exports = [],
  latestDecision = null,
  metrics = {},
}: {
  exports?: ExportResult[];
  latestDecision?: ReviewDecisionResult | null;
  metrics?: Partial<ReviewWorkspaceQuery['dashboardMetrics']>;
}): ReviewWorkspaceQuery {
  return {
    reviewWorkspace: {
      ...POPULATED_WORKSPACE,
      exports,
      latestDecision,
    },
    dashboardMetrics: {
      ...createEmptyDashboardMetrics(),
      ...metrics,
    },
  };
}

function createDecision(
  status: ReviewDecisionResult['status'],
  overrides: Partial<ReviewDecisionResult> = {},
): ReviewDecisionResult {
  return {
    id: `decision.button.${status.toLowerCase()}`,
    mappingId: buttonComponentMappingFixture.id,
    status,
    reviewerLabel: 'Local reviewer',
    editedMapping: null,
    notes: null,
    createdAt: '2026-01-01T00:00:01.000Z',
    ...overrides,
  };
}

function createSaveDecisionMock({
  decision,
  input,
}: {
  decision: ReviewDecisionResult;
  input: SaveReviewDecisionInput;
}): MockedResponse<SaveReviewDecisionMutation, SaveReviewDecisionMutationVariables> {
  return {
    request: {
      query: SAVE_REVIEW_DECISION_MUTATION,
      variables: { input },
    },
    result: {
      data: {
        saveReviewDecision: decision,
      },
    },
  };
}

function createExportMock({
  error,
  input,
  result,
}: {
  error?: Error;
  input: ExportMappingMutationVariables['input'];
  result?: ExportResult;
}): MockedResponse<ExportMappingMutation, ExportMappingMutationVariables> {
  const request = {
    query: EXPORT_MAPPING_MUTATION,
    variables: { input },
  };

  if (error !== undefined) {
    return {
      request,
      error,
    };
  }

  if (result === undefined) {
    throw new Error('createExportMock requires result or error.');
  }

  return {
    request,
    result: {
      data: {
        exportMapping: result,
      },
    },
  };
}
