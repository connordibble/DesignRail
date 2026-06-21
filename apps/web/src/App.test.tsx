import type { MockedResponse } from '@apollo/client/testing';
import { MockedProvider } from '@apollo/client/testing/react';
import {
  BUTTON_EXAMPLE_ID,
  buttonComplianceFindingsFixture,
  buttonComponentIntentFixture,
  buttonComponentMappingFixture,
  buttonExampleFixture,
  cardComplianceFindingsFixture,
  cardComponentIntentFixture,
  cardComponentMappingFixture,
  cardExampleFixture,
  createEmptyDashboardMetrics,
  htmlExportFixture,
  INPUT_EXAMPLE_ID,
  inputComplianceFindingsFixture,
  inputComponentIntentFixture,
  inputComponentMappingFixture,
  inputExampleFixture,
} from '@designrail/shared';
import { render, screen, within } from '@testing-library/react';
import { userEvent } from '@testing-library/user-event';
import { describe, expect, it } from 'vitest';

import { App } from './App.js';
import {
  EXAMPLES_QUERY,
  EXPORT_MAPPING_MUTATION,
  REVIEW_WORKSPACE_QUERY,
  SAVE_REVIEW_DECISION_MUTATION,
  type ComplianceFindingResult,
  type ComponentIntentResult,
  type ComponentMappingResult,
  type ExampleResult,
  type ExamplesQuery,
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

const DEFAULT_EXAMPLES: ExampleResult[] = [
  buttonExampleFixture,
  cardExampleFixture,
  inputExampleFixture,
];

function toIntentResult(
  intent:
    | typeof buttonComponentIntentFixture
    | typeof inputComponentIntentFixture
    | typeof cardComponentIntentFixture,
): ComponentIntentResult {
  return {
    ...intent,
    sourceRefs: intent.sourceRefs.map((sourceRef) => ({
      ...sourceRef,
      name: sourceRef.name ?? null,
    })),
    tokenRefs: intent.tokenRefs.map((tokenRef) => ({
      ...tokenRef,
      value: tokenRef.value ?? null,
      target: tokenRef.target ?? null,
    })),
    accessibility: {
      label: intent.accessibility.label ?? null,
      role: intent.accessibility.role ?? null,
      description: intent.accessibility.description ?? null,
      required: intent.accessibility.required,
    },
  };
}

function toMappingResult(
  mapping:
    | typeof buttonComponentMappingFixture
    | typeof inputComponentMappingFixture
    | typeof cardComponentMappingFixture,
): ComponentMappingResult {
  return {
    ...mapping,
    mappedTokens: mapping.mappedTokens.map((tokenRef) => ({
      ...tokenRef,
      value: tokenRef.value ?? null,
      target: tokenRef.target ?? null,
    })),
    fallbackNotes: mapping.fallbackNotes ?? null,
  };
}

function toFindingResults(
  findings: typeof buttonComplianceFindingsFixture,
): ComplianceFindingResult[] {
  return findings.map((finding) => ({ ...finding, path: finding.path ?? null }));
}

const POPULATED_WORKSPACE: ReviewWorkspace = {
  example: buttonExampleFixture,
  intent: toIntentResult(buttonComponentIntentFixture),
  mapping: toMappingResult(buttonComponentMappingFixture),
  complianceFindings: toFindingResults(buttonComplianceFindingsFixture),
  latestDecision: null,
  exports: [],
};

const INPUT_WORKSPACE: ReviewWorkspace = {
  example: inputExampleFixture,
  intent: toIntentResult(inputComponentIntentFixture),
  mapping: toMappingResult(inputComponentMappingFixture),
  complianceFindings: toFindingResults(inputComplianceFindingsFixture),
  latestDecision: null,
  exports: [],
};

const CARD_WORKSPACE: ReviewWorkspace = {
  example: cardExampleFixture,
  intent: toIntentResult(cardComponentIntentFixture),
  mapping: toMappingResult(cardComponentMappingFixture),
  complianceFindings: toFindingResults(cardComplianceFindingsFixture),
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
    expect(screen.getByText(buttonComplianceFindingsFixture[0]!.category)).toBeInTheDocument();
    expect(screen.getByText(buttonComplianceFindingsFixture[0]!.message)).toBeInTheDocument();
  });

  it('switches the workspace when another example is selected', async () => {
    const user = userEvent.setup();
    renderApp([
      createWorkspaceMock(POPULATED_RESULT),
      createWorkspaceMock(
        {
          reviewWorkspace: INPUT_WORKSPACE,
          dashboardMetrics: createEmptyDashboardMetrics(),
        },
        { exampleId: INPUT_EXAMPLE_ID },
      ),
    ]);

    expect(await screen.findByText(buttonComponentIntentFixture.summary)).toBeInTheDocument();

    // Wait for the examples query to populate the selector before switching.
    await user.click(await screen.findByRole('button', { name: /Input/ }));

    expect(await screen.findByText(inputComponentIntentFixture.summary)).toBeInTheDocument();
    expect(screen.getAllByText(inputComponentMappingFixture.targetComponent)).not.toHaveLength(0);
  });

  it('edits and exports the Input mapping through the schema-driven UI', async () => {
    const user = userEvent.setup();
    const editedInputMapping = {
      mappedProps: {
        type: 'email',
        size: 'medium',
        label: 'Email address',
        placeholder: 'you@example.com',
        disabled: false,
        required: false,
      },
      confidence: 'MEDIUM' as const,
      rationale: inputComponentMappingFixture.rationale,
    };
    const editedInputDecision: ReviewDecisionResult = {
      id: 'decision.input.edited',
      mappingId: inputComponentMappingFixture.id,
      status: 'EDITED',
      reviewerLabel: 'Local reviewer',
      editedMapping: editedInputMapping,
      notes: null,
      createdAt: '2026-01-01T00:00:01.000Z',
    };
    const inputExport: ExportResult = {
      id: 'export.input.edited.html',
      mappingId: inputComponentMappingFixture.id,
      format: 'HTML',
      content:
        '<sl-input type="email" size="medium" label="Email address" placeholder="you@example.com"></sl-input>',
      createdAt: '2026-01-01T00:00:02.000Z',
    };
    const inputResult = (overrides: Partial<ReviewWorkspace> = {}): ReviewWorkspaceQuery => ({
      reviewWorkspace: { ...INPUT_WORKSPACE, ...overrides },
      dashboardMetrics: createEmptyDashboardMetrics(),
    });

    renderApp(
      [
        createWorkspaceMock(inputResult(), { exampleId: INPUT_EXAMPLE_ID }),
        createSaveDecisionMock({
          input: {
            mappingId: inputComponentMappingFixture.id,
            status: 'EDITED',
            reviewerLabel: 'Local reviewer',
            editedMapping: editedInputMapping,
          },
          decision: editedInputDecision,
        }),
        createWorkspaceMock(inputResult({ latestDecision: editedInputDecision }), {
          exampleId: INPUT_EXAMPLE_ID,
        }),
        createExportMock({
          input: { mappingId: inputComponentMappingFixture.id, format: 'HTML' },
          result: inputExport,
        }),
        createWorkspaceMock(
          inputResult({ latestDecision: editedInputDecision, exports: [inputExport] }),
          { exampleId: INPUT_EXAMPLE_ID },
        ),
      ],
      [inputExampleFixture],
    );

    expect(await screen.findByText(inputComponentIntentFixture.summary)).toBeInTheDocument();

    // Editing is disclosed on demand; the editor is rendered from the Input schema, which exposes a
    // "Required" control that Button lacks.
    await user.click(screen.getByRole('button', { name: 'Edit' }));
    expect(screen.getByLabelText('Label')).toBeInTheDocument();
    await user.click(screen.getByLabelText('Required'));
    await user.click(screen.getByRole('button', { name: 'Save changes' }));
    expect(await screen.findAllByText('EDITED')).not.toHaveLength(0);

    await user.click(screen.getByRole('tab', { name: 'Exports' }));
    await user.click(screen.getByRole('button', { name: 'HTML' }));

    expect(await screen.findByText(inputExport.content)).toBeInTheDocument();
  });

  it('accepts and exports the Card mapping with content slot language', async () => {
    const user = userEvent.setup();
    const acceptedCardDecision = createDecision('ACCEPTED', {
      id: 'decision.card.accepted',
      mappingId: cardComponentMappingFixture.id,
    });
    const cardExport: ExportResult = {
      id: 'export.card.accepted.html',
      mappingId: cardComponentMappingFixture.id,
      format: 'HTML',
      content: '<sl-card>Wireless headphones with 30-hour battery life.</sl-card>',
      createdAt: '2026-01-01T00:00:02.000Z',
    };
    const cardResult = (overrides: Partial<ReviewWorkspace> = {}): ReviewWorkspaceQuery => ({
      reviewWorkspace: { ...CARD_WORKSPACE, ...overrides },
      dashboardMetrics: createEmptyDashboardMetrics(),
    });

    renderApp(
      [
        createWorkspaceMock(POPULATED_RESULT),
        createWorkspaceMock(cardResult(), { exampleId: cardExampleFixture.id }),
        createSaveDecisionMock({
          input: {
            mappingId: cardComponentMappingFixture.id,
            status: 'ACCEPTED',
            reviewerLabel: 'Local reviewer',
          },
          decision: acceptedCardDecision,
        }),
        createWorkspaceMock(cardResult({ latestDecision: acceptedCardDecision }), {
          exampleId: cardExampleFixture.id,
        }),
        createExportMock({
          input: { mappingId: cardComponentMappingFixture.id, format: 'HTML' },
          result: cardExport,
        }),
        createWorkspaceMock(
          cardResult({ latestDecision: acceptedCardDecision, exports: [cardExport] }),
          { exampleId: cardExampleFixture.id },
        ),
      ],
      [cardExampleFixture],
    );

    expect(await screen.findByText(cardComponentIntentFixture.summary)).toBeInTheDocument();
    // The card's default slot is labeled "Content" in the recommended-mapping display.
    expect(screen.getByText('Content')).toBeInTheDocument();

    await user.click(screen.getByRole('button', { name: 'Accept' }));
    expect(await screen.findAllByText('ACCEPTED')).not.toHaveLength(0);

    await user.click(screen.getByRole('tab', { name: 'Exports' }));
    await user.click(screen.getByRole('button', { name: 'HTML' }));

    expect(await screen.findByText(cardExport.content)).toBeInTheDocument();
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

  it('exports accepted Button mappings as HTML, React, and Agent Brief', async () => {
    const user = userEvent.setup();
    const acceptedDecision = createDecision('ACCEPTED');
    const htmlExport: ExportResult = {
      ...htmlExportFixture,
      id: 'export.button.accepted.html',
      createdAt: '2026-01-01T00:00:02.000Z',
    };
    const reactExport: ExportResult = {
      id: 'export.button.accepted.react',
      mappingId: buttonComponentMappingFixture.id,
      format: 'REACT',
      content: '<SlButton variant="primary" size="medium">Save changes</SlButton>',
      createdAt: '2026-01-01T00:00:03.000Z',
    };
    const briefExport: ExportResult = {
      id: 'export.button.accepted.brief',
      mappingId: buttonComponentMappingFixture.id,
      format: 'AGENT_BRIEF',
      content: [
        `Mapping: ${buttonComponentMappingFixture.id}`,
        `Target: ${buttonComponentMappingFixture.targetLibrary} ${buttonComponentMappingFixture.targetComponent}`,
        `Confidence: ${buttonComponentMappingFixture.confidence}`,
        `Rationale: ${buttonComponentMappingFixture.rationale}`,
      ].join('\n'),
      createdAt: '2026-01-01T00:00:04.000Z',
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
        result: htmlExport,
      }),
      createWorkspaceMock(
        createWorkspaceResult({
          exports: [htmlExport],
          latestDecision: acceptedDecision,
          metrics: { acceptedMappings: 1, exportsCreated: 1 },
        }),
      ),
      createExportMock({
        input: {
          mappingId: buttonComponentMappingFixture.id,
          format: 'REACT',
        },
        result: reactExport,
      }),
      createWorkspaceMock(
        createWorkspaceResult({
          exports: [reactExport, htmlExport],
          latestDecision: acceptedDecision,
          metrics: { acceptedMappings: 1, exportsCreated: 2 },
        }),
      ),
      createExportMock({
        input: {
          mappingId: buttonComponentMappingFixture.id,
          format: 'AGENT_BRIEF',
        },
        result: briefExport,
      }),
      createWorkspaceMock(
        createWorkspaceResult({
          exports: [briefExport, reactExport, htmlExport],
          latestDecision: acceptedDecision,
          metrics: { acceptedMappings: 1, exportsCreated: 3 },
        }),
      ),
    ]);

    expect(await screen.findByText(buttonComponentIntentFixture.summary)).toBeInTheDocument();

    await user.click(screen.getByRole('tab', { name: 'Exports' }));
    await user.click(screen.getByRole('button', { name: 'HTML' }));
    expect(await screen.findByText(htmlExport.content)).toBeInTheDocument();

    await user.click(screen.getByRole('button', { name: 'React' }));
    expect(await screen.findByText(reactExport.content)).toBeInTheDocument();

    await user.click(screen.getByRole('button', { name: 'Agent Brief' }));
    expect(
      await screen.findByText(/Mapping: mapping\.button\.primary\.shoelace/),
    ).toBeInTheDocument();
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

    await user.click(screen.getByRole('button', { name: 'Edit' }));
    await user.clear(screen.getByLabelText('Label'));
    await user.type(screen.getByLabelText('Label'), 'Publish changes');
    await user.selectOptions(screen.getByLabelText('Variant'), 'warning');
    await user.selectOptions(screen.getByLabelText('Size'), 'large');
    await user.click(screen.getByLabelText('Disabled'));
    await user.click(screen.getByRole('button', { name: 'Save changes' }));
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

function renderApp(
  mocks: ReadonlyArray<MockedResponse>,
  examples: ExampleResult[] = DEFAULT_EXAMPLES,
): void {
  render(
    <MockedProvider mocks={[createExamplesMock(examples), ...mocks]} showWarnings={false}>
      <App />
    </MockedProvider>,
  );
}

function createExamplesMock(
  examples: ExampleResult[],
): MockedResponse<ExamplesQuery, Record<string, never>> {
  return {
    request: { query: EXAMPLES_QUERY, variables: {} },
    result: { data: { examples } },
  };
}

function createWorkspaceMock(
  resultOrError: ReviewWorkspaceQuery | Error,
  options: { delay?: number; exampleId?: string } = {},
): MockedResponse<ReviewWorkspaceQuery, ReviewWorkspaceQueryVariables> {
  const request = {
    query: REVIEW_WORKSPACE_QUERY,
    variables: { exampleId: options.exampleId ?? REVIEW_WORKSPACE_VARIABLES.exampleId },
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
