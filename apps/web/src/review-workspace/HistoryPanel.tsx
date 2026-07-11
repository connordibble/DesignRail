import type { ShoelaceComponentSchema } from '@designrail/schema';
import { getComponentSchema } from '@designrail/schema';
import type { ReactElement } from 'react';
import { useState } from 'react';

import type {
  ComponentMappingResult,
  ReviewDecisionResult,
  ReviewWorkspace,
} from '../graphql/operations.js';

import { getDecisionSummary } from './decision-presentation.js';
import { computeMappingDiff } from './mapping-diff.js';
import { EmptyLine, Panel, StatusBadge, StatusDot } from './primitives.js';
import { STATUS_TONES, cx, getToneTextClass } from './workspace-tones.js';

interface HistoryPanelProps {
  workspace: ReviewWorkspace;
}

export function HistoryPanel({ workspace }: HistoryPanelProps): ReactElement {
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
