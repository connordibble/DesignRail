import { useMutation, useQuery } from '@apollo/client/react';
import {
  getComponentSchema,
  getDefaultSlotLabel,
  listEditableProps,
  type ShoelaceComponentSchema,
  type ShoelaceProp,
} from '@designrail/schema';
import {
  BUTTON_EXAMPLE_ID,
  createEmptyDashboardMetrics,
  type DashboardMetrics,
  type ExportFormat,
  type JsonValue,
  type ReviewDecisionStatus,
} from '@designrail/shared';
import type { KeyboardEvent, ReactElement, ReactNode } from 'react';
import { useEffect, useRef, useState } from 'react';

import {
  EXPORT_MAPPING_MUTATION,
  REVIEW_WORKSPACE_QUERY,
  SAVE_REVIEW_DECISION_MUTATION,
  type ComplianceFindingResult,
  type ComplianceLedgerEntryResult,
  type ComponentMappingResult,
  type ExampleResult,
  type ExportMappingMutation,
  type ExportMappingMutationVariables,
  type ExportResult,
  type ReviewDecisionResult,
  type ReviewWorkspace,
  type ReviewWorkspaceQuery,
  type ReviewWorkspaceQueryVariables,
  type SaveReviewDecisionMutation,
  type SaveReviewDecisionMutationVariables,
} from '../graphql/operations.js';
import { Button } from '../ui/Button.js';

import { computeMappingDiff } from './mapping-diff.js';
import {
  MAPPING_CONFIDENCE_OPTIONS,
  canSaveMappingEdit,
  createMappingEditDraft,
  createSaveDecisionInput,
  type MappingEditDraft,
} from './mapping-edit.js';

const TABS = ['Dashboard', 'Compliance', 'Review', 'History', 'Exports', 'Schema'] as const;

type WorkspaceTab = (typeof TABS)[number];
type Tone = 'success' | 'warning' | 'danger' | 'info' | 'edited' | 'neutral';

const EMPTY_METRICS = createEmptyDashboardMetrics();
const EMPTY_COMPLIANCE_LEDGER: ComplianceLedgerEntryResult[] = [];

const STATUS_TONES: Record<ReviewDecisionStatus, Tone> = {
  ACCEPTED: 'success',
  EDITED: 'edited',
  PENDING: 'warning',
  REJECTED: 'danger',
};

const SEVERITY_TONES: Record<ComplianceFindingResult['severity'], Tone> = {
  BLOCKER: 'danger',
  WARNING: 'warning',
  INFO: 'info',
};

const TONE_CLASSES: Record<Tone, { text: string; bg: string }> = {
  success: { text: 'text-dr-success', bg: 'bg-dr-success' },
  warning: { text: 'text-dr-warning', bg: 'bg-dr-warning' },
  danger: { text: 'text-dr-danger', bg: 'bg-dr-danger' },
  info: { text: 'text-dr-info', bg: 'bg-dr-info' },
  edited: { text: 'text-dr-edited', bg: 'bg-dr-edited' },
  neutral: { text: 'text-dr-muted', bg: 'bg-dr-muted' },
};

const METRIC_ITEMS = [
  { key: 'acceptedMappings', label: 'Accepted' },
  { key: 'editedMappings', label: 'Edited' },
  { key: 'rejectedMappings', label: 'Rejected' },
  { key: 'pendingMappings', label: 'Pending' },
  { key: 'exportsCreated', label: 'Exports' },
] as const;

const TAB_KEYBOARD_TARGETS: Record<WorkspaceTab, { previous: WorkspaceTab; next: WorkspaceTab }> = {
  Dashboard: { previous: 'Schema', next: 'Compliance' },
  Compliance: { previous: 'Dashboard', next: 'Review' },
  Review: { previous: 'Compliance', next: 'History' },
  History: { previous: 'Review', next: 'Exports' },
  Exports: { previous: 'History', next: 'Schema' },
  Schema: { previous: 'Exports', next: 'Dashboard' },
};

const EXPORT_FORMAT_OPTIONS: Array<{ format: ExportFormat; label: string }> = [
  { format: 'HTML', label: 'HTML' },
  { format: 'REACT', label: 'React' },
  { format: 'AGENT_BRIEF', label: 'Agent Brief' },
];

const EXPORT_FORMAT_DESCRIPTIONS: Record<ExportFormat, string> = {
  HTML: 'Static markup for direct embedding.',
  REACT: 'JSX for a React implementation.',
  AGENT_BRIEF:
    'Structured, human-reviewed context for AI coding agents — carries the review decision and compliance findings so agents cannot bypass the human gate.',
};

export interface ReviewWorkspaceShellProps {
  exampleId: string;
  examples?: ExampleResult[];
  selectedExampleId?: string;
  onSelectExample?: (exampleId: string) => void;
}

export function ReviewWorkspaceShell({
  exampleId,
  examples = [],
  selectedExampleId = exampleId,
  onSelectExample,
}: ReviewWorkspaceShellProps): ReactElement {
  const [activeTab, setActiveTab] = useState<WorkspaceTab>('Review');
  const tabButtonRefs = useRef<Record<WorkspaceTab, HTMLButtonElement | null>>({
    Dashboard: null,
    Compliance: null,
    Review: null,
    History: null,
    Exports: null,
    Schema: null,
  });
  const { data, error, loading } = useQuery<ReviewWorkspaceQuery, ReviewWorkspaceQueryVariables>(
    REVIEW_WORKSPACE_QUERY,
    {
      variables: { exampleId },
    },
  );

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
    workspace,
  });

  function selectTab(tab: WorkspaceTab): void {
    setActiveTab(tab);
    tabButtonRefs.current[tab]?.focus();
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
      <div className="grid lg:grid-cols-[17rem_minmax(0,1fr)]">
        <aside className="border-b border-dr-border bg-dr-shell lg:min-h-screen lg:border-b-0 lg:border-r">
          <div className="flex h-full flex-col gap-dr-md p-dr-lg">
            <div className="flex items-start justify-between gap-dr-sm lg:block">
              <div className="flex min-w-0 items-start gap-dr-sm">
                <BrandMark />
                <div className="min-w-0">
                  <p className="text-dr-caption font-medium text-dr-subtle">DesignRail</p>
                  <p className="mt-dr-xxs text-dr-section-title font-semibold text-dr-text">
                    Review Console
                  </p>
                </div>
              </div>
              <span className="mt-dr-sm inline-flex lg:mt-dr-xs">
                <MetaTag label="Mock mode" tone="info" />
              </span>
            </div>

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
                  onClick={() => selectTab(tab)}
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
                          onClick={() => onSelectExample?.(example.id)}
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
                          <span className="flex flex-col items-end gap-dr-xxs">
                            {example.status === 'DISABLED' ? (
                              <MetaTag label="Disabled" tone="neutral" />
                            ) : (
                              <StatusBadge
                                label={example.latestDecisionStatus}
                                tone={STATUS_TONES[example.latestDecisionStatus]}
                              />
                            )}
                            <MetaTag
                              label={summarizeExampleCompliance(example.complianceSummary)}
                              tone={getExampleComplianceTone(example.complianceSummary)}
                            />
                          </span>
                        </button>
                      </li>
                    );
                  })}
                </ul>
              )}
            </section>
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

          <div className="grid gap-dr-md p-dr-lg">
            <DemoOrientation
              onLoadDemoScenario={onSelectExample === undefined ? undefined : loadDemoScenario}
            />
            <div aria-labelledby={getTabId(activeTab)} id={tabPanelId} role="tabpanel" tabIndex={0}>
              {workspaceBody}
            </div>
          </div>
        </section>
      </div>
    </main>
  );
}

