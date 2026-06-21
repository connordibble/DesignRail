import { useMutation, useQuery } from '@apollo/client/react';
import {
  getComponentSchema,
  listEditableProps,
  type ShoelaceComponentSchema,
  type ShoelaceProp,
} from '@designrail/schema';
import {
  createEmptyDashboardMetrics,
  type DashboardMetrics,
  type ExportFormat,
  type JsonValue,
  type ReviewDecisionStatus,
} from '@designrail/shared';
import type { KeyboardEvent, ReactElement, ReactNode } from 'react';
import { useRef, useState } from 'react';

import {
  EXPORT_MAPPING_MUTATION,
  REVIEW_WORKSPACE_QUERY,
  SAVE_REVIEW_DECISION_MUTATION,
  type ComponentMappingResult,
  type ComplianceFindingResult,
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

import {
  MAPPING_CONFIDENCE_OPTIONS,
  canSaveMappingEdit,
  createMappingEditDraft,
  createSaveDecisionInput,
  type MappingEditDraft,
} from './mapping-edit.js';

const TABS = ['Dashboard', 'Review', 'Exports', 'Schema'] as const;

type WorkspaceTab = (typeof TABS)[number];
type Tone = 'success' | 'warning' | 'danger' | 'info' | 'edited' | 'neutral';

const EMPTY_METRICS = createEmptyDashboardMetrics();

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
  Dashboard: { previous: 'Schema', next: 'Review' },
  Review: { previous: 'Dashboard', next: 'Exports' },
  Exports: { previous: 'Review', next: 'Schema' },
  Schema: { previous: 'Exports', next: 'Dashboard' },
};

