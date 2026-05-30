import { useQuery } from '@apollo/client/react';
import {
  createEmptyDashboardMetrics,
  type DashboardMetrics,
  type JsonValue,
  type ReviewDecisionStatus,
} from '@designrail/shared';
import type { KeyboardEvent, ReactElement, ReactNode } from 'react';
import { useRef, useState } from 'react';

import {
  REVIEW_WORKSPACE_QUERY,
  type ComplianceFindingResult,
  type ExportResult,
  type ReviewDecisionResult,
  type ReviewWorkspace,
  type ReviewWorkspaceQuery,
  type ReviewWorkspaceQueryVariables,
} from '../graphql/operations.js';

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

// TODO: derive these from ReviewDecisionStatus and ExportFormat when mutation wiring lands.
const REVIEW_ACTION_PLACEHOLDERS = ['Accept', 'Edit', 'Reject'] as const;
const EXPORT_FORMAT_PLACEHOLDERS = ['HTML', 'React', 'Brief'] as const;

export interface ReviewWorkspaceShellProps {
  exampleId: string;
}

export function ReviewWorkspaceShell({ exampleId }: ReviewWorkspaceShellProps): ReactElement {
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

            <section aria-label="Selected example" className="grid gap-dr-xs">
              <p className="text-dr-caption font-semibold uppercase text-dr-subtle">Example</p>
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

  return <WorkspaceTabPanel activeTab={activeTab} metrics={metrics} workspace={workspace} />;
}

function WorkspaceTabPanel({
  activeTab,
  metrics,
  workspace,
}: WorkspaceTabPanelProps): ReactElement {
  switch (activeTab) {
    case 'Dashboard':
      return <DashboardPanel metrics={metrics} workspace={workspace} />;
    case 'Review':
      return <ReviewPanel workspace={workspace} />;
    case 'Exports':
      return <ExportsPanel exports={workspace.exports} latestDecision={workspace.latestDecision} />;
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

function ReviewPanel({ workspace }: WorkspacePanelProps): ReactElement {
  const intent = workspace.intent;
  const mapping = workspace.mapping;
  const decisionStatus = getDecisionStatus(workspace.latestDecision);

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
            <DefinitionList
              items={[
                ['Label', getSlotLabel(mapping.mappedSlots)],
                ['Variant', getJsonRecordValue(mapping.mappedProps, 'variant')],
                ['Size', getJsonRecordValue(mapping.mappedProps, 'size')],
                ['Disabled', getJsonRecordValue(mapping.mappedProps, 'disabled')],
              ]}
            />
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
            <div className="grid grid-cols-3 gap-dr-xs">
              {REVIEW_ACTION_PLACEHOLDERS.map((action) => (
                <button
                  className="rounded-dr-sm border border-dr-border bg-dr-panel-raised px-dr-xs py-dr-xs text-dr-caption font-semibold text-dr-muted focus-visible:outline focus-visible:outline-2 disabled:cursor-not-allowed disabled:opacity-60"
                  disabled
                  key={action}
                  type="button"
                >
                  {action}
                </button>
              ))}
            </div>
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
  exports: ExportResult[];
  latestDecision: ReviewDecisionResult | null;
}

function ExportsPanel({ exports, latestDecision }: ExportsPanelProps): ReactElement {
  const status = getDecisionStatus(latestDecision);
  const canExport = status === 'ACCEPTED' || status === 'EDITED';

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
            {EXPORT_FORMAT_PLACEHOLDERS.map((format) => (
              <button
                className="rounded-dr-sm border border-dr-border bg-dr-panel-raised px-dr-xs py-dr-xs text-dr-caption font-semibold text-dr-muted focus-visible:outline focus-visible:outline-2 disabled:cursor-not-allowed disabled:opacity-60"
                disabled
                key={format}
                type="button"
              >
                {format}
              </button>
            ))}
          </div>
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

function getSlotLabel(slots: Record<string, JsonValue>): string {
  return getJsonRecordValue(slots, 'default');
}

function getJsonRecordValue(record: Record<string, JsonValue>, key: string): string {
  const value = record[key];

  if (value === undefined || value === null) {
    return 'Unmapped';
  }

  if (typeof value === 'object') {
    return formatJson(value);
  }

  return String(value);
}

function formatJson(value: unknown): string {
  return JSON.stringify(value, null, 2);
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