interface DemoOrientationProps {
  onLoadDemoScenario: (() => void) | undefined;
}

function DemoOrientation({ onLoadDemoScenario }: DemoOrientationProps): ReactElement {
  return (
    <section
      aria-label="Demo path"
      className="grid gap-dr-sm rounded-dr-lg border border-dr-border bg-dr-panel px-dr-md py-dr-sm xl:grid-cols-[minmax(0,1fr)_auto] xl:items-center"
    >
      <div className="min-w-0">
        <p className="text-dr-caption font-medium text-dr-subtle">Demo path</p>
        <p className="mt-dr-xxs text-dr-section-title font-semibold text-dr-text">
          Review implementation proposals before export
        </p>
        <p className="mt-dr-xxs max-w-4xl text-dr-small text-dr-muted">
          Mock input becomes component intent, a Shoelace mapping, deterministic findings, and a
          human decision record. New exports unlock only after a reviewer accepts or edits the
          mapping.
        </p>
      </div>
      <div className="flex flex-wrap items-center gap-dr-xs">
        <MetaTag label="Mock fixtures" tone="info" />
        <Button
          className="shrink-0"
          disabled={onLoadDemoScenario === undefined}
          onClick={onLoadDemoScenario}
          size="sm"
          variant="primary"
        >
          Load Button demo
        </Button>
      </div>
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
  workspace: ReviewWorkspace | null;
}

function renderWorkspaceBody({
  activeTab,
  complianceLedger,
  errorMessage,
  exampleId,
  loading,
  metrics,
  workspace,
}: RenderWorkspaceBodyInput): ReactElement {
  if (loading) {
    return <LoadingWorkspace />;
  }

  if (errorMessage !== undefined) {
    return <ErrorWorkspace message={errorMessage} />;
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

interface WorkspacePanelProps {
  workspace: ReviewWorkspace;
}

function DashboardPanel({
  metrics,
  workspace,
}: WorkspacePanelProps & {
  metrics: DashboardMetrics;
}): ReactElement {
  return (
    <div className="grid gap-dr-md">
      <Panel title="Dashboard">
        <div className="grid gap-dr-xs sm:grid-cols-2 xl:grid-cols-5">
          {METRIC_ITEMS.map((item) => (
            <div
              className="rounded-dr-sm border border-dr-border bg-dr-panel-raised p-dr-sm"
              key={item.key}
            >
              <p className="text-dr-caption font-medium text-dr-subtle">{item.label}</p>
              <p className="mt-dr-xs text-dr-page-title font-semibold text-dr-text">
                {metrics[item.key]}
              </p>
            </div>
          ))}
        </div>
      </Panel>

      <div className="grid gap-dr-md xl:grid-cols-[minmax(0,1fr)_22rem]">
        <Panel title="Current Mapping">
          <DefinitionList
            items={[
              ['Example', workspace.example.name],
              ['Intent', workspace.intent?.summary ?? 'No intent recorded'],
              ['Target', workspace.mapping?.targetComponent ?? 'No mapping recorded'],
              ['Decision', getDecisionStatus(workspace.latestDecision)],
            ]}
          />
        </Panel>

        <Panel title="Warnings">
          {metrics.commonComplianceWarnings.length === 0 ? (
            <EmptyLine text="No recurring blocker or warning findings." />
          ) : (
            <div className="grid gap-dr-xs">
              {metrics.commonComplianceWarnings.map((warning) => (
                <div
                  className="rounded-dr-sm border border-dr-border bg-dr-panel-raised p-dr-sm"
                  key={warning.message}
                >
                  <p className="text-dr-small text-dr-text">{warning.message}</p>
                  <p className="mt-dr-xxs text-dr-caption text-dr-subtle">
                    {warning.count} matches
                  </p>
                </div>
              ))}
            </div>
          )}
        </Panel>
      </div>
    </div>
  );
}

interface ReviewPanelProps extends WorkspacePanelProps {
  exampleId: string;
}

function ReviewPanel({ exampleId, workspace }: ReviewPanelProps): ReactElement {
  const intent = workspace.intent;
  const mapping = workspace.mapping;
  const schema = intent === null ? null : getComponentSchema(intent.componentType);
  const decisionStatus = getDecisionStatus(workspace.latestDecision);
  const [draft, setDraft] = useState<MappingEditDraft | null>(() =>
    schema === null || mapping === null
      ? null
      : createMappingEditDraft(schema, mapping, workspace.latestDecision),
  );
  const [isEditing, setIsEditing] = useState(false);
  const [saveErrorMessage, setSaveErrorMessage] = useState<string | null>(null);
  const [saveReviewDecision, saveDecisionState] = useMutation<
    SaveReviewDecisionMutation,
    SaveReviewDecisionMutationVariables
  >(SAVE_REVIEW_DECISION_MUTATION);
  const isSavingDecision = saveDecisionState.loading;

  async function persistDecision(status: ReviewDecisionStatus): Promise<void> {
    if (schema === null || mapping === null || draft === null || isSavingDecision) {
      return;
    }

    const input = createSaveDecisionInput(schema, mapping.id, status, draft);

    setSaveErrorMessage(null);

    try {
      await saveReviewDecision({
        variables: { input },
        refetchQueries: [{ query: REVIEW_WORKSPACE_QUERY, variables: { exampleId } }],
        awaitRefetchQueries: true,
      });
    } catch (error) {
      setSaveErrorMessage(getErrorMessage(error));
    }
  }

  function cancelEdit(): void {
    setDraft(
      schema === null || mapping === null
        ? null
        : createMappingEditDraft(schema, mapping, workspace.latestDecision),
    );
    setSaveErrorMessage(null);
    setIsEditing(false);
  }

  return (
    <div className="grid gap-dr-lg">
      <div className="grid gap-dr-md xl:grid-cols-[minmax(0,1fr)_minmax(0,1.15fr)_20rem]">
        <Panel title="Source Intent">
          {intent === null ? (
            <EmptyLine text="No normalized component intent is available." />
          ) : (
            <div className="grid gap-dr-md">
              <p className="text-dr-body text-dr-text">{intent.summary}</p>
              <DefinitionList
                items={[
                  ['Component', intent.componentName],
                  ['Type', intent.componentType],
                  ['Source', intent.source],
                  ['Accessibility', intent.accessibility.label ?? 'No accessible label'],
                ]}
              />
              <PillGroup label="Variants" values={intent.variants} />
              <PillGroup label="States" values={intent.states} />
              <TokenList tokens={intent.tokenRefs} />
            </div>
          )}
        </Panel>

        <Panel title="Recommended Mapping">
          {mapping === null ? (
            <EmptyLine text="No Shoelace mapping is available." />
          ) : (
            <div className="grid gap-dr-md">
              <div className="flex flex-wrap items-center gap-dr-sm">
                <span className="font-mono text-dr-section-title text-dr-text">
                  {mapping.targetComponent}
                </span>
                <StatusBadge label={mapping.targetLibrary} tone="neutral" />
                <StatusBadge label={`${mapping.confidence} confidence`} tone="success" />
              </div>
              <DefinitionList items={buildMappingDisplayItems(mapping, schema)} />
              <CodeBlock label="mappedProps" value={formatJson(mapping.mappedProps)} />
              <p className="text-dr-small text-dr-muted">{mapping.rationale}</p>
            </div>
          )}
        </Panel>

        <aside className="xl:sticky xl:top-dr-lg xl:self-start">
          <Panel className="shadow-dr-sm" density="compact" title="Decision">
            <div className="grid gap-dr-md">
              <RailStatusRows
                complianceFindings={workspace.complianceFindings}
                decisionStatus={decisionStatus}
              />

              {schema === null || mapping === null || draft === null ? (
                <EmptyLine text="No schema-backed mapping is available for a review decision." />
              ) : isEditing ? (
                <MappingEditor
                  disabled={isSavingDecision}
                  draft={draft}
                  onCancel={cancelEdit}
                  onChange={setDraft}
                  onSave={() => persistDecision('EDITED')}
                  schema={schema}
                />
              ) : (
                <DecisionActions
                  disabled={isSavingDecision}
                  onAccept={() => persistDecision('ACCEPTED')}
                  onEdit={() => setIsEditing(true)}
                  onReject={() => persistDecision('REJECTED')}
                />
              )}

              {isSavingDecision ? (
                <p aria-live="polite" className="text-dr-small text-dr-subtle" role="status">
                  Saving review decision…
                </p>
              ) : null}
              {saveErrorMessage !== null ? (
                <InlineAlert message={saveErrorMessage} title="Decision failed" />
              ) : null}

              {workspace.latestDecision === null ? (
                <EmptyLine text="No decision saved." />
              ) : (
                <DefinitionList
                  items={[
                    ['Reviewer', workspace.latestDecision.reviewerLabel],
                    ['Saved', workspace.latestDecision.createdAt],
                    ['Notes', workspace.latestDecision.notes ?? 'No notes'],
                  ]}
                />
              )}
            </div>
          </Panel>
        </aside>
      </div>

      <ComplianceBand findings={workspace.complianceFindings} />
    </div>
  );
}

interface RailStatusRowsProps {
  complianceFindings: ComplianceFindingResult[];
  decisionStatus: ReviewDecisionStatus;
}

function RailStatusRows({ complianceFindings, decisionStatus }: RailStatusRowsProps): ReactElement {
  const decision = getDecisionSummary(decisionStatus);
  const exportGate = getExportGateSummary(decisionStatus);
  const compliance = getComplianceSummary(complianceFindings);

  return (
    <div className="grid gap-dr-sm">
      <div className="grid gap-dr-xxs">
        <div className="flex items-center gap-dr-xs">
          <StatusDot tone={decision.tone} />
          <p className={cx('text-dr-small font-semibold', getToneTextClass(decision.tone))}>
            {decision.label}
          </p>
        </div>
        <p className="text-dr-small text-dr-subtle">{decision.description}</p>
      </div>
      <dl className="grid gap-dr-xs border-t border-dr-border pt-dr-sm">
        <StatusRow label="Export" value={exportGate.label} tone={exportGate.tone} />
        <StatusRow label="Findings" value={compliance.label} tone={compliance.tone} />
      </dl>
    </div>
  );
}

interface StatusRowProps {
  label: string;
  value: string;
  tone: Tone;
}

function StatusRow({ label, value, tone }: StatusRowProps): ReactElement {
  return (
    <div className="grid grid-cols-[minmax(0,1fr)_auto] items-center gap-dr-sm">
      <dt className="text-dr-caption font-medium text-dr-subtle">{label}</dt>
      <dd
        className={cx(
          'flex items-center gap-dr-xs text-dr-small font-medium',
          getToneTextClass(tone),
        )}
      >
        <StatusDot tone={tone} />
        {value}
      </dd>
    </div>
  );
}

interface DecisionActionsProps {
  disabled: boolean;
  onAccept: () => void;
  onEdit: () => void;
  onReject: () => void;
}

function DecisionActions({
  disabled,
  onAccept,
  onEdit,
  onReject,
}: DecisionActionsProps): ReactElement {
  return (
    <div className="grid gap-dr-xs">
      <Button disabled={disabled} onClick={onAccept} variant="primary">
        Accept
      </Button>
      <div className="grid grid-cols-2 gap-dr-xs">
        <Button disabled={disabled} onClick={onEdit} variant="secondary">
          Edit
        </Button>
        <Button disabled={disabled} onClick={onReject} variant="danger">
          Reject
        </Button>
      </div>
    </div>
  );
}

interface MappingEditorProps {
  disabled: boolean;
  draft: MappingEditDraft;
  onCancel: () => void;
  onChange: (draft: MappingEditDraft) => void;
  onSave: () => void;
  schema: ShoelaceComponentSchema;
}

function MappingEditor({
  disabled,
  draft,
  onCancel,
  onChange,
  onSave,
  schema,
}: MappingEditorProps): ReactElement {
  const canSave = canSaveMappingEdit(draft);

  function updateProp(name: string, value: string | boolean): void {
    onChange({ ...draft, props: { ...draft.props, [name]: value } });
  }

  function updateField<TKey extends 'slotLabel' | 'confidence' | 'rationale' | 'notes'>(
    key: TKey,
    value: MappingEditDraft[TKey],
  ): void {
    onChange({ ...draft, [key]: value });
  }

  return (
    <div aria-label="Edit mapping" className="grid gap-dr-sm">
      <div className="grid gap-dr-sm">
        {draft.slotLabel === null ? null : (
          <TextField
            disabled={disabled}
            id="mapping-edit-slot-label"
            label={getDefaultSlotLabel(schema)}
            onChange={(value) => updateField('slotLabel', value)}
            value={draft.slotLabel}
          />
        )}
        {listEditableProps(schema).map((prop) => (
          <MappingPropField
            disabled={disabled}
            key={prop.name}
            onChange={(value) => updateProp(prop.name, value)}
            prop={prop}
            value={draft.props[prop.name] ?? (prop.kind === 'boolean' ? false : '')}
          />
        ))}
        <SelectField
          disabled={disabled}
          id="mapping-edit-confidence"
          label="Confidence"
          onChange={(value) => updateField('confidence', value)}
          options={MAPPING_CONFIDENCE_OPTIONS}
          value={draft.confidence}
        />
        <TextareaField
          disabled={disabled}
          id="mapping-edit-rationale"
          label="Rationale"
          onChange={(value) => updateField('rationale', value)}
          value={draft.rationale}
        />
        <TextareaField
          disabled={disabled}
          id="mapping-edit-notes"
          label="Notes"
          onChange={(value) => updateField('notes', value)}
          value={draft.notes}
        />
      </div>

      <div className="grid grid-cols-2 gap-dr-xs">
        <Button disabled={disabled || !canSave} onClick={onSave} variant="primary">
          Save changes
        </Button>
        <Button disabled={disabled} onClick={onCancel} variant="secondary">
          Cancel
        </Button>
      </div>
    </div>
  );
}

interface MappingPropFieldProps {
  disabled: boolean;
  onChange: (value: string | boolean) => void;
  prop: ShoelaceProp;
  value: string | boolean;
}

function MappingPropField({
  disabled,
  onChange,
  prop,
  value,
}: MappingPropFieldProps): ReactElement {
  const label = humanizeLabel(prop.name);
  const fieldId = `mapping-edit-${prop.name}`;

  if (prop.kind === 'boolean') {
    return (
      <label className="flex items-center justify-between gap-dr-sm py-dr-xxs text-dr-small text-dr-muted">
        {label}
        <input
          checked={typeof value === 'boolean' ? value : false}
          className="size-4 accent-dr-accent focus-visible:outline focus-visible:outline-2"
          disabled={disabled}
          name={fieldId}
          onChange={(event) => onChange(event.currentTarget.checked)}
          type="checkbox"
        />
      </label>
    );
  }

  if (prop.kind === 'enum' && prop.values !== undefined) {
    return (
      <SelectField
        disabled={disabled}
        id={fieldId}
        label={label}
        onChange={onChange}
        options={prop.values}
        value={typeof value === 'string' ? value : ''}
      />
    );
  }

  return (
    <TextField
      disabled={disabled}
      id={fieldId}
      label={label}
      onChange={onChange}
      value={typeof value === 'string' ? value : ''}
    />
  );
}

interface ComplianceTimelinePanelProps {
  entries: ComplianceLedgerEntryResult[];
}

interface ComplianceLedgerGroup {
  example: ComplianceLedgerEntryResult['example'];
  findings: ComplianceFindingResult[];
}

function ComplianceTimelinePanel({ entries }: ComplianceTimelinePanelProps): ReactElement {
  if (entries.length === 0) {
    return (
      <Panel title="Compliance Timeline">
        <EmptyLine text="No compliance findings recorded across any component." />
      </Panel>
    );
  }

  const groups = groupLedgerByExample(entries);

  return (
    <Panel title="Compliance Timeline">
      <p className="text-dr-caption text-dr-subtle">
        {summarizeFindings(entries.map((entry) => entry.finding))} across {groups.length}{' '}
        {groups.length === 1 ? 'component' : 'components'}
      </p>
      <div className="mt-dr-md grid gap-dr-md">
        {groups.map((group) => {
          const groupSummary = getComplianceSummary(group.findings);

          return (
            <section className="grid gap-dr-xs" key={group.example.id}>
              <div className="flex flex-wrap items-center gap-dr-sm">
                <span className="text-dr-section-title font-semibold text-dr-text">
                  {group.example.name}
                </span>
                <StatusBadge label={groupSummary.label} tone={groupSummary.tone} />
              </div>
              <ul className="divide-y divide-dr-border">
                {group.findings.map((finding) => (
                  <ComplianceFindingRow finding={finding} key={finding.id} />
                ))}
              </ul>
            </section>
          );
        })}
      </div>
    </Panel>
  );
}

/** Groups ledger entries by example, preserving the server's severity-first ordering: the first
 * example to appear (via its most severe finding) is the first group. */
function groupLedgerByExample(entries: ComplianceLedgerEntryResult[]): ComplianceLedgerGroup[] {
  const groups = new Map<string, ComplianceLedgerGroup>();

  for (const entry of entries) {
    const existing = groups.get(entry.example.id);

    if (existing === undefined) {
      groups.set(entry.example.id, { example: entry.example, findings: [entry.finding] });
    } else {
      existing.findings.push(entry.finding);
    }
  }

  return [...groups.values()];
}

interface ComplianceBandProps {
  findings: ComplianceFindingResult[];
}

const SEVERITY_ORDER: Record<ComplianceFindingResult['severity'], number> = {
  BLOCKER: 0,
  WARNING: 1,
  INFO: 2,
};

function ComplianceFindingRow({ finding }: { finding: ComplianceFindingResult }): ReactElement {
  return (
    <li className="flex flex-col gap-dr-xxs py-dr-sm sm:flex-row sm:items-start sm:gap-dr-md">
      <span className="flex flex-col gap-dr-xxs sm:w-48 sm:shrink-0">
        <span className="flex items-center gap-dr-xs">
          <StatusDot tone={SEVERITY_TONES[finding.severity]} />
          <span
            className={cx(
              'text-dr-caption font-semibold',
              getToneTextClass(SEVERITY_TONES[finding.severity]),
            )}
          >
            {finding.severity}
          </span>
        </span>
        <span className="break-words font-mono text-dr-caption text-dr-subtle">
          {finding.category}
        </span>
      </span>
      <span className="min-w-0 flex-1">
        <span className="block text-dr-small text-dr-text">{finding.message}</span>
        <span className="mt-dr-xxs block text-dr-small text-dr-muted">{finding.remediation}</span>
      </span>
      {finding.path ? (
        <span className="font-mono text-dr-caption text-dr-subtle sm:text-right">
          {finding.path}
        </span>
      ) : null}
    </li>
  );
}

function ComplianceBand({ findings }: ComplianceBandProps): ReactElement {
  if (findings.length === 0) {
    return (
      <Panel title="Compliance">
        <EmptyLine text="No compliance findings recorded." />
      </Panel>
    );
  }

  const ordered = [...findings].sort(
    (left, right) =>
      SEVERITY_ORDER[left.severity] - SEVERITY_ORDER[right.severity] ||
      left.id.localeCompare(right.id),
  );

  return (
    <Panel title="Compliance">
      <p className="text-dr-caption text-dr-subtle">{summarizeFindings(findings)}</p>
      <ul className="mt-dr-sm divide-y divide-dr-border">
        {ordered.map((finding) => (
          <ComplianceFindingRow finding={finding} key={finding.id} />
        ))}
      </ul>
    </Panel>
  );
}

function summarizeFindings(findings: ComplianceFindingResult[]): string {
  const counts = countFindings(findings);

  const parts: string[] = [];
  if (counts.BLOCKER > 0) {
    parts.push(`${counts.BLOCKER} blocking`);
  }
  if (counts.WARNING > 0) {
    parts.push(`${counts.WARNING} ${counts.WARNING === 1 ? 'warning' : 'warnings'}`);
  }
  if (counts.INFO > 0) {
    parts.push(`${counts.INFO} informational`);
  }

  return parts.join(' · ');
}

function countFindings(
  findings: ComplianceFindingResult[],
): Record<ComplianceFindingResult['severity'], number> {
  const counts = { BLOCKER: 0, WARNING: 0, INFO: 0 };
  for (const finding of findings) {
    counts[finding.severity] += 1;
  }

  return counts;
}

function getComplianceSummary(findings: ComplianceFindingResult[]): { label: string; tone: Tone } {
  const counts = countFindings(findings);

  if (counts.BLOCKER > 0) {
    return {
      label: `${counts.BLOCKER} ${counts.BLOCKER === 1 ? 'blocker' : 'blockers'}`,
      tone: 'danger',
    };
  }

  if (counts.WARNING > 0) {
    return {
      label: `${counts.WARNING} ${counts.WARNING === 1 ? 'warning' : 'warnings'}`,
      tone: 'warning',
    };
  }

  if (counts.INFO > 0) {
    return { label: `${counts.INFO} informational`, tone: 'info' };
  }

  return { label: 'Clear', tone: 'success' };
}

function summarizeExampleCompliance(summary: ExampleResult['complianceSummary']): string {
  if (summary.blockers > 0) {
    return `${summary.blockers} ${summary.blockers === 1 ? 'blocker' : 'blockers'}`;
  }

  if (summary.warnings > 0) {
    return `${summary.warnings} ${summary.warnings === 1 ? 'warning' : 'warnings'}`;
  }

  if (summary.info > 0) {
    return `${summary.info} info`;
  }

  return 'Clear';
}

function getExampleComplianceTone(summary: ExampleResult['complianceSummary']): Tone {
  if (summary.blockers > 0) {
    return 'danger';
  }

  if (summary.warnings > 0) {
    return 'warning';
  }

  if (summary.info > 0) {
    return 'info';
  }

  return 'success';
}

function getDecisionSummary(status: ReviewDecisionStatus): {
  description: string;
  label: string;
  tone: Tone;
} {
  switch (status) {
    case 'ACCEPTED':
      return {
        description: 'The recommended mapping is approved and ready to export.',
        label: 'Accepted by reviewer',
        tone: 'success',
      };
    case 'EDITED':
      return {
        description: 'Human edits are saved and ready to export.',
        label: 'Edited by reviewer',
        tone: 'edited',
      };
    case 'PENDING':
      return {
        description: 'Accept, edit, or reject this mapping before export.',
        label: 'Pending review',
        tone: 'warning',
      };
    case 'REJECTED':
      return {
        description: 'The mapping was rejected and export is unavailable.',
        label: 'Rejected by reviewer',
        tone: 'danger',
      };
  }
}

function getExportGateSummary(status: ReviewDecisionStatus): { label: string; tone: Tone } {
  switch (status) {
    case 'ACCEPTED':
    case 'EDITED':
      return { label: 'Ready', tone: 'success' };
    case 'REJECTED':
      return { label: 'Locked', tone: 'danger' };
    case 'PENDING':
      return { label: 'Locked', tone: 'warning' };
  }
}

interface CopyButtonProps {
  label: string;
  value: string;
}

type CopyStatus = 'idle' | 'copied' | 'failed';

function CopyButton({ label, value }: CopyButtonProps): ReactElement {
  const [status, setStatus] = useState<CopyStatus>('idle');

  useEffect(() => {
    if (status === 'idle') {
      return;
    }

    const timeoutId = setTimeout(() => setStatus('idle'), 2000);

    return () => clearTimeout(timeoutId);
  }, [status]);

  async function handleCopy(): Promise<void> {
    try {
      await navigator.clipboard.writeText(value);
      setStatus('copied');
    } catch {
      // Clipboard access can be denied by the browser; content remains manually selectable.
      setStatus('failed');
    }
  }

  return (
    <button
      aria-label={label}
      className="shrink-0 text-dr-caption font-medium text-dr-accent"
      onClick={handleCopy}
      type="button"
    >
      {status === 'copied' ? 'Copied' : status === 'failed' ? 'Copy failed' : 'Copy'}
    </button>
  );
}

interface ExportsPanelProps {
  exampleId: string;
  exports: ExportResult[];
  latestDecision: ReviewDecisionResult | null;
  mapping: ComponentMappingResult | null;
}

function ExportsPanel({
  exampleId,
  exports,
  latestDecision,
  mapping,
}: ExportsPanelProps): ReactElement {
  const status = getDecisionStatus(latestDecision);
  const canExport = status === 'ACCEPTED' || status === 'EDITED';
  const hasHistoricalExports = !canExport && exports.length > 0;
  const [pendingExportFormat, setPendingExportFormat] = useState<ExportFormat | null>(null);
  const [exportErrorMessage, setExportErrorMessage] = useState<string | null>(null);
  const [exportMapping, exportMappingState] = useMutation<
    ExportMappingMutation,
    ExportMappingMutationVariables
  >(EXPORT_MAPPING_MUTATION);
  const isExporting = exportMappingState.loading;

  async function createMappingExport(format: ExportFormat): Promise<void> {
    if (mapping === null || !canExport || isExporting) {
      return;
    }

    setPendingExportFormat(format);
    setExportErrorMessage(null);

    try {
      await exportMapping({
        variables: {
          input: {
            mappingId: mapping.id,
            format,
          },
        },
        refetchQueries: [{ query: REVIEW_WORKSPACE_QUERY, variables: { exampleId } }],
        awaitRefetchQueries: true,
      });
    } catch (error) {
      setExportErrorMessage(getErrorMessage(error));
    } finally {
      setPendingExportFormat(null);
    }
  }

  return (
    <div className="grid gap-dr-md xl:grid-cols-[22rem_minmax(0,1fr)]">
      <Panel title="Export Gate">
        <div className="grid gap-dr-sm">
          <div className="flex items-center justify-between gap-dr-sm">
            <span className="text-dr-small text-dr-muted">Decision</span>
            <StatusBadge label={status} tone={STATUS_TONES[status]} />
          </div>
          <div className="flex items-center justify-between gap-dr-sm">
            <span className="text-dr-small text-dr-muted">Gate</span>
            <StatusBadge
              label={canExport ? 'READY' : 'LOCKED'}
              tone={canExport ? 'success' : 'warning'}
            />
          </div>
          <div className="grid grid-cols-3 gap-dr-xs">
            {EXPORT_FORMAT_OPTIONS.map((option) => (
              <Button
                disabled={!canExport || mapping === null || isExporting}
                key={option.format}
                onClick={() => createMappingExport(option.format)}
                size="sm"
                variant="secondary"
              >
                {pendingExportFormat === option.format ? 'Exporting…' : option.label}
              </Button>
            ))}
          </div>
          {exportErrorMessage !== null ? (
            <InlineAlert message={exportErrorMessage} title="Export failed" />
          ) : null}
        </div>
      </Panel>

      <Panel title="Export History">
        {exports.length === 0 ? (
          <EmptyLine text="No exports have been generated." />
        ) : (
          <div className="grid min-w-0 gap-dr-sm">
            {hasHistoricalExports ? (
              <InlineNotice
                message="The latest decision locks new exports. Existing output is retained for audit history and should not be treated as export-ready."
                title="Historical exports retained"
                tone="warning"
              />
            ) : null}
            {exports.map((exportResult) => (
              <article
                className="min-w-0 overflow-hidden rounded-dr-sm border border-dr-border bg-dr-panel-raised"
                key={exportResult.id}
              >
                <div className="grid min-w-0 gap-dr-xs border-b border-dr-border px-dr-sm py-dr-xs sm:grid-cols-[auto_minmax(0,1fr)_auto] sm:items-center">
                  <StatusBadge label={exportResult.format} tone="neutral" />
                  <span className="min-w-0 break-all font-mono text-dr-caption text-dr-subtle sm:text-right">
                    {exportResult.createdAt}
                  </span>
                  <CopyButton
                    label={`Copy ${exportResult.format} export content`}
                    value={exportResult.content}
                  />
                </div>
                <p className="border-b border-dr-border px-dr-sm py-dr-xs text-dr-caption text-dr-subtle">
                  {EXPORT_FORMAT_DESCRIPTIONS[exportResult.format]}
                </p>
                <pre
                  aria-label={`${exportResult.format} export content`}
                  className="max-w-full overflow-x-auto overscroll-x-contain p-dr-sm font-mono text-dr-code text-dr-text"
                  tabIndex={0}
                >
                  {exportResult.content}
                </pre>
              </article>
            ))}
          </div>
        )}
      </Panel>
    </div>
  );
}

function HistoryPanel({ workspace }: WorkspacePanelProps): ReactElement {
  const intent = workspace.intent;
  const mapping = workspace.mapping;
  const schema = intent === null ? null : getComponentSchema(intent.componentType);
  const history = workspace.decisionHistory;

  return (
    <Panel title="Decision History">
      {history.length === 0 ? (
        <EmptyLine text="No review decisions have been recorded for this mapping yet." />
      ) : (
        <ol className="divide-y divide-dr-border">
          {history.map((decision) => (
            <HistoryEntry decision={decision} key={decision.id} mapping={mapping} schema={schema} />
          ))}
        </ol>
      )}
    </Panel>
  );
}

interface HistoryEntryProps {
  decision: ReviewDecisionResult;
  mapping: ComponentMappingResult | null;
  schema: ShoelaceComponentSchema | null;
}

function HistoryEntry({ decision, mapping, schema }: HistoryEntryProps): ReactElement {
  const [isDiffOpen, setIsDiffOpen] = useState(false);
  const summary = getDecisionSummary(decision.status);
  const canShowDiff = decision.status === 'EDITED' && decision.editedMapping !== null;

  return (
    <li className="grid gap-dr-xs py-dr-sm">
      <div className="flex flex-wrap items-center gap-dr-sm">
        <StatusBadge label={decision.status} tone={STATUS_TONES[decision.status]} />
        <span className="text-dr-small text-dr-text">{decision.reviewerLabel}</span>
        <span className="ml-auto break-all font-mono text-dr-caption text-dr-subtle">
          {decision.createdAt}
        </span>
      </div>
      <p className="text-dr-small text-dr-muted">{summary.description}</p>
      {decision.notes === null ? null : (
        <p className="text-dr-small text-dr-muted">{decision.notes}</p>
      )}
      {canShowDiff ? (
        <>
          <button
            aria-expanded={isDiffOpen}
            className="justify-self-start text-dr-small font-medium text-dr-accent"
            onClick={() => setIsDiffOpen((open) => !open)}
            type="button"
          >
            {isDiffOpen ? 'Hide diff' : 'View diff'}
          </button>
          {isDiffOpen ? (
            schema === null || mapping === null || decision.editedMapping === null ? (
              <EmptyLine text="No schema-backed mapping is available to diff against." />
            ) : (
              <MappingDiff
                editedMapping={decision.editedMapping}
                recommendedMapping={mapping}
                schema={schema}
              />
            )
          ) : null}
        </>
      ) : null}
    </li>
  );
}

interface MappingDiffProps {
  editedMapping: NonNullable<ReviewDecisionResult['editedMapping']>;
  recommendedMapping: ComponentMappingResult;
  schema: ShoelaceComponentSchema;
}

function MappingDiff({
  editedMapping,
  recommendedMapping,
  schema,
}: MappingDiffProps): ReactElement {
  const rows = computeMappingDiff(schema, recommendedMapping, editedMapping);

  return (
    <div className="overflow-x-auto overscroll-x-contain rounded-dr-sm border border-dr-border">
      <table
        aria-label="Mapping diff"
        className="w-full min-w-[32rem] border-collapse text-dr-small"
      >
        <thead>
          <tr className="border-b border-dr-border bg-dr-panel-raised text-dr-caption font-medium text-dr-subtle">
            <th className="px-dr-sm py-dr-xs text-left">Field</th>
            <th className="px-dr-sm py-dr-xs text-left">Recommended</th>
            <th className="px-dr-sm py-dr-xs text-left">Edited</th>
          </tr>
        </thead>
        <tbody className="divide-y divide-dr-border">
          {rows.map((row) => (
            <tr key={row.key}>
              <td className="px-dr-sm py-dr-xs font-medium text-dr-subtle">{row.label}</td>
              <td className="px-dr-sm py-dr-xs font-mono text-dr-muted">{row.recommendedValue}</td>
              <td
                className={cx(
                  'px-dr-sm py-dr-xs font-mono',
                  row.changed ? getToneTextClass('edited') : 'text-dr-muted',
                )}
              >
                <span className="flex items-center gap-dr-xs">
                  {row.changed ? <StatusDot tone="edited" /> : null}
                  {row.editedValue}
                </span>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

function SchemaPanel({ workspace }: WorkspacePanelProps): ReactElement {
  const intent = workspace.intent;
  const mapping = workspace.mapping;

  return (
    <div className="grid gap-dr-md xl:grid-cols-2">
      <Panel title="Intent Contract">
        {intent === null ? (
          <EmptyLine text="No intent contract data is available." />
        ) : (
          <div className="grid gap-dr-sm">
            <DefinitionList
              items={[
                ['componentName', intent.componentName],
                ['componentType', intent.componentType],
                ['props', Object.keys(intent.props).join(', ')],
                ['states', intent.states.join(', ')],
                ['sourceRefs', String(intent.sourceRefs.length)],
              ]}
            />
            <CodeBlock label="props" value={formatJson(intent.props)} />
          </div>
        )}
      </Panel>

      <Panel title="Shoelace Contract">
        {mapping === null ? (
          <EmptyLine text="No mapping contract data is available." />
        ) : (
          <div className="grid gap-dr-sm">
            <DefinitionList
              items={[
                ['targetComponent', mapping.targetComponent],
                ['mappedProps', Object.keys(mapping.mappedProps).join(', ')],
                ['mappedEvents', Object.keys(mapping.mappedEvents).join(', ')],
                ['mappedSlots', Object.keys(mapping.mappedSlots).join(', ')],
                ['mappedTokens', String(mapping.mappedTokens.length)],
              ]}
            />
            <CodeBlock label="mappedSlots" value={formatJson(mapping.mappedSlots)} />
          </div>
        )}
      </Panel>
    </div>
  );
}

function LoadingWorkspace(): ReactElement {
  return (
    <div aria-live="polite" className="grid gap-dr-md" role="status">
      <Panel title="Loading">
        <div className="grid gap-dr-sm">
          <div className="h-4 w-48 rounded-dr-sm bg-dr-panel-raised" />
          <div className="h-20 rounded-dr-sm bg-dr-panel-raised" />
          <div className="h-20 rounded-dr-sm bg-dr-panel-raised" />
        </div>
      </Panel>
    </div>
  );
}

interface ErrorWorkspaceProps {
  message: string;
}

function ErrorWorkspace({ message }: ErrorWorkspaceProps): ReactElement {
  return (
    <div className="rounded-dr-md border border-dr-danger bg-dr-panel p-dr-md" role="alert">
      <p className="text-dr-section-title font-semibold text-dr-danger">Workspace failed</p>
      <p className="mt-dr-xs text-dr-small text-dr-muted">{message}</p>
    </div>
  );
}

interface EmptyWorkspaceProps {
  exampleId: string;
}

function EmptyWorkspace({ exampleId }: EmptyWorkspaceProps): ReactElement {
  return (
    <div className="rounded-dr-md border border-dr-border bg-dr-panel p-dr-md">
      <p className="text-dr-section-title font-semibold text-dr-text">No workspace found</p>
      <p className="mt-dr-xs font-mono text-dr-caption text-dr-subtle">{exampleId}</p>
    </div>
  );
}

interface InlineAlertProps {
  message: string;
  title: string;
}

function InlineAlert({ message, title }: InlineAlertProps): ReactElement {
  return (
    <div className="rounded-dr-sm border border-dr-danger bg-dr-panel-raised p-dr-sm" role="alert">
      <p className="text-dr-caption font-semibold text-dr-danger">{title}</p>
      <p className="mt-dr-xxs text-dr-small text-dr-muted">{message}</p>
    </div>
  );
}

interface InlineNoticeProps {
  message: string;
  title: string;
  tone: Tone;
}

function InlineNotice({ message, title, tone }: InlineNoticeProps): ReactElement {
  return (
    <div className="rounded-dr-sm border border-dr-border bg-dr-panel-raised p-dr-sm">
      <p className={cx('text-dr-caption font-semibold', getToneTextClass(tone))}>{title}</p>
      <p className="mt-dr-xxs text-dr-small text-dr-muted">{message}</p>
    </div>
  );
}

interface PanelProps {
  children: ReactNode;
  title: string;
  className?: string;
  density?: 'regular' | 'compact';
}

function Panel({ children, title, className, density = 'regular' }: PanelProps): ReactElement {
  const isCompact = density === 'compact';

  return (
    <section className={cx('min-w-0 rounded-dr-lg border border-dr-border bg-dr-panel', className)}>
      <div
        className={cx(
          'border-b border-dr-border',
          isCompact ? 'px-dr-sm py-dr-xs' : 'px-dr-md py-dr-sm',
        )}
      >
        <h2
          className={cx(
            'font-semibold text-dr-text',
            isCompact ? 'text-dr-small' : 'text-dr-section-title',
          )}
        >
          {title}
        </h2>
      </div>
      <div className={isCompact ? 'p-dr-sm' : 'p-dr-md'}>{children}</div>
    </section>
  );
}

interface TextFieldProps {
  disabled: boolean;
  id: string;
  label: string;
  onChange: (value: string) => void;
  value: string;
}

function TextField({ disabled, id, label, onChange, value }: TextFieldProps): ReactElement {
  return (
    <label className="grid gap-dr-xxs text-dr-caption font-medium text-dr-subtle" htmlFor={id}>
      {label}
      <input
        autoComplete="off"
        className="rounded-dr-sm border border-dr-border bg-dr-panel-raised px-dr-sm py-dr-xs font-ui text-dr-small font-normal text-dr-text focus-visible:outline focus-visible:outline-2 disabled:cursor-not-allowed disabled:opacity-60"
        disabled={disabled}
        id={id}
        name={id}
        onChange={(event) => onChange(event.currentTarget.value)}
        value={value}
      />
    </label>
  );
}

interface SelectFieldProps<TValue extends string> {
  disabled: boolean;
  id: string;
  label: string;
  onChange: (value: TValue) => void;
  options: readonly TValue[];
  value: TValue;
}

function SelectField<TValue extends string>({
  disabled,
  id,
  label,
  onChange,
  options,
  value,
}: SelectFieldProps<TValue>): ReactElement {
  return (
    <label className="grid gap-dr-xxs text-dr-caption font-medium text-dr-subtle" htmlFor={id}>
      {label}
      <select
        autoComplete="off"
        className="rounded-dr-sm border border-dr-border bg-dr-panel-raised px-dr-sm py-dr-xs font-ui text-dr-small font-normal text-dr-text focus-visible:outline focus-visible:outline-2 disabled:cursor-not-allowed disabled:opacity-60"
        disabled={disabled}
        id={id}
        name={id}
        onChange={(event) => onChange(event.currentTarget.value as TValue)}
        value={value}
      >
        {options.map((option) => (
          <option key={option} value={option}>
            {option}
          </option>
        ))}
      </select>
    </label>
  );
}

interface TextareaFieldProps {
  disabled: boolean;
  id: string;
  label: string;
  onChange: (value: string) => void;
  value: string;
}

function TextareaField({ disabled, id, label, onChange, value }: TextareaFieldProps): ReactElement {
  return (
    <label className="grid gap-dr-xxs text-dr-caption font-medium text-dr-subtle" htmlFor={id}>
      {label}
      <textarea
        autoComplete="off"
        className="min-h-20 resize-y rounded-dr-sm border border-dr-border bg-dr-panel-raised px-dr-sm py-dr-xs font-ui text-dr-small font-normal text-dr-text focus-visible:outline focus-visible:outline-2 disabled:cursor-not-allowed disabled:opacity-60"
        disabled={disabled}
        id={id}
        name={id}
        onChange={(event) => onChange(event.currentTarget.value)}
        value={value}
      />
    </label>
  );
}

interface DefinitionListProps {
  items: Array<[string, string]>;
}

function DefinitionList({ items }: DefinitionListProps): ReactElement {
  return (
    <dl className="grid gap-dr-xs">
      {items.map(([label, value]) => (
        <div className="grid gap-dr-xxs sm:grid-cols-[9rem_minmax(0,1fr)]" key={label}>
          <dt className="text-dr-caption font-medium text-dr-subtle">{label}</dt>
          <dd className="min-w-0 break-words font-mono text-dr-caption text-dr-muted">{value}</dd>
        </div>
      ))}
    </dl>
  );
}

interface PillGroupProps {
  label: string;
  values: string[];
}

function PillGroup({ label, values }: PillGroupProps): ReactElement {
  return (
    <div>
      <p className="text-dr-caption font-medium text-dr-subtle">{label}</p>
      <div className="mt-dr-xs flex flex-wrap gap-dr-xs">
        {values.map((value) => (
          <span
            className="rounded-dr-xs bg-dr-panel-raised px-dr-xs py-dr-xxs font-mono text-dr-caption text-dr-muted"
            key={value}
          >
            {value}
          </span>
        ))}
      </div>
    </div>
  );
}

interface TokenListProps {
  tokens: Array<{ name: string; target: string | null; value: string | null }>;
}

function TokenList({ tokens }: TokenListProps): ReactElement {
  if (tokens.length === 0) {
    return <EmptyLine text="No tokens recorded." />;
  }

  return (
    <div>
      <p className="text-dr-caption font-medium text-dr-subtle">Tokens</p>
      <ul className="mt-dr-xs divide-y divide-dr-border rounded-dr-sm border border-dr-border">
        {tokens.map((token) => (
          <li
            className="flex items-center justify-between gap-dr-sm px-dr-sm py-dr-xs"
            key={token.name}
          >
            <span className="min-w-0 break-words font-mono text-dr-caption text-dr-text">
              {token.name}
            </span>
            <span className="font-mono text-dr-caption text-dr-subtle">
              {token.target ?? token.value ?? 'Unmapped'}
            </span>
          </li>
        ))}
      </ul>
    </div>
  );
}

interface CodeBlockProps {
  label: string;
  value: string;
}

function CodeBlock({ label, value }: CodeBlockProps): ReactElement {
  return (
    <figure className="rounded-dr-sm border border-dr-code-border bg-dr-code-bg">
      <figcaption className="border-b border-dr-code-border px-dr-sm py-dr-xs font-mono text-dr-caption text-dr-subtle">
        {label}
      </figcaption>
      <pre className="overflow-x-auto p-dr-sm font-mono text-dr-code text-dr-text">{value}</pre>
    </figure>
  );
}

interface MetaTagProps {
  label: string;
  tone?: Tone;
}

function BrandMark(): ReactElement {
  return (
    <span
      aria-hidden="true"
      className="flex h-8 w-8 shrink-0 items-center justify-center gap-1 rounded-dr-sm border border-dr-border bg-dr-panel-raised"
    >
      <span className="h-4 w-px rounded bg-dr-border-strong" />
      <span className="size-1.5 rounded-full bg-dr-accent" />
      <span className="h-4 w-px rounded bg-dr-border-strong" />
    </span>
  );
}

function MetaTag({ label, tone = 'neutral' }: MetaTagProps): ReactElement {
  return (
    <span
      className={cx(
        'inline-flex shrink-0 items-center rounded-dr-xs border border-dr-border bg-dr-shell px-dr-xs py-dr-xxs text-dr-caption font-medium',
        getToneTextClass(tone),
      )}
    >
      {label}
    </span>
  );
}

interface StatusBadgeProps {
  label: string;
  tone: Tone;
}

function StatusBadge({ label, tone }: StatusBadgeProps): ReactElement {
  return (
    <span
      className={cx(
        'inline-flex items-center gap-dr-xxs rounded-dr-xs border border-dr-border bg-dr-panel-raised px-dr-xs py-dr-xxs text-dr-caption font-semibold',
        getToneTextClass(tone),
      )}
    >
      <StatusDot tone={tone} />
      {label}
    </span>
  );
}

interface StatusDotProps {
  tone: Tone;
}

function StatusDot({ tone }: StatusDotProps): ReactElement {
  return (
    <span aria-hidden="true" className={cx('size-2 rounded-full', getToneBackgroundClass(tone))} />
  );
}

interface EmptyLineProps {
  text: string;
}

function EmptyLine({ text }: EmptyLineProps): ReactElement {
  return <p className="text-dr-small text-dr-subtle">{text}</p>;
}

function getDecisionStatus(decision: ReviewDecisionResult | null): ReviewDecisionStatus {
  return decision?.status ?? 'PENDING';
}

/** Build the read-only mapping display rows directly from the mapped data. */
function buildMappingDisplayItems(
  mapping: ComponentMappingResult,
  schema: ShoelaceComponentSchema | null,
): Array<[string, string]> {
  const items: Array<[string, string]> = [];
  const slot = mapping.mappedSlots['default'];

  if (typeof slot === 'string') {
    items.push([schema === null ? 'Label' : getDefaultSlotLabel(schema), slot]);
  }

  for (const [key, value] of Object.entries(mapping.mappedProps)) {
    items.push([humanizeLabel(key), formatMappedValue(value)]);
  }

  return items;
}

function formatMappedValue(value: JsonValue): string {
  if (typeof value === 'boolean') {
    return value ? 'true' : 'false';
  }

  if (value === null) {
    return 'null';
  }

  if (typeof value === 'object') {
    return formatJson(value);
  }

  return String(value);
}

/** Turn a camelCase prop name into a human label (e.g. `helpText` → `Help Text`). */
function humanizeLabel(name: string): string {
  const spaced = name.replace(/([a-z0-9])([A-Z])/g, '$1 $2');

  return spaced.charAt(0).toUpperCase() + spaced.slice(1);
}

function formatJson(value: unknown): string {
  return JSON.stringify(value, null, 2);
}

function getErrorMessage(error: unknown): string {
  return error instanceof Error ? error.message : 'Request failed.';
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

function getToneTextClass(tone: Tone): string {
  return TONE_CLASSES[tone].text;
}

function getToneBackgroundClass(tone: Tone): string {
  return TONE_CLASSES[tone].bg;
}

function cx(...classes: Array<string | false | null | undefined>): string {
  return classes.filter(Boolean).join(' ');
}
