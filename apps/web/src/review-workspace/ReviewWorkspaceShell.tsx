import { useQuery } from '@apollo/client/react';
import {
  BUTTON_EXAMPLE_ID,
  createEmptyDashboardMetrics,
  type DashboardMetrics,
} from '@designrail/shared';
import type { KeyboardEvent, ReactElement } from 'react';
import { useRef, useState } from 'react';

import {
  REVIEW_WORKSPACE_QUERY,
  type ComplianceLedgerEntryResult,
  type ExampleResult,
  type ReviewWorkspace,
  type ReviewWorkspaceQuery,
  type ReviewWorkspaceQueryVariables,
} from '../graphql/operations.js';
import { Button } from '../ui/Button.js';
import { useTrackUiEvent } from '../use-track-ui-event.js';

import { ComplianceTimelinePanel } from './CompliancePanels.js';
import { DashboardPanel } from './DashboardPanel.js';
import { getDecisionStatus, summarizeExampleCompliance } from './decision-presentation.js';
import { ExportsPanel } from './ExportsPanel.js';
import { HistoryPanel } from './HistoryPanel.js';
import { BrandMark, EmptyLine, MetaTag, StatusBadge, StatusDot } from './primitives.js';
import { ReviewPanel } from './ReviewPanel.js';
import { SchemaPanel } from './SchemaPanel.js';
import { STATUS_TONES, cx, getToneTextClass } from './workspace-tones.js';
import { EmptyWorkspace, ErrorWorkspace, LoadingWorkspace } from './WorkspaceStates.js';

const TABS = ['Dashboard', 'Compliance', 'Review', 'History', 'Exports', 'Schema'] as const;

export type WorkspaceTab = (typeof TABS)[number];

const EMPTY_METRICS = createEmptyDashboardMetrics();
const EMPTY_COMPLIANCE_LEDGER: ComplianceLedgerEntryResult[] = [];

const TAB_KEYBOARD_TARGETS: Record<WorkspaceTab, { previous: WorkspaceTab; next: WorkspaceTab }> = {
  Dashboard: { previous: 'Schema', next: 'Compliance' },
  Compliance: { previous: 'Dashboard', next: 'Review' },
  Review: { previous: 'Compliance', next: 'History' },
  History: { previous: 'Review', next: 'Exports' },
  Exports: { previous: 'History', next: 'Schema' },
  Schema: { previous: 'Exports', next: 'Dashboard' },
};

export interface ReviewWorkspaceShellProps {
  exampleId: string;
  examples?: ExampleResult[];
  selectedExampleId?: string;
  onSelectExample?: (exampleId: string) => void;
  /** Controlled active tab (e.g. mirrored from the URL); omit for internal tab state. */
  activeTab?: WorkspaceTab;
  onSelectTab?: (tab: WorkspaceTab) => void;
}