const EXPORT_FORMAT_OPTIONS: Array<{ format: ExportFormat; label: string }> = [
  { format: 'HTML', label: 'HTML' },
  { format: 'REACT', label: 'React' },
  { format: 'AGENT_BRIEF', label: 'Agent Brief' },
];

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
    Review: null,
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
  const decisionStatus = workspace === null ? null : getDecisionStatus(workspace.latestDecision);
  const decisionTone = decisionStatus === null ? 'neutral' : STATUS_TONES[decisionStatus];
  const decisionLabel = decisionStatus ?? (loading ? 'Loading' : 'Unavailable');
  const shellTitle = workspace?.example.name ?? 'Workspace';
  const exampleName =
    workspace?.example.name ?? (loading ? 'Loading example' : 'Requested example');
  const tabPanelId = getTabPanelId(activeTab);
  const workspaceBody = renderWorkspaceBody({
    activeTab,
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

  return (
    <main className="min-h-screen bg-dr-canvas font-ui text-dr-body text-dr-text">
      <div className="grid lg:grid-cols-[18rem_minmax(0,1fr)]">
        <aside className="border-b border-dr-border bg-dr-shell lg:border-b-0 lg:border-r">
          <div className="flex h-full flex-col gap-dr-lg p-dr-lg">
            <div className="flex items-start justify-between gap-dr-sm lg:block">
              <div>
                <p className="text-dr-caption font-semibold text-dr-subtle">DesignRail</p>
                <p className="mt-dr-xxs text-dr-section-title font-semibold text-dr-text">
                  Review Console
                </p>
              </div>
              <StatusBadge label="Mock mode" tone="info" />
            </div>

            <nav aria-label="Workspace areas" className="grid gap-dr-xs" role="tablist">
              {TABS.map((tab) => (
                <button
                  aria-controls={activeTab === tab ? getTabPanelId(tab) : undefined}
                  aria-selected={activeTab === tab}
                  className={cx(
                    'rounded-dr-sm border px-dr-sm py-dr-xs text-left text-dr-small font-medium transition-colors focus-visible:outline focus-visible:outline-2',
                    activeTab === tab
                      ? 'border-dr-accent bg-dr-accent-soft text-dr-text'
                      : 'border-transparent text-dr-muted hover:border-dr-border hover:bg-dr-panel',
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
              <p className="text-dr-caption font-semibold uppercase text-dr-subtle">Examples</p>
              {examples.length === 0 ? (
                <EmptyLine text="No examples available." />
              ) : (
                <ul className="grid gap-dr-xs">
                  {examples.map((example) => {
                    const isSelected = example.id === selectedExampleId;

                    return (
                      <li key={example.id}>
                        <button
                          aria-current={isSelected}
                          className={cx(
                            'flex w-full items-center justify-between gap-dr-sm rounded-dr-sm border px-dr-sm py-dr-xs text-left transition-colors focus-visible:outline focus-visible:outline-2',
                            isSelected
                              ? 'border-dr-accent bg-dr-accent-soft text-dr-text'
                              : 'border-dr-border bg-dr-panel text-dr-muted hover:border-dr-border-strong hover:bg-dr-panel-hover',
                            example.status === 'READY' ? '' : 'opacity-60',
                          )}
                          disabled={onSelectExample === undefined || example.status !== 'READY'}
                          onClick={() => onSelectExample?.(example.id)}
                          type="button"
                        >
                          <span>
                            <span className="block text-dr-small font-semibold text-dr-text">
                              {example.name}
                            </span>
                            <span className="mt-dr-xxs block font-mono text-dr-caption text-dr-subtle">
                              {example.componentType}
                            </span>
                          </span>
                          <StatusDot tone={isSelected ? 'info' : 'neutral'} />
                        </button>
                      </li>
                    );
                  })}
                </ul>
              )}
            </section>

            <section aria-label="Selected example" className="grid gap-dr-xs">
              <p className="text-dr-caption font-semibold uppercase text-dr-subtle">Selected</p>
              <div className="rounded-dr-md border border-dr-border bg-dr-panel p-dr-sm">
                <div className="flex items-center justify-between gap-dr-sm">
                  <div>
                    <p className="text-dr-small font-semibold text-dr-text">{exampleName}</p>
                    <p className="mt-dr-xxs font-mono text-dr-caption text-dr-subtle">
                      {workspace?.example.id ?? exampleId}
                    </p>
                  </div>
                  <StatusDot tone={decisionTone} />
                </div>
                <div className="mt-dr-sm flex flex-wrap gap-dr-xs">
                  {workspace === null ? null : (
                    <StatusBadge label={workspace.example.source} tone="info" />
                  )}
                  <StatusBadge label={decisionLabel} tone={decisionTone} />
                </div>
              </div>
            </section>
          </div>
        </aside>

        <section className="min-w-0 bg-dr-canvas">
          <header className="border-b border-dr-border bg-dr-shell px-dr-lg py-dr-md">
            <div className="flex flex-col gap-dr-md xl:flex-row xl:items-center xl:justify-between">
              <div>
                <p className="text-dr-caption font-semibold uppercase text-dr-subtle">
                  Human review
                </p>
                <h1 className="mt-dr-xxs text-dr-page-title font-semibold text-dr-text">
                  {shellTitle}
                </h1>
              </div>
              <div className="flex flex-wrap gap-dr-xs">
                <StatusBadge label="GraphQL contract" tone="neutral" />
                <StatusBadge label={decisionLabel} tone={decisionTone} />
                <StatusBadge label={`Exports ${metrics.exportsCreated}`} tone="success" />
              </div>
            </div>
          </header>

          <div
            aria-labelledby={getTabId(activeTab)}
            className="p-dr-lg"
            id={tabPanelId}
            role="tabpanel"
            tabIndex={0}
          >
            {workspaceBody}
          </div>
        </section>
      </div>
    </main>
  );
}

interface WorkspaceTabPanelProps {
  activeTab: WorkspaceTab;
  exampleId: string;
  metrics: DashboardMetrics;
  workspace: ReviewWorkspace;
}

interface RenderWorkspaceBodyInput {
  activeTab: WorkspaceTab;
  errorMessage: string | undefined;
  exampleId: string;
  loading: boolean;
  metrics: DashboardMetrics;
  workspace: ReviewWorkspace | null;
}

function renderWorkspaceBody({
  activeTab,
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
      exampleId={exampleId}
      metrics={metrics}
      workspace={workspace}
    />
  );
}

function WorkspaceTabPanel({
  activeTab,
  exampleId,
  metrics,
  workspace,
}: WorkspaceTabPanelProps): ReactElement {
  switch (activeTab) {
    case 'Dashboard':
      return <DashboardPanel metrics={metrics} workspace={workspace} />;
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
              <p className="text-dr-caption font-semibold text-dr-subtle">{item.label}</p>
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

  return (
    <div className="grid gap-dr-md xl:grid-cols-[minmax(0,1fr)_minmax(0,1fr)_22rem]">
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
            <div className="flex flex-wrap items-center gap-dr-xs">
              <StatusBadge label={mapping.targetLibrary} tone="neutral" />
              <StatusBadge label={mapping.confidence} tone="success" />
              <span className="font-mono text-dr-section-title text-dr-text">
                {mapping.targetComponent}
              </span>
            </div>
            <DefinitionList items={buildMappingDisplayItems(mapping)} />
            <CodeBlock label="mappedProps" value={formatJson(mapping.mappedProps)} />
            <p className="text-dr-small text-dr-muted">{mapping.rationale}</p>
          </div>
        )}
      </Panel>

      <aside className="grid content-start gap-dr-md">
        <Panel title="Decision">
          <div className="grid gap-dr-sm">
            <div className="flex items-center justify-between gap-dr-sm">
              <span className="text-dr-small text-dr-muted">Current status</span>
              <StatusBadge label={decisionStatus} tone={STATUS_TONES[decisionStatus]} />
            </div>

            {schema === null || mapping === null || draft === null ? (
              <EmptyLine text="No schema-backed mapping is available for a review decision." />
            ) : (
              <MappingEditForm
                disabled={isSavingDecision}
                draft={draft}
                onChange={setDraft}
                onSaveAccept={() => persistDecision('ACCEPTED')}
                onSaveEdit={() => persistDecision('EDITED')}
                onSaveReject={() => persistDecision('REJECTED')}
                schema={schema}
              />
            )}

            {isSavingDecision ? (
              <p aria-live="polite" className="text-dr-small text-dr-subtle" role="status">
                Saving review decision.
              </p>
            ) : null}
            {saveErrorMessage !== null ? (
              <InlineAlert message={saveErrorMessage} title="Decision failed" />
            ) : null}

            {workspace.latestDecision === null ? (
              <EmptyLine text="Awaiting human review." />
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

        <CompliancePanel findings={workspace.complianceFindings} />
      </aside>
    </div>
  );
}

interface MappingEditFormProps {
  disabled: boolean;
  draft: MappingEditDraft;
  onChange: (draft: MappingEditDraft) => void;
  onSaveAccept: () => void;
  onSaveEdit: () => void;
  onSaveReject: () => void;
  schema: ShoelaceComponentSchema;
}

function MappingEditForm({
  disabled,
  draft,
  onChange,
  onSaveAccept,
  onSaveEdit,
  onSaveReject,
  schema,
}: MappingEditFormProps): ReactElement {
  const canSaveEdit = canSaveMappingEdit(draft);

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
    <div className="grid gap-dr-sm">
      <div className="grid gap-dr-xs">
        {draft.slotLabel === null ? null : (
          <TextField
            disabled={disabled}
            id="mapping-edit-slot-label"
            label="Label"
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

      <div className="grid grid-cols-3 gap-dr-xs">
        <button
          className="rounded-dr-sm border border-dr-success bg-dr-panel-raised px-dr-xs py-dr-xs text-dr-caption font-semibold text-dr-success focus-visible:outline focus-visible:outline-2 disabled:cursor-not-allowed disabled:opacity-60"
          disabled={disabled}
          onClick={onSaveAccept}
          type="button"
        >
          Accept
        </button>
        <button
          className="rounded-dr-sm border border-dr-edited bg-dr-panel-raised px-dr-xs py-dr-xs text-dr-caption font-semibold text-dr-edited focus-visible:outline focus-visible:outline-2 disabled:cursor-not-allowed disabled:opacity-60"
          disabled={disabled || !canSaveEdit}
          onClick={onSaveEdit}
          type="button"
        >
          Edit
        </button>
        <button
          className="rounded-dr-sm border border-dr-danger bg-dr-panel-raised px-dr-xs py-dr-xs text-dr-caption font-semibold text-dr-danger focus-visible:outline focus-visible:outline-2 disabled:cursor-not-allowed disabled:opacity-60"
          disabled={disabled}
          onClick={onSaveReject}
          type="button"
        >
          Reject
        </button>
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
      <label className="flex items-center justify-between gap-dr-sm rounded-dr-sm border border-dr-border bg-dr-panel-raised px-dr-sm py-dr-xs text-dr-small text-dr-muted">
        {label}
        <input
          checked={typeof value === 'boolean' ? value : false}
          className="size-4 accent-dr-accent focus-visible:outline focus-visible:outline-2"
          disabled={disabled}
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

interface CompliancePanelProps {
  findings: ComplianceFindingResult[];
}

function CompliancePanel({ findings }: CompliancePanelProps): ReactElement {
  return (
    <Panel title="Compliance">
      {findings.length === 0 ? (
        <EmptyLine text="No compliance findings recorded." />
      ) : (
        <div className="grid gap-dr-xs">
          {findings.map((finding) => (
            <article
              className="rounded-dr-sm border border-dr-border bg-dr-panel-raised p-dr-sm"
              key={finding.id}
            >
              <div className="flex flex-wrap items-center gap-dr-xs">
                <StatusBadge label={finding.severity} tone={SEVERITY_TONES[finding.severity]} />
                <span className="font-mono text-dr-caption text-dr-subtle">{finding.category}</span>
              </div>
              <p className="mt-dr-xs text-dr-small font-semibold text-dr-text">{finding.message}</p>
              <p className="mt-dr-xxs text-dr-small text-dr-muted">{finding.remediation}</p>
              {finding.path ? (
                <p className="mt-dr-xs font-mono text-dr-caption text-dr-subtle">{finding.path}</p>
              ) : null}
            </article>
          ))}
        </div>
      )}
    </Panel>
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
              <button
                className="rounded-dr-sm border border-dr-border bg-dr-panel-raised px-dr-xs py-dr-xs text-dr-caption font-semibold text-dr-muted focus-visible:outline focus-visible:outline-2 disabled:cursor-not-allowed disabled:opacity-60"
                disabled={!canExport || mapping === null || isExporting}
                key={option.format}
                onClick={() => createMappingExport(option.format)}
                type="button"
              >
                {pendingExportFormat === option.format ? 'Exporting' : option.label}
              </button>
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
          <div className="grid gap-dr-sm">
            {exports.map((exportResult) => (
              <article
                className="rounded-dr-sm border border-dr-border bg-dr-panel-raised"
                key={exportResult.id}
              >
                <div className="flex items-center justify-between gap-dr-sm border-b border-dr-border px-dr-sm py-dr-xs">
                  <StatusBadge label={exportResult.format} tone="neutral" />
                  <span className="font-mono text-dr-caption text-dr-subtle">
                    {exportResult.createdAt}
                  </span>
                </div>
                <pre className="overflow-x-auto p-dr-sm font-mono text-dr-code text-dr-text">
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

interface PanelProps {
  children: ReactNode;
  title: string;
}

function Panel({ children, title }: PanelProps): ReactElement {
  return (
    <section className="min-w-0 rounded-dr-md border border-dr-border bg-dr-panel">
      <div className="border-b border-dr-border px-dr-md py-dr-sm">
        <h2 className="text-dr-section-title font-semibold text-dr-text">{title}</h2>
      </div>
      <div className="p-dr-md">{children}</div>
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
    <label className="grid gap-dr-xxs text-dr-caption font-semibold text-dr-subtle" htmlFor={id}>
      {label}
      <input
        className="rounded-dr-sm border border-dr-border bg-dr-panel-raised px-dr-sm py-dr-xs font-ui text-dr-small font-normal text-dr-text focus-visible:outline focus-visible:outline-2 disabled:cursor-not-allowed disabled:opacity-60"
        disabled={disabled}
        id={id}
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
    <label className="grid gap-dr-xxs text-dr-caption font-semibold text-dr-subtle" htmlFor={id}>
      {label}
      <select
        className="rounded-dr-sm border border-dr-border bg-dr-panel-raised px-dr-sm py-dr-xs font-ui text-dr-small font-normal text-dr-text focus-visible:outline focus-visible:outline-2 disabled:cursor-not-allowed disabled:opacity-60"
        disabled={disabled}
        id={id}
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
    <label className="grid gap-dr-xxs text-dr-caption font-semibold text-dr-subtle" htmlFor={id}>
      {label}
      <textarea
        className="min-h-20 resize-y rounded-dr-sm border border-dr-border bg-dr-panel-raised px-dr-sm py-dr-xs font-ui text-dr-small font-normal text-dr-text focus-visible:outline focus-visible:outline-2 disabled:cursor-not-allowed disabled:opacity-60"
        disabled={disabled}
        id={id}
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
          <dt className="text-dr-caption font-semibold text-dr-subtle">{label}</dt>
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
      <p className="text-dr-caption font-semibold text-dr-subtle">{label}</p>
      <div className="mt-dr-xs flex flex-wrap gap-dr-xs">
        {values.map((value) => (
          <span
            className="rounded-dr-xs border border-dr-border bg-dr-panel-raised px-dr-xs py-dr-xxs font-mono text-dr-caption text-dr-muted"
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
    <div className="grid gap-dr-xs">
      {tokens.map((token) => (
        <div
          className="rounded-dr-sm border border-dr-border bg-dr-panel-raised p-dr-sm"
          key={token.name}
        >
          <p className="font-mono text-dr-caption text-dr-text">{token.name}</p>
          <p className="mt-dr-xxs font-mono text-dr-caption text-dr-subtle">
            {token.target ?? token.value ?? 'Unmapped'}
          </p>
        </div>
      ))}
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

/** Build the read-only mapping display rows directly from the mapped data (schema-agnostic). */
function buildMappingDisplayItems(mapping: ComponentMappingResult): Array<[string, string]> {
  const items: Array<[string, string]> = [];
  const slot = mapping.mappedSlots['default'];

  if (typeof slot === 'string') {
    items.push(['Label', slot]);
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
