import { useMutation } from '@apollo/client/react';
import type { ExportFormat } from '@designrail/shared';
import type { ReactElement } from 'react';
import { useState } from 'react';

import {
  EXPORT_MAPPING_MUTATION,
  REVIEW_WORKSPACE_QUERY,
  type ComponentMappingResult,
  type ExportMappingMutation,
  type ExportMappingMutationVariables,
  type ExportResult,
  type ReviewDecisionResult,
} from '../graphql/operations.js';
import { Button } from '../ui/Button.js';

import { getDecisionStatus } from './decision-presentation.js';
import { getErrorMessage } from './format.js';
import {
  CopyButton,
  EmptyLine,
  InlineAlert,
  InlineNotice,
  Panel,
  StatusBadge,
} from './primitives.js';
import { STATUS_TONES } from './workspace-tones.js';

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

interface ExportsPanelProps {
  exampleId: string;
  exports: ExportResult[];
  latestDecision: ReviewDecisionResult | null;
  mapping: ComponentMappingResult | null;
}

export function ExportsPanel({
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