export function ReviewWorkspaceShell({
  exampleId,
  examples = [],
  selectedExampleId = exampleId,
  onSelectExample,
  activeTab: controlledTab,
  onSelectTab,
}: ReviewWorkspaceShellProps): ReactElement {
  const [internalTab, setInternalTab] = useState<WorkspaceTab>('Review');
  const activeTab = controlledTab ?? internalTab;
  const [isMobileNavOpen, setIsMobileNavOpen] = useState(false);
  const tabButtonRefs = useRef<Record<WorkspaceTab, HTMLButtonElement | null>>({
    Dashboard: null,
    Compliance: null,
    Review: null,
    History: null,
    Exports: null,
    Schema: null,
  });
  const tabPanelRef = useRef<HTMLDivElement | null>(null);
  const trackUiEvent = useTrackUiEvent();
  const { data, error, loading, refetch } = useQuery<
    ReviewWorkspaceQuery,
    ReviewWorkspaceQueryVariables
  >(REVIEW_WORKSPACE_QUERY, {
    variables: { exampleId },
  });

  const workspace = data?.reviewWorkspace ?? null;
  const metrics = data?.dashboardMetrics ?? EMPTY_METRICS;
  const complianceLedger = data?.complianceLedger ?? EMPTY_COMPLIANCE_LEDGER;
  const decisionStatus = workspace === null ? null : getDecisionStatus(workspace.latestDecision);
  const decisionTone = decisionStatus === null ? 'neutral' : STATUS_TONES[decisionStatus];
  const decisionLabel = decisionStatus ?? (loading ? 'Loading' : 'Unavailable');
  const shellTitle = workspace?.example.name ?? 'Workspace';
  const headerExampleId = workspace?.example.id ?? exampleId;
  const tabPanelId = getTabPanelId(activeTab);
  const workspaceBody = renderWorkspaceBody({
    activeTab,
    complianceLedger,
    errorMessage: error?.message,
    exampleId,
    loading,
    metrics,
    onRetry: () => {
      trackUiEvent('ui.workspace_retried', { exampleId });
      void refetch();
    },
    workspace,
  });

  function setActiveTab(tab: WorkspaceTab): void {
    onSelectTab?.(tab);

    if (controlledTab === undefined) {
      setInternalTab(tab);
    }
  }

  function selectTab(tab: WorkspaceTab): void {
    setActiveTab(tab);
    tabButtonRefs.current[tab]?.focus();
  }

  // Activating a tab from the open mobile menu hides the tab button itself, so the menu
  // closes and focus moves to the panel instead of being dropped on <body>. On desktop the
  // rail is persistent and standard tab focus behavior applies.
  function activateTab(tab: WorkspaceTab): void {
    if (isMobileNavOpen) {
      setActiveTab(tab);
      setIsMobileNavOpen(false);
      tabPanelRef.current?.focus();
      return;
    }

    selectTab(tab);
  }

  function selectExample(nextExampleId: string): void {
    onSelectExample?.(nextExampleId);
    setIsMobileNavOpen(false);
  }

  function handleTabKeyDown(event: KeyboardEvent<HTMLButtonElement>, tab: WorkspaceTab): void {
    const nextTab = getKeyboardTargetTab(event.key, tab);

    if (nextTab === null) {
      return;
    }

    event.preventDefault();
    selectTab(nextTab);
  }

  function loadDemoScenario(): void {
    onSelectExample?.(BUTTON_EXAMPLE_ID);
    setActiveTab('Review');
  }

  return (
    <main className="min-h-screen bg-dr-canvas font-ui text-dr-body text-dr-text">
      <a
        className="sr-only focus:not-sr-only focus:absolute focus:left-dr-sm focus:top-dr-sm focus:z-50 focus:rounded-dr-sm focus:border focus:border-dr-border-strong focus:bg-dr-panel-raised focus:px-dr-md focus:py-dr-xs focus:text-dr-small focus:font-medium focus:text-dr-text focus:outline focus:outline-2"
        href="#workspace-content"
      >
        Skip to review content
      </a>
      <div className="grid lg:grid-cols-[17rem_minmax(0,1fr)]">
        <aside className="border-b border-dr-border bg-dr-shell lg:min-h-screen lg:border-b-0 lg:border-r">
          <div className="flex flex-col gap-dr-md p-dr-md lg:h-full lg:p-dr-lg">
            <div className="flex items-center justify-between gap-dr-sm">
              <div className="flex min-w-0 items-center gap-dr-sm">
                <BrandMark />
                <div className="min-w-0">
                  <p className="text-dr-caption font-medium text-dr-subtle">DesignRail</p>
                  <p className="text-dr-section-title font-semibold text-dr-text">Review Console</p>
                </div>
              </div>
              <div className="flex shrink-0 items-center gap-dr-xs">
                <MetaTag label="Mock mode" tone="info" />
                <button
                  aria-controls="workspace-navigation"
                  aria-expanded={isMobileNavOpen}
                  className="rounded-dr-xs border border-dr-border px-dr-sm py-dr-xs text-dr-caption font-medium text-dr-muted transition-colors hover:bg-dr-panel hover:text-dr-text focus-visible:outline focus-visible:outline-2 active:bg-dr-panel-hover lg:hidden"
                  onClick={() => setIsMobileNavOpen((open) => !open)}
                  type="button"
                >
                  Menu
                </button>
              </div>
            </div>

            <div
              className={cx('flex-col gap-dr-md', isMobileNavOpen ? 'flex' : 'hidden lg:flex')}
              id="workspace-navigation"
            >
              <nav aria-label="Workspace areas" className="grid gap-dr-xxs" role="tablist">
                {TABS.map((tab) => (
                  <button
                    aria-controls={activeTab === tab ? getTabPanelId(tab) : undefined}
                    aria-selected={activeTab === tab}
                    className={cx(
                      'rounded-dr-xs px-dr-sm py-dr-xs text-left text-dr-small font-medium transition-colors focus-visible:outline focus-visible:outline-2',
                      activeTab === tab
                        ? 'bg-dr-panel text-dr-text ring-1 ring-inset ring-dr-border'
                        : 'text-dr-muted hover:bg-dr-panel hover:text-dr-text',
                    )}
                    id={getTabId(tab)}
                    key={tab}
                    onClick={() => activateTab(tab)}
                    onKeyDown={(event) => handleTabKeyDown(event, tab)}
                    ref={(element) => {
                      tabButtonRefs.current[tab] = element;
                    }}
                    role="tab"
                    tabIndex={activeTab === tab ? 0 : -1}
                    type="button"
                  >
                    {tab}
                  </button>
                ))}
              </nav>

              <section aria-label="Examples" className="grid gap-dr-xs">
                <p className="text-dr-caption font-medium text-dr-subtle">Examples</p>
                {examples.length === 0 ? (
                  <EmptyLine text="No examples available." />
                ) : (
                  <ul className="grid gap-dr-xxs">
                    {examples.map((example) => {
                      const isSelected = example.id === selectedExampleId;

                      return (
                        <li key={example.id}>
                          <button
                            aria-current={isSelected}
                            className={cx(
                              'grid w-full grid-cols-[minmax(0,1fr)_auto] items-center gap-dr-sm rounded-dr-xs px-dr-sm py-dr-xs text-left transition-colors focus-visible:outline focus-visible:outline-2',
                              isSelected
                                ? 'bg-dr-panel text-dr-text ring-1 ring-inset ring-dr-border'
                                : 'text-dr-muted hover:bg-dr-panel-hover hover:text-dr-text',
                              example.status === 'READY' ? '' : 'opacity-60',
                            )}
                            disabled={onSelectExample === undefined || example.status !== 'READY'}
                            onClick={() => selectExample(example.id)}
                            type="button"
                          >
                            <span className="min-w-0">
                              <span className="block truncate text-dr-small font-semibold text-dr-text">
                                {example.name}
                              </span>
                              <span className="mt-dr-xxs flex min-w-0 items-center gap-dr-xs text-dr-caption text-dr-subtle">
                                <span className="truncate font-mono">{example.componentType}</span>
                                <span aria-hidden="true">·</span>
                                <span>{example.source}</span>
                              </span>
                            </span>
                            <span className="flex flex-col items-end gap-dr-xxs text-dr-caption">
                              {example.status === 'DISABLED' ? (
                                <span className="font-medium text-dr-subtle">Disabled</span>
                              ) : (
                                <span
                                  className={cx(
                                    'flex items-center gap-dr-xs font-medium',
                                    getToneTextClass(STATUS_TONES[example.latestDecisionStatus]),
                                  )}
                                >
                                  <StatusDot tone={STATUS_TONES[example.latestDecisionStatus]} />
                                  {example.latestDecisionStatus}
                                </span>
                              )}
                              <span
                                className={
                                  example.complianceSummary.blockers > 0
                                    ? 'text-dr-danger'
                                    : 'text-dr-subtle'
                                }
                              >
                                {summarizeExampleCompliance(example.complianceSummary)}
                              </span>
                            </span>
                          </button>
                        </li>
                      );
                    })}
                  </ul>
                )}
              </section>
            </div>
          </div>
        </aside>

        <section className="min-w-0 bg-dr-canvas">
          <header className="border-b border-dr-border bg-dr-shell px-dr-lg py-dr-md">
            <p className="text-dr-caption font-medium text-dr-subtle">Human review</p>
            <div className="mt-dr-xxs flex flex-wrap items-center gap-dr-sm">
              <h1 className="text-dr-page-title font-semibold text-dr-text">{shellTitle}</h1>
              <span className="flex min-w-0 flex-wrap items-center gap-dr-xs text-dr-caption text-dr-subtle">
                {workspace === null ? null : (
                  <>
                    <span className="font-mono text-dr-muted">
                      {workspace.example.componentType}
                    </span>
                    <span aria-hidden="true">·</span>
                    <span>{workspace.example.source}</span>
                    <span aria-hidden="true">·</span>
                  </>
                )}
                <span className="break-all font-mono">{headerExampleId}</span>
              </span>
              <span className="xl:ml-auto">
                <StatusBadge label={decisionLabel} tone={decisionTone} />
              </span>
            </div>
          </header>

          <DemoRibbon
            onLoadDemoScenario={onSelectExample === undefined ? undefined : loadDemoScenario}
          />

          <div className="grid gap-dr-md p-dr-lg" id="workspace-content" tabIndex={-1}>
            <div
              aria-labelledby={getTabId(activeTab)}
              id={tabPanelId}
              ref={tabPanelRef}
              role="tabpanel"
              tabIndex={0}
            >
              {workspaceBody}
            </div>
          </div>
        </section>
      </div>
    </main>
  );
}

