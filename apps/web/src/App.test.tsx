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
  REVIEW_WORKSPACE_QUERY,
  type ReviewWorkspace,
  type ReviewWorkspaceQuery,
  type ReviewWorkspaceQueryVariables,
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
});

function renderApp(
  mocks: ReadonlyArray<MockedResponse<ReviewWorkspaceQuery, ReviewWorkspaceQueryVariables>>,
): void {
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