const PIPELINE_STAGES = [
  'Mock Figma input',
  'Component intent',
  'Shoelace mapping',
  'Reviewer decision',
  'Gated export',
] as const;

interface DemoRibbonProps {
  onLoadDemoScenario: (() => void) | undefined;
}

function DemoRibbon({ onLoadDemoScenario }: DemoRibbonProps): ReactElement {
  return (
    <section
      aria-label="Demo path"
      className="flex flex-wrap items-center justify-between gap-x-dr-md gap-y-dr-xs border-b border-dr-border bg-dr-shell px-dr-lg py-dr-xs"
    >
      <p className="flex min-w-0 flex-wrap items-center gap-dr-xs text-dr-caption text-dr-subtle">
        {PIPELINE_STAGES.map((stage, index) => (
          <span className="flex items-center gap-dr-xs" key={stage}>
            {index > 0 ? <span aria-hidden="true">→</span> : null}
            <span>{stage}</span>
          </span>
        ))}
      </p>
      <Button
        className="shrink-0"
        disabled={onLoadDemoScenario === undefined}
        onClick={onLoadDemoScenario}
        size="sm"
        variant="ghost"
      >
        Load Button demo
      </Button>
    </section>
  );
}

interface WorkspaceTabPanelProps {
  activeTab: WorkspaceTab;
  complianceLedger: ComplianceLedgerEntryResult[];
  exampleId: string;
  metrics: DashboardMetrics;
  workspace: ReviewWorkspace;
}

interface RenderWorkspaceBodyInput {
  activeTab: WorkspaceTab;
  complianceLedger: ComplianceLedgerEntryResult[];
  errorMessage: string | undefined;
  exampleId: string;
  loading: boolean;
  metrics: DashboardMetrics;
  onRetry: () => void;
  workspace: ReviewWorkspace | null;
}

function renderWorkspaceBody({
  activeTab,
  complianceLedger,
  errorMessage,
  exampleId,
  loading,
  metrics,
  onRetry,
  workspace,
}: RenderWorkspaceBodyInput): ReactElement {
  if (loading) {
    return <LoadingWorkspace />;
  }

  if (errorMessage !== undefined) {
    return <ErrorWorkspace message={errorMessage} onRetry={onRetry} />;
  }

  if (workspace === null) {
    return <EmptyWorkspace exampleId={exampleId} />;
  }

  return (
    <WorkspaceTabPanel
      activeTab={activeTab}
      complianceLedger={complianceLedger}
      exampleId={exampleId}
      metrics={metrics}
      workspace={workspace}
    />
  );
}

function WorkspaceTabPanel({
  activeTab,
  complianceLedger,
  exampleId,
  metrics,
  workspace,
}: WorkspaceTabPanelProps): ReactElement {
  switch (activeTab) {
    case 'Dashboard':
      return <DashboardPanel metrics={metrics} workspace={workspace} />;
    case 'Compliance':
      return <ComplianceTimelinePanel entries={complianceLedger} />;
    case 'Review':
      // Remount the edit form whenever the underlying decision or mapping changes so
      // the draft re-initializes from server state without a state-syncing effect.
      return (
        <ReviewPanel
          exampleId={exampleId}
          key={workspace.latestDecision?.id ?? workspace.mapping?.id ?? 'no-mapping'}
          workspace={workspace}
        />
      );
    case 'History':
      return <HistoryPanel workspace={workspace} />;
    case 'Exports':
      return (
        <ExportsPanel
          exampleId={exampleId}
          exports={workspace.exports}
          latestDecision={workspace.latestDecision}
          mapping={workspace.mapping}
        />
      );
    case 'Schema':
      return <SchemaPanel workspace={workspace} />;
  }
}

function getTabId(tab: WorkspaceTab): string {
  return `workspace-tab-${tab.toLowerCase()}`;
}

function getTabPanelId(tab: WorkspaceTab): string {
  return `workspace-panel-${tab.toLowerCase()}`;
}

function getKeyboardTargetTab(key: string, currentTab: WorkspaceTab): WorkspaceTab | null {
  switch (key) {
    case 'ArrowLeft':
    case 'ArrowUp':
      return TAB_KEYBOARD_TARGETS[currentTab].previous;
    case 'ArrowRight':
    case 'ArrowDown':
      return TAB_KEYBOARD_TARGETS[currentTab].next;
    case 'Home':
      return 'Dashboard';
    case 'End':
      return 'Schema';
    default:
      return null;
  }
}
